// Visual-only checkbox — presentational, doesn't capture touches.
// Tap handling lives on the parent Pressable that wraps the whole row,
// which avoids nested-Pressable double-fires and missed events.
//
// Theme-aware: uncheched border uses colors.text for full contrast on
// white / dark backgrounds; checked fills with primary.

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Check } from 'lucide-react-native';

import { useTheme } from '@/context/ThemeContext';

interface CheckboxProps {
  checked: boolean;
  // Kept for backwards compatibility with existing call sites; tap is now
  // owned by the parent Pressable so this prop is effectively ignored.
  onToggle?: () => void;
  disabled?: boolean;
  hasError?: boolean;
  accessibilityLabel?: string;
}

export function Checkbox({ checked, hasError = false, disabled }: CheckboxProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.box,
        {
          borderColor: hasError ? colors.red : colors.text,
          backgroundColor: 'transparent',
        },
        checked && {
          backgroundColor: colors.primary,
          borderColor: colors.primary,
        },
        disabled && styles.disabled,
      ]}
    >
      {checked && <Check size={14} color="#fff" strokeWidth={3} />}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.5 },
});
