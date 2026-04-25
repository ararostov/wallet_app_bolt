// TierBadge — circular badge showing tier name + emoji icon. The colour
// comes from a small lookup keyed by `levelOrder` so any 3-tier program
// (silver/gold/platinum or otherwise) renders consistently.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { useTheme } from '@/context/ThemeContext';

interface TierBadgeProps {
  name: string;
  levelOrder: number;
  size?: number;
}

const TIER_COLORS: Record<number, string> = {
  1: '#94a3b8', // entry / silver
  2: '#f59e0b', // gold
  3: '#a78bfa', // platinum
};

export function TierBadge({
  name,
  levelOrder,
  size = 120,
}: TierBadgeProps): React.ReactElement {
  const { colors } = useTheme();
  const color = TIER_COLORS[levelOrder] ?? '#94a3b8';
  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: color,
          backgroundColor: colors.surface,
          shadowColor: colors.shadowColor,
        },
      ]}
      accessibilityRole="image"
      accessibilityLabel={`${name} tier badge`}
    >
      <Text style={styles.star}>⭐</Text>
      <Text style={[styles.name, { color }]}>{name}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  star: { fontSize: 30 },
  name: { fontSize: 22, fontFamily: 'Inter-Bold' },
});
