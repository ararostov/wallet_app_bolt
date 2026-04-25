// Transactions endpoint helpers.
// Contracts mirror docs/api/specs/06-transactions.ru.md and OpenAPI
// paths/transactions.yaml. Helpers return the unwrapped `data` envelope when
// the body is a single object, but for list / search we keep the meta around
// (cursor pagination + `truncated` flag) — those calls return the raw axios
// response so the caller can read both `data` and `meta`.

import { api } from '../api';
import type {
  DisputeRecord,
  ListTransactionsParams,
  ReportTransactionRequest,
  SearchTransactionsParams,
  TransactionDetail,
  TransactionListMeta,
  TransactionRecord,
  TransactionSearchMeta,
} from '@/types/transactions';

export interface TransactionListResult {
  data: TransactionRecord[];
  meta: TransactionListMeta;
}

export interface TransactionSearchResult {
  data: TransactionRecord[];
  meta: TransactionSearchMeta;
}

export const transactionsApi = {
  list(params: ListTransactionsParams = {}): Promise<TransactionListResult> {
    return api
      .get<TransactionRecord[]>('/transactions', { params })
      .then((r) => ({
        data: r.data,
        // The response interceptor stashes the envelope `meta` onto the
        // axios response under `meta`. Cast through `unknown` because the
        // axios typings don't know about that bolted-on field.
        meta: ((r as unknown) as { meta: TransactionListMeta }).meta,
      }));
  },

  search(params: SearchTransactionsParams): Promise<TransactionSearchResult> {
    return api
      .get<TransactionRecord[]>('/transactions/search', { params })
      .then((r) => ({
        data: r.data,
        meta: ((r as unknown) as { meta: TransactionSearchMeta }).meta,
      }));
  },

  get(id: string): Promise<TransactionDetail> {
    return api
      .get<TransactionDetail>(`/transactions/${encodeURIComponent(id)}`)
      .then((r) => r.data);
  },

  report(
    id: string,
    payload: ReportTransactionRequest,
    idempotencyKey: string,
  ): Promise<DisputeRecord> {
    return api
      .post<DisputeRecord>(
        `/transactions/${encodeURIComponent(id)}/report`,
        payload,
        { headers: { 'Idempotency-Key': idempotencyKey } },
      )
      .then((r) => r.data);
  },

  getDispute(id: string): Promise<DisputeRecord> {
    return api
      .get<DisputeRecord>(`/transactions/${encodeURIComponent(id)}/dispute`)
      .then((r) => r.data);
  },
};
