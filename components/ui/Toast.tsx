// Toast — non-blocking transient feedback primitive.
//
// Architecture:
//   - <ToastProvider> mounts at the app root inside ThemeProvider so we can
//     read theme colours. It renders an absolute-positioned <ToastView> at
//     the top or bottom safe-area edge.
//   - useToast() returns { show, hide } for components inside the React tree.
//   - Module-level `toast.show(...)` / `toast.hide()` work outside React
//     render — hooks, utilities, anywhere. Matches the spec convention from
//     `docs/mobile/conventions.ru.md` §19/§20.
//
// Behaviour:
//   - Single active toast at a time. A fresh `show()` while another toast is
//     visible replaces the existing one (no queue — keep the primitive
//     simple, queueing can be layered on later if a need surfaces).
//   - Auto-dismiss after `duration` ms (default 3000; pass 0 for persistent).
//   - Animate in/out with the built-in Animated API (translateY + fade,
//     200ms). We deliberately avoid react-native-reanimated here because the
//     project does not configure the babel plugin and bringing it in just
//     for one primitive is unnecessary.
//   - Variant colours come from ThemeContext (light/dark aware).
//   - Calls expo-haptics for success / warning / error variants for parity
//     with the rest of the app.
//   - Accessible: live region polite, role alert, label includes variant.

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { useTheme, type ThemeColors } from '@/context/ThemeContext';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastAction {
  label: string;
  onPress: () => void;
}

export interface ToastOptions {
  message: string;
  variant?: ToastVariant;
  /** Auto-dismiss after this many ms. Default 3000. Pass 0 for persistent. */
  duration?: number;
  position?: 'top' | 'bottom';
  onPress?: () => void;
  action?: ToastAction;
}

interface ToastInstance {
  show: (opts: ToastOptions) => void;
  hide: () => void;
}

interface ActiveToast extends Required<Omit<ToastOptions, 'onPress' | 'action'>> {
  id: number;
  onPress: (() => void) | null;
  action: ToastAction | null;
}

const DEFAULT_DURATION_MS = 3000;
const ANIM_MS = 200;

// ---------- Module-level singleton ----------

let _instance: ToastInstance | null = null;

export function _registerToastInstance(inst: ToastInstance | null): void {
  _instance = inst;
}

export const toast = {
  show: (opts: ToastOptions | string): void => {
    if (!_instance) return;
    _instance.show(typeof opts === 'string' ? { message: opts } : opts);
  },
  hide: (): void => {
    if (!_instance) return;
    _instance.hide();
  },
};

// ---------- React context ----------

const ToastContext = createContext<ToastInstance | null>(null);

export function useToast(): ToastInstance {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fall back to the module-level singleton so callers outside the
    // provider tree (rare, but possible during early bootstrap) still work.
    return {
      show: (opts) => toast.show(opts),
      hide: () => toast.hide(),
    };
  }
  return ctx;
}

// ---------- Provider ----------

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState<ActiveToast | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idRef = useRef(0);

  const clearTimer = useCallback((): void => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const hide = useCallback((): void => {
    clearTimer();
    setActive(null);
  }, [clearTimer]);

  const show = useCallback(
    (opts: ToastOptions): void => {
      clearTimer();
      idRef.current += 1;
      const next: ActiveToast = {
        id: idRef.current,
        message: opts.message,
        variant: opts.variant ?? 'info',
        duration: opts.duration ?? DEFAULT_DURATION_MS,
        position: opts.position ?? 'bottom',
        onPress: opts.onPress ?? null,
        action: opts.action ?? null,
      };
      setActive(next);

      // Match haptics convention from elsewhere in the codebase (see e.g.
      // RewardDetailSheet, signup/otp). Info has no haptic.
      if (next.variant === 'success') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (next.variant === 'warning') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } else if (next.variant === 'error') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }

      if (next.duration > 0) {
        timerRef.current = setTimeout(() => {
          setActive((current) => (current?.id === next.id ? null : current));
          timerRef.current = null;
        }, next.duration);
      }
    },
    [clearTimer],
  );

  const instance = useMemo<ToastInstance>(() => ({ show, hide }), [show, hide]);

  // Register / unregister the module-level singleton.
  useEffect(() => {
    _registerToastInstance(instance);
    return () => {
      _registerToastInstance(null);
    };
  }, [instance]);

  // Cleanup outstanding timer on unmount.
  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  return (
    <ToastContext.Provider value={instance}>
      {children}
      {active !== null && <ToastView toast={active} onDismiss={hide} />}
    </ToastContext.Provider>
  );
}

