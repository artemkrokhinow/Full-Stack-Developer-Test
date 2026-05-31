// @vitest-environment happy-dom
import { renderHook, act } from '@testing-library/react';
import { useCountdown } from '../useCountdown';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('useCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('formats time correctly and calls onExpire when time runs out', () => {
    const onExpireMock = vi.fn();
    // Set expiry 5 minutes from now
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const { result } = renderHook(() => useCountdown(expiresAt, onExpireMock));

    expect(result.current.formatted).toBe('05:00');
    expect(result.current.isExpired).toBe(false);

    // Fast forward 2 minutes
    act(() => {
      vi.advanceTimersByTime(2 * 60 * 1000);
    });

    expect(result.current.formatted).toBe('03:00');
    expect(result.current.isExpired).toBe(false);

    // Fast forward remaining 3 minutes
    act(() => {
      vi.advanceTimersByTime(3 * 60 * 1000);
    });

    expect(result.current.formatted).toBe('00:00');
    expect(result.current.isExpired).toBe(true);
    expect(onExpireMock).toHaveBeenCalledTimes(1);
  });
});
