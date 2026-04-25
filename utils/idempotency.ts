// Idempotency key generator for write-money operations.
// Generate once per logical operation, reuse across retries.

import { v4 as uuidv4 } from 'uuid';

export function newIdempotencyKey(): string {
  return uuidv4();
}
