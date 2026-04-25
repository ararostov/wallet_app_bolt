// Unit tests for utils/validators.ts — pure synchronous predicates.

import {
  isValidEmail,
  isValidUkPhone,
  isValidE164,
  isValidDob18plus,
  isValidUkPostcode,
  isStrongPassword,
  isValidCardPin,
} from '@/utils/validators';

describe('isValidEmail', () => {
  it.each([
    ['a@b.co', true],
    ['alex.smith@example.co.uk', true],
    ['not-an-email', false],
    ['a@b', false],
    ['', false],
    ['  ', false],
  ])('isValidEmail(%p) = %p', (input, expected) => {
    expect(isValidEmail(input)).toBe(expected);
  });
});

describe('isValidE164', () => {
  it.each([
    ['+447911123456', true],
    ['+12025551234', true],
    ['447911123456', false], // no plus
    ['', false],
    ['+0', false],
  ])('isValidE164(%p) = %p', (input, expected) => {
    expect(isValidE164(input)).toBe(expected);
  });
});

describe('isValidUkPhone', () => {
  it('accepts UK +44 numbers', () => {
    expect(isValidUkPhone('+447911123456')).toBe(true);
  });

  it('rejects non-UK E.164 numbers', () => {
    expect(isValidUkPhone('+12025551234')).toBe(false);
  });

  it('rejects UK numbers without leading "+"', () => {
    expect(isValidUkPhone('07911123456')).toBe(false);
  });

  it('rejects empty input', () => {
    expect(isValidUkPhone('')).toBe(false);
  });
});

describe('isValidDob18plus', () => {
  it('accepts a clearly adult date', () => {
    expect(isValidDob18plus('1990-01-01')).toBe(true);
  });

  it('rejects a date 17 years ago', () => {
    const now = new Date();
    const seventeen = new Date(
      now.getFullYear() - 17,
      now.getMonth(),
      now.getDate(),
    );
    const iso = seventeen.toISOString().slice(0, 10);
    expect(isValidDob18plus(iso)).toBe(false);
  });

  it('accepts the day someone turns exactly 18', () => {
    const now = new Date();
    const eighteen = new Date(
      now.getFullYear() - 18,
      now.getMonth(),
      now.getDate(),
    );
    expect(isValidDob18plus(eighteen.toISOString().slice(0, 10))).toBe(true);
  });

  it('rejects a future date', () => {
    expect(isValidDob18plus('2999-01-01')).toBe(false);
  });

  it('rejects unparsable strings', () => {
    expect(isValidDob18plus('not-a-date')).toBe(false);
    expect(isValidDob18plus('')).toBe(false);
  });

  it('rejects implausibly old dates (>130y)', () => {
    expect(isValidDob18plus('1850-01-01')).toBe(false);
  });
});

describe('isValidUkPostcode', () => {
  it.each([
    ['SW1A 1AA', true],
    ['SW1A1AA', true], // optional space tolerated
    ['EC1A 1BB', true],
    ['12345', false],
    ['', false],
    ['ABC', false],
  ])('isValidUkPostcode(%p) = %p', (input, expected) => {
    expect(isValidUkPostcode(input)).toBe(expected);
  });
});

describe('isStrongPassword', () => {
  it('accepts a password with letters and digits and >=8 chars', () => {
    expect(isStrongPassword('Aa1bb456')).toBe(true);
  });

  it('rejects short passwords', () => {
    expect(isStrongPassword('Aa1')).toBe(false);
  });

  it('rejects letters-only', () => {
    expect(isStrongPassword('abcdefgh')).toBe(false);
  });

  it('rejects digits-only', () => {
    expect(isStrongPassword('12345678')).toBe(false);
  });
});

describe('isValidCardPin', () => {
  it.each([
    ['1234', true],
    ['123456', true],
    ['12', false],
    ['12a4', false],
    ['', false],
    ['1234567', false],
  ])('isValidCardPin(%p) = %p', (input, expected) => {
    expect(isValidCardPin(input)).toBe(expected);
  });
});
