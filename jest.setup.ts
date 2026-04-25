// Global Jest setup — minimal mocks so the test files don't have to repeat
// them. Per technical-debt §6.2 the focus is utils + reducer; we don't try
// to render screens, so most expo-* shims are no-ops.

/* eslint-disable @typescript-eslint/no-require-imports */

// AsyncStorage — minimal in-memory mock. The v3.x package no longer ships
// `jest/async-storage-mock`, so we recreate the relevant surface inline.
jest.mock('@react-native-async-storage/async-storage', () => {
  let store: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async (key: string) => (key in store ? store[key] : null)),
      setItem: jest.fn(async (key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: jest.fn(async (key: string) => {
        delete store[key];
      }),
      clear: jest.fn(async () => {
        store = {};
      }),
      getAllKeys: jest.fn(async () => Object.keys(store)),
      multiGet: jest.fn(async (keys: string[]) =>
        keys.map((k) => [k, k in store ? store[k] : null] as [string, string | null]),
      ),
      multiSet: jest.fn(async (pairs: [string, string][]) => {
        for (const [k, v] of pairs) store[k] = v;
      }),
      multiRemove: jest.fn(async (keys: string[]) => {
        for (const k of keys) delete store[k];
      }),
    },
  };
});

// expo-secure-store — return null for reads, no-op for writes.
jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED: 'whenUnlocked',
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'whenUnlockedThisDeviceOnly',
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

// expo-haptics — no-op all functions.
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(async () => undefined),
  notificationAsync: jest.fn(async () => undefined),
  selectionAsync: jest.fn(async () => undefined),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

// expo-notifications — listener registration is a no-op.
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  getPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  getExpoPushTokenAsync: jest.fn(async () => ({ data: 'ExponentPushToken[mock]' })),
  setNotificationCategoryAsync: jest.fn(async () => undefined),
  AndroidImportance: { DEFAULT: 3, HIGH: 4 },
}));

// expo-localization — pretend we're en-GB.
jest.mock('expo-localization', () => ({
  locale: 'en-GB',
  locales: ['en-GB'],
  timezone: 'Europe/London',
  isRTL: false,
  getCalendars: () => [
    {
      calendar: 'gregorian',
      timeZone: 'Europe/London',
      uses24hourClock: true,
      firstWeekday: 2,
    },
  ],
  getLocales: () => [
    {
      languageTag: 'en-GB',
      languageCode: 'en',
      regionCode: 'GB',
      currencyCode: 'GBP',
      decimalSeparator: '.',
      digitGroupingSeparator: ',',
      textDirection: 'ltr',
      measurementSystem: 'metric',
      temperatureUnit: 'celsius',
    },
  ],
}));

// react-native-reanimated — official mock from the lib.
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

// Silence specific RN test-runtime warnings that don't add signal.
const originalWarn = console.warn;
console.warn = (...args: unknown[]) => {
  const msg = typeof args[0] === 'string' ? args[0] : '';
  if (
    msg.includes('Animated:') ||
    msg.includes('useNativeDriver') ||
    msg.includes('NativeAnimatedHelper')
  ) {
    return;
  }
  originalWarn(...(args as Parameters<typeof console.warn>));
};
