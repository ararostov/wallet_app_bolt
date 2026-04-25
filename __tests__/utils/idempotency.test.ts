// Unit tests for utils/idempotency.ts — UUID v4 generator.

import { newIdempotencyKey } from '@/utils/idempotency';

const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('newIdempotencyKey', () => {
  it('returns a UUID v4', () => {
    expect(newIdempotencyKey()).toMatch(UUID_V4_RE);
  });

  it('returns distinct values across calls', () => {
    const a = newIdempotencyKey();
    const b = newIdempotencyKey();
    expect(a).not.toBe(b);
  });
});
