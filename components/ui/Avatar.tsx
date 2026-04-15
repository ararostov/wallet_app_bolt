import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';

interface AvatarProps {
  initials: string;
  size?: number;
  backgroundColor?: string;
  textColor?: string;
  style?: ViewStyle;
}

export function Avatar({
  initials,
  size = 48,
  backgroundColor = '#2563eb',
  textColor = '#fff',
  style,
}: AvatarProps) {
  const fontSize = size * 0.38;
  return (
    <View
      style={[
        styles.base,
        { width: size, height: size, borderRadius: size / 2, backgroundColor },
        style,
      ]}
    >
      <Text style={[styles.text, { fontSize, color: textColor }]}>
        {initials.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
