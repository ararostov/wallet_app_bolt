// Accessible checkbox tile with theme support.
// Used by Consents screen but kept generic.

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Check } from 'lucide-react-native';

import { useTheme } from '@/context/ThemeContext';

interface CheckboxProps {
  checked: boolean;
  onToggle: () => void;
  disabled?: boolean;
  hasError?: boolean;
  accessibilityLabel?: string;
}

export function Checkbox({
  checked,
  onToggle,
  disabled = false,
  hasError = false,
  accessibilityLabel,
}: CheckboxProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={() => {
        if (!disabled) onToggle();
      }}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={accessibilityLabel}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={({ pressed }) => [
        styles.box,
        {
          borderColor: hasError ? colors.red : colors.textTertiary,
          backgroundColor: 'transparent',
        },
        checked && {
          backgroundColor: colors.primary,
          borderColor: colors.primary,
        },
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      {checked && (
        <View style={styles.center}>
          <Check size={14} color="#fff" strokeWidth={3} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.8 },
});
