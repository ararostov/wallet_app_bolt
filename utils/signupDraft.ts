// Pure helpers for the signup draft. Kept out of `WalletContext.tsx` so the
// router (`app/index.tsx`) and other consumers can import them without
// pulling in the full provider module.

import type { SignupDraft } from '@/context/WalletContext';

export type SignupResumeRoute =
  | '/(onboarding)/signup'
  | '/(onboarding)/signup/profile'
  | '/(onboarding)/signup/otp';

// Structural check against `initialSignupDraft` — true when nothing the user
// would type or accept has been written yet. Cheap field-by-field comparison
// avoids importing the const and accidentally taking a hard dep on it.
export function isSignupDraftEmpty(draft: SignupDraft): boolean {
  return (
    draft.method === null &&
    draft.email === null &&
    draft.phoneE164 === null &&
    draft.firstName === null &&
    draft.lastName === null &&
    draft.dateOfBirth === null &&
    draft.referralCode === null &&
    draft.acceptedConsentIds.length === 0 &&
    draft.marketingOptIn === false &&
    draft.pendingCustomerId === null &&
    draft.verificationTarget === null &&
    draft.otpExpiresAt === null &&
    draft.resendDeadlineMs === null &&
    draft.registerIdempotencyKey === null
  );
}

// Decide which signup step a user with a hydrated draft should land on.
// Returns null when the draft is empty or its OTP window has lapsed — the
// caller should then route to the normal entry point (intro).
//
// Order matters:
//   1. If we already issued /auth/register (pendingCustomerId) and the OTP
//      window is still open → resume on the OTP screen so the code the user
//      already received remains usable.
//   2. Otherwise, pick the earliest step whose required fields are missing.
//      `signup` (channel + identifier + inline legal consents) → `profile`
//      (name + DOB), which now also fires /auth/register on Continue.
export function selectSignupResumeRoute(
  draft: SignupDraft,
  now: number = Date.now(),
): SignupResumeRoute | null {
  if (isSignupDraftEmpty(draft)) {
    return null;
  }

  if (draft.pendingCustomerId) {
    if (!draft.otpExpiresAt || Date.parse(draft.otpExpiresAt) > now) {
      return '/(onboarding)/signup/otp';
    }
    // OTP expired — the draft itself is stale. Caller decides whether to
    // wipe it; we don't suggest a screen.
    return null;
  }

  // Pre-register: pick whichever step still has unfilled required fields.
  const hasIdentifier = Boolean(draft.email || draft.phoneE164);
  if (!hasIdentifier) {
    return '/(onboarding)/signup';
  }
  return '/(onboarding)/signup/profile';
}

// Whether the draft's OTP window has lapsed. Consumers use this on cold-
// start to decide between restoring and wiping.
export function isOtpWindowExpired(
  draft: SignupDraft,
  now: number = Date.now(),
): boolean {
  if (!draft.otpExpiresAt) {
    return false;
  }
  return Date.parse(draft.otpExpiresAt) <= now;
}
