// Loyalty endpoint helpers.
// Contracts mirror docs/api/specs/07-loyalty.ru.md and OpenAPI
// paths/loyalty.yaml. All helpers return the unwrapped data envelope (handled
// by api.ts interceptor); the list helper additionally surfaces `meta` so
// `useRewards` can paginate via the cursor.

import { api } from '../api';
import type {
  CashbackStatement,
  CashbackStatementPeriodType,
  ClaimRewardRequest,
  ClaimedReward,
  ListRewardsParams,
  Perk,
  Reward,
  RewardListMeta,
  Tier,
} from '@/types/loyalty';

export interface RewardListResult {
  data: Reward[];
  meta: RewardListMeta;
}

export const loyaltyApi = {
  listRewards(params: ListRewardsParams = {}): Promise<RewardListResult> {
    return api.get<Reward[]>('/rewards', { params }).then((r) => ({
      data: r.data,
      meta: ((r as unknown) as { meta: RewardListMeta }).meta,
    }));
  },

  getReward(id: string): Promise<Reward> {
    return api
      .get<Reward>(`/rewards/${encodeURIComponent(id)}`)
      .then((r) => r.data);
  },

  claimReward(
    id: string,
    body: ClaimRewardRequest,
    idempotencyKey: string,
  ): Promise<ClaimedReward> {
    return api
      .post<ClaimedReward>(
        `/rewards/${encodeURIComponent(id)}/claim`,
        body,
        { headers: { 'Idempotency-Key': idempotencyKey } },
      )
      .then((r) => r.data);
  },

  getTier(): Promise<Tier> {
    return api.get<Tier>('/tier').then((r) => r.data);
  },

  listPerks(params: { tier?: string } = {}): Promise<Perk[]> {
    return api.get<Perk[]>('/perks', { params }).then((r) => r.data);
  },

  getCashbackStatement(params: {
    period: CashbackStatementPeriodType;
  }): Promise<CashbackStatement> {
    return api
      .get<CashbackStatement>('/cashback/statement', { params })
      .then((r) => r.data);
  },
};
