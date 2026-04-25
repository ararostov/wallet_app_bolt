// Profile endpoint helpers.
// Contracts mirror docs/api/specs/01-profile.ru.md and OpenAPI paths/profile.yaml.
// All helpers return the unwrapped data envelope (handled by api.ts interceptor).

import { api } from '../api';
import type {
  AccountDeletionStatus,
  ChangePasswordRequest,
  ConsentsStatusResponse,
  ContactChangeResultResponse,
  ContactChangeVerifyRequest,
  ContactDetailsResponse,
  PasswordChangedResponse,
  RequestDeletionRequest,
  RequestEmailChangeRequest,
  RequestPhoneChangeRequest,
  UpdateConsentsRequest,
  UpdateProfileRequest,
  UserProfile,
} from '@/types/profile';

export const profileApi = {
  getProfile(): Promise<UserProfile> {
    return api.get<UserProfile>('/user/profile').then((r) => r.data);
  },

  updateProfile(data: UpdateProfileRequest): Promise<UserProfile> {
    return api.patch<UserProfile>('/user/profile', data).then((r) => r.data);
  },

  changePassword(
    data: ChangePasswordRequest,
  ): Promise<PasswordChangedResponse> {
    return api
      .patch<PasswordChangedResponse>('/user/password', data)
      .then((r) => r.data);
  },

  getConsents(): Promise<ConsentsStatusResponse> {
    return api.get<ConsentsStatusResponse>('/user/consents').then((r) => r.data);
  },

  updateConsents(data: UpdateConsentsRequest): Promise<ConsentsStatusResponse> {
    return api
      .patch<ConsentsStatusResponse>('/user/consents', data)
      .then((r) => r.data);
  },

  getContactDetails(): Promise<ContactDetailsResponse> {
    return api
      .get<ContactDetailsResponse>('/user/contact-details')
      .then((r) => r.data);
  },

  requestEmailChange(
    data: RequestEmailChangeRequest,
    idempotencyKey: string,
  ): Promise<ContactChangeResultResponse> {
    return api
      .post<ContactChangeResultResponse>('/user/contact/email/request', data, {
        headers: { 'Idempotency-Key': idempotencyKey },
      })
      .then((r) => r.data);
  },

  verifyEmailChange(data: ContactChangeVerifyRequest): Promise<UserProfile> {
    return api
      .post<UserProfile>('/user/contact/email/verify', data)
      .then((r) => r.data);
  },

  requestPhoneChange(
    data: RequestPhoneChangeRequest,
    idempotencyKey: string,
  ): Promise<ContactChangeResultResponse> {
    return api
      .post<ContactChangeResultResponse>('/user/contact/phone/request', data, {
        headers: { 'Idempotency-Key': idempotencyKey },
      })
      .then((r) => r.data);
  },

  verifyPhoneChange(data: ContactChangeVerifyRequest): Promise<UserProfile> {
    return api
      .post<UserProfile>('/user/contact/phone/verify', data)
      .then((r) => r.data);
  },

  // Spec §3.1.7: backend returns 202 with the schedule. The mobile client
  // does not need a request body in the simple case (reasonCode optional).
  requestDeletion(
    data: RequestDeletionRequest,
    idempotencyKey: string,
  ): Promise<AccountDeletionStatus> {
    return api
      .post<AccountDeletionStatus>('/user/delete-account', data, {
        headers: { 'Idempotency-Key': idempotencyKey },
      })
      .then((r) => r.data);
  },
};
