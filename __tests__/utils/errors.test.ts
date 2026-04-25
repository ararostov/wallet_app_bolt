// Unit tests for utils/errors.ts — ApiError predicates, NetworkError shape,
// and the error-code → user-message map.

import { ApiError, NetworkError, mapErrorCode } from '@/utils/errors';

describe('ApiError', () => {
  it('exposes constructor params on the instance', () => {
    const err = new ApiError({
      status: 422,
      code: 'VALIDATION_FAILED',
      message: 'Bad inputs',
      requestId: 'req_123',
      details: { field: 'email' },
    });
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe('Bad inputs');
    expect(err.status).toBe(422);
    expect(err.code).toBe('VALIDATION_FAILED');
    expect(err.requestId).toBe('req_123');
    expect(err.details).toEqual({ field: 'email' });
    expect(err.name).toBe('ApiError');
  });

  it('classifies 422 as a validation error', () => {
    const err = new ApiError({ status: 422, code: 'X', message: 'x' });
    expect(err.isValidation()).toBe(true);
    expect(err.isUnauthorized()).toBe(false);
    expect(err.isServer()).toBe(false);
  });

  it('classifies 401 as unauthorized only', () => {
    const err = new ApiError({ status: 401, code: 'X', message: 'x' });
    expect(err.isUnauthorized()).toBe(true);
    expect(err.isValidation()).toBe(false);
    expect(err.isForbidden()).toBe(false);
  });

  it('classifies 403 as forbidden', () => {
    const err = new ApiError({ status: 403, code: 'X', message: 'x' });
    expect(err.isForbidden()).toBe(true);
  });

  it('classifies 409 as conflict', () => {
    const err = new ApiError({ status: 409, code: 'X', message: 'x' });
    expect(err.isConflict()).toBe(true);
  });

  it('classifies 429 as rate limit', () => {
    const err = new ApiError({ status: 429, code: 'X', message: 'x' });
    expect(err.isRateLimit()).toBe(true);
  });

  it('classifies 5xx as server errors', () => {
    expect(new ApiError({ status: 500, code: 'X', message: 'x' }).isServer()).toBe(true);
    expect(new ApiError({ status: 503, code: 'X', message: 'x' }).isServer()).toBe(true);
    expect(new ApiError({ status: 504, code: 'X', message: 'x' }).isServer()).toBe(true);
  });

  it('does not classify 4xx as server errors', () => {
    expect(new ApiError({ status: 400, code: 'X', message: 'x' }).isServer()).toBe(false);
    expect(new ApiError({ status: 422, code: 'X', message: 'x' }).isServer()).toBe(false);
  });
});

describe('NetworkError', () => {
  it('stores the message', () => {
    const err = new NetworkError('offline');
    expect(err).toBeInstanceOf(NetworkError);
    expect(err.message).toBe('offline');
    expect(err.name).toBe('NetworkError');
  });

  it('attaches the cause when provided', () => {
    const cause = new Error('TCP reset');
    const err = new NetworkError('offline', { cause });
    expect((err as NetworkError & { cause?: unknown }).cause).toBe(cause);
  });
});

describe('mapErrorCode', () => {
  it('returns a friendly message for known codes', () => {
    const msg = mapErrorCode('INVALID_VERIFICATION_CODE');
    expect(typeof msg).toBe('string');
    expect((msg ?? '').length).toBeGreaterThan(0);
  });

  it('returns a friendly message for VALIDATION_FAILED', () => {
    expect(mapErrorCode('VALIDATION_FAILED')).toBe(
      'Please check the fields and try again.',
    );
  });

  it('returns null for an unknown code', () => {
    expect(mapErrorCode('UNKNOWN_CODE_NOBODY_DEFINED')).toBeNull();
  });
});
