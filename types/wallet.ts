// Wallet domain types — aligned with docs/api/specs/02-wallet.ru.md and the
// OpenAPI schema at app/public/openapi/components/schemas/wallet.yaml.
//
// All amounts are minor units + ISO currency. IDs are strings (backend
// serialises bigint as string for JS safety). Dates are ISO 8601 UTC strings.

import type { MoneyAmount } from './auth';

export type WalletStatus = 'pending' | 'active' | 'frozen' | 'suspended' | 'closed';

export type CardSummaryStatus = 'pending' | 'active' | 'frozen' | 'closed' | 'replaced';

export type CardTokenizationStatus =
  | 'not_started'
  | 'in_progress'
  | 'provisioned'
  | 'failed';

export type AutoReloadStatus = 'active' | 'paused' | 'disabled';

export type AutoReloadDisableReason =
  | 'manual'
  | 'consecutive_failures'
  | 'payment_method_removed'
  | 'wallet_frozen';

export type AutoReloadFailureReason =
  | 'payment_method_declined'
  | 'insufficient_funds'
  | 'currency_mismatch'
  | 'daily_cap_exceeded'
  | 'monthly_cap_exceeded'
  | 'provider_error'
  | 'unknown';

// --- /wallet/balance --------------------------------------------------------

export interface WalletBalance {
  walletId: string;
  status: WalletStatus;
  currency: string;
  available: MoneyAmount;
  pending: MoneyAmount;
  asOf: string;
}

// --- /wallet/state slices ---------------------------------------------------

// `WalletSummary` lives in types/auth.ts (returned by /verify-* and /me).
// Reused under /wallet/state.wallet.

export interface CardSummary {
  id: string;
  status: CardSummaryStatus;
  brand: 'visa' | 'mastercard' | 'unknown';
  last4: string;
  expiryMonth: number;
  expiryYear: number;
  isPrimary: boolean;
  tokenizationStatus: CardTokenizationStatus;
}

export interface TierSummary {
  currentLevel: string | null;
  nextLevel: string | null;
  progress: MoneyAmount;
  target: MoneyAmount | null;
  currency: string;
  windowEndsAt: string | null;
  currentCashbackRateBps: number | null;
}

export interface AutoReloadPaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expiryMonth?: number | null;
  expiryYear?: number | null;
  isDefault: boolean;
}

export interface AutoReloadSummary {
  id: string;
  enabled: boolean;
  status: AutoReloadStatus;
  paymentMethod: AutoReloadPaymentMethod | null;
  triggerBalance: MoneyAmount;
  reloadAmount: MoneyAmount;
  dailyCap: MoneyAmount | null;
  monthlyCap: MoneyAmount | null;
  currency: string;
  lastTriggeredAt: string | null;
  nextEvaluationAt: string | null;
  consecutiveFailureCount: number;
  disableReason: AutoReloadDisableReason | null;
  lastFailureReason: AutoReloadFailureReason | null;
  updatedAt: string | null;
}

// `WalletSummary` mirrors the backend projection used by /me, auth, and
// /wallet/state.wallet. The richer fields (merchantId, openedAt) are present
// in the /wallet/state response — declared here for completeness; not all of
// them appear in every consumer.
export interface WalletStateWallet {
  id: string;
  merchantId?: string;
  status: WalletStatus;
  currency: string;
  balance: MoneyAmount;
  pendingBalance: MoneyAmount;
  openedAt?: string | null;
}

export interface WalletStateData {
  wallet: WalletStateWallet | null;
  card: CardSummary | null;
  tier: TierSummary | null;
  autoReload: AutoReloadSummary | null;
}

// --- PATCH /wallet/auto-reload request --------------------------------------

export type UpdateAutoReloadRequest =
  | { enabled: false }
  | {
      enabled: true;
      paymentMethodId?: string;
      triggerBalance?: MoneyAmount;
      reloadAmount?: MoneyAmount;
      dailyCap?: MoneyAmount | null;
      monthlyCap?: MoneyAmount | null;
    };

export interface UpdateAutoReloadResponse {
  autoReload: AutoReloadSummary | null;
}

// --- /wallet/state include filter ------------------------------------------

export type WalletStateInclude = 'wallet' | 'card' | 'tier' | 'autoReload';
