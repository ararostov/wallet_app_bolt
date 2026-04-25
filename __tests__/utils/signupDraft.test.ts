// Unit tests for utils/signupDraft.ts — pure routing/predicate helpers
// used by the cold-start router and WalletContext.

import {
  isOtpWindowExpired,
  isSignupDraftEmpty,
  selectSignupResumeRoute,
} from '@/utils/signupDraft';
import { initialSignupDraft } from '@/context/WalletContext';
import type { SignupDraft } from '@/context/WalletContext';

describe('isSignupDraftEmpty', () => {
  it('returns true for the canonical initial draft', () => {
    expect(isSignupDraftEmpty(initialSignupDraft)).toBe(true);
  });

  it('returns false when any field has been populated', () => {
    const dirty: SignupDraft = { ...initialSignupDraft, firstName: 'Alex' };
    expect(isSignupDraftEmpty(dirty)).toBe(false);
  });

  it('returns false when only the marketing flag is set', () => {
    const dirty: SignupDraft = { ...initialSignupDraft, marketingOptIn: true };
    expect(isSignupDraftEmpty(dirty)).toBe(false);
  });

  it('returns false when a consent has been accepted', () => {
    const dirty: SignupDraft = {
      ...initialSignupDraft,
      acceptedConsentIds: [1],
    };
    expect(isSignupDraftEmpty(dirty)).toBe(false);
  });
});

describe('isOtpWindowExpired', () => {
  const now = Date.parse('2026-04-25T12:00:00Z');

  it('returns false for a null window', () => {
    expect(isOtpWindowExpired(initialSignupDraft, now)).toBe(false);
  });

  it('returns true when otpExpiresAt is in the past', () => {
    const draft: SignupDraft = {
      ...initialSignupDraft,
      otpExpiresAt: '2026-04-25T11:00:00Z',
    };
    expect(isOtpWindowExpired(draft, now)).toBe(true);
  });

  it('returns false when otpExpiresAt is in the future', () => {
    const draft: SignupDraft = {
      ...initialSignupDraft,
      otpExpiresAt: '2026-04-25T13:00:00Z',
    };
    expect(isOtpWindowExpired(draft, now)).toBe(false);
  });
});

describe('selectSignupResumeRoute', () => {
  const now = Date.parse('2026-04-25T12:00:00Z');

  it('returns null for an empty draft', () => {
    expect(selectSignupResumeRoute(initialSignupDraft, now)).toBeNull();
  });

  it('routes to OTP when /auth/register has been issued and the window is open', () => {
    const draft: SignupDraft = {
      ...initialSignupDraft,
      method: 'email',
      email: 'alex@example.com',
      pendingCustomerId: 'cust_1',
      otpExpiresAt: '2026-04-25T13:00:00Z',
    };
    expect(selectSignupResumeRoute(draft, now)).toBe('/(onboarding)/signup/otp');
  });

  it('returns null when the OTP window has lapsed', () => {
    const draft: SignupDraft = {
      ...initialSignupDraft,
      method: 'email',
      email: 'alex@example.com',
      pendingCustomerId: 'cust_1',
      otpExpiresAt: '2026-04-25T11:00:00Z',
    };
    expect(selectSignupResumeRoute(draft, now)).toBeNull();
  });

  it('routes to /signup when no identifier has been entered yet', () => {
    const draft: SignupDraft = {
      ...initialSignupDraft,
      // marketingOptIn = true is enough to avoid empty-draft short-circuit.
      marketingOptIn: true,
    };
    expect(selectSignupResumeRoute(draft, now)).toBe('/(onboarding)/signup');
  });

  it('routes to /signup/profile when identifier exists but profile fields are missing', () => {
    const draft: SignupDraft = {
      ...initialSignupDraft,
      method: 'email',
      email: 'alex@example.com',
      firstName: 'Alex',
      // lastName/dob still missing
    };
    expect(selectSignupResumeRoute(draft, now)).toBe('/(onboarding)/signup/profile');
  });

  it('routes to /signup/profile when consents have been accepted on screen 1 but profile is empty', () => {
    // After the new flow's screen 1, the draft holds an identifier plus
    // accepted legal documents — but no name / DOB yet. The user should
    // resume on /signup/profile, where both the remaining fields and the
    // /auth/register call now live.
    const draft: SignupDraft = {
      ...initialSignupDraft,
      method: 'email',
      email: 'alex@example.com',
      acceptedConsentIds: [1, 2],
      marketingOptIn: true,
    };
    expect(selectSignupResumeRoute(draft, now)).toBe('/(onboarding)/signup/profile');
  });

  it('routes to /signup/profile when profile is complete but /auth/register has not run yet', () => {
    const draft: SignupDraft = {
      ...initialSignupDraft,
      method: 'email',
      email: 'alex@example.com',
      firstName: 'Alex',
      lastName: 'Smith',
      dateOfBirth: '1990-01-01',
      acceptedConsentIds: [1, 2],
    };
    expect(selectSignupResumeRoute(draft, now)).toBe('/(onboarding)/signup/profile');
  });
});
