// ExpiryBadge — amber "expires in N days" badge for rewards within 5 days
// of `expiresAt`. Renders nothing for already-expired / claimed / pending
// rows or when expiry is more than 5 days away.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Reward } from '@/types/loyalty';

const WARN_THRESHOLD_DAYS = 5;

export function ExpiryBadge({ reward }: { reward: Reward }): React.ReactElement | null {
  if (reward.status !== 'available' || !reward.expiresAt) return null;
  const millisLeft = new Date(reward.expiresAt).getTime() - Date.now();
  const daysLeft = Math.ceil(millisLeft / 86_400_000);
  if (daysLeft > WARN_THRESHOLD_DAYS) return null;
  const label =
    daysLeft <= 0 ? 'Expires today' : `Expires in ${daysLeft}d`;
  return (
    <View style={styles.badge}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
  text: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#92400e',
  },
});
