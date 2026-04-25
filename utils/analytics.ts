// Analytics stub for MVP. Backend analytics SDK (Amplitude/Mixpanel/Segment)
// will replace this after MVP without changing call sites.

import { logEvent } from './logger';

export type TrackProps = Record<string, string | number | boolean | null | undefined>;

export const Analytics = {
  track(event: string, props?: TrackProps): void {
    logEvent(event, props);
  },

  identify(userId: string, traits?: TrackProps): void {
    logEvent('identify', { userId, ...(traits ?? {}) });
  },

  reset(): void {
    logEvent('reset');
  },
};
