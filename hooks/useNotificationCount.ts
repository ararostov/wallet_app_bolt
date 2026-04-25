// useNotificationCount — polls /notifications/count and mirrors the value
// into WalletContext (`unreadNotificationsCountApi`) so the home-tab badge
// can read it via `useWallet()`.
//
// Polling cadence: 60s while the hook is mounted and `enabled`. The API
// rate-limits this endpoint to 600 req/min per customer, so the polling
// rate is well within budget.

import { useEffect, useRef, useState } from 'react';

import { useWallet } from '@/context/WalletContext';
import { notificationsApi } from '@/utils/api/notifications';
import { logError } from '@/utils/logger';

export interface UseNotificationCountOptions {
  enabled?: boolean;
  intervalMs?: number;
}

export interface UseNotificationCountResult {
  unreadCount: number | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

const DEFAULT_INTERVAL_MS = 60_000;

export function useNotificationCount(
  options: UseNotificationCountOptions = {},
): UseNotificationCountResult {
  const { enabled = true, intervalMs = DEFAULT_INTERVAL_MS } = options;
  const { state, dispatch } = useWallet();
  const [loading, setLoading] = useState(enabled && state.unreadNotificationsCount === null);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useRef(async (): Promise<void> => {
    try {
      const result = await notificationsApi.getCount();
      if (!mountedRef.current) return;
      dispatch({
        type: 'NOTIFICATIONS/SET_UNREAD_COUNT',
        payload: result.unreadCount,
      });
      setError(null);
    } catch (e) {
      if (!mountedRef.current) return;
      logError(e, { where: 'useNotificationCount' });
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }).current;

  useEffect(() => {
    if (!enabled) return undefined;
    void refresh();
    const handle = setInterval(() => {
      void refresh();
    }, intervalMs);
    return () => {
      clearInterval(handle);
    };
  }, [enabled, intervalMs, refresh]);

  return {
    unreadCount: state.unreadNotificationsCount,
    loading,
    error,
    refresh,
  };
}
