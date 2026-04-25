// useDeleteNotification — optimistic hard-delete.
// 404 is treated as success (the row is already gone server-side).

import { useCallback, useState } from 'react';

import { useWallet } from '@/context/WalletContext';
import { notificationsApi } from '@/utils/api/notifications';
import { ApiError } from '@/utils/errors';
import { logError } from '@/utils/logger';

export interface UseDeleteNotificationResult {
  loading: boolean;
  error: Error | null;
  remove: (id: string) => Promise<void>;
}

export function useDeleteNotification(): UseDeleteNotificationResult {
  const { state, dispatch } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const remove = useCallback(
    async (id: string): Promise<void> => {
      const previous = state.notificationsApi?.find((n) => n.id === id) ?? null;
      const previousCount = state.unreadNotificationsCountApi;
      const wasUnread = previous ? previous.readAt === null : false;

      // Optimistic remove.
      dispatch({ type: 'NOTIFICATIONS/REMOVE_API', payload: { id } });

      setLoading(true);
      setError(null);
      try {
        await notificationsApi.delete(id);
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) {
          // Already gone — keep the optimistic remove.
          return;
        }
        // Rollback.
        if (previous) {
          dispatch({ type: 'NOTIFICATIONS/UPSERT_API', payload: previous });
          if (wasUnread && previousCount !== null) {
            dispatch({
              type: 'NOTIFICATIONS/SET_UNREAD_COUNT_API',
              payload: previousCount,
            });
          }
        }
        logError(e, { where: 'useDeleteNotification', id });
        setError(e instanceof Error ? e : new Error(String(e)));
        throw e instanceof Error ? e : new Error(String(e));
      } finally {
        setLoading(false);
      }
    },
    [dispatch, state.notificationsApi, state.unreadNotificationsCountApi],
  );

  return { loading, error, remove };
}
