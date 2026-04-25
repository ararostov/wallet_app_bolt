// useLogout — best-effort revoke + local sign-out + redirect.

import { useCallback, useState } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useWallet } from '@/context/WalletContext';
import { authApi } from '@/utils/api/auth';
import { TokenStorage } from '@/utils/tokens';
import { SignupDraftStorage } from '@/utils/signupDraftStorage';
import { revokePushToken } from '@/utils/push';
import { logEvent } from '@/utils/logger';

const STORAGE_KEY = 'wallet_state_v1';

export function useLogout() {
  const router = useRouter();
  const { dispatch } = useWallet();
  const [loading, setLoading] = useState(false);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await authApi.logout(); // already swallows errors
      await TokenStorage.clear();
      await SignupDraftStorage.clear();
      await AsyncStorage.removeItem(STORAGE_KEY);
      revokePushToken().catch(() => undefined);
      dispatch({ type: 'AUTH/LOGOUT' });
      logEvent('logout');
      router.replace('/(onboarding)/intro');
    } finally {
      setLoading(false);
    }
  }, [dispatch, router]);

  return { logout, loading };
}
