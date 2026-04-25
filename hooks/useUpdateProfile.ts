// useUpdateProfile — wraps PATCH /user/profile, merges the result into
// WalletContext.user so other screens reflect the change immediately.

import { useWallet } from '@/context/WalletContext';
import { profileApi } from '@/utils/api/profile';
import { useMutation } from './useMutation';
import type { UpdateProfileRequest, UserProfile } from '@/types/profile';

export function useUpdateProfile() {
  const { dispatch } = useWallet();

  return useMutation<UpdateProfileRequest, UserProfile>(
    (vars) => profileApi.updateProfile(vars),
    {
      retry: 2,
      invalidateKeys: ['profile/me'],
      onSuccess: (data) => {
        dispatch({
          type: 'UPDATE_USER',
          payload: {
            id: data.id,
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email ?? '',
            phone: data.phoneE164 ?? undefined,
            phoneE164: data.phoneE164 ?? undefined,
            dob: data.dateOfBirth ?? '',
            emailVerified: data.emailVerified,
            phoneVerified: data.phoneVerified,
            hasPassword: data.hasPassword,
            hasDateOfBirth: data.hasDateOfBirth,
            marketingOptIn: data.marketingOptIn,
          },
        });
      },
    },
  );
}
