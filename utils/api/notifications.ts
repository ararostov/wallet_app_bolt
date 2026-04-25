// Notifications endpoint helpers (in-app feed + settings + push tokens).
// Contracts mirror docs/api/specs/09-notifications.ru.md and OpenAPI
// paths/notifications.yaml. The list endpoint is cursor-paginated, so it
// returns the raw envelope (data + meta); single-resource endpoints unwrap
// `data` like the rest of the codebase.

import { api } from '../api';
import type {
  MarkAllReadResult,
  Notification,
  NotificationCountResponse,
  NotificationListMeta,
  NotificationSettings,
  NotificationType,
  PushTokenRecord,
  RegisterPushTokenRequest,
  UpdateNotificationSettingsRequest,
} from '@/types/notifications';

export interface ListNotificationsParams {
  cursor?: string;
  limit?: number;
  unreadOnly?: boolean;
  type?: NotificationType;
}

export interface NotificationListResult {
  data: Notification[];
  meta: NotificationListMeta;
}

export const notificationsApi = {
  list(params: ListNotificationsParams = {}): Promise<NotificationListResult> {
    return api
      .get<Notification[]>('/notifications', { params })
      .then((r) => ({
        data: r.data,
        meta: ((r as unknown) as { meta: NotificationListMeta }).meta,
      }));
  },

  getCount(): Promise<NotificationCountResponse> {
    return api
      .get<NotificationCountResponse>('/notifications/count')
      .then((r) => r.data);
  },

  // Backend uses PATCH (per OpenAPI) for both mark-read and mark-all-read.
  markRead(id: string): Promise<Notification> {
    return api
      .patch<Notification>(`/notifications/${encodeURIComponent(id)}/read`)
      .then((r) => r.data);
  },

  markAllRead(type?: NotificationType): Promise<MarkAllReadResult> {
    const body = type ? { type } : {};
    return api
      .patch<MarkAllReadResult>('/notifications/mark-all-read', body)
      .then((r) => r.data);
  },

  delete(id: string): Promise<void> {
    return api
      .delete<void>(`/notifications/${encodeURIComponent(id)}`)
      .then(() => undefined);
  },

  getSettings(): Promise<NotificationSettings> {
    return api
      .get<NotificationSettings>('/notifications/settings')
      .then((r) => r.data);
  },

  updateSettings(
    payload: UpdateNotificationSettingsRequest,
    idempotencyKey?: string,
  ): Promise<NotificationSettings> {
    return api
      .patch<NotificationSettings>('/notifications/settings', payload, {
        headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
      })
      .then((r) => r.data);
  },

  registerPushToken(
    payload: RegisterPushTokenRequest,
    idempotencyKey: string,
  ): Promise<PushTokenRecord> {
    return api
      .post<PushTokenRecord>('/push-tokens/register', payload, {
        headers: { 'Idempotency-Key': idempotencyKey },
      })
      .then((r) => r.data);
  },

  revokePushToken(deviceId?: string): Promise<void> {
    return api
      .delete<void>('/push-tokens', {
        params: deviceId ? { deviceId } : undefined,
      })
      .then(() => undefined);
  },
};
