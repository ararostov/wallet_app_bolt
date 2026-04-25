// Deep link router. Parses incoming URLs and forwards to the right Expo Router
// destination. Spec-specific paths get added as features land.

import * as Linking from 'expo-linking';
import { router } from 'expo-router';

import { logDebug } from './logger';

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
