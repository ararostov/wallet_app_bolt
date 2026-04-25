// Thin wrapper over expo-haptics so success / warning / error / impact calls
// share a single consistent API and the same fire-and-forget convention.
//
// Each function returns void — callers don't need to await; on platforms
// where haptics aren't available (web, simulators) the underlying expo-haptics
// promise rejects silently and we swallow it here.

import * as Haptics from 'expo-haptics';

function fire(promise: Promise<unknown>): void {
  promise.catch(() => undefined);
}

export const haptics = {
  success(): void {
    fire(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
  },
  warning(): void {
    fire(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
  },
  error(): void {
    fire(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
  },
  light(): void {
    fire(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
  },
  medium(): void {
    fire(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
  },
};
