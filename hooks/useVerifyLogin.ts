// useVerifyLogin — POST /auth/verify-login + token storage + redirect.

import { useRouter } from 'expo-router';

import { authUserToUser, useWallet } from '@/context/WalletContext';
import { authApi } from '@/utils/api/auth';
import { TokenStorage } from '@/utils/tokens';
import { logEvent } from '@/utils/logger';
import { registerPushToken } from '@/utils/push';
import { useMutation } from './useMutation';
import type {
  AuthChannel,
  AuthSessionResponse,
  VerifyLoginRequest,
} from '@/types/auth';

export function useVerifyLogin() {
  const { state, dispatch } = useWallet();
  const router = useRouter();

  return useMutation<VerifyLoginRequest, AuthSessionResponse>(
    (vars) => authApi.verifyLogin(vars),
    {
      retry: 1,
      onSuccess: async (data) => {
        await TokenStorage.set({
          access: data.tokens.accessToken,
          refresh: data.tokens.refreshToken,
        });
        const channel: AuthChannel = state.signupDraft.method ?? 'email';
        const user = authUserToUser(data.customer, channel);
        dispatch({
          type: 'AUTH/LOGIN_SUCCESS',
          payload: { user, walletSummary: data.wallet, onboardingComplete: true },
        });
        logEvent('login_success', { method: channel });
        registerPushToken().catch(() => undefined);
        router.replace('/(tabs)');
      },
    },
  );
}
