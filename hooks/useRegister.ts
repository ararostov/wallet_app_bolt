// useRegister — wraps POST /auth/register with idempotency key.
//
// The key is generated once per hook instance (per Consents-screen mount) so a
// retry of the same logical attempt is deduplicated server-side. After
// success the resulting customerId / target / expiry / key get committed to
// signupDraft for the OTP screen to consume.

import { useRef } from 'react';

import { useWallet } from '@/context/WalletContext';
import { authApi } from '@/utils/api/auth';
import { newIdempotencyKey } from '@/utils/idempotency';
import { useMutation } from './useMutation';
import type { RegisterRequest, RegistrationPendingResponse } from '@/types/auth';

export function useRegister() {
  const { dispatch } = useWallet();
  const idempotencyKeyRef = useRef<string>(newIdempotencyKey());

  const mutation = useMutation<RegisterRequest, RegistrationPendingResponse>(
    (vars) => authApi.register(vars, idempotencyKeyRef.current),
    {
      retry: 3,
      onSuccess: (data) => {
        const expiresAt = new Date(
          Date.now() + data.expiresInSeconds * 1000,
        ).toISOString();
        dispatch({
          type: 'AUTH/UPDATE_DRAFT',
          payload: {
            pendingCustomerId: data.customerId,
            verificationTarget: data.verificationTarget,
            otpExpiresAt: expiresAt,
            resendDeadlineMs: Date.now() + 45_000,
            registerIdempotencyKey: idempotencyKeyRef.current,
          },
        });
      },
    },
  );

  // Resend produces a new logical request → rotate the key.
  const rotateKey = () => {
    idempotencyKeyRef.current = newIdempotencyKey();
  };

  return { ...mutation, rotateKey };
}
