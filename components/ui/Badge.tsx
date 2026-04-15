import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';

interface BadgeProps {
  label: string;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

export function Badge({ label, variant = 'default', size = 'md', style }: BadgeProps) {
  return (
    <View style={[styles.base, styles[variant], size === 'sm' && styles.small, style]}>
      <Text style={[styles.text, styles[`text_${variant}`], size === 'sm' && styles.textSmall]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  small: {
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  default: { backgroundColor: '#dbeafe' },
  success: { backgroundColor: '#dcfce7' },
  warning: { backgroundColor: '#fef3c7' },
  error: { backgroundColor: '#fee2e2' },
  info: { backgroundColor: '#e0f2fe' },
  neutral: { backgroundColor: '#f1f5f9' },
  text: { fontSize: 12, fontWeight: '600' },
  textSmall: { fontSize: 11 },
  text_default: { color: '#1d4ed8' },
  text_success: { color: '#15803d' },
  text_warning: { color: '#d97706' },
  text_error: { color: '#dc2626' },
  text_info: { color: '#0369a1' },
  text_neutral: { color: '#475569' },
});
