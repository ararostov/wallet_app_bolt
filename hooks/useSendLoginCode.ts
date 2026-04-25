// useSendLoginCode — POST /auth/send-code for the login flow.
// Updates signupDraft with the (enumeration-safe) verification target.

import { useWallet } from '@/context/WalletContext';
import { authApi } from '@/utils/api/auth';
import { useMutation } from './useMutation';
import type { SendCodeRequest, SendCodeResponse } from '@/types/auth';

export function useSendLoginCode() {
  const { dispatch } = useWallet();

  return useMutation<SendCodeRequest, SendCodeResponse>(
    (vars) => authApi.sendCode(vars),
    {
      retry: 2,
      onSuccess: (data, vars) => {
        const expiresAt = new Date(
          Date.now() + data.expiresInSeconds * 1000,
        ).toISOString();
        dispatch({
          type: 'AUTH/UPDATE_DRAFT',
          payload: {
            email: vars.email ?? null,
            phoneE164: vars.phoneE164 ?? null,
            method: vars.email ? 'email' : 'phone',
            pendingCustomerId: data.customerId ?? null,
            verificationTarget: data.verificationTarget,
            otpExpiresAt: expiresAt,
            resendDeadlineMs: Date.now() + 45_000,
          },
        });
      },
    },
  );
}
