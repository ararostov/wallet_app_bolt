// useUpdateNotificationSettings — partial PATCH with optimistic merge.
//
// Optimistic strategy: deep-merge the incoming partial into the cached
// settings, dispatch immediately, then reconcile with the server response
// on success. On failure, roll back to the snapshot taken before dispatch.

import { useCallback, useRef, useState } from 'react';

import { useWallet } from '@/context/WalletContext';
import type {
  NotificationCategory,
  NotificationSettings,
  UpdateNotificationSettingsRequest,
} from '@/types/notifications';
import { notificationsApi } from '@/utils/api/notifications';
import { newIdempotencyKey } from '@/utils/idempotency';
import { logError } from '@/utils/logger';

export interface UseUpdateNotificationSettingsResult {
  loading: boolean;
  error: Error | null;
  updateSettings: (
    payload: UpdateNotificationSettingsRequest,
  ) => Promise<NotificationSettings | null>;
}

function mergeSettings(
  current: NotificationSettings,
  patch: UpdateNotificationSettingsRequest,
): NotificationSettings {
  const next: NotificationSettings = {
    ...current,
    masterPushEnabled:
      patch.masterPushEnabled !== undefined
        ? patch.masterPushEnabled
        : current.masterPushEnabled,
    quietHours:
      patch.quietHours === null
        ? { start: null, end: null, timezone: null }
        : patch.quietHours !== undefined
          ? {
              start: patch.quietHours.start,
              end: patch.quietHours.end,
              timezone: patch.quietHours.timezone,
            }
          : current.quietHours,
    categories: { ...current.categories },
  };
  if (patch.categories) {
    const keys = Object.keys(patch.categories) as NotificationCategory[];
    for (const key of keys) {
      const partial = patch.categories[key];
      if (!partial) continue;
      next.categories[key] = {
        ...current.categories[key],
        ...(partial.inApp !== undefined ? { inApp: partial.inApp } : null),
        ...(partial.push !== undefined ? { push: partial.push } : null),
      };
    }
  }
  return next;
}

export function useUpdateNotificationSettings(): UseUpdateNotificationSettingsResult {
  const { state, dispatch } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  // Stable Idempotency-Key per hook instance — shared across retries of
  // the same logical save.
  const idempotencyKeyRef = useRef<string>(newIdempotencyKey());

  const updateSettings = useCallback(
    async (
      payload: UpdateNotificationSettingsRequest,
    ): Promise<NotificationSettings | null> => {
      const previous = state.notificationSettings;
      // Optimistic merge.
      if (previous) {
        const merged = mergeSettings(previous, payload);
        dispatch({ type: 'NOTIFICATIONS/SET_SETTINGS', payload: merged });
      }

      setLoading(true);
      setError(null);
      try {
        const result = await notificationsApi.updateSettings(
          payload,
          idempotencyKeyRef.current,
        );
        dispatch({ type: 'NOTIFICATIONS/SET_SETTINGS', payload: result });
        // Rotate the key so the next save uses a fresh one.
        idempotencyKeyRef.current = newIdempotencyKey();
        return result;
      } catch (e) {
        if (previous) {
          dispatch({ type: 'NOTIFICATIONS/SET_SETTINGS', payload: previous });
        }
        logError(e, { where: 'useUpdateNotificationSettings' });
        setError(e instanceof Error ? e : new Error(String(e)));
        throw e instanceof Error ? e : new Error(String(e));
      } finally {
        setLoading(false);
      }
    },
    [dispatch, state.notificationSettings],
  );

  return { loading, error, updateSettings };
}
