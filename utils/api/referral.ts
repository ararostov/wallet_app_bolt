// Referral endpoint helpers.
// Contracts mirror docs/api/specs/08-referral.ru.md and OpenAPI
// paths/referral.yaml. Helpers return the unwrapped data envelope
// (handled by api.ts interceptor); list helpers additionally surface
// `meta` so cursor-paginated hooks can read `pagination`.

import { api } from '../api';
import type {
  ListFriendsParams,
  ListReferralRewardsParams,
  ReferralCodeRotated,
  ReferralFriend,
  ReferralFriendDetail,
  ReferralListMeta,
  ReferralRewardsPayload,
  ReferralSummary,
  SendInviteRequest,
  SendInviteResponse,
} from '@/types/referral';

export interface ReferralFriendsResult {
  data: ReferralFriend[];
  meta: ReferralListMeta;
}

export interface ReferralRewardsResult {
  data: ReferralRewardsPayload;
  meta: ReferralListMeta;
}

export const referralApi = {
  getSummary(): Promise<ReferralSummary> {
    return api.get<ReferralSummary>('/referral').then((r) => r.data);
  },

  generateCode(idempotencyKey: string): Promise<ReferralCodeRotated> {
    return api
      .post<ReferralCodeRotated>(
        '/referral/generate-code',
        {},
        { headers: { 'Idempotency-Key': idempotencyKey } },
      )
      .then((r) => r.data);
  },

  sendInvite(
    payload: SendInviteRequest,
    idempotencyKey: string,
  ): Promise<SendInviteResponse> {
    return api
      .post<SendInviteResponse>('/referral/send-invite', payload, {
        headers: { 'Idempotency-Key': idempotencyKey },
      })
      .then((r) => r.data);
  },

  listFriends(params: ListFriendsParams = {}): Promise<ReferralFriendsResult> {
    return api
      .get<ReferralFriend[]>('/referral/friends', { params })
      .then((r) => ({
        data: r.data,
        meta: ((r as unknown) as { meta: ReferralListMeta }).meta,
      }));
  },

  getFriend(id: string): Promise<ReferralFriendDetail> {
    return api
      .get<ReferralFriendDetail>(
        `/referral/friends/${encodeURIComponent(id)}`,
      )
      .then((r) => r.data);
  },

  listRewards(
    params: ListReferralRewardsParams = {},
  ): Promise<ReferralRewardsResult> {
    return api
      .get<ReferralRewardsPayload>('/referral/rewards', { params })
      .then((r) => ({
        data: r.data,
        meta: ((r as unknown) as { meta: ReferralListMeta }).meta,
      }));
  },
};
