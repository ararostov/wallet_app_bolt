// useRequestPhoneChange — POST /user/contact/phone/request.

import { useRef } from 'react';

import { useWallet } from '@/context/WalletContext';
import { profileApi } from '@/utils/api/profile';
import { newIdempotencyKey } from '@/utils/idempotency';
import { useMutation } from './useMutation';
import type {
  ContactChangeResultResponse,
  RequestPhoneChangeRequest,
} from '@/types/profile';

export function useRequestPhoneChange() {
  const { dispatch } = useWallet();
  const idempotencyKeyRef = useRef<string>(newIdempotencyKey());

  const mutation = useMutation<
    RequestPhoneChangeRequest,
    ContactChangeResultResponse
  >((vars) => profileApi.requestPhoneChange(vars, idempotencyKeyRef.current), {
    retry: 2,
    onSuccess: (data, vars) => {
      const expiresAt = new Date(
        Date.now() + data.expiresInSeconds * 1000,
      ).toISOString();
      dispatch({
        type: 'CONTACT_CHANGE/BEGIN',
        payload: {
          field: 'phone',
          newValue: vars.newPhoneE164,
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
