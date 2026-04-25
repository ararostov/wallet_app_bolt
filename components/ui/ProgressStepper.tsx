// Onboarding progress indicator. Renders `total` segments and fills the
// first `current` of them. Includes a textual label "X of Y" for a11y.

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/context/ThemeContext';

interface ProgressStepperProps {
  current: number;
  total: number;
}

export function ProgressStepper({ current, total }: ProgressStepperProps) {
  const { colors } = useTheme();
  return (
    <View
      style={styles.row}
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${current} of ${total}`}
    >
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.step,
            { backgroundColor: colors.border },
            i < current && { backgroundColor: colors.primary },
          ]}
        />
      ))}
      <Text style={[styles.label, { color: colors.textTertiary }]}>
        {current} of {total}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 28 },
  step: { flex: 1, height: 4, borderRadius: 2 },
  label: { fontSize: 15, fontFamily: 'Inter-Regular', marginLeft: 4 },
});
