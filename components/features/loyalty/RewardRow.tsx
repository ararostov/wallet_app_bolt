// RewardRow — single row in the rewards feed (spec 07-loyalty §4.1).

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  BadgeCheck,
  Gift,
  Sparkles,
  TrendingUp,
  Users,
  type LucideIcon,
} from 'lucide-react-native';

import type { Reward, RewardStatus } from '@/types/loyalty';
import { useTheme } from '@/context/ThemeContext';
import { formatDate, formatMoney } from '@/utils/format';
import { ExpiryBadge } from './ExpiryBadge';

interface RewardRowProps {
  reward: Reward;
  onPress: () => void;
}

function pickIcon(reward: Reward): LucideIcon {
  if (reward.source === 'referral') return Users;
  switch (reward.bucket) {
    case 'cashback':
      return TrendingUp;
    case 'bonus':
      return Gift;
    case 'promo':
      return Sparkles;
    default:
      return BadgeCheck;
  }
}

function statusBadge(
  status: RewardStatus,
  isDark: boolean,
): { bg: string; text: string; label: string } {
  const labels: Record<RewardStatus, string> = {
    available: 'Available',
    pending: 'Pending',
    claimed: 'Claimed',
    expired: 'Expired',
    cancelled: 'Cancelled',
  };
  if (isDark) {
    switch (status) {
      case 'available':
        return { bg: '#064E3B', text: '#34D399', label: labels[status] };
      case 'pending':
        return { bg: '#78350F', text: '#FBBF24', label: labels[status] };
      case 'claimed':
        return { bg: '#1E3A5F', text: '#3B82F6', label: labels[status] };
      case 'expired':
      case 'cancelled':
        return { bg: '#334155', text: '#94A3B8', label: labels[status] };
    }
  }
  switch (status) {
    case 'available':
      return { bg: '#dcfce7', text: '#15803d', label: labels[status] };
    case 'pending':
      return { bg: '#fef3c7', text: '#92400e', label: labels[status] };
    case 'claimed':
      return { bg: '#dbeafe', text: '#1d4ed8', label: labels[status] };
    case 'expired':
    case 'cancelled':
      return { bg: '#f1f5f9', text: '#475569', label: labels[status] };
  }
}

export function RewardRow({ reward, onPress }: RewardRowProps): React.ReactElement {
  const { colors, isDark } = useTheme();
  const Icon = pickIcon(reward);
  const sb = statusBadge(reward.status, isDark);
  const isPositive = reward.status !== 'expired' && reward.status !== 'cancelled';
  const subtitleParts: string[] = [];
  subtitleParts.push(`Earned ${formatDate(reward.earnedAt, 'short')}`);
  if (reward.expiresAt) {
    subtitleParts.push(`Expires ${formatDate(reward.expiresAt, 'short')}`);
  }

  const accessibilityLabel = `${reward.title}, ${formatMoney(
    reward.amount.amountMinor,
    reward.amount.currency,
  )}, status ${sb.label}`;

  return (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: colors.borderLight }]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <View
        style={[
          styles.iconBox,
          { backgroundColor: isDark ? colors.surfaceAlt : '#f1f5f9' },
        ]}
      >
        <Icon size={20} color={colors.primary} />
      </View>
      <View style={styles.info}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {reward.title}
        </Text>
        <Text
          style={[styles.meta, { color: colors.textTertiary }]}
          numberOfLines={1}
        >
          {subtitleParts.join(' · ')}
        </Text>
      </View>
      <View style={styles.right}>
        <Text
          style={[
            styles.amount,
            { color: isPositive ? '#059669' : colors.textTertiary },
          ]}
        >
          {isPositive ? '+' : ''}
          {formatMoney(reward.amount.amountMinor, reward.amount.currency)}
        </Text>
        <View style={styles.badges}>
          <View style={[styles.statusBadge, { backgroundColor: sb.bg }]}>
            <Text style={[styles.statusText, { color: sb.text }]}>{sb.label}</Text>
          </View>
          <ExpiryBadge reward={reward} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, gap: 2 },
  title: { fontSize: 16, fontFamily: 'Inter-SemiBold', lineHeight: 20 },
  meta: { fontSize: 13, fontFamily: 'Inter-Regular' },
  right: { alignItems: 'flex-end', gap: 4 },
  amount: { fontSize: 17, fontFamily: 'Inter-SemiBold' },
  badges: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  statusText: { fontSize: 12, fontFamily: 'Inter-SemiBold' },
});
