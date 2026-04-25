// SwipeableRow — wraps `Swipeable` from react-native-gesture-handler with a
// single right-side delete action.
//
// Behaviour matches spec 09 §4.3:
//   - Slide left to reveal a red "Delete" panel on the right.
//   - Short swipe leaves the action visible — user taps Delete to confirm.
//   - Full swipe past the threshold auto-fires the delete on release.
//   - Tapping the body (when the panel is closed) calls `onPress`. When the
//     panel is open, the Pressable's onPress closes the swipe instead of
//     firing the body action — this matches the iOS Mail-style UX.
//   - Theme-aware red comes from ThemeContext.
//   - Haptics: warning notification fires once when the panel transitions
//     from closed -> open so the user feels the row "arm" itself.
//
// The component renders a Pressable around `children` so the row stays
// tappable; pass `onPress` to forward taps. `accessibilityLabel` is forwarded
// to the row Pressable, while the action button has its own accessible
// label derived from the same prop ("Delete <itemLabel>") for screen readers.

import React, { useCallback, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
} from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';

import { useTheme } from '@/context/ThemeContext';
import { haptics } from '@/utils/haptics';

export interface SwipeableRowProps {
  children: React.ReactNode;
  onDelete?: () => void;
  /** Defaults to "Delete". */
  deleteLabel?: string;
  onPress?: () => void;
  disabled?: boolean;
  /** Forwarded to the row Pressable; also used to compose the action label. */
  accessibilityLabel?: string;
}

const ACTION_WIDTH = 84;

export function SwipeableRow({
  children,
  onDelete,
  deleteLabel = 'Delete',
  onPress,
  disabled = false,
  accessibilityLabel,
}: SwipeableRowProps): React.ReactElement {
  const { colors } = useTheme();
  const swipeableRef = useRef<Swipeable | null>(null);
  const isOpenRef = useRef(false);

  const close = useCallback((): void => {
    swipeableRef.current?.close();
  }, []);

  const handleDelete = useCallback((): void => {
    isOpenRef.current = false;
    swipeableRef.current?.close();
    onDelete?.();
  }, [onDelete]);

  const handleBodyPress = useCallback(
    (_e: GestureResponderEvent): void => {
      // If the action panel is open, treat a body tap as "close the panel"
      // rather than firing the row's own onPress — matches iOS conventions.
      if (isOpenRef.current) {
        close();
        return;
      }
      onPress?.();
    },
    [close, onPress],
  );

  const handleWillOpen = useCallback((direction: 'left' | 'right'): void => {
    if (direction !== 'right') return;
    haptics.warning();
  }, []);

  const handleOpen = useCallback((direction: 'left' | 'right'): void => {
    if (direction !== 'right') return;
    isOpenRef.current = true;
  }, []);

  const handleClose = useCallback((): void => {
    isOpenRef.current = false;
  }, []);

  const renderRightActions = useCallback(
    (
      progress: Animated.AnimatedInterpolation<number>,
      _drag: Animated.AnimatedInterpolation<number>,
    ): React.ReactNode => {
      // Slide the action in proportionally as the user drags.
      const translateX = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [ACTION_WIDTH, 0],
        extrapolate: 'clamp',
      });
      const composedAccessibilityLabel = accessibilityLabel
        ? `${deleteLabel} ${accessibilityLabel}`
        : deleteLabel;
      return (
        <View style={styles.actionContainer}>
          <Animated.View
            style={[
              styles.action,
              { backgroundColor: colors.red, transform: [{ translateX }] },
            ]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={composedAccessibilityLabel}
              onPress={handleDelete}
              style={styles.actionPressable}
            >
              <Text style={styles.actionText}>{deleteLabel}</Text>
            </Pressable>
          </Animated.View>
        </View>
      );
    },
    [accessibilityLabel, colors.red, deleteLabel, handleDelete],
  );

  if (disabled || !onDelete) {
    // No swipe action available — render the row as a plain pressable so
    // callers can still pass `onPress`.
    return (
      <Pressable
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        disabled={disabled}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <Swipeable
      ref={(ref) => {
        swipeableRef.current = ref;
      }}
      renderRightActions={renderRightActions}
      friction={2}
      rightThreshold={ACTION_WIDTH * 0.6}
      overshootRight={false}
      onSwipeableWillOpen={handleWillOpen}
      onSwipeableOpen={handleOpen}
      onSwipeableClose={handleClose}
    >
      <Pressable
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={accessibilityLabel}
        onPress={handleBodyPress}
      >
        {children}
      </Pressable>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  actionContainer: {
    width: ACTION_WIDTH,
    overflow: 'hidden',
  },
  action: {
    flex: 1,
    width: ACTION_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPressable: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  actionText: {
    color: '#ffffff',
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
  },
});
