// Formatting helpers (money / date / phone) and a few legacy view helpers
// kept for the Bolt screens that have not yet been migrated to the API.
//
// Conventions:
// - Money is always passed as minor units + ISO currency.
// - Dates are ISO 8601 UTC strings; formatting locale is en-GB.

const DEFAULT_LOCALE = 'en-GB';

export function formatMoney(amountMinor: number, currency: string): string {
  const major = amountMinor / 100;
  try {
    return new Intl.NumberFormat(DEFAULT_LOCALE, {
      style: 'currency',
      currency,
    }).format(major);
  } catch {
    // Fallback when an unknown currency code is passed at runtime.
    return `${currency} ${major.toFixed(2)}`;
  }
}

// Legacy helper retained for Bolt mock screens (uses major-unit float, GBP).
// Prefer formatMoney(amountMinor, currency) for new code.
export function formatCurrency(amount: number): string {
  const abs = Math.abs(amount);
  return `£${abs.toFixed(2)}`;
}

export type DateFormat = 'short' | 'long' | 'time' | 'relative';

export function formatDate(iso: string, fmt: DateFormat = 'short'): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  switch (fmt) {
    case 'short':
      return d.toLocaleDateString(DEFAULT_LOCALE, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    case 'long':
      return d.toLocaleDateString(DEFAULT_LOCALE, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    case 'time':
      return d.toLocaleTimeString(DEFAULT_LOCALE, {
        hour: '2-digit',
        minute: '2-digit',
      });
    case 'relative':
      return relativeTime(iso);
  }
}

export function formatDateLong(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(DEFAULT_LOCALE, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(DEFAULT_LOCALE, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export type PhoneFormatOptions = {
  masked?: boolean;
};

// Display E.164 numbers with sensible spacing. UK numbers (+44) get a
// dedicated grouping, everything else is grouped 3-3-...; masked replaces
// all but the country code and last 4 digits.
export function formatPhoneE164(e164: string, opts: PhoneFormatOptions = {}): string {
  if (typeof e164 !== 'string' || !e164.startsWith('+')) return e164;
  const digits = e164.slice(1).replace(/\D/g, '');
  if (digits.length < 4) return e164;

  const isUk = e164.startsWith('+44');
  const country = isUk ? '44' : digits.slice(0, Math.min(3, digits.length - 4));
  const rest = digits.slice(country.length);

  if (opts.masked) {
    const last4 = rest.slice(-4);
    const maskedRest = rest.slice(0, -4).replace(/./g, '*');
    return `+${country} ${maskedRest.replace(/(.{3})/g, '$1 ').trim()} ${last4}`.trim();
  }

  if (isUk && rest.length === 10) {
    // +44 20 1234 5678 / +44 7911 123456 — coarse grouping
    if (rest.startsWith('20')) {
      return `+44 ${rest.slice(0, 2)} ${rest.slice(2, 6)} ${rest.slice(6)}`;
    }
    return `+44 ${rest.slice(0, 4)} ${rest.slice(4)}`;
  }

  // Generic fallback: groups of 3.
  const grouped = rest.replace(/(.{3})(?=.)/g, '$1 ');
  return `+${country} ${grouped}`.trim();
}

// Mask an email or E.164 phone for display in OTP screens / logs.
// - email: keeps first 2 chars + domain → "al***@example.com".
// - phone: keeps country code + last 4 digits → "+44 *** *** 1234".
export function maskIdentifier(identifier: string): string {
  if (typeof identifier !== 'string' || identifier.length === 0) return '';
  if (identifier.includes('@')) {
    const [local, domain] = identifier.split('@');
    if (!local || !domain) return identifier;
    const visible = local.slice(0, Math.min(2, local.length));
    return `${visible}***@${domain}`;
  }
  if (identifier.startsWith('+')) {
    return formatPhoneE164(identifier, { masked: true });
  }
  return identifier;
}

// Parse user-entered amount string into minor units.
// Accepts "12", "12.5", "12.50". Throws on invalid input — callers should
// validate first or wrap in try/catch.
export function parseAmountInput(input: string, _currency: string = 'GBP'): number {
  if (typeof input !== 'string') {
    throw new Error('Amount must be a string');
  }
  const cleaned = input.trim().replace(/,/g, '.');
  if (cleaned === '' || !/^\d+(\.\d{0,2})?$/.test(cleaned)) {
    throw new Error('Invalid amount format');
  }
  const [whole, fraction = ''] = cleaned.split('.');
  const minorFraction = (fraction + '00').slice(0, 2);
  const minor = Number(whole) * 100 + Number(minorFraction);
  if (!Number.isFinite(minor) || minor < 0) {
    throw new Error('Invalid amount value');
  }
  return minor;
}

// --- Legacy helpers used by existing Bolt screens ---------------------------

export function getTransactionIcon(type: string): string {
  switch (type) {
    case 'topup':
      return '\u{1F4B3}';
    case 'purchase':
      return '\u{1F6D2}';
    case 'cashback':
      return '\u{1F4B0}';
    case 'bonus':
      return '\u{1F381}';
    case 'refund':
      return '\u{21A9}';
    default:
      return '\u{1F4B8}';
  }
}

export function getTxColor(type: string): string {
  switch (type) {
    case 'cashback':
      return '#059669';
    case 'bonus':
      return '#059669';
    case 'topup':
      return '#1a56db';
    case 'refund':
      return '#7c3aed';
    default:
      return '#64748b';
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'completed':
      return '#059669';
    case 'pending':
      return '#d97706';
    case 'failed':
      return '#ef4444';
    case 'refunded':
      return '#7c3aed';
    default:
      return '#64748b';
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case 'completed':
      return 'Completed';
    case 'pending':
      return 'Pending';
    case 'failed':
      return 'Failed';
    case 'refunded':
      return 'Refunded';
    default:
      return status;
  }
}

type DatedItem = { date: string };

export function groupTransactionsByDate<T extends DatedItem>(
  transactions: T[],
): { date: string; items: T[] }[] {
  const groups: Record<string, T[]> = {};
  for (const tx of transactions) {
    const d = new Date(tx.date);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const txDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffDays = Math.round((today.getTime() - txDay.getTime()) / 86400000);
    let key: string;
    if (diffDays === 0) key = 'Today';
    else if (diffDays === 1) key = 'Yesterday';
    else
      key = d.toLocaleDateString(DEFAULT_LOCALE, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    if (!groups[key]) groups[key] = [];
    groups[key].push(tx);
  }
  return Object.entries(groups).map(([date, items]) => ({ date, items }));
}

// Variant of groupTransactionsByDate that operates on the API-shape
// `TransactionRecord` (uses `occurredAt` instead of `date`). Bucket labels
// match the spec §4.1: Today, Yesterday, "This week" (day-of-week), then
// "DD MMMM YYYY" for older rows. Order is preserved (input is already sorted
// `occurredAt DESC`).
export function groupTransactionsByOccurredAt<T extends { occurredAt: string }>(
  transactions: T[],
): { key: string; items: T[] }[] {
  const buckets: { key: string; items: T[] }[] = [];
  const indexByKey = new Map<string, number>();
  // Lazy import via require to avoid pulling date-fns into bundles for
  // screens that don't use this helper. date-fns is tree-shakeable so the
  // explicit import here is fine in practice.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { isToday, isYesterday, isThisWeek, format } = require('date-fns') as {
    isToday: (d: Date) => boolean;
    isYesterday: (d: Date) => boolean;
    isThisWeek: (d: Date, options?: { weekStartsOn?: number }) => boolean;
    format: (d: Date, fmt: string) => string;
  };
  for (const tx of transactions) {
    const d = new Date(tx.occurredAt);
    let key: string;
    if (isToday(d)) key = 'Today';
    else if (isYesterday(d)) key = 'Yesterday';
    else if (isThisWeek(d, { weekStartsOn: 1 })) key = format(d, 'EEEE');
    else key = format(d, 'd MMMM yyyy');
    const idx = indexByKey.get(key);
    if (idx !== undefined) {
      buckets[idx].items.push(tx);
    } else {
      indexByKey.set(key, buckets.length);
      buckets.push({ key, items: [tx] });
    }
  }
  return buckets;
}

export function relativeTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDateShort(iso);
}
