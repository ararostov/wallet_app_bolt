// useNotificationSettings — fetch + cache notification settings.
// Mirrors into WalletContext (`notificationSettingsApi`) on every fetch.

import { useCallback, useEffect, useState } from 'react';

import { useWallet } from '@/context/WalletContext';
import type { NotificationSettings } from '@/types/notifications';
import { notificationsApi } from '@/utils/api/notifications';
import { logError } from '@/utils/logger';

export interface UseNotificationSettingsResult {
  data: NotificationSettings | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useNotificationSettings(
  options: { enabled?: boolean } = {},
): UseNotificationSettingsResult {
  const { enabled = true } = options;
  const { state, dispatch } = useWallet();
  const [loading, setLoading] = useState<boolean>(
    enabled && state.notificationSettings === null,
  );
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const settings = await notificationsApi.getSettings();
      dispatch({ type: 'NOTIFICATIONS/SET_SETTINGS', payload: settings });
      setError(null);
    } catch (e) {
      logError(e, { where: 'useNotificationSettings' });
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    if (!enabled) return;
    void refresh();
  }, [enabled, refresh]);

  return {
    data: state.notificationSettings,
    loading,
    error,
    refresh,
  };
}
