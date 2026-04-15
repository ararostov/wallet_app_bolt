import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, ChevronDown, ChevronUp, Star } from 'lucide-react-native';
import { useWallet } from '@/context/WalletContext';
import { formatCurrency } from '@/utils/format';
import { useTheme } from '@/context/ThemeContext';

const TIER_COLORS: Record<string, string> = {
  Silver: '#94a3b8',
  Gold: '#f59e0b',
  Platinum: '#a78bfa',
};

const TIER_DATA = [
  { name: 'Silver', threshold: '£0+', cashback: '2%' },
  { name: 'Gold', threshold: '£500+', cashback: '3%' },
  { name: 'Platinum', threshold: '£1,500+', cashback: '5%' },
];

export default function TierScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { state } = useWallet();
  const { tier } = state;
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);

  const progressPct = Math.min(tier.progressGBP / tier.targetGBP, 1);
  const color = TIER_COLORS[tier.current] ?? '#94a3b8';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Loyalty tier</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Tier Badge */}
        <View style={styles.tierHero}>
          <View style={[styles.tierBadgeCircle, { borderColor: color, backgroundColor: colors.surface, shadowColor: colors.shadowColor }]}>
            <Text style={styles.tierStar}>⭐</Text>
            <Text style={[styles.tierName, { color }]}>{tier.current}</Text>
          </View>
          {tier.next && (
            <Text style={[styles.awayText, { color: colors.textSecondary }]}>
              {formatCurrency(tier.targetGBP - tier.progressGBP)} away from {tier.next}
            </Text>
          )}
        </View>

        {/* Progress */}
        <View style={[styles.progressCard, { backgroundColor: colors.surface, shadowColor: colors.shadowColor }]}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>Qualifying spend</Text>
            <Text style={[styles.progressValue, { color: colors.text }]}>
              {formatCurrency(tier.progressGBP)} / {formatCurrency(tier.targetGBP)}
            </Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
            <View style={[styles.progressFill, { width: `${progressPct * 100}%` as any, backgroundColor: color }]} />
          </View>
          <Text style={[styles.progressReset, { color: colors.textTertiary }]}>Resets in {tier.resetDays} days</Text>
        </View>

        {/* All Tiers Table */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>All tiers</Text>
        {TIER_DATA.map((t) => {
          const isActive = t.name === tier.current;
          const tc = TIER_COLORS[t.name];
          return (
            <View key={t.name} style={[styles.tierCard, { backgroundColor: colors.surface, borderColor: isActive ? colors.primary : colors.border }, isActive && { backgroundColor: isDark ? '#1E293B' : '#f8faff' }]}>
              <View style={[styles.tierIconBg, { backgroundColor: isDark ? colors.surfaceAlt : '#f1f5f9' }]}>
                <Star size={22} color={tc} />
              </View>
              <View style={styles.tierCardInfo}>
                <View style={styles.tierCardNameRow}>
                  <Text style={[styles.tierCardName, { color: tc }]}>{t.name}</Text>
                  {isActive && (
                    <View style={[styles.currentBadge, { backgroundColor: isDark ? '#1E3A5F' : '#dbeafe' }]}>
                      <Text style={[styles.currentBadgeText, { color: colors.primary }]}>✓ Current</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.tierThreshold, { color: colors.textSecondary }]}>Spend {t.threshold} per year</Text>
              </View>
              <View style={styles.tierCashbackCol}>
                <Text style={[styles.tierCashbackPct, { color: colors.text }]}>{t.cashback}</Text>
                <Text style={[styles.tierCashbackLabel, { color: colors.textSecondary }]}>cashback</Text>
              </View>
            </View>
          );
        })}

        {/* How it works */}
        <TouchableOpacity
          style={[styles.expandSection, { borderTopColor: colors.border }]}
          onPress={() => setHowItWorksOpen((v) => !v)}
        >
          <Text style={[styles.expandTitle, { color: colors.text }]}>How tiers work</Text>
          {howItWorksOpen ? <ChevronUp size={18} color={colors.textSecondary} /> : <ChevronDown size={18} color={colors.textSecondary} />}
        </TouchableOpacity>
        {howItWorksOpen && (
          <View style={styles.expandContent}>
            <Text style={[styles.expandText, { color: colors.textSecondary }]}>
              Your tier is determined by your total qualifying card spend in the last 90 days. Progress resets every 90 days. Higher tiers earn more cashback and unlock exclusive benefits.{'\n\n'}
              Purchases made with your Tesco Wallet card count as qualifying spend. Top-ups and cashback credits do not count.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 19, fontFamily: 'Inter-SemiBold' },
  scroll: { padding: 16, paddingBottom: 40 },
  tierHero: { alignItems: 'center', paddingVertical: 24, gap: 12 },
  tierBadgeCircle: { width: 120, height: 120, borderRadius: 60, borderWidth: 4, alignItems: 'center', justifyContent: 'center', gap: 4, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 6 },
  tierStar: { fontSize: 30 },
  tierName: { fontSize: 24, fontFamily: 'Inter-Bold' },
  awayText: { fontSize: 17, fontFamily: 'Inter-Medium', textAlign: 'center' },
  progressCard: { borderRadius: 16, padding: 16, marginBottom: 24, gap: 10, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { fontSize: 16, fontFamily: 'Inter-Medium' },
  progressValue: { fontSize: 16, fontFamily: 'Inter-SemiBold' },
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4 },
  progressReset: { fontSize: 15, fontFamily: 'Inter-Regular' },
  sectionTitle: { fontSize: 19, fontFamily: 'Inter-Bold', marginBottom: 12 },
  tierCard: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 16, marginBottom: 12, borderWidth: 1.5, padding: 16 },
  tierIconBg: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  tierCardInfo: { flex: 1, gap: 4 },
  tierCardNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tierCardName: { fontSize: 18, fontFamily: 'Inter-Bold' },
  currentBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  currentBadgeText: { fontSize: 15, fontFamily: 'Inter-SemiBold' },
  tierThreshold: { fontSize: 15, fontFamily: 'Inter-Regular' },
  tierCashbackCol: { alignItems: 'flex-end' },
  tierCashbackPct: { fontSize: 22, fontFamily: 'Inter-Bold' },
  tierCashbackLabel: { fontSize: 15, fontFamily: 'Inter-Regular' },
  expandSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderTopWidth: 1, marginTop: 8 },
  expandTitle: { fontSize: 17, fontFamily: 'Inter-SemiBold' },
  expandContent: { paddingBottom: 16 },
  expandText: { fontSize: 16, fontFamily: 'Inter-Regular', lineHeight: 22 },
});
