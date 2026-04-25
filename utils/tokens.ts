// SecureStore-backed access/refresh token storage.
// Never write tokens to AsyncStorage. Never log token values.

import * as SecureStore from 'expo-secure-store';

const ACCESS_KEY = 'access_token';
const REFRESH_KEY = 'refresh_token';

export type Tokens = {
  access: string | null;
  refresh: string | null;
};

export type TokenPair = {
  access: string;
  refresh: string;
};

const writeOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED,
};

export const TokenStorage = {
  async set(tokens: TokenPair): Promise<void> {
    await Promise.all([
      SecureStore.setItemAsync(ACCESS_KEY, tokens.access, writeOptions),
      SecureStore.setItemAsync(REFRESH_KEY, tokens.refresh, writeOptions),
    ]);
  },

  async get(): Promise<Tokens> {
    const [access, refresh] = await Promise.all([
      SecureStore.getItemAsync(ACCESS_KEY),
      SecureStore.getItemAsync(REFRESH_KEY),
    ]);
    return { access, refresh };
  },

  async clear(): Promise<void> {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_KEY),
      SecureStore.deleteItemAsync(REFRESH_KEY),
    ]);
  },
};
