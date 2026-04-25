// Deep link router. Parses incoming URLs and forwards to the right Expo Router
// destination. Spec-specific paths get added as features land.

import * as Linking from 'expo-linking';
import { router } from 'expo-router';

import { logDebug } from './logger';

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
    default: {
      logDebug('Unknown deep link', { url, root });
    }
  }
}
