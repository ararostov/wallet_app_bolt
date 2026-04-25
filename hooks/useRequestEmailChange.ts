// useRequestEmailChange — POST /user/contact/email/request.
// Uses one idempotency key per hook lifetime so retries dedupe server-side.

import { useRef } from 'react';

import { useWallet } from '@/context/WalletContext';
import { profileApi } from '@/utils/api/profile';
import { newIdempotencyKey } from '@/utils/idempotency';
import { useMutation } from './useMutation';
import type {
  ContactChangeResultResponse,
  RequestEmailChangeRequest,
} from '@/types/profile';

export function useRequestEmailChange() {
  const { dispatch } = useWallet();
  const idempotencyKeyRef = useRef<string>(newIdempotencyKey());

  const mutation = useMutation<
    RequestEmailChangeRequest,
    ContactChangeResultResponse
  >((vars) => profileApi.requestEmailChange(vars, idempotencyKeyRef.current), {
    retry: 2,
    onSuccess: (data, vars) => {
      const expiresAt = new Date(
        Date.now() + data.expiresInSeconds * 1000,
      ).toISOString();
      dispatch({
        type: 'CONTACT_CHANGE/BEGIN',
        payload: {
          field: 'email',
          newValue: vars.newEmail,
          maskedTarget: data.verificationTarget,
          expiresAt,
          attemptsRemaining: data.attemptsRemaining,
          requestedAt: new Date().toISOString(),
        },
      });
    },
  });

  const rotateKey = () => {
    idempotencyKeyRef.current = newIdempotencyKey();
  };

  return { ...mutation, rotateKey };
}
