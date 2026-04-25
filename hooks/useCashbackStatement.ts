// useCashbackStatement — GET /cashback/statement?period={period}.
// Cache key is parameterised by period so swapping the segmented control
// only triggers a fetch the first time each period is selected.

import type {
  CashbackStatement,
  CashbackStatementPeriodType,
} from '@/types/loyalty';
import { loyaltyApi } from '@/utils/api/loyalty';
import { useQuery, type QueryResult } from './useQuery';

const TTL_MS = 10 * 60 * 1000;
const STALE_MS = 60 * 1000;

export function useCashbackStatement(
  period: CashbackStatementPeriodType,
): QueryResult<CashbackStatement> {
  return useQuery<CashbackStatement>(
    `cashback:statement:${period}`,
    async () => {
      const data = await loyaltyApi.getCashbackStatement({ period });
      return { data };
    },
    {
      ttlMs: TTL_MS,
      staleMs: STALE_MS,
      refetchOnFocus: false,
    },
  );
}
