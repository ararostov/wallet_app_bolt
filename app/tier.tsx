// Tier screen — spec 07-loyalty §4.3 + Bolt brief Bug #11.
//
// Tier rows render only cashback % + threshold (no boosted merchants /
// support / anniversary bonus). Manual upgrade endpoint returns 501 in MVP
// so we never render an upgrade button.

import React, { useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { ArrowLeft, ChevronDown, ChevronUp, Star } from 'lucide-react-native';

import { ProgressBar } from '@/components/ui/ProgressBar';
import { TierBadge } from '@/components/features/loyalty/TierBadge';
import { useTheme } from '@/context/ThemeContext';
import { useTierState } from '@/hooks/useTierState';
import { useWallet } from '@/context/WalletContext';
import type { TierLevel } from '@/types/loyalty';
import { formatMoney } from '@/utils/format';

const TIER_BAR_COLORS: Record<number, string> = {
  1: '#94a3b8',
  2: '#f59e0b',
  3: '#a78bfa',
};

function tierBarColor(levelOrder: number): string {
  return TIER_BAR_COLORS[levelOrder] ?? '#94a3b8';
}

export default function TierScreen(): React.ReactElement {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { state } = useWallet();
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);

  const tierQuery = useTierState();
  const tier = tierQuery.data ?? state.tierApiFull;
  const refreshing = tierQuery.loading && tier !== null;

  const renderProgressCopy = (): string | null => {
    if (!tier) return null;
    if (!tier.next || !tier.next.threshold) return "You've reached the top tier";
    const remainingMinor = Math.max(
      0,
      tier.next.threshold.amountMinor - tier.progress.amount.amountMinor,
    );
    return `${formatMoney(remainingMinor, tier.next.threshold.currency)} away from ${
      tier.next.name
    }`;
  };

  return (
    <SafeAreaView
      edges={['left', 'right']}
      style={[styles.safe, { backgroundColor: colors.background }]}
    >
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
            paddingTop: insets.top + 14,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Loyalty tier</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 24 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={tierQuery.refetch}
            tintColor={colors.primary}
          />
        }
      >
        {tierQuery.loading && !tier ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />
        ) : !tier ? (
          <Text
            style={[styles.empty, { color: colors.textSecondary }]}
          >
            Tier information is unavailable.
          </Text>
        ) : (
          <>
            <View style={styles.tierHero}>
              <TierBadge
                name={tier.current.name}
                levelOrder={tier.current.levelOrder}
              />
              <Text style={[styles.cashbackRate, { color: colors.text }]}>
                {tier.current.cashbackRateDisplay} on every purchase
              </Text>
              {renderProgressCopy() ? (
                <Text style={[styles.awayText, { color: colors.textSecondary }]}>
                  {renderProgressCopy()}
                </Text>
              ) : null}
            </View>

            {tier.next && tier.next.threshold ? (
              <View
                style={[
                  styles.progressCard,
                  {
                    backgroundColor: colors.surface,
                    shadowColor: colors.shadowColor,
                  },
                ]}
              >
                <View style={styles.progressHeader}>
                  <Text
                    style={[
                      styles.progressLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Qualifying spend
                  </Text>
                  <Text style={[styles.progressValue, { color: colors.text }]}>
                    {formatMoney(
                      tier.progress.amount.amountMinor,
                      tier.progress.amount.currency,
                    )}{' '}
                    /{' '}
                    {formatMoney(
                      tier.next.threshold.amountMinor,
                      tier.next.threshold.currency,
                    )}
                  </Text>
                </View>
                <ProgressBar
                  progress={tier.progress.percentage / 100}
                  color={tierBarColor(tier.current.levelOrder)}
                  trackColor={colors.border}
                />
                <Text
                  style={[styles.progressReset, { color: colors.textTertiary }]}
                >
                  {tier.resetDays === 0
                    ? 'Resets today'
                    : `Resets in ${tier.resetDays} days`}
                </Text>
              </View>
            ) : null}

            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              All tiers
            </Text>
            <TierComparisonRow
              tierLevel={tier.current}
              isCurrent
              accentColor={tierBarColor(tier.current.levelOrder)}
              isDark={isDark}
            />
            {tier.next ? (
              <TierComparisonRow
                tierLevel={tier.next}
                isCurrent={false}
                accentColor={tierBarColor(tier.next.levelOrder)}
                isDark={isDark}
              />
            ) : null}

            <TouchableOpacity
              style={[styles.expandRow, { borderTopColor: colors.border }]}
              onPress={() => setHowItWorksOpen((v) => !v)}
              accessibilityRole="button"
            >
              <Text style={[styles.expandTitle, { color: colors.text }]}>
                How tiers work
              </Text>
              {howItWorksOpen ? (
                <ChevronUp size={18} color={colors.textSecondary} />
              ) : (
                <ChevronDown size={18} color={colors.textSecondary} />
              )}
            </TouchableOpacity>
            {howItWorksOpen ? (
              <View style={styles.expandContent}>
                <Text
                  style={[styles.expandText, { color: colors.textSecondary }]}
                >
                  Your tier is based on your qualifying spend in the last{' '}
                  {tier.windowDays} days. Higher tiers earn more cashback. Tier
                  changes happen automatically based on your spend.
                </Text>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

interface TierComparisonRowProps {
  tierLevel: TierLevel;
  isCurrent: boolean;
  accentColor: string;
  isDark: boolean;
}

function TierComparisonRow({
  tierLevel,
  isCurrent,
  accentColor,
  isDark,
}: TierComparisonRowProps): React.ReactElement {
  const { colors } = useTheme();
  const thresholdLabel = tierLevel.threshold
    ? `Spend ${formatMoney(
        tierLevel.threshold.amountMinor,
        tierLevel.threshold.currency,
      )}+`
    : 'Default tier';
  return (
    <View
      style={[
        styles.tierRow,
        {
          backgroundColor: colors.surface,
          borderColor: isCurrent ? colors.primary : colors.border,
        },
        isCurrent && {
          backgroundColor: isDark ? '#1E293B' : '#f8faff',
        },
      ]}
      accessibilityRole="text"
      accessibilityLabel={`${tierLevel.name} tier${isCurrent ? ', current' : ''}, ${tierLevel.cashbackRateDisplay} cashback, ${thresholdLabel}`}
    >
      <View
        style={[
          styles.tierIconBg,
          { backgroundColor: isDark ? colors.surfaceAlt : '#f1f5f9' },
        ]}
      >
        <Star size={22} color={accentColor} />
      </View>
      <View style={styles.tierInfo}>
        <View style={styles.tierNameRow}>
          <Text style={[styles.tierName, { color: accentColor }]}>
            {tierLevel.name}
          </Text>
          {isCurrent ? (
            <View
              style={[
                styles.currentBadge,
                { backgroundColor: isDark ? '#1E3A5F' : '#dbeafe' },
              ]}
            >
              <Text style={[styles.currentBadgeText, { color: colors.primary }]}>
                ✓ Current
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={[styles.tierThreshold, { color: colors.textSecondary }]}>
          {thresholdLabel}
        </Text>
      </View>
      <View style={styles.tierCashback}>
        <Text style={[styles.tierCashbackPct, { color: colors.text }]}>
          {tierLevel.cashbackRateDisplay}
        </Text>
        <Text
          style={[styles.tierCashbackLabel, { color: colors.textSecondary }]}
        >
          cashback
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 19, fontFamily: 'Inter-SemiBold' },
  scroll: { padding: 16, paddingBottom: 80 },
  empty: { textAlign: 'center', fontFamily: 'Inter-Regular', marginTop: 40 },
  tierHero: { alignItems: 'center', paddingVertical: 20, gap: 10 },
  cashbackRate: { fontSize: 16, fontFamily: 'Inter-SemiBold' },
  awayText: { fontSize: 15, fontFamily: 'Inter-Medium', textAlign: 'center' },
  progressCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    gap: 10,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { fontSize: 14, fontFamily: 'Inter-Medium' },
  progressValue: { fontSize: 14, fontFamily: 'Inter-SemiBold' },
  progressReset: { fontSize: 13, fontFamily: 'Inter-Regular' },
  sectionTitle: { fontSize: 18, fontFamily: 'Inter-Bold', marginBottom: 12 },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    padding: 16,
  },
  tierIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierInfo: { flex: 1, gap: 4 },
  tierNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tierName: { fontSize: 17, fontFamily: 'Inter-Bold' },
  currentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  currentBadgeText: { fontSize: 13, fontFamily: 'Inter-SemiBold' },
  tierThreshold: { fontSize: 14, fontFamily: 'Inter-Regular' },
  tierCashback: { alignItems: 'flex-end' },
  tierCashbackPct: { fontSize: 22, fontFamily: 'Inter-Bold' },
  tierCashbackLabel: { fontSize: 13, fontFamily: 'Inter-Regular' },
  expandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderTopWidth: 1,
    marginTop: 8,
  },
  expandTitle: { fontSize: 16, fontFamily: 'Inter-SemiBold' },
  expandContent: { paddingBottom: 16 },
  expandText: { fontSize: 15, fontFamily: 'Inter-Regular', lineHeight: 22 },
});
