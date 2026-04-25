// useTopupStatus — GET /wallet/topup-status/{paymentOrderId} polling helper.
//
// Polls every `intervalMs` while `enabled` and the latest status is
// non-terminal. Auto-stops when:
// - a terminal status (`completed` / `failed` / `cancelled`) lands;
// - `enabled` becomes false;
// - the cumulative poll budget (`timeoutMs`, default 60s) is exhausted, in
//   which case `timedOut` flips to `true` and the screen switches copy to
//   "we'll notify you when this completes".
//
// The hook does NOT use the cached useQuery layer because polling cadence
// requires a dedicated timer (and a per-paymentOrderId TTL would be wrong).

import { useCallback, useEffect, useRef, useState } from 'react';

import type { TopupStatusResponse } from '@/types/topup';
import { topupApi } from '@/utils/api/topup';
import { logError } from '@/utils/logger';

export interface UseTopupStatusOptions {
  enabled: boolean;
  intervalMs?: number;
  timeoutMs?: number;
}

export interface UseTopupStatusResult {
  data: TopupStatusResponse | undefined;
  loading: boolean;
  error: Error | null;
  timedOut: boolean;
  refetch: () => Promise<void>;
}

const DEFAULT_INTERVAL_MS = 5_000;
const DEFAULT_TIMEOUT_MS = 60_000;
const TERMINAL_STATUSES: ReadonlySet<string> = new Set([
  'completed',
  'failed',
  'cancelled',
]);

export function useTopupStatus(
  paymentOrderId: string | null,
  options: UseTopupStatusOptions,
): UseTopupStatusResult {
  const {
    enabled,
    intervalMs = DEFAULT_INTERVAL_MS,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = options;

  const [data, setData] = useState<TopupStatusResponse | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(enabled && !!paymentOrderId);
  const [error, setError] = useState<Error | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  const mountedRef = useRef(true);
  const startedAtRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inFlightRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const fetchOnce = useCallback(async (): Promise<void> => {
    if (!paymentOrderId || inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const response = await topupApi.getStatus(paymentOrderId);
      if (!mountedRef.current) return;
      setData(response);
      setError(null);
      if (TERMINAL_STATUSES.has(response.status)) {
        clearTimer();
      }
    } catch (e) {
      if (!mountedRef.current) return;
      logError(e, { where: 'useTopupStatus', paymentOrderId });
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      inFlightRef.current = false;
      if (mountedRef.current) setLoading(false);
    }
  }, [paymentOrderId, clearTimer]);

  // Driver effect — starts/stops the polling timer based on inputs.
  useEffect(() => {
    mountedRef.current = true;
    if (!enabled || !paymentOrderId) {
      setLoading(false);
      clearTimer();
      return () => {
        mountedRef.current = false;
        clearTimer();
      };
    }

    // Reset timeout state when (re)starting for a new order.
    setTimedOut(false);
    startedAtRef.current = Date.now();
    setLoading(true);

    // Immediate first read so the screen renders fresh data without waiting
    // a full interval.
    void fetchOnce();

    timerRef.current = setInterval(() => {
      if (!mountedRef.current) return;
      const startedAt = startedAtRef.current ?? Date.now();
      if (Date.now() - startedAt >= timeoutMs) {
        setTimedOut(true);
        clearTimer();
        return;
      }
      // Terminal-status short-circuit lives inside fetchOnce, which clears
      // the timer as soon as the response lands.
      void fetchOnce();
    }, intervalMs);

    return () => {
      mountedRef.current = false;
      clearTimer();
    };
  }, [enabled, paymentOrderId, intervalMs, timeoutMs, fetchOnce, clearTimer]);

  const refetch = useCallback(async (): Promise<void> => {
    await fetchOnce();
  }, [fetchOnce]);

  return { data, loading, error, timedOut, refetch };
}
