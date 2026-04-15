import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';

interface DividerProps {
  style?: ViewStyle;
  color?: string;
}

export function Divider({ style, color = '#e2e8f0' }: DividerProps) {
  return <View style={[styles.divider, { backgroundColor: color }, style]} />;
}

const styles = StyleSheet.create({
  divider: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },
});
