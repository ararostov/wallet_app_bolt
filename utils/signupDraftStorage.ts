// SecureStore-backed persistence for the in-progress signup draft.
//
// Why SecureStore (not AsyncStorage): the draft carries pending PII before
// /auth/register has been issued — first/last name, DOB, contact, referral
// code, idempotency key. SecureStore encrypts at rest and is OS-keystore-
// scoped to the bundle id, matching the threat model of the auth tokens
// stored in `tokens.ts`. AsyncStorage would leave PII at rest in plaintext.
//
// TTL is owned by the consumer (WalletContext): the draft is valid until
// `otpExpiresAt` passes, after which the consumer calls `clear()`. This
// module is intentionally storage-dumb — no clocks, no validation.

import * as SecureStore from 'expo-secure-store';

import { logError } from './logger';
import type { SignupDraft } from '@/context/WalletContext';

// Versioned key — mirrors the `wallet_state_v1` AsyncStorage convention so
// future schema changes can ship a migration (or a one-shot wipe) without
// colliding with stale data on devices that already updated the app.
const STORAGE_KEY = 'signup_draft_v1';

const writeOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED,
};

export const SignupDraftStorage = {
  async get(): Promise<SignupDraft | null> {
    let raw: string | null;
    try {
      raw = await SecureStore.getItemAsync(STORAGE_KEY);
    } catch (err) {
      logError(err, { where: 'SignupDraftStorage.get/read' });
      return null;
    }
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as SignupDraft;
    } catch (err) {
      logError(err, { where: 'SignupDraftStorage.get/parse' });
      // Corrupt payload — wipe so subsequent reads don't keep failing.
      try {
        await SecureStore.deleteItemAsync(STORAGE_KEY);
      } catch {
        // best-effort
      }
      return null;
    }
  },

  async set(draft: SignupDraft): Promise<void> {
    try {
      await SecureStore.setItemAsync(
        STORAGE_KEY,
        JSON.stringify(draft),
        writeOptions,
      );
    } catch (err) {
      logError(err, { where: 'SignupDraftStorage.set' });
    }
  },

  async clear(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(STORAGE_KEY);
    } catch (err) {
      logError(err, { where: 'SignupDraftStorage.clear' });
    }
  },
};
