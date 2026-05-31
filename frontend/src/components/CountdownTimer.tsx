import { useCountdown } from '../hooks/useCountdown';

interface CountdownTimerProps {
  expiresAt: string;
  onExpire: () => void;
}

export function CountdownTimer({ expiresAt, onExpire }: CountdownTimerProps) {
  const { formatted, isExpired } = useCountdown(expiresAt, onExpire);

  if (isExpired) {
    return <span className="countdown countdown--expired">Expired</span>;
  }

  return <span className="countdown countdown--active">{formatted}</span>;
}
