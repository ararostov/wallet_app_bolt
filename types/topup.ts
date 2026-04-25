// Top-up domain types — aligned with docs/api/specs/05-topup.ru.md and the
// OpenAPI schema at app/public/openapi/components/schemas/topup.yaml.
//
// Wire shape rules:
// - Money is `{ amountMinor: number; currency: string }`.
// - All IDs are strings (backend serialises bigint as string).
// - Dates are ISO 8601 UTC strings.
// - All optional fields are always present in the payload (null-preserving).
//
// Mobile clients drive a single 3-outcome flow off `TopupClientStatus`:
//   completed         → wallet credited synchronously
//   pending           → poll `/wallet/topup-status/{id}`
//   action_required   → open `redirectUrl` in WebBrowser, then poll
//   failed            → terminal in-band decline
//   cancelled         → terminal abandonment / 24h auto-cancel

import type { MoneyAmount } from './auth';
import type { WalletBalance } from './wallet';

// `TopupClientStatus` (OpenAPI: components/schemas/topup.yaml) — the union
// drives the entire top-up state machine on the client.
export type TopupClientStatus =
  | 'pending'
  | 'action_required'
  | 'completed'
  | 'failed'
  | 'cancelled';

// `TopupFailureCategory` — coarse bucket for the retry UX on `failed`.
export type TopupFailureCategory =
  | 'customer_fixable'
  | 'issuer'
  | 'psp'
  | 'fraud'
  | 'unknown';

// PSP-native action payload (Adyen Drop-in `handleAction`). Opaque to the
// mobile client in the MVP — we only handle `redirectUrl` flows.
export type TopupProviderAction = Record<string, unknown>;

// --- POST /wallet/topup -----------------------------------------------------

// Idempotency-Key is a header, NOT a body field — passed separately to the
// API helper.
export interface InitiateTopupRequest {
  amount: MoneyAmount;
  paymentMethodId: string;
  returnUrl: string;
}

export interface TopupInitiationResponse {
  paymentOrderId: string;
  status: TopupClientStatus;
  amount: MoneyAmount;
  redirectUrl: string | null;
  redirectExpiresAt: string | null;
  providerAction: TopupProviderAction | null;
  failureCode: string | null;
  failureCategory: TopupFailureCategory | null;
  failureMessage: string | null;
  walletBalance: WalletBalance | null;
  pollIntervalMs: number;
  pollTimeoutMs: number;
}

// --- GET /wallet/topup-status/{paymentOrderId} ------------------------------

export interface TopupStatusResponse {
  paymentOrderId: string;
  status: TopupClientStatus;
  amount: MoneyAmount;
  failureCode: string | null;
  failureCategory: TopupFailureCategory | null;
  failureMessage: string | null;
  completedAt: string | null;
  walletBalance: WalletBalance | null;
}