// ---------- View ----------

interface ToastViewProps {
  toast: ActiveToast;
  onDismiss: () => void;
}

function variantPalette(
  variant: ToastVariant,
  colors: ThemeColors,
): { bg: string; fg: string } {
  switch (variant) {
    case 'success':
      return { bg: colors.green, fg: '#ffffff' };
    case 'warning':
      return { bg: colors.amber, fg: '#ffffff' };
    case 'error':
      return { bg: colors.red, fg: '#ffffff' };
    case 'info':
    default:
      return { bg: colors.primary, fg: '#ffffff' };
  }
}

function ToastView({ toast: t, onDismiss }: ToastViewProps): React.ReactElement {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const palette = variantPalette(t.variant, colors);

  // Animated value drives both translateY and opacity. 0 = hidden, 1 = shown.
  const progress = useRef(new Animated.Value(0)).current;
  // Track the latest dismiss callback so the unmount animation always uses
  // the freshest closure (active toast may have been replaced).
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  // Animate in when this toast mounts (or its id changes).
  useEffect(() => {
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: ANIM_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [t.id, progress]);

  const animateOutAnd = useCallback(
    (after: () => void): void => {
      Animated.timing(progress, {
        toValue: 0,
        duration: ANIM_MS,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) after();
      });
    },
    [progress],
  );

  const handleBodyPress = (): void => {
    const userOnPress = t.onPress;
    animateOutAnd(() => {
      if (userOnPress) userOnPress();
      dismissRef.current();
    });
  };

  const handleActionPress = (): void => {
    const action = t.action;
    if (!action) return;
    animateOutAnd(() => {
      action.onPress();
      dismissRef.current();
    });
  };

  const isTop = t.position === 'top';
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: isTop ? [-24, 0] : [24, 0],
  });

  const wrapperStyle: ViewStyle = isTop
    ? { top: insets.top + 8 }
    : { bottom: insets.bottom + 8 };

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.wrapper, wrapperStyle]}
    >
      <Animated.View
        style={[
          styles.shadow,
          { opacity: progress, transform: [{ translateY }] },
        ]}
      >
        <Pressable
          onPress={handleBodyPress}
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          accessibilityLabel={`${t.variant}: ${t.message}`}
          style={[styles.toast, { backgroundColor: palette.bg }]}
        >
          <Text
            style={[styles.message, { color: palette.fg }]}
            numberOfLines={3}
          >
            {t.message}
          </Text>
          {t.action && (
            <View style={styles.actionWrap}>
              <Pressable
                onPress={handleActionPress}
                accessibilityRole="button"
                accessibilityLabel={t.action.label}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={({ pressed }) => [
                  styles.actionBtn,
                  pressed && styles.actionBtnPressed,
                ]}
              >
                <Text style={[styles.actionLabel, { color: palette.fg }]}>
                  {t.action.label}
                </Text>
              </Pressable>
            </View>
          )}
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    alignItems: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
  shadow: {
    width: '100%',
    maxWidth: 480,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    borderRadius: 12,
  },
  toast: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  actionWrap: {
    flexShrink: 0,
  },
  actionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  actionBtnPressed: {
    opacity: 0.7,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
});
