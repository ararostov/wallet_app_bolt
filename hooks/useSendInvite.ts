// useSendInvite — POST /referral/send-invite.
//
// Idempotency-Key is owned per hook instance via useRef so retries (e.g.
// after a 502 from SendGrid / Twilio) reuse the same key. The key rotates
// after each *successful* completion so a fresh send from the same hook
// instance gets a new key.

import { useCallback, useRef, useState } from 'react';

import { useWallet } from '@/context/WalletContext';
import type {
  ReferralFriend,
  SendInviteRequest,
  SendInviteResponse,
} from '@/types/referral';
import { ApiError } from '@/utils/errors';
import { newIdempotencyKey } from '@/utils/idempotency';
import { logError } from '@/utils/logger';
import { referralApi } from '@/utils/api/referral';

import { invalidateQueries } from './useQuery';

export interface UseSendInviteResult {
  loading: boolean;
  error: Error | null;
  data: SendInviteResponse | undefined;
  mutate: (vars: SendInviteRequest) => Promise<SendInviteResponse>;
  reset: () => void;
}

const RETRIABLE_STATUSES = [502, 503, 504];
const MAX_RETRIES = 2;
const BASE_DELAY_MS = 1000;

// Promote a SendInvite response into the local Friends slice so the list
// updates optimistically while the next /referral/friends fetch is in
// flight. Backend stage stays `invited` for fresh rows; on duplicate
// replays the row may already be more advanced and we keep the server
// view as-is.
function inviteToFriend(invite: SendInviteResponse['invite']): ReferralFriend {
  return {
    id: invite.id,
    inviteeName: null,
    displayName: invite.displayName,
    contactMasked: invite.contactMasked,
    channel: invite.channel,
    stage: invite.stage,
    timeline: {
      sentAt: invite.sentAt,
      acceptedAt: null,
      firstTopupAt: null,
      rewardPostedAt: null,
    },
    rewards: [],
    inviterEarned: { amountMinor: 0, currency: 'GBP' },
    inviteeEarned: { amountMinor: 0, currency: 'GBP' },
  };
}

export function useSendInvite(): UseSendInviteResult {
  const { dispatch } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<SendInviteResponse | undefined>(undefined);
  const inFlight = useRef<Promise<SendInviteResponse> | null>(null);
  const idempotencyKeyRef = useRef<string>(newIdempotencyKey());

  const mutate = useCallback(
    async (vars: SendInviteRequest): Promise<SendInviteResponse> => {
      if (inFlight.current) return inFlight.current;
      setLoading(true);
      setError(null);

      const run = (async (): Promise<SendInviteResponse> => {
        let attempt = 0;
        let lastError: unknown;
        while (attempt <= MAX_RETRIES) {
          try {
            const result = await referralApi.sendInvite(
              vars,
              idempotencyKeyRef.current,
            );
            setData(result);
            setLoading(false);

            // Optimistically prepend the (or update existing) row in the
            // local Friends slice so the UI reflects the change before
            // the next /referral/friends fetch.
            dispatch({
              type: 'REFERRAL/UPSERT_FRIEND',
              payload: inviteToFriend(result.invite),
            });

            // Invalidate cached summary + friends list so a focus refetch
            // picks up the new totals + ordering.
            invalidateQueries(['referral:summary', 'referral:friends:all']);

            // Rotate idempotency key for a follow-up send from this hook.
            idempotencyKeyRef.current = newIdempotencyKey();
            return result;
          } catch (e) {
            lastError = e;
            const retriable =
              e instanceof ApiError && RETRIABLE_STATUSES.includes(e.status);
            if (!retriable || attempt === MAX_RETRIES) break;
            await new Promise((resolve) =>
              setTimeout(resolve, BASE_DELAY_MS * 2 ** attempt),
            );
            attempt += 1;
          }
        }
        const err =
          lastError instanceof Error
            ? lastError
            : new Error(String(lastError));
        logError(err, { where: 'useSendInvite', channel: vars.channel });
        setError(err);
        setLoading(false);
        throw err;
      })();

      inFlight.current = run;
      try {
        return await run;
      } finally {
        inFlight.current = null;
      }
    },
    [dispatch],
  );

  const reset = useCallback(() => {
    idempotencyKeyRef.current = newIdempotencyKey();
    setLoading(false);
    setError(null);
    setData(undefined);
  }, []);

  return { loading, error, data, mutate, reset };
}
