// App entry. Performs first-launch hydration: if we have an access token,
// fetch /me to confirm the session and refresh the user payload, then
// route to the tabs. Otherwise → onboarding intro.

import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { authUserToUser, useWallet } from '@/context/WalletContext';
import { TokenStorage } from '@/utils/tokens';
import { meApi } from '@/utils/api/me';
import { ApiError } from '@/utils/errors';
import { logError } from '@/utils/logger';
import type { AuthChannel } from '@/types/auth';

export default function Index() {
  const router = useRouter();
  const { state, dispatch } = useWallet();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!state.initialized || hydrated) return;

    (async () => {
      try {
        const tokens = await TokenStorage.get();
        if (!tokens.access && !tokens.refresh) {
          // No session at all — straight to onboarding.
          return;
        }
        try {
          const me = await meApi.get();
          // Best-guess at the channel based on which identifier we have.
          const channel: AuthChannel = me.customer.email ? 'email' : 'phone';
          const user = authUserToUser(me.customer, channel);
          dispatch({
            type: 'AUTH/LOGIN_SUCCESS',
            payload: { user, walletSummary: me.wallet, onboardingComplete: true },
          });
        } catch (err) {
          if (err instanceof ApiError && err.isUnauthorized()) {
            await TokenStorage.clear();
            dispatch({ type: 'AUTH/LOGOUT' });
          } else {
            // Network / 5xx — keep persisted state. The user will be sent
            // to tabs if onboardingComplete is true; pull-to-refresh will retry.
            logError(err, { where: 'index/me' });
          }
        }
      } finally {
        setHydrated(true);
      }
    })();
  }, [state.initialized, hydrated, dispatch]);

  useEffect(() => {
    if (!state.initialized || !hydrated) return;
    if (state.onboardingComplete && state.user) {
      router.replace('/(tabs)');
    } else {
      router.replace('/(onboarding)/intro');
    }
  }, [state.initialized, hydrated, state.onboardingComplete, state.user, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#1a56db" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' },
});
