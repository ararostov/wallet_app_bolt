// Transactions domain types — aligned with docs/api/specs/06-transactions.ru.md
// and the OpenAPI schema at app/public/openapi/components/schemas/transaction.yaml.
//
// Wire shape rules:
// - Money is `{ amountMinor: number; currency: string }`. `amountMinor` is
//   signed (negative on debits, positive on credits).
// - All IDs are strings (backend serialises bigint as string for JS safety).
// - Dates are ISO 8601 UTC strings.
// - All optional fields are always present in the payload (null-preserving).

import type { MoneyAmount } from './auth';

// `CustomerTransactionType` (OpenAPI: `Transaction.type` enum).
export type TransactionType =
  | 'topup'
  | 'auto_reload'
  | 'purchase'
  | 'cashback'
  | 'bonus'
  | 'refund';

// `CustomerTransactionStatus` (OpenAPI: `Transaction.status` enum).
export type TransactionStatus =
  | 'completed'
  | 'pending'
  | 'failed'
  | 'refunded'
  | 'reversed';

// Single customer-facing transaction feed item.
export interface TransactionRecord {
  id: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: MoneyAmount; // signed amountMinor
  merchantName: string | null;
  merchantCategory: string | null;
  merchantLogoUrl: string | null;
  reference: string | null;
  description: string | null;
  linkedTransactionId: string | null;
  cashbackEarnedMinor: number | null;
  cashbackCurrency: string | null;
  cashbackAvailableAt: string | null;
  occurredAt: string;
}

// Backwards-compat alias retained for the spec-05 topup linkage. Spec 06
// now owns the canonical TransactionRecord type; ApiTransactionRecord is
// kept as an alias so existing reducer/payload code keeps compiling.
export type ApiTransactionRecord = TransactionRecord;

// --- Payment-method snapshot embedded in detail ----------------------------

// TrueLayer Open Banking is the sole PSP for new top-ups (tech-debt §2.2).
// Legacy `adyen_*` channel values may still appear on historical transaction
// records created when Adyen was live; we keep them on the read-side union
// as a dead-but-tolerated literal to preserve display of past data.
// TODO(tech-debt §2.2): drop the `adyen_*` literals once OpenAPI prunes
// them and backend confirms no historical data carries those channel values.
export type TransactionPaymentMethodChannel =
  | 'adyen_card'
  | 'adyen_apple_pay'
  | 'adyen_google_pay'
  | 'truelayer_open_banking';

export interface TransactionPaymentMethodSummary {
  id: string;
  channel: TransactionPaymentMethodChannel;
  brand: string | null;
  last4: string | null;
}

export interface TransactionProviderReceipt {
  authorizationCode: string | null;
  acceptorCountry: string | null;
}

// --- Disputes --------------------------------------------------------------

export type DisputeReason =
  | 'unauthorized'
  | 'duplicate'
  | 'wrong_amount'
  | 'service_not_received'
  | 'product_defective'
  | 'other';

export type DisputeStatus =
  | 'open'
  | 'investigating'
  | 'resolved'
  | 'rejected'
  | 'cancelled';

export type DisputeResolutionOutcome =
  | 'refunded_full'
  | 'refunded_partial'
  | 'no_action'
  | 'duplicate';

export type DisputeAttachmentContentType =
  | 'image/jpeg'
  | 'image/png'
  | 'image/heic'
  | 'application/pdf';

export type DisputeAttachmentStatus = 'declared' | 'uploaded' | 'rejected';

export interface DisputeAttachment {
  id: string;
  filename: string;
  contentType: DisputeAttachmentContentType;
  sizeBytes: number;
  status: DisputeAttachmentStatus;
}

// `DisputeSummary` — embedded in TransactionDetail.activeDispute.
export interface DisputeSummary {
  id: string;
  reference: string;
  status: DisputeStatus;
  submittedAt: string;
  targetResolutionAt: string | null;
}

// Full dispute record (POST /report 201, GET /dispute 200).
export interface DisputeRecord {
  id: string;
  transactionId: string;
  reference: string;
  reason: DisputeReason;
  description: string;
  status: DisputeStatus;
  resolutionOutcome: DisputeResolutionOutcome | null;
  resolutionNote: string | null;
  refundAmount: MoneyAmount | null;
  attachments: DisputeAttachment[];
  submittedAt: string;
  targetResolutionAt: string | null;
  resolvedAt: string | null;
}

// --- Detail composite ------------------------------------------------------

export interface TransactionDetail {
  transaction: TransactionRecord;
  linkedTransaction: TransactionRecord | null;
  activeDispute: DisputeSummary | null;
  paymentMethod: TransactionPaymentMethodSummary | null;
  providerReceipt: TransactionProviderReceipt | null;
}

// --- Pagination & list ----------------------------------------------------

export interface TransactionListPagination {
  cursor: string | null;
  nextCursor: string | null;
  hasMore: boolean;
  limit: number;
}

export interface TransactionListMeta {
  requestId?: string;
  timestamp?: string;
  pagination: TransactionListPagination;
}

export interface TransactionListResponse {
  data: TransactionRecord[];
  meta: TransactionListMeta;
}

// --- Search ----------------------------------------------------------------

export interface TransactionSearchMeta {
  requestId?: string;
  timestamp?: string;
  search: {
    query: string;
    limit: number;
    truncated: boolean;
  };
}

export interface TransactionSearchResponse {
  data: TransactionRecord[];
  meta: TransactionSearchMeta;
}

// --- Request bodies --------------------------------------------------------

export interface DeclaredAttachment {
  filename: string;
  contentType: DisputeAttachmentContentType;
  sizeBytes: number;
}

export interface ReportTransactionRequest {
  reason: DisputeReason;
  description: string;
  attachments?: DeclaredAttachment[];
}

// --- Search / list params --------------------------------------------------

export interface ListTransactionsParams {
  cursor?: string;
  limit?: number;
  type?: TransactionType;
  status?: TransactionStatus;
  startDate?: string;
  endDate?: string;
}

export interface SearchTransactionsParams {
  q: string;
  limit?: number;
  type?: TransactionType;
}
