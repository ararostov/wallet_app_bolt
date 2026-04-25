// Device metadata helpers used by auth verify endpoints.
// Persists a stable random deviceId in SecureStore so verify-* requests can
// associate tokens to a logical device.

import Constants from 'expo-constants';
import { Platform as RNPlatform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { v4 as uuidv4 } from 'uuid';

import type { Platform } from '@/types/auth';

const DEVICE_ID_KEY = 'device_id';

let cachedDeviceId: string | null = null;

export async function getDeviceId(): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId;
  const stored = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (stored) {
    cachedDeviceId = stored;
    return stored;
  }
  const fresh = uuidv4();
  await SecureStore.setItemAsync(DEVICE_ID_KEY, fresh, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED,
  });
  cachedDeviceId = fresh;
  return fresh;
}

export function getPlatform(): Platform {
  return RNPlatform.OS === 'ios' ? 'ios' : 'android';
}

export function getAppVersion(): string {
  const version = Constants.expoConfig?.version ?? '1.0.0';
  return version;
}

export type DeviceInfo = {
  deviceId: string;
  platform: Platform;
  appVersion: string;
};

export async function getDeviceInfo(): Promise<DeviceInfo> {
  const deviceId = await getDeviceId();
  return {
    deviceId,
    platform: getPlatform(),
    appVersion: getAppVersion(),
  };
}
