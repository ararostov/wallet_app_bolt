// Push notification lifecycle helpers (spec 09-notifications §5/§7).
//
// Responsibilities:
// - Foreground notification handler + Android channels (`setupNotificationHandler`).
// - Permission state reads / requests.
// - Token registration on app start (`registerPushToken`) and revocation on
//   logout (`revokePushToken`). Both are best-effort and never throw — call
//   sites can `.catch(() => undefined)` without losing meaningful errors.
// - Helpers for the persisted Idempotency-Key (so retries of a failed
//   register call replay the same key).
// - iOS badge sync (`syncBadgeCount`).

import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Localization from 'expo-localization';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { v4 as uuidv4 } from 'uuid';

import { notificationsApi } from './api/notifications';
import { getDeviceId } from './device';
import { logDebug, logError } from './logger';
import type { PushPlatform } from '@/types/notifications';

export type PushPermissionStatus = 'undetermined' | 'granted' | 'denied';

// SecureStore keys.
const IDEMPOTENCY_KEY = 'push_registration_idempotency_key';

// Cached, so we only call setup-once-style APIs once per session.
let handlerConfigured = false;
let androidChannelsConfigured = false;

// --- Permission helpers ----------------------------------------------------

export async function getPushPermissionStatus(): Promise<PushPermissionStatus> {
  if (!Device.isDevice) return 'denied';
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status === 'granted') return 'granted';
    if (status === 'denied') return 'denied';
    return 'undetermined';
  } catch (error) {
    logError(error, { where: 'getPushPermissionStatus' });
    return 'undetermined';
  }
}

export async function requestPushPermissions(): Promise<PushPermissionStatus> {
  if (!Device.isDevice) return 'denied';
  try {
    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });
    if (status === 'granted') return 'granted';
    if (status === 'denied') return 'denied';
    return 'undetermined';
  } catch (error) {
    logError(error, { where: 'requestPushPermissions' });
    return 'undetermined';
  }
}

// --- Foreground handler & Android channels --------------------------------

// Configure how Expo behaves when a push arrives while the app is open.
// We deliberately set `shouldShowAlert: false` so the in-app Toast handles
// the visible UI and the push doesn't double-render. Badge stays in sync.
//
// On Android we also register the channel set used by the backend templates;
// IDs match the channel matrix in docs/api/integrations/expo-push.ru.md.
export async function setupNotificationHandler(): Promise<void> {
  if (!handlerConfigured) {
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        const severity = (notification.request.content.data as { severity?: string } | null)
          ?.severity;
        const isCritical = severity === 'error' || severity === 'warning';
        return {
          // Foreground in-app toast handles the visible UI; the system
          // banner would otherwise double up.
          shouldShowAlert: false,
          shouldShowBanner: false,
          shouldShowList: true,
          shouldPlaySound: isCritical,
          shouldSetBadge: true,
        };
      },
    });
    handlerConfigured = true;
  }

  if (Platform.OS === 'android' && !androidChannelsConfigured) {
    try {
      await Promise.all([
        Notifications.setNotificationChannelAsync('default', {
          name: 'General',
          importance: Notifications.AndroidImportance.DEFAULT,
        }),
        Notifications.setNotificationChannelAsync('transactions', {
          name: 'Transactions',
          importance: Notifications.AndroidImportance.HIGH,
          sound: 'default',
        }),
        Notifications.setNotificationChannelAsync('security', {
          name: 'Security',
          importance: Notifications.AndroidImportance.HIGH,
          sound: 'default',
          enableVibrate: true,
        }),
        Notifications.setNotificationChannelAsync('rewards', {
          name: 'Rewards',
          importance: Notifications.AndroidImportance.DEFAULT,
        }),
        Notifications.setNotificationChannelAsync('promo', {
          name: 'Promotions',
          importance: Notifications.AndroidImportance.DEFAULT,
        }),
        Notifications.setNotificationChannelAsync('tier', {
          name: 'Tier updates',
          importance: Notifications.AndroidImportance.DEFAULT,
        }),
      ]);
      androidChannelsConfigured = true;
    } catch (error) {
      logError(error, { where: 'setupNotificationHandler.androidChannels' });
    }
  }
}

// --- Idempotency-Key persistence ------------------------------------------

async function getOrCreateRegKey(): Promise<string> {
  try {
    const existing = await SecureStore.getItemAsync(IDEMPOTENCY_KEY);
    if (existing) return existing;
    const fresh = uuidv4();
    await SecureStore.setItemAsync(IDEMPOTENCY_KEY, fresh, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED,
    });
    return fresh;
  } catch (error) {
    logError(error, { where: 'getOrCreateRegKey' });
    return uuidv4();
  }
}

async function clearRegKey(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(IDEMPOTENCY_KEY);
  } catch {
    // Best-effort; nothing else to do.
  }
}

// --- Register / revoke -----------------------------------------------------

export async function registerPushToken(): Promise<void> {
  if (!Device.isDevice) {
    logDebug('Push tokens disabled on simulator');
    return;
  }

  const perm = await getPushPermissionStatus();
  if (perm !== 'granted') {
    logDebug('Push permission not granted; skip register', { perm });
    return;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants as unknown as { easConfig?: { projectId?: string } }).easConfig?.projectId;
  if (!projectId) {
    logError(new Error('Missing expoConfig.extra.eas.projectId'), {
      where: 'registerPushToken',
    });
    return;
  }

  try {
    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenResponse.data;
    const deviceId = await getDeviceId();
    const idempotencyKey = await getOrCreateRegKey();
    const platform: PushPlatform = Platform.OS === 'ios' ? 'ios' : 'android';

    await notificationsApi.registerPushToken(
      {
        deviceId,
        token,
        platform,
        appVersion: Constants.expoConfig?.version ?? null,
        osVersion: String(Platform.Version),
        deviceName: Device.deviceName ?? null,
        locale: Localization.getLocales()[0]?.languageTag ?? null,
        capabilities: { supportsRichNotifications: Platform.OS === 'ios' },
      },
      idempotencyKey,
    );

    logDebug('Push token registered', { deviceId });
  } catch (error) {
    logError(error, { where: 'registerPushToken' });
  }
}

export async function revokePushToken(): Promise<void> {
  try {
    const deviceId = await getDeviceId();
    if (deviceId) {
      await notificationsApi.revokePushToken(deviceId);
    }
  } catch (error) {
    logError(error, { where: 'revokePushToken' });
  } finally {
    await clearRegKey();
  }
}

// --- Badge sync (iOS) ------------------------------------------------------

export async function syncBadgeCount(unreadCount: number): Promise<void> {
  if (Platform.OS !== 'ios') return;
  try {
    await Notifications.setBadgeCountAsync(Math.max(0, unreadCount));
  } catch (error) {
    logError(error, { where: 'syncBadgeCount' });
  }
}

// --- Listener helpers ------------------------------------------------------
//
// Thin pass-throughs so call sites import everything they need from the
// project's `utils/push` module, not directly from expo-notifications.
// Both return Subscription objects that callers must `.remove()` on cleanup.

export function addNotificationReceivedListener(
  handler: (n: Notifications.Notification) => void,
): Notifications.EventSubscription {
  return Notifications.addNotificationReceivedListener(handler);
}

export function addNotificationResponseReceivedListener(
  handler: (r: Notifications.NotificationResponse) => void,
): Notifications.EventSubscription {
  return Notifications.addNotificationResponseReceivedListener(handler);
}

export function getLastNotificationResponseAsync(): Promise<Notifications.NotificationResponse | null> {
  return Notifications.getLastNotificationResponseAsync();
}
