import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, ChevronDown, ChevronUp, Lock } from 'lucide-react-native';
import { useWallet } from '@/context/WalletContext';
import { formatCurrency, formatDateShort } from '@/utils/format';
import { useTheme } from '@/context/ThemeContext';
import type { Perk } from '@/types';

const TABS = ['Active', 'Available', 'Coming soon'] as const;
type Tab = typeof TABS[number];

const STATUS_TO_TAB: Record<string, Tab> = {
  active: 'Active',
  available: 'Available',
  coming_soon: 'Coming soon',
};

const LIGHT_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active: { bg: '#dcfce7', text: '#15803d' },
  available: { bg: '#dbeafe', text: '#1d4ed8' },
  coming_soon: { bg: '#f1f5f9', text: '#475569' },
  claimed: { bg: '#fef3c7', text: '#92400e' },
  locked: { bg: '#fee2e2', text: '#dc2626' },
};

const DARK_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active: { bg: '#064E3B', text: '#34D399' },
  available: { bg: '#1E3A5F', text: '#3B82F6' },
  coming_soon: { bg: '#334155', text: '#94A3B8' },
  claimed: { bg: '#78350F', text: '#FBBF24' },
  locked: { bg: '#7F1D1D', text: '#F87171' },
};

function PerkCard({ perk }: { perk: Perk }) {
  const [expanded, setExpanded] = useState(false);
  const { colors, isDark } = useTheme();
  const statusColors = isDark ? DARK_STATUS_COLORS : LIGHT_STATUS_COLORS;
  const chipColors = statusColors[perk.status] ?? statusColors.available;
  const hasProgress = perk.progress !== undefined && perk.target !== undefined;

  return (
    <View style={[styles.perkCard, { backgroundColor: colors.surface, shadowColor: colors.shadowColor }]}>
      <TouchableOpacity style={styles.perkCardHeader} onPress={() => setExpanded((v) => !v)}>
        <View style={[styles.perkIconBox, { backgroundColor: colors.surfaceAlt }]}>
          <Text style={styles.perkIconText}>
            {perk.icon === 'Wallet' ? '💳' : perk.icon === 'Users' ? '👥' : perk.icon === 'Sun' ? '☀️' : perk.icon === 'Target' ? '🎯' : perk.icon === 'Star' ? '⭐' : '✈️'}
          </Text>
        </View>
        <View style={styles.perkInfo}>
          <Text style={[styles.perkTitle, { color: colors.text }]}>{perk.title}</Text>
          <Text style={[styles.perkShortRule, { color: colors.textSecondary }]}>{perk.shortRule}</Text>
        </View>
        <View style={[styles.statusChip, { backgroundColor: chipColors.bg }]}>
          <Text style={[styles.statusChipText, { color: chipColors.text }]}>{perk.status.replace('_', ' ')}</Text>
        </View>
        {expanded ? <ChevronUp size={16} color={colors.textSecondary} /> : <ChevronDown size={16} color={colors.textSecondary} />}
      </TouchableOpacity>

      {hasProgress && (
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressLabel, { color: colors.textTertiary }]}>
              {perk.icon === 'Target' ? `£${perk.progress} spent` : `${perk.progress} referred`}
            </Text>
            <Text style={[styles.progressLabel, { color: colors.textTertiary }]}>
              {perk.icon === 'Target' ? `£${perk.target} target` : `${perk.target} max`}
            </Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
            <View style={[styles.progressFill, { width: `${Math.min(((perk.progress!) / (perk.target!)) * 100, 100)}%` as any, backgroundColor: colors.primary }]} />
          </View>
        </View>
      )}

      {expanded && (
        <View style={[styles.expandContent, { borderTopColor: colors.borderLight }]}>
          <Text style={[styles.expandFullRules, { color: colors.textSecondary }]}>{perk.fullRules}</Text>
          {perk.cap && (
            <View style={[styles.infoRow, { borderTopColor: colors.borderLight }]}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{perk.cap ? 'Cap' : ''}</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{perk.cap}</Text>
            </View>
          )}
          {perk.expiresAt && (
            <View style={[styles.infoRow, { borderTopColor: colors.borderLight }]}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Expires</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{formatDateShort(perk.expiresAt)}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

export default function ProgramScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { state } = useWallet();
  const [activeTab, setActiveTab] = useState<Tab>('Active');

  const filtered = state.perks.filter((p) => STATUS_TO_TAB[p.status] === activeTab);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Perks & Offers</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={[styles.tabs, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && [styles.tabActive, { borderBottomColor: colors.primary }]]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, { color: colors.textSecondary }, activeTab === tab && { color: colors.primary, fontFamily: 'Inter-SemiBold' }]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textTertiary }]}>No perks in this category</Text>
        ) : (
          filtered.map((perk) => <PerkCard key={perk.id} perk={perk} />)
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
  tabs: { flexDirection: 'row', borderBottomWidth: 1, paddingHorizontal: 16, paddingBottom: 0 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: {},
  tabText: { fontSize: 15, fontFamily: 'Inter-Medium' },
  scroll: { padding: 16, paddingBottom: 40 },
  perkCard: { borderRadius: 16, marginBottom: 10, overflow: 'hidden', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  perkCardHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  perkIconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  perkIconText: { fontSize: 24 },
  perkInfo: { flex: 1 },
  perkTitle: { fontSize: 17, fontFamily: 'Inter-SemiBold' },
  perkShortRule: { fontSize: 15, fontFamily: 'Inter-Regular', marginTop: 2 },
  statusChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusChipText: { fontSize: 15, fontFamily: 'Inter-SemiBold' },
  progressSection: { paddingHorizontal: 14, paddingBottom: 12, gap: 6 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { fontSize: 15, fontFamily: 'Inter-Regular' },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
  expandContent: { paddingHorizontal: 14, paddingBottom: 14, borderTopWidth: 1, paddingTop: 12, gap: 8 },
  expandFullRules: { fontSize: 15, fontFamily: 'Inter-Regular', lineHeight: 20 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderTopWidth: 1 },
  infoLabel: { fontSize: 15, fontFamily: 'Inter-Regular' },
  infoValue: { fontSize: 15, fontFamily: 'Inter-SemiBold' },
  emptyText: { textAlign: 'center', fontFamily: 'Inter-Regular', paddingVertical: 40 },
});
