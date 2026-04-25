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
    },
  },
  android: {
    package: 'retail_wallet.app',
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
  },
  web: {
    bundler: 'metro',
    output: 'single',
    favicon: './assets/images/favicon.png',
  },
  plugins: ['expo-router', 'expo-font', 'expo-web-browser', 'expo-secure-store'],
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
