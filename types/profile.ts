// Profile-domain types — aligned with docs/api/specs/01-profile.ru.md and the
// OpenAPI schemas under app/public/openapi/components/schemas/profile.yaml.
//
// All field names are camelCase (envelope is unwrapped by api.ts interceptor;
// backend serialises through BaseApiResource which converts snake → camel).

import type { CustomerStatus } from './auth';

// --- Profile read / update -------------------------------------------------

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string | null;
  phoneE164: string | null;
  dateOfBirth: string | null; // ISO 8601 date (YYYY-MM-DD)
  countryCode: string | null;
  locale: string | null;
  status: CustomerStatus;
  marketingOptIn: boolean;
  hasPassword: boolean;
  hasDateOfBirth: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  marketingOptIn?: boolean;
  countryCode?: string;
  locale?: string;
}

// --- Password --------------------------------------------------------------

export interface ChangePasswordRequest {
  currentPassword?: string;
  newPassword: string;
}

export interface PasswordChangedResponse {
  hasPassword: boolean;
  passwordSetAt: string;
  otherSessionsRevoked: number;
}

// --- Consents --------------------------------------------------------------

// Profile-domain consent (legal-document summary + per-customer acceptance).
export interface ProfileConsent {
  id: number;
  type: string;
  slug: string;
  title: string;
  version: string;
  url: string | null;
  mandatory: boolean;
  accepted: boolean;
  acceptedVersion: string | null;
  acceptedAt: string | null;
}

export interface ConsentsStatusResponse {
  marketingOptIn: boolean;
  documents: ProfileConsent[];
}

export interface UpdateConsentsRequest {
  consents: Record<string, boolean>;
  marketingOptIn?: boolean;
}

// --- Contact details -------------------------------------------------------

export interface ContactDetailsPendingChange {
  maskedTarget: string;
  expiresAt: string;
}

export interface ContactDetailsResponse {
  customer: {
    email: string | null;
    phoneE164: string | null;
    emailVerified: boolean;
    phoneVerified: boolean;
    pendingChanges: {
      email: ContactDetailsPendingChange | null;
      phone: ContactDetailsPendingChange | null;
    };
  };
  support: {
    email: string | null;
    phoneE164: string | null;
    hours: string | null;
    chatUrl: string | null;
  };
}

// --- Contact change (request / verify) -------------------------------------

export interface RequestEmailChangeRequest {
  newEmail: string;
}

export interface RequestPhoneChangeRequest {
  newPhoneE164: string;
}

export interface ContactChangeResultResponse {
  verificationTarget: string;
  expiresInSeconds: number;
  attemptsRemaining: number;
  channel: 'email' | 'phone';
}

export interface ContactChangeVerifyRequest {
  code: string;
}

// --- Account deletion ------------------------------------------------------

export type DeletionReasonCode =
  | 'not_using_anymore'
  | 'privacy_concerns'
  | 'duplicate_account'
  | 'switching_provider'
  | 'other';

export interface RequestDeletionRequest {
  reasonCode?: DeletionReasonCode;
  reasonText?: string;
  confirmPassword?: string;
}

export interface AccountDeletionStatus {
  status: 'pending' | 'cancelled' | 'executed';
  requestedAt: string;
  scheduledFor: string;
  recoveryWindowDays: number;
  supportEmail: string | null;
}

// --- Local UI-only state ---------------------------------------------------

export interface ContactChangeInProgress {
  field: 'email' | 'phone';
  newValue: string;
  maskedTarget: string;
  expiresAt: string;
  attemptsRemaining: number;
  requestedAt: string;
}
