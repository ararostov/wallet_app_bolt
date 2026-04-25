// Expo dynamic config. Reads runtime values from EXPO_PUBLIC_* env vars
// while preserving every static field that previously lived in app.json.
//
// Expo loads app.config.ts in addition to app.json — values returned here
// override those from app.json.

import type { ExpoConfig } from 'expo/config';

const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'https://api-dev.retail-wallet.com';
const apiVersion = process.env.EXPO_PUBLIC_API_VERSION ?? 'v1';
const env = process.env.EXPO_PUBLIC_ENV ?? 'development';
const merchantCode = process.env.EXPO_PUBLIC_MERCHANT_CODE ?? 'tesco';

const config: ExpoConfig = {
  name: 'retail_wallet',
  slug: 'wallet-app',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'walletapp',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.ararostov.wallet',
    buildNumber: '1',
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      // Required by expo-image-picker for the dispute attachment picker.
      NSPhotoLibraryUsageDescription:
        'We use the photo library so you can attach a screenshot when opening a dispute.',
      NSCameraUsageDescription:
        'We use the camera so you can take a photo when opening a dispute.',
      // Allow silent / data-only push so the backend can future-proof
      // background refreshes without a config change. spec 09 §7.6.
      UIBackgroundModes: ['remote-notification'],
    },
  },
  android: {
    package: 'retail_wallet.app',
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    // Read-media permission used by expo-image-picker on Android 13+.
    permissions: ['android.permission.READ_MEDIA_IMAGES'],
  },
  web: {
    bundler: 'metro',
    output: 'single',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-font',
    'expo-web-browser',
    'expo-secure-store',
    'expo-localization',
    [
      'expo-image-picker',
      {
        photosPermission:
          'We use the photo library so you can attach a screenshot when opening a dispute.',
        cameraPermission:
          'We use the camera so you can take a photo when opening a dispute.',
      },
    ],
    [
      'expo-notifications',
      {
        // Accent colour for the notification tray on Android.
        // Custom icon will be added when we have a dedicated asset; until
        // then expo-notifications falls back to the app icon.
        color: '#1a56db',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    router: {},
    eas: {
      projectId: '05ac1e98-3390-48b6-8ea6-9704a1786307',
    },
    apiUrl,
    apiVersion,
    env,
    merchantCode,
  },
  owner: 'ararostov',
};

export default config;
