// Deep link router. Parses incoming URLs and forwards to the right Expo Router
// destination. Spec-specific paths get added as features land.

import * as Linking from 'expo-linking';
import { router } from 'expo-router';

import { logDebug } from './logger';

// Whitelist of route prefixes the app is willing to navigate to from a
// notification payload's `actionRoute`. Anything outside the whitelist is
// dropped — the route comes from server templates that we trust, but the
// allow-list is a defence-in-depth against payload injection.
//
// See spec 09-notifications §8.3.
const ALLOWED_ACTION_ROUTE_PREFIXES = [
  '/transactions',
  '/rewards',
  '/tier',
  '/card',
  '/topup',
  '/notifications',
  '/profile',
  '/payment-methods',
  '/referral',
  '/(tabs)',
];

export function isValidActionRoute(route: string): boolean {
  if (typeof route !== 'string' || route.length === 0) return false;
  if (!route.startsWith('/')) return false;
  // Strip query string for the prefix check.
  const path = route.split('?')[0]!;
  return ALLOWED_ACTION_ROUTE_PREFIXES.some(
    (p) => path === p || path.startsWith(`${p}/`) || path.startsWith(`${p}?`),
  );
}

// Generic in-app navigation for an `actionRoute` string sourced from a
// notification payload. Validates against the whitelist; logs and drops
// anything that fails. Safe to call with `null` / undefined.
export function handleActionRoute(actionRoute: string | null | undefined): void {
  if (!actionRoute) return;
  if (!isValidActionRoute(actionRoute)) {
    logDebug('Dropped unsafe actionRoute', { actionRoute });
    return;
  }
  try {
    // Expo Router accepts any internal path. Cast widens the typed-routes
    // signature; the whitelist above is what keeps this safe.
    router.push(actionRoute as never);
  } catch (error) {
    logDebug('Failed to push actionRoute', { actionRoute, error: String(error) });
  }
}

// Lazy import-free callback used by handleDeepLink to forward referral codes
// into WalletContext. Wired at WalletProvider mount.
let referralListener: ((code: string) => void) | null = null;
export function setReferralDeepLinkListener(fn: ((code: string) => void) | null): void {
  referralListener = fn;
}

const REFERRAL_RE = /^[A-Z0-9-]{4,12}$/;

export function handleDeepLink(url: string): void {
  if (!url) return;

  let parsed: ReturnType<typeof Linking.parse>;
  try {
    parsed = Linking.parse(url);
  } catch (error) {
    logDebug('Failed to parse deep link', { url, error: String(error) });
    return;
  }

  const path = parsed.hostname ?? parsed.path ?? '';
  const segments = path.split('/').filter(Boolean);
  const root = segments[0];
  const queryParams = (parsed.queryParams ?? {}) as Record<string, string | string[] | undefined>;

  switch (root) {
    case 'invite': {
      const codeRaw = queryParams.code;
      const code = typeof codeRaw === 'string' ? codeRaw.toUpperCase() : null;
      if (!code || !REFERRAL_RE.test(code)) {
        logDebug('Ignored invite link with invalid code', { url });
        return;
      }
      referralListener?.(code);
      // The reducer decides whether to put the code in signupDraft (logged-out)
      // or pendingReferralCode (logged-in). Routing follows.
      router.push('/(onboarding)/intro');
      return;
    }
    case 'transactions': {
      const id = segments[1] ?? (typeof queryParams.id === 'string' ? queryParams.id : undefined);
      if (id) {
        router.push({ pathname: '/transactions/[id]', params: { id } });
      } else {
        router.push('/transactions');
      }
      return;
    }
    case 'referral': {
      // `walletapp://referral?code=ABC` — same semantics as `invite`:
      // forward a candidate code to the auth slice (which decides whether
      // to stash it in the signup draft or in `pendingReferralCode`) and
      // then route. Logged-in users land on /referral; logged-out users
      // pick up the code from the signup draft when they reach
      // /(onboarding)/intro.
      const codeRaw = queryParams.code;
      const code = typeof codeRaw === 'string' ? codeRaw.toUpperCase() : null;
      if (code && REFERRAL_RE.test(code)) {
        referralListener?.(code);
      }
      router.push({
        pathname: '/referral',
        params: Object.fromEntries(
          Object.entries(queryParams).filter(
            (entry): entry is [string, string] => typeof entry[1] === 'string',
          ),
        ),
      });
      return;
    }
    case 'notifications': {
      router.push('/notifications');
      return;
    }
    case 'topup': {
      // walletapp://topup/return?paymentOrderId=… — fallback path for the
      // PSP redirect on Android, where `expo-web-browser` may not auto-close
      // the in-app browser on every device. iOS AuthSession resolves via the
      // promise instead and never reaches this branch.
      const subroute = segments[1];
      if (subroute === 'return') {
        const paymentOrderIdRaw =
          queryParams.paymentOrderId ?? queryParams.po;
        const paymentOrderId =
          typeof paymentOrderIdRaw === 'string' ? paymentOrderIdRaw : undefined;
        if (paymentOrderId) {
          router.push({
            pathname: '/topup/result',
            params: { paymentOrderId },
          });
        }
      }
      return;
    }
    default: {
      logDebug('Unknown deep link', { url, root });
    }
  }
}
