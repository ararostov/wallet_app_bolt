// Referral domain types — aligned with docs/api/specs/08-referral.ru.md and
// the OpenAPI schema at app/public/openapi/components/schemas/referral.yaml.
//
// Money is `{ amountMinor: number; currency: string }`. Dates are ISO 8601 UTC
// strings. Referral rewards reuse the Loyalty wire shape with `source=referral`
// and are claimed through the Loyalty endpoint — no referral-specific claim
// path exists in the API.

import type { MoneyAmount } from './auth';

// --- Code ------------------------------------------------------------------

export type ReferralCodeStatus = 'active' | 'revoked';

export interface ReferralCode {
  code: string;
  status: ReferralCodeStatus;
  deepLink: string;
  createdAt: string;
  lastUsedAt: string | null;
}

// --- Programme rules / configuration --------------------------------------

export interface ReferralConfig {
  inviterJoinBonus: MoneyAmount;
  inviterTopupBonus: MoneyAmount;
  inviteeWelcomeBonus: MoneyAmount;
  minTopup: MoneyAmount;
  rewardExpiryDays: number;
  monthlyCapLimit: number;
}

// --- Monthly cap snapshot --------------------------------------------------

export interface ReferralMonthlyCap {
  limit: number;
  rewarded: number;
  remaining: number;
  yearMonth: string;
}

// --- Lifetime totals -------------------------------------------------------

export interface ReferralTotals {
  invitesSent: number;
  friendsJoined: number;
  friendsToppedUp: number;
  rewardsEarnedCount: number;
  rewardsEarnedAmount: MoneyAmount;
}

// --- Summary (GET /referral) ----------------------------------------------

export interface ReferralSummary {
  enabled: boolean;
  code: ReferralCode | null;
  totals: ReferralTotals;
  monthlyCap: ReferralMonthlyCap;
  config: ReferralConfig;
}

// --- Friends (invite lifecycle) -------------------------------------------

export type ReferralStage =
  | 'invited'
  | 'joined'
  | 'topped_up'
  | 'reward_posted';

export type ReferralChannel = 'email' | 'sms' | 'link';

export interface ReferralTimeline {
  sentAt: string | null;
  acceptedAt: string | null;
  firstTopupAt: string | null;
  rewardPostedAt: string | null;
}

// --- Reward (referral-scoped projection of the Loyalty reward) ------------

export type ReferralRewardRole =
  | 'inviter_join'
  | 'inviter_topup'
  | 'invitee_welcome';

export type ReferralRewardStatus =
  | 'pending'
  | 'available'
  | 'claimed'
  | 'expired'
  | 'cancelled';

export interface ReferralRewardItem {
  id: string;
  role: ReferralRewardRole;
  amount: MoneyAmount;
  status: ReferralRewardStatus;
  earnedAt: string;
  availableFrom: string | null;
  expiresAt: string | null;
  claimedAt: string | null;
  friendInviteId: string | null;
}

// --- Friend (list + detail share the same shape) --------------------------

export interface ReferralFriend {
  id: string;
  inviteeName: string | null;
  displayName: string | null;
  contactMasked: string | null;
  channel: ReferralChannel;
  stage: ReferralStage;
  timeline: ReferralTimeline;
  rewards: ReferralRewardItem[];
  inviterEarned: MoneyAmount;
  inviteeEarned: MoneyAmount;
}

// Detail screen reuses the same row — server returns hydrated rewards array.
export type ReferralFriendDetail = ReferralFriend;

// --- Rewards feed (GET /referral/rewards) ---------------------------------

export interface ReferralRewardsTotals {
  earned: MoneyAmount;
  available: MoneyAmount;
  claimed: MoneyAmount;
}

export interface ReferralRewardsPayload {
  cap: ReferralMonthlyCap;
  totals: ReferralRewardsTotals;
  rewards: ReferralRewardItem[];
}

// --- Generate code ---------------------------------------------------------

export interface ReferralCodeRotated {
  code: string;
  status: 'active';
  deepLink: string;
  rotatedFromCode: string | null;
  rotatedAt: string;
}

// --- Send invite ----------------------------------------------------------

export interface SendInviteRequestEmail {
  channel: 'email';
  email: string;
  displayName?: string | null;
}

export interface SendInviteRequestSms {
  channel: 'sms';
  phoneE164: string;
  displayName?: string | null;
}

export interface SendInviteRequestLink {
  channel: 'link';
  displayName?: string | null;
}

export type SendInviteRequest =
  | SendInviteRequestEmail
  | SendInviteRequestSms
  | SendInviteRequestLink;

export interface SendInviteInvite {
  id: string;
  channel: ReferralChannel;
  stage: ReferralStage;
  contactMasked: string | null;
  displayName: string | null;
  sentAt: string | null;
  code: string | null;
  deepLink: string | null;
  shareMessage: string | null;
}

export interface SendInviteResponse {
  invite: SendInviteInvite;
  duplicate: boolean;
}

// --- List params + pagination ---------------------------------------------

export interface ListFriendsParams {
  cursor?: string;
  limit?: number;
  stage?: ReferralStage;
}

export interface ListReferralRewardsParams {
  cursor?: string;
  limit?: number;
}

export interface ReferralPagination {
  cursor: string | null;
  nextCursor: string | null;
  hasMore: boolean;
  limit: number;
}

export interface ReferralListMeta {
  requestId?: string;
  timestamp?: string;
  pagination: ReferralPagination;
}
