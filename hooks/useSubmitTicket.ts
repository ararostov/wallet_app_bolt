// useSubmitTicket — POST /support/ticket.
//
// The idempotency key is owned by the screen (per spec §6.5: generated once
// per screen mount via `useRef`, rotated only on 409 conflict). This hook
// therefore takes the key with each call and does not mint its own.

import { useCallback, useRef, useState } from 'react';

import type {
  CreateSupportTicketRequest,
  SupportTicket,
} from '@/types/help';
import { helpApi } from '@/utils/api/help';
import { ApiError } from '@/utils/errors';
import { logError } from '@/utils/logger';

export interface SubmitTicketVars {
  payload: CreateSupportTicketRequest;
  idempotencyKey: string;
}

export interface UseSubmitTicketResult {
  loading: boolean;
  error: Error | null;
  data: SupportTicket | undefined;
  mutate: (vars: SubmitTicketVars) => Promise<SupportTicket>;
  reset: () => void;
}

const RETRIABLE_STATUSES = [502, 503, 504];
const MAX_RETRIES = 2;
const BASE_DELAY_MS = 1000;

export function useSubmitTicket(): UseSubmitTicketResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<SupportTicket | undefined>(undefined);
  const inFlight = useRef<Promise<SupportTicket> | null>(null);

  const mutate = useCallback(
    async (vars: SubmitTicketVars): Promise<SupportTicket> => {
      if (inFlight.current) return inFlight.current;
      setLoading(true);
      setError(null);

      const run = (async (): Promise<SupportTicket> => {
        let attempt = 0;
        let lastError: unknown;
        while (attempt <= MAX_RETRIES) {
          try {
            const result = await helpApi.submitTicket(
              vars.payload,
              vars.idempotencyKey,
            );
            setData(result);
            setLoading(false);
            return result;
          } catch (e) {
            lastError = e;
            // 429 is also retriable in principle but the UX is to surface a
            // 60s cooldown to the user — don't burn retries silently.
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
        logError(err, { where: 'useSubmitTicket' });
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
    [],
  );

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setData(undefined);
  }, []);

  return { loading, error, data, mutate, reset };
}
