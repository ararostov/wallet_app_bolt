import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { X, ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react-native';
import { useWallet } from '@/context/WalletContext';
import { useTheme } from '@/context/ThemeContext';
import { formatCurrency, formatDateShort } from '@/utils/format';
import type { Reward } from '@/types';

const BUCKETS = ['all', 'cashback', 'bonus', 'promo'] as const;
type Bucket = typeof BUCKETS[number];

const BUCKET_LABELS: Record<Bucket, string> = {
  all: 'All',
  cashback: 'Cashback',
  bonus: 'Bonuses',
  promo: 'Promo',
};

function RewardRow({ reward, onPress, colors, isDark }: { reward: Reward; onPress: () => void; colors: any; isDark: boolean }) {
  const statusColors: Record<string, { bg: string; text: string }> = {
    available: { bg: isDark ? '#064E3B' : '#dcfce7', text: isDark ? '#34D399' : '#15803d' },
    pending: { bg: isDark ? '#78350F' : '#fef3c7', text: isDark ? '#FBBF24' : '#92400e' },
    expired: { bg: isDark ? '#334155' : '#f1f5f9', text: colors.textSecondary },
    claimed: { bg: isDark ? '#1E3A5F' : '#dbeafe', text: isDark ? '#3B82F6' : '#1d4ed8' },
  };
  const sc = statusColors[reward.status] ?? statusColors.available;
  const isPositive = reward.status !== 'expired';
  return (
    <TouchableOpacity style={[styles.rewardRow, { borderBottomColor: colors.borderLight }]} onPress={onPress}>
      <View style={[styles.rewardDot, { backgroundColor: reward.bucket === 'cashback' ? '#059669' : reward.bucket === 'bonus' ? '#d97706' : colors.primary }]} />
      <View style={styles.rewardInfo}>
        <Text style={[styles.rewardSource, { color: colors.text }]}>{reward.source}</Text>
        <Text style={[styles.rewardMeta, { color: colors.textTertiary }]}>
          Earned {formatDateShort(reward.earnedAt)} · Expires {formatDateShort(reward.expiresAt)}
        </Text>
      </View>
      <View style={styles.rewardRight}>
        <Text style={[styles.rewardAmount, !isPositive && { color: colors.textTertiary }]}>
          +{formatCurrency(reward.amount)}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
          <Text style={[styles.statusTextLabel, { color: sc.text }]}>{reward.status}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function RewardsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, availableRewardsTotal } = useWallet();
  const { colors, isDark } = useTheme();
  const [activeBucket, setActiveBucket] = useState<Bucket>('all');
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);

  const filtered = activeBucket === 'all'
    ? state.rewards
    : state.rewards.filter((r) => r.bucket === activeBucket);

  return (
    <SafeAreaView edges={['left', 'right']} style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border, paddingTop: insets.top + 14 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Rewards</Text>
        <TouchableOpacity onPress={() => router.push('/tier')}>
          <Text style={[styles.tierLink, { color: colors.primary }]}>Tier</Text>
        </TouchableOpacity>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}>

        <View style={[styles.hero, { backgroundColor: colors.surface }]}>
          <View style={styles.heroStatRow}>
            <View style={styles.heroStat}>
              <Text style={[styles.heroStatAmount, { color: colors.text }]}>{formatCurrency(availableRewardsTotal + 14.07)}</Text>
              <Text style={[styles.heroStatLabel, { color: colors.textSecondary }]}>Earned all time</Text>
            </View>
            <View style={[styles.heroStatDivider, { backgroundColor: colors.border }]} />
            <View style={styles.heroStat}>
              <Text style={[styles.heroStatAmount, { color: colors.amber }]}>
                {formatCurrency(state.rewards.filter(r => r.status === 'pending').reduce((s, r) => s + r.amount, 0))}
              </Text>
              <Text style={[styles.heroStatLabel, { color: colors.textSecondary }]}>Pending</Text>
            </View>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs} contentContainerStyle={styles.tabsContent}>
          {BUCKETS.map((b) => (
            <TouchableOpacity
              key={b}
              style={[styles.tab, { backgroundColor: colors.surfaceAlt }, activeBucket === b && { backgroundColor: colors.primary }]}
              onPress={() => setActiveBucket(b)}
            >
              <Text style={[styles.tabText, { color: colors.textSecondary }, activeBucket === b && styles.tabTextActive]}>
                {BUCKET_LABELS[b]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.list}>
          {filtered.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>No rewards in this category</Text>
          ) : (
            filtered.map((r) => (
              <RewardRow key={r.id} reward={r} onPress={() => setSelectedReward(r)} colors={colors} isDark={isDark} />
            ))
          )}
        </View>

        <TouchableOpacity
          style={[styles.expandSection, { borderTopColor: colors.border }]}
          onPress={() => setHowItWorksOpen((v) => !v)}
        >
          <Text style={[styles.expandTitle, { color: colors.text }]}>How rewards work</Text>
          {howItWorksOpen ? <ChevronUp size={18} color={colors.textSecondary} /> : <ChevronDown size={18} color={colors.textSecondary} />}
        </TouchableOpacity>
        {howItWorksOpen && (
          <View style={styles.expandContent}>
            {[
              ['Cashback', 'Earned on every purchase. Posted within 3 working days.'],
              ['Bonuses', 'One-off rewards from referrals, milestones, and promotions.'],
              ['Promo', 'Limited-time rewards from special campaigns.'],
              ['Expiry', 'All rewards expire 90 days after being earned.'],
            ].map(([t, desc]) => (
              <View key={t} style={styles.expandItem}>
                <Text style={[styles.expandItemTitle, { color: colors.text }]}>{t}</Text>
                <Text style={[styles.expandItemDesc, { color: colors.textSecondary }]}>{desc}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={!!selectedReward} animationType="slide" presentationStyle="pageSheet">
        {selectedReward && (
          <SafeAreaView style={[styles.modalSafe, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Reward details</Text>
              <TouchableOpacity onPress={() => setSelectedReward(null)}>
                <X size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalContent}>
              <View style={styles.modalAmountRow}>
                <Text style={styles.modalAmount}>+{formatCurrency(selectedReward.amount)}</Text>
              </View>
              {[
                ['Source', selectedReward.source],
                ['Type', selectedReward.bucket],
                ['Earned', formatDateShort(selectedReward.earnedAt)],
                ['Expires', formatDateShort(selectedReward.expiresAt)],
              ].map(([label, value]) => (
                <View key={label} style={[styles.infoRow, { borderBottomColor: colors.borderLight }]}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
                </View>
              ))}
              {selectedReward.linkedTxId && (
                <TouchableOpacity
                  style={styles.linkedTx}
                  onPress={() => { setSelectedReward(null); router.push(`/transactions/${selectedReward.linkedTxId}` as any); }}
                >
                  <Text style={[styles.linkedTxText, { color: colors.primary }]}>View linked transaction</Text>
                </TouchableOpacity>
              )}
              <Text style={[styles.modalNote, { color: colors.textTertiary, backgroundColor: colors.background }]}>
                Rewards are credited to your Tesco Wallet balance. Terms apply.
              </Text>
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingBottom: 80 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontFamily: 'Inter-Bold' },
  tierLink: { fontSize: 16, fontFamily: 'Inter-SemiBold' },
  hero: {
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  heroStatRow: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  heroStat: { flex: 1, alignItems: 'center', gap: 4 },
  heroStatDivider: { width: 1, height: 44 },
  heroStatAmount: { fontSize: 32, fontFamily: 'Inter-Bold', letterSpacing: -1 },
  heroStatLabel: { fontSize: 15, fontFamily: 'Inter-Regular' },
  tabs: { marginBottom: 4 },
  tabsContent: { paddingHorizontal: 16, gap: 8 },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  tabText: { fontSize: 15, fontFamily: 'Inter-Medium' },
  tabTextActive: { color: '#fff' },
  list: { paddingHorizontal: 16, marginTop: 8 },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  rewardDot: { width: 10, height: 10, borderRadius: 5, marginTop: 2 },
  rewardInfo: { flex: 1 },
  rewardSource: { fontSize: 16, fontFamily: 'Inter-SemiBold', lineHeight: 20 },
  rewardMeta: { fontSize: 15, fontFamily: 'Inter-Regular', marginTop: 2 },
  rewardRight: { alignItems: 'flex-end', gap: 4 },
  rewardAmount: { fontSize: 17, fontFamily: 'Inter-SemiBold', color: '#059669' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  statusTextLabel: { fontSize: 15, fontFamily: 'Inter-SemiBold' },
  emptyText: { textAlign: 'center', fontFamily: 'Inter-Regular', paddingVertical: 24 },
  expandSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  expandTitle: { fontSize: 17, fontFamily: 'Inter-SemiBold' },
  expandContent: { paddingHorizontal: 16, gap: 12, paddingBottom: 8 },
  expandItem: { gap: 2 },
  expandItemTitle: { fontSize: 16, fontFamily: 'Inter-SemiBold' },
  expandItemDesc: { fontSize: 15, fontFamily: 'Inter-Regular', lineHeight: 18 },
  modalSafe: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 19, fontFamily: 'Inter-Bold' },
  modalContent: { padding: 20, gap: 16 },
  modalAmountRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  modalAmount: { fontSize: 35, fontFamily: 'Inter-Bold', color: '#059669' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1 },
  infoLabel: { fontSize: 16, fontFamily: 'Inter-Regular' },
  infoValue: { fontSize: 16, fontFamily: 'Inter-SemiBold' },
  linkedTx: { paddingVertical: 12 },
  linkedTxText: { fontSize: 16, fontFamily: 'Inter-SemiBold' },
  modalNote: { fontSize: 15, fontFamily: 'Inter-Regular', lineHeight: 18, padding: 12, borderRadius: 8 },
});
