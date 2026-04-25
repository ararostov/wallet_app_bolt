// useChangePassword — wraps PATCH /user/password.
// On success: marks user.hasPassword=true and surfaces otherSessionsRevoked
// to the caller via the mutation result.

import { useWallet } from '@/context/WalletContext';
import { profileApi } from '@/utils/api/profile';
import { useMutation } from './useMutation';
import type {
  ChangePasswordRequest,
  PasswordChangedResponse,
} from '@/types/profile';

export function useChangePassword() {
  const { dispatch } = useWallet();

  return useMutation<ChangePasswordRequest, PasswordChangedResponse>(
    (vars) => profileApi.changePassword(vars),
    {
      // Password change is non-money but should not retry on 4xx.
      retry: 1,
      onSuccess: (data) => {
        dispatch({ type: 'UPDATE_USER', payload: { hasPassword: data.hasPassword } });
      },
    },
  );
}
