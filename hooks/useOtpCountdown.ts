// Countdown hook for OTP resend cooldown that survives backgrounding.
// Uses an absolute deadline timestamp instead of a tick counter, so when the
// app comes back from background the remaining seconds are recomputed.

import { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

export function useOtpCountdown(deadlineMs: number | null): {
  remainingSeconds: number;
  isExpired: boolean;
} {
  const compute = () =>
    deadlineMs == null
      ? 0
      : Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000));

  const [remainingSeconds, setRemainingSeconds] = useState<number>(compute);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setRemainingSeconds(compute());
    if (deadlineMs == null) return;

    const tick = () => {
      const next =
        deadlineMs == null
          ? 0
          : Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000));
      setRemainingSeconds(next);
      if (next > 0) {
        timerRef.current = setTimeout(tick, 1000);
      }
    };
    tick();

    const sub = AppState.addEventListener('change', (s: AppStateStatus) => {
      if (s === 'active') tick();
    });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      sub.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadlineMs]);

  return {
    remainingSeconds,
    isExpired: remainingSeconds === 0,
  };
}
