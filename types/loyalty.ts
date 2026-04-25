// Loyalty domain types — aligned with docs/api/specs/07-loyalty.ru.md and
// the OpenAPI schema at app/public/openapi/components/schemas/loyalty.yaml.
//
// Money is `{ amountMinor: number; currency: string }`. Dates are ISO 8601
// UTC strings. All optional fields are always present in the payload
// (null-preserving). `referral`-source rewards project to `bucket = bonus`
// in the wire format — the mobile UI groups them under the "Bonus" filter
// chip and uses `source` only for analytics / icon selection.

import type { MoneyAmount, WalletSummary } from './auth';

// --- Reward ----------------------------------------------------------------

export type RewardBucket = 'cashback' | 'bonus' | 'promo';
export type RewardSource = 'cashback' | 'bonus' | 'promo' | 'referral';
export type RewardStatus =
  | 'pending'
  | 'available'
  | 'claimed'
  | 'expired'
  | 'cancelled';

export type RewardClaimTarget = 'wallet' | 'card';

export type RewardCancellationReason =
  | 'duplicate'
  | 'refund_reversal'
  | 'admin_revoke'
  | 'program_closed';

export interface RewardTierRef {
  code: string;
  name: string;
  cashbackRateBps: number | null;
}

export interface RewardClaim {
  canClaim: boolean;
  targets: RewardClaimTarget[];
  notClaimableReason: string | null;
}

export interface RewardCancellation {
  reason: RewardCancellationReason;
  cancelledAt: string;
}

export interface Reward {
  id: string;
  bucket: RewardBucket;
  source: RewardSource;
  title: string;
  description: string | null;
  amount: MoneyAmount;
  status: RewardStatus;
  earnedAt: string;
  availableFrom: string | null;
  expiresAt: string | null;
  claimedAt: string | null;
  linkedTransactionId: string | null;
  merchantName: string | null;
  merchantCategory: string | null;
  tier: RewardTierRef | null;
  claim: RewardClaim;
  cancellation?: RewardCancellation | null;
}

// On the list endpoint cancelled rewards are filtered out by default — the
// envelope is the same `Reward` shape but `cancellation` may be absent.
export type RewardListItem = Reward;

// --- Claim ------------------------------------------------------------------

export interface ClaimRewardRequest {
  claimTarget?: RewardClaimTarget;
  cardId?: string | null;
}

export interface ClaimedReward {
  reward: Reward;
  wallet: WalletSummary;
}

// --- Rewards summary (header / hero) ---------------------------------------

// Derived locally from the rewards feed — there is no server-side `summary`
// envelope on `/rewards`. We compute the two figures shown in the hero
// (earned all time excluding expired/cancelled, pending cashback) from the
// in-memory list.
export interface RewardsSummary {
  earnedAllTimeMinor: number;
  pendingMinor: number;
  currency: string;
}

// --- Tier ------------------------------------------------------------------

export interface TierLevel {
  code: string;
  name: string;
  levelOrder: number;
  cashbackRateBps: number;
  cashbackRateDisplay: string;
  since?: string | null;
  threshold?: MoneyAmount | null;
}

export interface TierProgress {
  amount: MoneyAmount;
  percentage: number;
}

export interface Tier {
  current: TierLevel;
  next: TierLevel | null;
  progress: TierProgress;
  resetDays: number;
  windowDays: number;
  windowResetsAt: string | null;
}

// --- Perks -----------------------------------------------------------------

export type PerkCategory = 'cashback' | 'bonus' | 'tier' | 'referral' | 'promo';
export type PerkStatus = 'active' | 'coming_soon' | 'archived';

export interface PerkMinTier {
  code: string;
  name: string;
}

export interface PerkProgress {
  current: MoneyAmount;
  target: MoneyAmount;
  percentage: number;
}

export interface Perk {
  id: string;
  code: string;
  title: string;
  description: string;
  shortRule: string | null;
  fullRules: string | null;
  category: PerkCategory;
  icon: string | null;
  status: PerkStatus;
  minTierLevel: number;
  minTier: PerkMinTier | null;
  isAvailable: boolean;
  config: Record<string, unknown> | null;
  progress: PerkProgress | null;
}

// --- Cashback statement ---------------------------------------------------

export type CashbackStatementPeriodType = 'month' | 'quarter' | 'year';

export interface CashbackStatementPeriod {
  type: CashbackStatementPeriodType;
  from: string;
  to: string;
}

export interface CashbackStatementTotals {
  earned: MoneyAmount;
  claimed: MoneyAmount;
  pending: MoneyAmount;
  available: MoneyAmount;
  expired: MoneyAmount;
}

export interface CashbackStatementMerchantGroup {
  merchantName: string | null;
  merchantCategory: string | null;
  earned: MoneyAmount;
  rewardCount: number;
}

export interface CashbackStatement {
  period: CashbackStatementPeriod;
  totals: CashbackStatementTotals;
  byMerchant: CashbackStatementMerchantGroup[];
}

// --- List params + pagination ---------------------------------------------

export interface ListRewardsParams {
  cursor?: string;
  limit?: number;
  status?: RewardStatus;
  sort?: '-earnedAt' | 'earnedAt' | '-amount' | 'amount';
}

export interface RewardListPagination {
  cursor: string | null;
  nextCursor: string | null;
  hasMore: boolean;
  limit: number;
}

export interface RewardListMeta {
  requestId?: string;
  timestamp?: string;
  pagination: RewardListPagination;
}
