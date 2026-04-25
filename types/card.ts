// Card domain types — aligned with docs/api/specs/03-cards.ru.md and the
// OpenAPI schema at app/public/openapi/components/schemas/card.yaml.
//
// Money is minor units + ISO currency. IDs are strings. Dates are ISO 8601
// UTC strings. The shape matches `Card` (full projection) returned by every
// /card mutation that carries a body — GET/issue/freeze/unfreeze/limits.

import type { MoneyAmount } from './auth';

// Backend lifecycle is `requested | issued | active | frozen | closed`.
// The mobile UI also models a synthetic `not_issued` for the empty state
// when the backend returns `card: null` so render code can branch on a
// single discriminator rather than null + status.
export type CardLifecycleStatus =
  | 'requested'
  | 'issued'
  | 'active'
  | 'frozen'
  | 'closed';

// Legacy flat status retained for compatibility with `WalletSummary.card`.
// Mobile prefers `lifecycleStatus`.
export type CardStatus =
  | 'pending'
  | 'active'
  | 'frozen'
  | 'closed'
  | 'replaced';

export type CardBrand = 'visa' | 'mastercard' | 'unknown';

export type CardTokenizationStatus =
  | 'not_started'
  | 'in_progress'
  | 'provisioned'
  | 'failed';

export type CardIssuanceFailureReason =
  | 'provider_timeout'
  | 'provider_rejected'
  | 'kyc_rejected'
  | 'product_unavailable'
  | 'sponsor_account_missing'
  | 'network_error'
  | 'unknown';

export type CardFreezeReason =
  | 'user_request'
  | 'lost'
  | 'stolen'
  | 'suspicious_activity'
  | 'other';

export type CardCloseReason =
  | 'user_request'
  | 'lost'
  | 'stolen'
  | 'replaced'
  | 'other';

export type WalletProvisioningProvider = 'apple_wallet' | 'google_wallet';

// Full card view returned by `GET /card`, freeze, unfreeze, request-issuance,
// and limits. Mirrors the `Card` schema in OpenAPI exactly.
export interface Card {
  id: string;
  lifecycleStatus: CardLifecycleStatus;
  status: CardStatus;
  brand: CardBrand;
  panLast4: string;
  expiryMonth: number | null;
  expiryYear: number | null;
  tokenizationStatus: CardTokenizationStatus;
  currency: string;
  dailyLimit: MoneyAmount | null;
  monthlyLimit: MoneyAmount | null;
  dailyLimitIsDefault: boolean;
  monthlyLimitIsDefault: boolean;
  issuanceFailureReason: CardIssuanceFailureReason | null;
  activatedAt: string | null;
  frozenAt: string | null;
  closedAt: string | null;
}

// --- Request bodies --------------------------------------------------------

export interface RequestIssuanceRequest {
  designCode?: string | null;
}

export interface FreezeRequest {
  reason?: CardFreezeReason | null;
}

export interface UnfreezeRequest {
  pin: string;
}

export interface CloseRequest {
  reason?: CardCloseReason | null;
}

export interface UpdateLimitsRequest {
  // `null` resets to program default; field omitted leaves stored value.
  dailyLimit?: MoneyAmount | null;
  monthlyLimit?: MoneyAmount | null;
}

export interface AddToWalletRequest {
  deviceId: string;
  deviceName?: string | null;
  walletAccountId: string;
  clientAppVersion?: string | null;
}

// --- Response shapes -------------------------------------------------------

// Returned by `POST /card/add-to-apple-wallet` /
// `POST /card/add-to-google-wallet`. `activationData` is opaque base64 — the
// app forwards it to PassKit / TapAndPay and never logs or persists it.
export interface ProvisioningInstructions {
  provisioningRequestId: string;
  provider: WalletProvisioningProvider;
  activationData: string;
  tokenRequestorId: string;
  networkTokenReference: string | null;
  deviceAccountReference: string | null;
  walletAccountIdentifier: string | null;
  expiresAt: string | null;
  issuedAt: string;
}

// Wrapper used by both wallet-provisioning endpoints.
export interface WalletProvisioningResult {
  provisioning: ProvisioningInstructions;
}

// MVP program bounds for client-side limit validation. Backend is the
// source of truth — these are fallbacks when /wallet/state has not yet
// surfaced a richer payload.
export interface CardLimitBounds {
  dailyMin: number;
  dailyMax: number;
  monthlyMin: number;
  monthlyMax: number;
  step: number;
  currency: string;
}

export const DEFAULT_CARD_LIMIT_BOUNDS: CardLimitBounds = {
  dailyMin: 1000, // £10.00
  dailyMax: 100000, // £1,000.00
  monthlyMin: 10000, // £100.00
  monthlyMax: 1500000, // £15,000.00
  step: 5000, // £50.00
  currency: 'GBP',
};

// Lifecycle of a wallet-provisioning attempt as tracked locally by the
// reducer (purely client-side; backend's truth is `tokenizationStatus`).
export type WalletProvisioningStatus =
  | 'idle'
  | 'requested'
  | 'instructions_received'
  | 'completed'
  | 'failed';
