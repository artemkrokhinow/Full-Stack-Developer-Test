import { useState, useEffect, useRef } from 'react';

interface TimerResult {
  /** Formatted time string like "04:59" */
  formatted: string;
  /** True when the countdown has reached 00:00 */
  isExpired: boolean;
  /** Remaining seconds */
  secondsLeft: number;
}

/**
 * Counts down from `expiresAt` (ISO string) to zero, updating every second.
 * Calls `onExpire` exactly once when the timer reaches 00:00.
 * Uses recursive setTimeout instead of setInterval for reliable timing.
 */
export function useCountdown(
  expiresAt: string | null,
  onExpire?: () => void
): TimerResult {
  const getSecondsLeft = () => {
    if (!expiresAt) return 0;
    const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
    return Math.max(0, diff);
  };

  const [secondsLeft, setSecondsLeft] = useState<number>(getSecondsLeft);
  const hasExpiredRef = useRef(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    if (!expiresAt) {
      setSecondsLeft(0);
      hasExpiredRef.current = false;
      return;
    }

    hasExpiredRef.current = false;
    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout>;

    const tick = () => {
      if (!isMounted) return;

      const secs = getSecondsLeft();
      setSecondsLeft(secs);

      if (secs <= 0 && !hasExpiredRef.current) {
        hasExpiredRef.current = true;
        onExpireRef.current?.();
        return; // Stop recursion
      }

      timeoutId = setTimeout(tick, 1000);
    };

    // Immediate sync
    setSecondsLeft(getSecondsLeft());
    timeoutId = setTimeout(tick, 1000);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [expiresAt]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return {
    formatted,
    isExpired: secondsLeft <= 0 && expiresAt !== null,
    secondsLeft,
  };
}
