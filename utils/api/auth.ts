// Auth endpoint helpers.
// Contracts mirror docs/api/specs/00-auth.ru.md.
// All helpers return the unwrapped data envelope (handled by api.ts interceptor).

import { api } from '../api';
import type {
  AuthSessionResponse,
  MeResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  RegisterRequest,
  RegistrationPendingResponse,
  SendCodeRequest,
  SendCodeResponse,
  VerifyLoginRequest,
  VerifyRegistrationRequest,
} from '@/types/auth';

export const authApi = {
  register(
    data: RegisterRequest,
    idempotencyKey: string,
  ): Promise<RegistrationPendingResponse> {
    return api
      .post<RegistrationPendingResponse>('/auth/register', data, {
        headers: { 'Idempotency-Key': idempotencyKey },
      })
      .then((r) => r.data);
  },

  verifyRegistration(
    data: VerifyRegistrationRequest,
  ): Promise<AuthSessionResponse> {
    return api
      .post<AuthSessionResponse>('/auth/verify-registration', data)
      .then((r) => r.data);
  },

  sendCode(data: SendCodeRequest): Promise<SendCodeResponse> {
    return api
      .post<SendCodeResponse>('/auth/send-code', data)
      .then((r) => r.data);
  },

  verifyLogin(data: VerifyLoginRequest): Promise<AuthSessionResponse> {
    return api
      .post<AuthSessionResponse>('/auth/verify-login', data)
      .then((r) => r.data);
  },

  // Refresh is also called directly from utils/authQueue.ts via plain fetch
  // to avoid a circular import. This helper is kept for imperative call sites.
  refresh(data: RefreshTokenRequest): Promise<RefreshTokenResponse> {
    return api
      .post<RefreshTokenResponse>('/auth/refresh-token', data)
      .then((r) => r.data);
  },

  // Best-effort: ignore network/HTTP errors per spec §4.9.
  async logout(): Promise<void> {
    try {
      await api.post<void>('/auth/logout');
    } catch {
      // swallow — logout must not block local sign-out.
    }
  },

  logoutAll(): Promise<void> {
    return api.post<void>('/auth/logout-all').then(() => undefined);
  },
};
