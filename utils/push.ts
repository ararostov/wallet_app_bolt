// Push token registration stub.
//
// Real implementation (expo-notifications) lives in spec 09-notifications.
// For now, just log so the call site exists and is wired into the auth flow.

import { logDebug } from './logger';

export async function registerPushToken(): Promise<void> {
  logDebug('registerPushToken called (stub — real impl in spec 09)');
}

export async function revokePushToken(): Promise<void> {
  logDebug('revokePushToken called (stub — real impl in spec 09)');
}
