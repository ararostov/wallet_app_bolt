// useMarkAllNotificationsRead — optimistic bulk mark-read.

import { useCallback, useState } from 'react';

import { useWallet } from '@/context/WalletContext';
import type { MarkAllReadResult, NotificationType } from '@/types/notifications';
import { notificationsApi } from '@/utils/api/notifications';
import { logError } from '@/utils/logger';

export interface UseMarkAllNotificationsReadResult {
  loading: boolean;
  error: Error | null;
  markAllRead: (type?: NotificationType) => Promise<MarkAllReadResult | null>;
}

export function useMarkAllNotificationsRead(): UseMarkAllNotificationsReadResult {
  const { state, dispatch } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const markAllRead = useCallback(
    async (type?: NotificationType): Promise<MarkAllReadResult | null> => {
      const previousList = state.notifications;
      const previousCount = state.unreadNotificationsCount;

      // Optimistic flip.
      dispatch({
        type: 'NOTIFICATIONS/MARK_ALL_READ',
        payload: { readAt: new Date().toISOString() },
      });

      setLoading(true);
      setError(null);
      try {
        const result = await notificationsApi.markAllRead(type);
        // Re-sync count from server (a new row may have arrived between
        // optimistic flip and server execution).
        try {
          const fresh = await notificationsApi.getCount();
          dispatch({
            type: 'NOTIFICATIONS/SET_UNREAD_COUNT',
            payload: fresh.unreadCount,
          });
        } catch (countError) {
          logError(countError, { where: 'useMarkAllNotificationsRead.count' });
        }
        return result;
      } catch (e) {
        // Rollback.
        if (previousList) {
          dispatch({
            type: 'NOTIFICATIONS/SET',
            payload: { items: previousList },
          });
        }
        if (previousCount !== null) {
          dispatch({
            type: 'NOTIFICATIONS/SET_UNREAD_COUNT',
            payload: previousCount,
          });
        }
        logError(e, { where: 'useMarkAllNotificationsRead' });
        setError(e instanceof Error ? e : new Error(String(e)));
        throw e instanceof Error ? e : new Error(String(e));
      } finally {
        setLoading(false);
      }
    },
    [dispatch, state.notifications, state.unreadNotificationsCount],
  );

  return { loading, error, markAllRead };
}
