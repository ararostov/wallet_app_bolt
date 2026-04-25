// useMarkNotificationRead — optimistic mark-read.
//
// Optimistic dispatch first; rollback only on non-404 failure (a 404
// means the row is gone server-side, so the optimistic remove-as-read is
// already correct).

import { useCallback, useState } from 'react';

import { useWallet } from '@/context/WalletContext';
import type { Notification } from '@/types/notifications';
import { notificationsApi } from '@/utils/api/notifications';
import { ApiError } from '@/utils/errors';
import { logError } from '@/utils/logger';

export interface UseMarkNotificationReadResult {
  loading: boolean;
  error: Error | null;
  markRead: (id: string) => Promise<Notification | null>;
}

export function useMarkNotificationRead(): UseMarkNotificationReadResult {
  const { state, dispatch } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const markRead = useCallback(
    async (id: string): Promise<Notification | null> => {
      const previous = state.notificationsApi?.find((n) => n.id === id) ?? null;
      const wasUnread = previous ? previous.readAt === null : false;
      // Optimistic dispatch.
      dispatch({
        type: 'NOTIFICATIONS/MARK_READ_API',
        payload: { id, readAt: new Date().toISOString() },
      });
      setLoading(true);
      setError(null);
      try {
        const updated = await notificationsApi.markRead(id);
        // Reconcile with server-truth (server-side `readAt`).
        dispatch({ type: 'NOTIFICATIONS/UPSERT_API', payload: updated });
        return updated;
      } catch (e) {
        const isNotFound = e instanceof ApiError && e.status === 404;
        if (isNotFound) {
          // Stale local copy — drop it and let the unread count rebalance.
          dispatch({ type: 'NOTIFICATIONS/REMOVE_API', payload: { id } });
          // The MARK_READ_API above already decremented; REMOVE_API would
          // decrement again on a still-unread row, but our optimistic
          // mark-read flipped readAt to a non-null value so the second
          // decrement will not fire.
          return null;
        }
        // Rollback the optimistic flip.
        if (previous && wasUnread) {
          dispatch({ type: 'NOTIFICATIONS/UPSERT_API', payload: previous });
          if (state.unreadNotificationsCountApi !== null) {
            dispatch({
              type: 'NOTIFICATIONS/SET_UNREAD_COUNT_API',
              payload: state.unreadNotificationsCountApi + 1,
            });
          }
        }
        logError(e, { where: 'useMarkNotificationRead', id });
        setError(e instanceof Error ? e : new Error(String(e)));
        throw e instanceof Error ? e : new Error(String(e));
      } finally {
        setLoading(false);
      }
    },
    [dispatch, state.notificationsApi, state.unreadNotificationsCountApi],
  );

  return { loading, error, markRead };
}
