// Perks / Program screen — spec 07-loyalty §4.4.
//
// Three sections (Active / Available / Coming soon) computed locally from
// the perk catalog: a perk is `active` when `isAvailable && status=active`,
// `available` when `!isAvailable && status=active` (e.g. locked behind
// next tier), and `coming_soon` when `status=coming_soon`. The mobile UI
// maps `perk.icon` to a lucide whitelist (see utils/perkIcons.ts).

import React, { useMemo, useState } from 'react';
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
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react-native';

import { ProgressBar } from '@/components/ui/ProgressBar';
import { useTheme } from '@/context/ThemeContext';
import { usePerks } from '@/hooks/usePerks';
import type { Perk } from '@/types/loyalty';
import { formatMoney } from '@/utils/format';
import { getPerkIcon } from '@/utils/perkIcons';

type Tab = 'Active' | 'Available' | 'Coming soon';
const TABS: Tab[] = ['Active', 'Available', 'Coming soon'];

function categorise(perk: Perk): Tab {
  if (perk.status === 'coming_soon') return 'Coming soon';
  if (perk.isAvailable) return 'Active';
  return 'Available';
}

export default function ProgramScreen(): React.ReactElement {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>('Active');

  const perksQuery = usePerks();
  const perks = useMemo(() => perksQuery.data ?? [], [perksQuery.data]);

  const filtered = useMemo(
    () => perks.filter((p) => categorise(p) === activeTab),
    [perks, activeTab],
  );

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
        <Text style={[styles.title, { color: colors.text }]}>Perks & Offers</Text>
        <View style={{ width: 36 }} />
      </View>

      <View
        style={[
          styles.tabs,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        {TABS.map((tab) => {
          const active = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tab,
                active && [styles.tabActive, { borderBottomColor: colors.primary }],
              ]}
              onPress={() => setActiveTab(tab)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: colors.textSecondary },
                  active && {
                    color: colors.primary,
                    fontFamily: 'Inter-SemiBold',
                  },
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 24 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={perksQuery.loading && !!perksQuery.data}
            onRefresh={perksQuery.refetch}
            tintColor={colors.primary}
          />
        }
      >
        {perksQuery.loading && !perksQuery.data ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />
        ) : filtered.length === 0 ? (
          <Text style={[styles.empty, { color: colors.textTertiary }]}>
            No perks in this category
          </Text>
        ) : (
          filtered.map((perk) => <PerkCard key={perk.id} perk={perk} isDark={isDark} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

interface PerkCardProps {
  perk: Perk;
  isDark: boolean;
}

function PerkCard({ perk, isDark }: PerkCardProps): React.ReactElement {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const Icon = getPerkIcon(perk.icon);

  const statusChip = (() => {
    const tab = categorise(perk);
    if (isDark) {
      switch (tab) {
        case 'Active':
          return { bg: '#064E3B', fg: '#34D399', label: 'active' };
        case 'Available':
          return { bg: '#1E3A5F', fg: '#3B82F6', label: 'locked' };
        case 'Coming soon':
          return { bg: '#334155', fg: '#94A3B8', label: 'coming soon' };
      }
    }
    switch (tab) {
      case 'Active':
        return { bg: '#dcfce7', fg: '#15803d', label: 'active' };
      case 'Available':
        return { bg: '#fee2e2', fg: '#dc2626', label: 'locked' };
      case 'Coming soon':
        return { bg: '#f1f5f9', fg: '#475569', label: 'coming soon' };
    }
  })();

  const progress = perk.progress;
  const capRemainingMinor = progress
    ? Math.max(0, progress.target.amountMinor - progress.current.amountMinor)
    : null;

  return (
    <View
      style={[
        styles.perkCard,
        { backgroundColor: colors.surface, shadowColor: colors.shadowColor },
      ]}
    >
      <TouchableOpacity
        style={styles.perkHeader}
        onPress={() => setExpanded((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={`${perk.title}, ${statusChip.label}`}
        accessibilityState={{ expanded }}
      >
        <View
          style={[
            styles.perkIconBox,
            { backgroundColor: isDark ? colors.surfaceAlt : '#f1f5f9' },
          ]}
        >
          <Icon size={22} color={colors.primary} />
        </View>
        <View style={styles.perkInfo}>
          <Text style={[styles.perkTitle, { color: colors.text }]}>{perk.title}</Text>
          {perk.shortRule ? (
            <Text style={[styles.perkShort, { color: colors.textSecondary }]}>
              {perk.shortRule}
            </Text>
          ) : null}
        </View>
        <View style={[styles.statusChip, { backgroundColor: statusChip.bg }]}>
          <Text style={[styles.statusChipText, { color: statusChip.fg }]}>
            {statusChip.label}
          </Text>
        </View>
        {expanded ? (
          <ChevronUp size={16} color={colors.textSecondary} />
        ) : (
          <ChevronDown size={16} color={colors.textSecondary} />
        )}
      </TouchableOpacity>

      {progress ? (
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressLabel, { color: colors.textTertiary }]}>
              {formatMoney(progress.current.amountMinor, progress.current.currency)}{' '}
              spent
            </Text>
            <Text style={[styles.progressLabel, { color: colors.textTertiary }]}>
              of{' '}
              {formatMoney(progress.target.amountMinor, progress.target.currency)}
            </Text>
          </View>
          <ProgressBar
            progress={progress.percentage / 100}
            color={colors.primary}
            trackColor={colors.border}
            height={6}
          />
          {capRemainingMinor !== null ? (
            <Text style={[styles.capText, { color: colors.textTertiary }]}>
              {formatMoney(capRemainingMinor, progress.target.currency)} remaining
            </Text>
          ) : null}
        </View>
      ) : null}

      {expanded ? (
        <View style={[styles.expand, { borderTopColor: colors.borderLight }]}>
          <Text style={[styles.expandText, { color: colors.textSecondary }]}>
            {perk.fullRules ?? perk.description}
          </Text>
          {perk.minTier && !perk.isAvailable ? (
            <Text style={[styles.unlockText, { color: colors.textTertiary }]}>
              Unlocks at {perk.minTier.name}
            </Text>
          ) : null}
        </View>
      ) : null}
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
  tabs: { flexDirection: 'row', borderBottomWidth: 1, paddingHorizontal: 16 },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {},
  tabText: { fontSize: 14, fontFamily: 'Inter-Medium' },
  scroll: { padding: 16, paddingBottom: 80 },
  empty: { textAlign: 'center', fontFamily: 'Inter-Regular', paddingVertical: 40 },
  perkCard: {
    borderRadius: 16,
    marginBottom: 10,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  perkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 10,
  },
  perkIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  perkInfo: { flex: 1 },
  perkTitle: { fontSize: 16, fontFamily: 'Inter-SemiBold' },
  perkShort: { fontSize: 14, fontFamily: 'Inter-Regular', marginTop: 2 },
  statusChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusChipText: { fontSize: 12, fontFamily: 'Inter-SemiBold' },
  progressSection: { paddingHorizontal: 14, paddingBottom: 12, gap: 6 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { fontSize: 13, fontFamily: 'Inter-Regular' },
  capText: { fontSize: 12, fontFamily: 'Inter-Regular' },
  expand: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    paddingTop: 12,
    gap: 8,
  },
  expandText: { fontSize: 14, fontFamily: 'Inter-Regular', lineHeight: 20 },
  unlockText: { fontSize: 13, fontFamily: 'Inter-Regular', fontStyle: 'italic' },
});
