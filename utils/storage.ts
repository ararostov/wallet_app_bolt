// Typed AsyncStorage wrapper with JSON serialization.
// For tokens use TokenStorage (SecureStore) instead.

import AsyncStorage from '@react-native-async-storage/async-storage';

export const Storage = {
  async get<T>(key: string): Promise<T | null> {
    const raw = await AsyncStorage.getItem(key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },

  async set<T>(key: string, value: T): Promise<void> {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  },

  async remove(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  },

  async removeMany(keys: string[]): Promise<void> {
    await AsyncStorage.removeMany(keys);
  },
};
