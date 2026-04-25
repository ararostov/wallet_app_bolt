// Auth domain types — aligned with docs/api/specs/00-auth.ru.md.
// All field names are camelCase (envelope is unwrapped by api.ts interceptor;
// backend serialises through BaseApiResource which converts snake → camel).

export type AuthChannel = 'phone' | 'email';

export type Platform = 'ios' | 'android';

export type CustomerStatus =
  | 'active'
  | 'pending'
  | 'suspended'
  | 'blocked'
  | 'closed';

export interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string | null;
  phoneE164: string | null;
  status: CustomerStatus;
  marketingOptIn: boolean;
  hasPassword: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: string;
}

export interface MoneyAmount {
  amountMinor: number;
  currency: string;
}

export type WalletStatus = 'pending' | 'active' | 'frozen' | 'closed';

export interface WalletSummary {
  id: string;
  status: WalletStatus;
  balance: MoneyAmount;
  pendingBalance: MoneyAmount;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  expiresAt: string;
}

// --- Register --------------------------------------------------------------

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email?: string;
  phoneE164?: string;
  dateOfBirth?: string; // YYYY-MM-DD
  marketingOptIn: boolean;
  consentedDocumentIds: number[];
  referralCode?: string;
}

export interface RegistrationPendingResponse {
  customerId: string;
  verificationTarget: string; // masked, e.g. "al***@example.com"
  expiresInSeconds: number;
  attemptsRemaining: number;
}

// --- Verify registration ---------------------------------------------------

export interface VerifyRegistrationRequest {
  customerId: string;
  code: string;
  deviceId: string;
  platform: Platform;
  appVersion: string;
}

export interface AuthSessionResponse {
  customer: AuthUser;
  wallet: WalletSummary;
  tokens: AuthTokens;
}

// --- Send code (login) -----------------------------------------------------

export interface SendCodeRequest {
  email?: string;
  phoneE164?: string;
}

export interface SendCodeResponse {
  customerId?: string;
  verificationTarget: string;
  expiresInSeconds: number;
  attemptsRemaining: number;
}

// --- Verify login ----------------------------------------------------------

export interface VerifyLoginRequest {
  email?: string;
  phoneE164?: string;
  code: string;
  deviceId: string;
  platform: Platform;
  appVersion: string;
}

// --- Refresh ---------------------------------------------------------------

export interface RefreshTokenRequest {
  refreshToken: string;
  deviceId?: string;
  platform?: Platform;
  appVersion?: string;
}

export interface RefreshTokenResponse {
  tokens: AuthTokens;
}

// --- /me -------------------------------------------------------------------

export interface MeResponse {
  customer: AuthUser;
  wallet: WalletSummary;
}
