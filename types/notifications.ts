// Notifications domain types — aligned with docs/api/specs/09-notifications.ru.md
// and the OpenAPI schemas at app/public/openapi/components/schemas/notification.yaml.
//
// Wire shape rules:
// - All IDs are strings.
// - Dates are ISO 8601 UTC strings.
// - `data` payload is camelCase, free-form per type — clients should treat
//   unknown keys as forward-compatibility.
// - The full Expo push token is *never* echoed back; the register response
//   carries only metadata (PushToken).

// `NotificationCategory` — server-side bucket used by per-category settings.
// Five categories; `security` is locked.
export type NotificationCategory =
  | 'transactions'
  | 'rewards'
  | 'security'
  | 'promo'
  | 'tier';

// `NotificationType` — concrete server-rendered type. Mobile clients render
// per-type styling (icon / severity) but should fall back gracefully to
// generic styling for unknown values (the enum is extended additively).
export type NotificationType =
  | 'topup_completed'
  | 'topup_failed'
  | 'reward_earned'
  | 'reward_available'
  | 'tier_upgraded'
  | 'tier_downgraded'
  | 'card_issued'
  | 'card_frozen'
  | 'card_unfrozen'
  | 'card_closed'
  | 'card_limits_updated'
  | 'auto_reload_disabled'
  | 'auto_reload_updated'
  | 'dispute_opened'
  | 'dispute_status_changed'
  | 'friend_joined'
  | 'referral_reward_posted'
  | 'security_alert'
  | 'promo';

// `NotificationSeverity` — UI-level colour token (does not affect routing).
export type NotificationSeverity = 'info' | 'success' | 'warning' | 'error';

// Logical icon name the server sends; the mobile client maps onto its
// `lucide-react-native` registry.
export type NotificationIcon =
  | 'wallet'
  | 'gift'
  | 'shield'
  | 'sparkles'
  | 'trophy'
  | 'card'
  | 'bell';

// `Notification` — one row of the customer's in-app feed.
export interface Notification {
  id: string;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  body: string;
  data: Record<string, unknown>;
  icon: NotificationIcon | string | null;
  actionLabel: string | null;
  actionRoute: string | null;
  readAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
}

// Mapping of `NotificationType` → `NotificationCategory`. Used by mobile
// to bucket inbox rows when the API does not echo `category` separately.
export const NOTIFICATION_TYPE_TO_CATEGORY: Record<NotificationType, NotificationCategory> = {
  topup_completed: 'transactions',
  topup_failed: 'transactions',
  card_issued: 'transactions',
  card_frozen: 'transactions',
  card_unfrozen: 'transactions',
  card_closed: 'transactions',
  card_limits_updated: 'transactions',
  auto_reload_disabled: 'transactions',
  auto_reload_updated: 'transactions',
  dispute_opened: 'transactions',
  dispute_status_changed: 'transactions',
  reward_earned: 'rewards',
  reward_available: 'rewards',
  friend_joined: 'rewards',
  referral_reward_posted: 'rewards',
  security_alert: 'security',
  promo: 'promo',
  tier_upgraded: 'tier',
  tier_downgraded: 'tier',
};

// --- List & count ----------------------------------------------------------

export interface NotificationListPagination {
  cursor: string | null;
  nextCursor: string | null;
  hasMore: boolean;
  limit: number;
}

export interface NotificationListMeta {
  requestId?: string;
  timestamp?: string;
  pagination: NotificationListPagination;
}

export interface NotificationListResponse {
  data: Notification[];
  meta: NotificationListMeta;
}

export interface NotificationCountResponse {
  unreadCount: number;
}

export interface MarkAllReadResult {
  markedCount: number;
}

// --- Settings --------------------------------------------------------------

export interface CategoryToggles {
  inApp: boolean;
  push: boolean;
  // Present only on `security` rows.
  locked?: boolean;
}

export interface QuietHours {
  start: string | null; // "HH:MM"
  end: string | null;
  timezone: string | null;
}

export interface NotificationSettings {
  masterPushEnabled: boolean;
  categories: Record<NotificationCategory, CategoryToggles>;
  quietHours: QuietHours;
  updatedAt: string | null;
}

// Partial-update shape for PATCH /notifications/settings. All fields optional.
export interface UpdateNotificationSettingsRequest {
  masterPushEnabled?: boolean;
  categories?: Partial<Record<NotificationCategory, Partial<CategoryToggles>>>;
  quietHours?: QuietHours | null;
}

// --- Push tokens -----------------------------------------------------------

export type PushPlatform = 'ios' | 'android';

export interface RegisterPushTokenRequest {
  deviceId: string;
  token: string;
  platform: PushPlatform;
  appVersion?: string | null;
  osVersion?: string | null;
  deviceName?: string | null;
  locale?: string | null;
  capabilities?: Record<string, unknown> | null;
}

export interface PushTokenRecord {
  id: string;
  deviceId: string;
  platform: PushPlatform;
  appVersion: string | null;
  lastSeenAt: string | null;
  revokedAt: string | null;
}
