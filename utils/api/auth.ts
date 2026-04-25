// Auth endpoint helpers.
// Stub signatures only — request/response types are placeholders to be
// fully fleshed out per docs/mobile/specs/00-auth.ru.md in the next session.

import type { AxiosResponse } from 'axios';

import { api } from '../api';
import type {
  RegisterRequest,
  RegisterResponse,
  SendOtpRequest,
  SendOtpResponse,
  TokensResponse,
  VerifyOtpRequest,
  VerifyOtpResponse,
} from '@/types/auth';

export const authApi = {
  // TODO 00-auth: confirm endpoint path and payload shape.
  sendOtp(data: SendOtpRequest): Promise<AxiosResponse<SendOtpResponse>> {
    return api.post<SendOtpResponse>('/auth/send-otp', data);
  },

  // TODO 00-auth: verify-registration vs verify-login split.
  verifyOtp(data: VerifyOtpRequest): Promise<AxiosResponse<VerifyOtpResponse>> {
    return api.post<VerifyOtpResponse>('/auth/verify-otp', data);
  },

  register(
    data: RegisterRequest,
    idempotencyKey: string,
  ): Promise<AxiosResponse<RegisterResponse>> {
    return api.post<RegisterResponse>('/auth/register', data, {
      headers: { 'Idempotency-Key': idempotencyKey },
    });
  },

  // refreshToken endpoint is also called directly from utils/authQueue.ts
  // via fetch to break the import cycle. This helper is provided for any
  // call site that wants to refresh imperatively.
  refreshToken(refreshToken: string): Promise<AxiosResponse<TokensResponse>> {
    return api.post<TokensResponse>('/auth/refresh-token', { refreshToken });
  },

  logout(): Promise<AxiosResponse<void>> {
    return api.post<void>('/auth/logout');
  },
};
