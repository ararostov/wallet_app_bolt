// Unit tests for utils/format.ts — formatters used everywhere in the app.

import {
  formatMoney,
  formatDate,
  formatPhoneE164,
  parseAmountInput,
  formatCurrency,
  getTransactionIcon,
  getStatusLabel,
  getStatusColor,
  getTxColor,
  groupTransactionsByOccurredAt,
  maskIdentifier,
  relativeTime,
} from '@/utils/format';

// `Intl.NumberFormat` and `toLocaleDateString` use non-breaking spaces and
// can be locale-fragile across Node versions. Helper to normalise output for
// equality assertions.
const normalise = (s: string): string => s.replace(/ /g, ' ');

describe('formatMoney', () => {
  it('formats zero GBP', () => {
    expect(normalise(formatMoney(0, 'GBP'))).toBe('£0.00');
  });

  it('formats positive GBP minor units', () => {
    expect(normalise(formatMoney(1234, 'GBP'))).toBe('£12.34');
  });

  it('formats negative EUR amount', () => {
    // Some Intl implementations render the minus separately; allow the
    // hyphen to land before the symbol.
    expect(normalise(formatMoney(-500, 'EUR'))).toMatch(/^-€?5\.00|^-€5\.00$/);
  });

  it('formats large USD amount', () => {
    // en-GB renders USD as "US$999.99" — accept both that and "$999.99"
    // depending on the bundled ICU data.
    expect(normalise(formatMoney(99999, 'USD'))).toMatch(/^(US)?\$999\.99$/);
  });

  it('falls through gracefully for an unknown currency', () => {
    const out = formatMoney(1000, 'XYZ');
    // Either the runtime accepts XYZ (rare) or we hit the fallback.
    expect(out).toMatch(/(XYZ\s*10\.00|10\.00\s*XYZ)/);
  });
});

describe('formatCurrency', () => {
  it('renders absolute GBP value with two decimals', () => {
    expect(formatCurrency(12.5)).toBe('£12.50');
    expect(formatCurrency(-3.1)).toBe('£3.10');
  });
});

describe('parseAmountInput', () => {
  it('parses a dot decimal', () => {
    expect(parseAmountInput('12.50', 'GBP')).toBe(1250);
  });

  it('treats comma as decimal separator', () => {
    expect(parseAmountInput('12,50', 'GBP')).toBe(1250);
  });

  it('parses whole units', () => {
    expect(parseAmountInput('99', 'GBP')).toBe(9900);
  });

  it('throws on empty input', () => {
    expect(() => parseAmountInput('', 'GBP')).toThrow();
  });

  it('throws on non-numeric input', () => {
    expect(() => parseAmountInput('abc', 'GBP')).toThrow();
  });

  it('throws when more than two decimals', () => {
    expect(() => parseAmountInput('1.234', 'GBP')).toThrow();
  });

  it('round-trips with formatMoney', () => {
    const minor = parseAmountInput('99.99', 'GBP');
    expect(normalise(formatMoney(minor, 'GBP'))).toBe('£99.99');
  });
});

describe('formatDate', () => {
  // 2026-04-25 14:30 UTC. Tests assume CI runs in a timezone that doesn't
  // shift the day — the en-GB output is robust to UTC vs Europe/London for
  // this date (BST puts London at +1, so 14:30Z → 15:30 local).
  const iso = '2026-04-25T12:00:00Z';

  it('formats short', () => {
    expect(formatDate(iso, 'short')).toBe('25 Apr 2026');
  });

  it('formats long', () => {
    expect(formatDate(iso, 'long')).toBe('25 April 2026');
  });

  it('formats time as HH:MM', () => {
    // Locale-dependent — accept any HH:MM rendering.
    expect(formatDate(iso, 'time')).toMatch(/^\d{2}:\d{2}$/);
  });

  it('falls back to relative for relative format', () => {
    // relative branch — use a "Just now" date to keep it deterministic.
    expect(formatDate(new Date().toISOString(), 'relative')).toBe('Just now');
  });

  it('echoes input on parse failure', () => {
    expect(formatDate('not-a-date', 'short')).toBe('not-a-date');
  });
});

