// Rewards tab — spec 07-loyalty §4.1.
//
// Replaces the previous mock-driven implementation with the loyalty API
// surface: cursor-paginated `useRewards`, hero summary derived from the
// feed, bucket filter chips (cashback / bonus / promo — referral source
// rewards are folded into the bonus chip per the OpenAPI bucket enum),
// reward detail bottom sheet with claim CTA.

import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { ArrowLeft, ChevronDown, ChevronUp, Gift } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { RewardDetailSheet } from '@/components/features/loyalty/RewardDetailSheet';
import { RewardRow } from '@/components/features/loyalty/RewardRow';
import { useTheme } from '@/context/ThemeContext';
import { useRewards } from '@/hooks/useRewards';
import { useWallet } from '@/context/WalletContext';
import type { RewardBucket } from '@/types/loyalty';
import { formatMoney } from '@/utils/format';

type BucketFilter = 'all' | RewardBucket;

const BUCKET_FILTERS: { id: BucketFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'cashback', label: 'Cashback' },
  { id: 'bonus', label: 'Bonus' },
  { id: 'promo', label: 'Promo' },
];

export default function RewardsScreen(): React.ReactElement {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { state } = useWallet();
  const params = useLocalSearchParams<{ rewardId?: string }>();

  const [activeBucket, setActiveBucket] = useState<BucketFilter>('all');
  const [selectedRewardId, setSelectedRewardId] = useState<string | null>(null);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);

  const rewardsQuery = useRewards();

  // Auto-open detail sheet on deep-link param.
  useEffect(() => {
    if (typeof params.rewardId === 'string' && params.rewardId.length > 0) {
      setSelectedRewardId(params.rewardId);
    }
  }, [params.rewardId]);

  const items = rewardsQuery.data;
  const summary = state.rewardsSummary;

  const filtered = useMemo(() => {
    if (activeBucket === 'all') return items;
    return items.filter((r) => r.bucket === activeBucket);
  }, [items, activeBucket]);

  const currency = summary?.currency ?? 'GBP';
  const heroEarned = summary
    ? formatMoney(summary.earnedAllTimeMinor, summary.currency)
    : formatMoney(0, currency);
  const heroPending = summary
    ? formatMoney(summary.pendingMinor, summary.currency)
    : formatMoney(0, currency);

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
        <Text style={[styles.title, { color: colors.text }]}>Rewards</Text>
        <View style={styles.headerLinks}>
          <TouchableOpacity onPress={() => router.push('/tier')}>
            <Text style={[styles.headerLink, { color: colors.primary }]}>Tier</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/rewards/statement')}>
            <Text style={[styles.headerLink, { color: colors.primary }]}>
              Statement
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 24 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={rewardsQuery.refreshing}
            onRefresh={rewardsQuery.refresh}
            tintColor={colors.primary}
          />
        }
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (rewardsQuery.hasMore && !rewardsQuery.loadingMore) {
            void rewardsQuery.loadMore();
          }
        }}
        ListHeaderComponent={
          <>
            <View style={[styles.hero, { backgroundColor: colors.surface }]}>
              <View style={styles.heroRow}>
                <View style={styles.heroStat}>
                  <Text style={[styles.heroAmount, { color: colors.text }]}>
                    {heroEarned}
                  </Text>
                  <Text
                    style={[styles.heroLabel, { color: colors.textSecondary }]}
                  >
                    Earned all time
                  </Text>
                </View>
                <View
                  style={[styles.heroDivider, { backgroundColor: colors.border }]}
                />
                <View style={styles.heroStat}>
                  <Text style={[styles.heroAmount, { color: colors.amber }]}>
                    {heroPending}
                  </Text>
                  <Text
                    style={[styles.heroLabel, { color: colors.textSecondary }]}
                  >
                    Pending
                  </Text>
                </View>
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsRow}
            >
              {BUCKET_FILTERS.map((b) => {
                const active = activeBucket === b.id;
                return (
                  <TouchableOpacity
                    key={b.id}
                    onPress={() => setActiveBucket(b.id)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active
                          ? colors.primary
                          : colors.surfaceAlt,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Filter rewards by ${b.label}`}
                    accessibilityState={{ selected: active }}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: active ? '#fff' : colors.textSecondary },
                      ]}
                    >
                      {b.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </>
        }
        ListEmptyComponent={
          rewardsQuery.loading ? (
            <ActivityIndicator
              color={colors.primary}
              style={{ marginTop: 40 }}
            />
          ) : (
            <View style={styles.empty}>
              <View
                style={[
                  styles.emptyIcon,
                  { backgroundColor: isDark ? colors.surfaceAlt : '#f1f5f9' },
                ]}
              >
                <Gift size={32} color={colors.textTertiary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No rewards yet
              </Text>
              <Text
                style={[styles.emptySubtitle, { color: colors.textSecondary }]}
              >
                Top up your wallet to start earning cashback.
              </Text>
              <Button
                variant="primary"
                size="md"
                onPress={() => router.push('/topup')}
                style={{ marginTop: 16 }}
              >
                Top up now
              </Button>
            </View>
          )
        }
        renderItem={({ item }) => (
          <View style={styles.itemWrapper}>
            <RewardRow
              reward={item}
              onPress={() => setSelectedRewardId(item.id)}
            />
          </View>
        )}
        ListFooterComponent={
          <>
            {rewardsQuery.loadingMore ? (
              <ActivityIndicator
                color={colors.primary}
                style={{ paddingVertical: 16 }}
              />
            ) : null}
            <TouchableOpacity
              style={[styles.expandRow, { borderTopColor: colors.border }]}
              onPress={() => setHowItWorksOpen((v) => !v)}
              accessibilityRole="button"
            >
              <Text style={[styles.expandTitle, { color: colors.text }]}>
                How rewards work
              </Text>
              {howItWorksOpen ? (
                <ChevronUp size={18} color={colors.textSecondary} />
              ) : (
                <ChevronDown size={18} color={colors.textSecondary} />
              )}
            </TouchableOpacity>
            {howItWorksOpen ? (
              <View style={styles.howContent}>
                {[
                  ['Cashback', 'Earned on every purchase. Posted within 3 working days.'],
                  ['Bonuses', 'One-off rewards from referrals, milestones, and promotions.'],
                  ['Promo', 'Limited-time rewards from special campaigns.'],
                  ['Expiry', 'Rewards expire 90 days after they become available.'],
                ].map(([t, desc]) => (
                  <View key={t} style={{ marginBottom: 8 }}>
                    <Text style={[styles.howTitle, { color: colors.text }]}>{t}</Text>
                    <Text style={[styles.howDesc, { color: colors.textSecondary }]}>
                      {desc}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </>
        }
      />

      <RewardDetailSheet
        rewardId={selectedRewardId}
        onClose={() => setSelectedRewardId(null)}
      />
    </SafeAreaView>
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
  title: { fontSize: 22, fontFamily: 'Inter-Bold' },
  headerLinks: { flexDirection: 'row', gap: 14 },
  headerLink: { fontSize: 15, fontFamily: 'Inter-SemiBold' },
  listContent: { paddingBottom: 80 },
  hero: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  heroRow: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  heroStat: { flex: 1, alignItems: 'center', gap: 4 },
  heroDivider: { width: 1, height: 44 },
  heroAmount: { fontSize: 30, fontFamily: 'Inter-Bold', letterSpacing: -1 },
  heroLabel: { fontSize: 14, fontFamily: 'Inter-Regular' },
  chipsRow: { paddingHorizontal: 16, gap: 8, paddingVertical: 12 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  chipText: { fontSize: 14, fontFamily: 'Inter-Medium' },
  itemWrapper: { paddingHorizontal: 16 },
  empty: { alignItems: 'center', paddingTop: 48, paddingHorizontal: 24 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontFamily: 'Inter-SemiBold' },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 20,
  },
  expandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    marginTop: 16,
  },
  expandTitle: { fontSize: 16, fontFamily: 'Inter-SemiBold' },
  howContent: { paddingHorizontal: 16, paddingBottom: 16, gap: 8 },
  howTitle: { fontSize: 15, fontFamily: 'Inter-SemiBold' },
  howDesc: { fontSize: 14, fontFamily: 'Inter-Regular', lineHeight: 18 },
});
