// useReportTransaction — POST /transactions/{id}/report.
//
// Idempotency-Key is owned by the caller (report.tsx) so it can be rotated
// when reason / description / attachment change and reused on retry.

import { useCallback, useRef, useState } from 'react';

import { useWallet } from '@/context/WalletContext';
import type {
  DisputeRecord,
  ReportTransactionRequest,
} from '@/types/transactions';
import { ApiError } from '@/utils/errors';
import { logError } from '@/utils/logger';
import { transactionsApi } from '@/utils/api/transactions';
import { invalidateQuery } from './useQuery';

export interface ReportTransactionVars {
  transactionId: string;
  payload: ReportTransactionRequest;
  idempotencyKey: string;
}

export interface UseReportTransactionResult {
  loading: boolean;
  error: Error | null;
  data: DisputeRecord | undefined;
  mutate: (vars: ReportTransactionVars) => Promise<DisputeRecord>;
  reset: () => void;
}

const RETRIABLE_STATUSES = [502, 503, 504];
const MAX_RETRIES = 2;
const BASE_DELAY_MS = 1000;

export function useReportTransaction(): UseReportTransactionResult {
  const { dispatch } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<DisputeRecord | undefined>(undefined);
  const inFlight = useRef<Promise<DisputeRecord> | null>(null);

  const mutate = useCallback(
    async (vars: ReportTransactionVars): Promise<DisputeRecord> => {
      if (inFlight.current) return inFlight.current;
      setLoading(true);
      setError(null);

      const run = (async (): Promise<DisputeRecord> => {
        let attempt = 0;
        let lastError: unknown;
        while (attempt <= MAX_RETRIES) {
          try {
            const result = await transactionsApi.report(
              vars.transactionId,
              vars.payload,
              vars.idempotencyKey,
            );
            setData(result);
            setLoading(false);
            // Invalidate the detail cache so the next focus refetches and
            // the dispute banner appears.
            invalidateQuery(`transactions:detail:${vars.transactionId}`);
            invalidateQuery(`transactions:dispute:${vars.transactionId}`);
            dispatch({ type: 'DISPUTES/UPSERT', payload: result });
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
        logError(err, { where: 'useReportTransaction' });
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
    setLoading(false);
    setError(null);
    setData(undefined);
  }, []);

  return { loading, error, data, mutate, reset };
}
