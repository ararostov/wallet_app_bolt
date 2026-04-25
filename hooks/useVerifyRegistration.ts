// useVerifyRegistration — submits OTP after register, persists tokens,
// updates WalletContext, fires push registration.

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
  VerifyRegistrationRequest,
} from '@/types/auth';

export function useVerifyRegistration() {
  const { state, dispatch } = useWallet();
  const router = useRouter();

  return useMutation<VerifyRegistrationRequest, AuthSessionResponse>(
    (vars) => authApi.verifyRegistration(vars),
    {
      retry: 1,
      onSuccess: async (data) => {
        await TokenStorage.set({
          access: data.tokens.accessToken,
          refresh: data.tokens.refreshToken,
        });
        const channel: AuthChannel = state.signupDraft.method ?? 'email';
        const user = authUserToUser(data.customer, channel);
        // Preserve DOB the customer provided in signup, since /verify-registration
        // does not echo it back in the customer payload.
        if (state.signupDraft.dateOfBirth) {
          user.dob = state.signupDraft.dateOfBirth;
        }
        if (state.signupDraft.referralCode) {
          user.referralCode = state.signupDraft.referralCode;
        }
        dispatch({
          type: 'AUTH/LOGIN_SUCCESS',
          payload: { user, walletSummary: data.wallet, onboardingComplete: true },
        });
        logEvent('signup_completed', { method: channel });
        // Fire-and-forget — implementation lives in spec 09.
        registerPushToken().catch(() => undefined);

        const hasReferral = Boolean(state.signupDraft.referralCode);
        if (hasReferral) {
          router.replace('/(onboarding)/invite-welcome');
        } else {
          router.replace('/(tabs)');
        }
      },
    },
  );
}
