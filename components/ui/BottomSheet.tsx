// BottomSheet — gesture-driven bottom sheet primitive.
//
// Architecture:
//   - Wraps `@gorhom/bottom-sheet`'s `BottomSheetModal` so call sites import
//     from `@/components/ui/BottomSheet`, matching the convention used by
//     `Toast`, `Checkbox`, `OtpInput`, etc.
//   - The host app must mount `<BottomSheetModalProvider>` (re-exported here
//     for convenience) inside `<GestureHandlerRootView>`. See `app/_layout.tsx`.
//
// API notes:
//   - The wrapper is declarative: callers control presentation via the
//     `visible` boolean. Internally we hold a ref to the modal and call
//     `present()` / `dismiss()` in a useEffect that reacts to `visible`.
//   - When the user dismisses by gesture (pan-down, backdrop tap), the lib
//     fires `onDismiss`, which we forward to `onClose` so parent state stays
//     in sync.
//   - Theme colours come from ThemeContext. Backdrop is rendered via the
//     library's `BottomSheetBackdrop` so the standard fade-in/-out animation
//     is preserved.
//   - Children render inside `BottomSheetView`, which auto-detects content
//     height (v5 dynamic sizing) when `enableDynamicSizing` is true. We
//     default to fixed snap points (50%) but callers can pass `snapPoints`
//     or set `enableDynamicSizing` to let the sheet hug its content.

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetModalProvider,
  BottomSheetScrollView,
  BottomSheetView,
  type BottomSheetBackdropProps,
  type BottomSheetModal as BottomSheetModalType,
} from '@gorhom/bottom-sheet';

import { useTheme } from '@/context/ThemeContext';

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  /**
   * Snap points for the sheet. Strings are percentages of the screen height,
   * numbers are absolute pixel heights. Sorted bottom-to-top.
   * Default: ['50%'].
   */
  snapPoints?: (string | number)[];
  /**
   * Allow the user to dismiss by swiping down. Default true.
   */
  enablePanDownToClose?: boolean;
  /**
   * Backdrop opacity at full visibility. Default 0.5.
   */
  backdropOpacity?: number;
  /**
   * When true, the sheet sizes itself to its content and ignores
   * `snapPoints`. Useful for short action sheets. Default false.
   */
  enableDynamicSizing?: boolean;
  /**
   * When true, content is wrapped in `BottomSheetScrollView` instead of
   * `BottomSheetView`. Use this when the content is taller than the
   * available snap height; the gesture handler delegates to scroll until
   * the inner scroll is at the top, then to the sheet pan-down.
   * Default false.
   */
  scrollable?: boolean;
  accessibilityLabel?: string;
  children: React.ReactNode;
}

export function BottomSheet({
  visible,
  onClose,
  snapPoints,
  enablePanDownToClose = true,
  backdropOpacity = 0.5,
  enableDynamicSizing = false,
  scrollable = false,
  accessibilityLabel,
  children,
}: BottomSheetProps): React.ReactElement {
  const { colors, isDark } = useTheme();
  const modalRef = useRef<BottomSheetModalType>(null);

  const memoSnapPoints = useMemo(
    () => snapPoints ?? ['50%'],
    [snapPoints],
  );

  // Drive present/dismiss from the visibility prop. We keep this declarative
  // so callers don't need to juggle a ref of their own.
  useEffect(() => {
    if (visible) {
      modalRef.current?.present();
    } else {
      modalRef.current?.dismiss();
    }
  }, [visible]);

  // When the user dismisses via gesture or backdrop tap the lib calls
  // onDismiss. Forward to the caller so parent state stays consistent.
  const handleDismiss = useCallback(() => {
    onClose();
  }, [onClose]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        opacity={backdropOpacity}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
      />
    ),
    [backdropOpacity],
  );

  return (
    <BottomSheetModal
      ref={modalRef}
      onDismiss={handleDismiss}
      snapPoints={enableDynamicSizing ? undefined : memoSnapPoints}
      enableDynamicSizing={enableDynamicSizing}
      enablePanDownToClose={enablePanDownToClose}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: colors.surface }}
      handleIndicatorStyle={{
        backgroundColor: isDark ? colors.textTertiary : colors.border,
      }}
      handleStyle={[styles.handle, { backgroundColor: colors.surface }]}
      accessibilityLabel={accessibilityLabel}
      accessibilityViewIsModal
    >
      {scrollable ? (
        <BottomSheetScrollView contentContainerStyle={styles.scrollContent}>
          {children}
        </BottomSheetScrollView>
      ) : (
        <BottomSheetView style={styles.content}>{children}</BottomSheetView>
      )}
    </BottomSheetModal>
  );
}

// Re-export the provider so the app root can mount it with a single import:
//   import { BottomSheetProvider } from '@/components/ui/BottomSheet';
export const BottomSheetProvider = BottomSheetModalProvider;

const styles = StyleSheet.create({
  handle: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
});
