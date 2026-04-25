// Minimal placeholder types for auth flow.
// TODO: flesh out per spec docs/mobile/specs/00-auth.ru.md (next session).
// These exist to satisfy `utils/api/auth.ts` compile.

export type SendOtpPurpose = 'registration' | 'login' | 'password_reset' | 'contact_change';

// TODO 00-auth: align with backend POST /auth/send-otp request body.
export type SendOtpRequest = {
  identifier: string; // email or E.164 phone
  purpose: SendOtpPurpose;
};

// TODO 00-auth: align with envelope unwrap (already-stripped by interceptor).
export type SendOtpResponse = {
  verificationId: string;
  expiresAt: string; // ISO 8601 UTC
  resendAvailableAt: string; // ISO 8601 UTC
};

// TODO 00-auth: VerifyOtp covers both registration and login flows.
export type VerifyOtpRequest = {
  verificationId: string;
  code: string;
};

export type VerifyOtpResponse = {
  // For registration: returns a registration session id to feed into /auth/register.
  registrationSessionId?: string;
  // For login: returns tokens immediately.
  tokens?: TokensResponse;
  user?: AuthUser;
};

// TODO 00-auth: actual fields per spec.
export type RegisterRequest = {
  registrationSessionId: string;
  firstName: string;
  lastName: string;
  dob: string; // ISO date
  acceptedConsentIds: string[];
};

export type RegisterResponse = {
  user: AuthUser;
  tokens: TokensResponse;
};

export type TokensResponse = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string; // ISO 8601 UTC
  refreshTokenExpiresAt: string; // ISO 8601 UTC
};

// TODO 00-auth: replace with shared User type from types/index.ts after auth shape is finalised.
export type AuthUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phoneE164: string | null;
};