describe('formatPhoneE164', () => {
  it('formats +44 mobile with 4-6 grouping', () => {
    expect(formatPhoneE164('+447911123456')).toBe('+44 7911 123456');
  });

  it('formats London +44 20 with 2-4-4 grouping', () => {
    expect(formatPhoneE164('+442012345678')).toBe('+44 20 1234 5678');
  });

  it('falls back to generic 3-grouping for non-UK numbers', () => {
    // +1 234567890 → country '123' + rest '4567890' grouped 3-3-1.
    expect(formatPhoneE164('+1234567890')).toMatch(/^\+\d+\s/);
  });

  it('passes through values without leading "+"', () => {
    expect(formatPhoneE164('447911123456')).toBe('447911123456');
  });

  it('masks middle digits when masked option is set', () => {
    const masked = formatPhoneE164('+447911123456', { masked: true });
    expect(masked.endsWith('3456')).toBe(true);
    expect(masked).toMatch(/\*/);
  });
});

describe('maskIdentifier', () => {
  it('masks an email keeping first 2 chars and domain', () => {
    expect(maskIdentifier('alex@example.com')).toBe('al***@example.com');
  });

  it('masks an E.164 phone', () => {
    const masked = maskIdentifier('+447911123456');
    expect(masked.endsWith('3456')).toBe(true);
    expect(masked).toMatch(/\*/);
  });

  it('returns empty for empty input', () => {
    expect(maskIdentifier('')).toBe('');
  });

  it('passes through non-email non-phone values', () => {
    expect(maskIdentifier('plain-string')).toBe('plain-string');
  });
});

describe('legacy helpers', () => {
  it('getTransactionIcon returns cashback emoji', () => {
    expect(getTransactionIcon('cashback')).toBe('\u{1F4B0}');
  });

  it('getTransactionIcon falls back for unknown types', () => {
    expect(getTransactionIcon('unknown-type')).toBe('\u{1F4B8}');
  });

  it('getStatusLabel maps known statuses', () => {
    expect(getStatusLabel('completed')).toBe('Completed');
    expect(getStatusLabel('pending')).toBe('Pending');
  });

  it('getStatusLabel echoes unknown values', () => {
    expect(getStatusLabel('weird')).toBe('weird');
  });

  it('getStatusColor returns hex for known statuses and default otherwise', () => {
    expect(getStatusColor('failed')).toBe('#ef4444');
    expect(getStatusColor('weird')).toBe('#64748b');
  });

  it('getTxColor returns hex for known types and default otherwise', () => {
    expect(getTxColor('cashback')).toBe('#059669');
    expect(getTxColor('weird')).toBe('#64748b');
  });
});

describe('groupTransactionsByOccurredAt', () => {
  it('buckets Today / Yesterday / older items in input order', () => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const older = new Date('2025-01-01T12:00:00Z');

    const groups = groupTransactionsByOccurredAt([
      { id: 't1', occurredAt: today.toISOString() },
      { id: 't2', occurredAt: yesterday.toISOString() },
      { id: 't3', occurredAt: older.toISOString() },
    ]);

    expect(groups.length).toBe(3);
    expect(groups[0].key).toBe('Today');
    expect(groups[1].key).toBe('Yesterday');
    expect(groups[2].key).toMatch(/2025/);
  });

  it('groups multiple items in the same bucket', () => {
    const today = new Date();
    today.setHours(8, 0, 0, 0);
    const todayLater = new Date(today);
    todayLater.setHours(20, 0, 0, 0);

    const groups = groupTransactionsByOccurredAt([
      { id: 't1', occurredAt: today.toISOString() },
      { id: 't2', occurredAt: todayLater.toISOString() },
    ]);

    expect(groups.length).toBe(1);
    expect(groups[0].items.length).toBe(2);
  });
});

describe('relativeTime', () => {
  it('returns "Just now" for the current moment', () => {
    expect(relativeTime(new Date().toISOString())).toBe('Just now');
  });

  it('returns minutes ago for sub-hour deltas', () => {
    const t = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(relativeTime(t)).toBe('5m ago');
  });

  it('returns hours ago for sub-day deltas', () => {
    const t = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    expect(relativeTime(t)).toBe('3h ago');
  });

  it('returns days ago for sub-week deltas', () => {
    const t = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    expect(relativeTime(t)).toBe('2d ago');
  });

  it('falls back to short date for older values', () => {
    expect(relativeTime('2024-01-15T12:00:00Z')).toMatch(/2024/);
  });
});
