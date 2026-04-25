// useRequestDeletion — wraps POST /user/delete-account.
// Generates one idempotency key per hook instance; rotate via `rotateKey`
// after a final-error retry decision.

import { useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useWallet } from '@/context/WalletContext';
import { profileApi } from '@/utils/api/profile';
import { TokenStorage } from '@/utils/tokens';
import { revokePushToken } from '@/utils/push';
import { haptics } from '@/utils/haptics';
import { newIdempotencyKey } from '@/utils/idempotency';
import { logEvent } from '@/utils/logger';
import { useMutation } from './useMutation';
import type {
  AccountDeletionStatus,
  RequestDeletionRequest,
} from '@/types/profile';

const STORAGE_KEY = 'wallet_state_v1';

export function useRequestDeletion() {
  const { dispatch } = useWallet();
  const idempotencyKeyRef = useRef<string>(newIdempotencyKey());

  const mutation = useMutation<RequestDeletionRequest, AccountDeletionStatus>(
    (vars) => profileApi.requestDeletion(vars, idempotencyKeyRef.current),
    {
      retry: 1,
      onSuccess: async (data, vars) => {
        dispatch({ type: 'ACCOUNT/DELETION_SCHEDULED', payload: data });
        logEvent('account_deletion_requested', {
          reasonCode: vars.reasonCode ?? null,
        });
        // Destructive operation — warning haptic per spec 4.5 §B.1.
        haptics.warning();
        // Backend already revoked all tokens — mirror that locally so the
        // app can't accidentally reuse them.
        revokePushToken().catch(() => undefined);
        await TokenStorage.clear();
        // Drop persisted wallet snapshot but keep accountDeletion (the
        // reducer preserves it across AUTH/LOGOUT).
        await AsyncStorage.removeItem(STORAGE_KEY).catch(() => undefined);
        dispatch({ type: 'AUTH/LOGOUT' });
      },
    },
  );

  const rotateKey = () => {
    idempotencyKeyRef.current = newIdempotencyKey();
  };

  return { ...mutation, rotateKey };
}
