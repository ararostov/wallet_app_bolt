// Cashback statement — spec 07-loyalty §4.5.
//
// Period selector is a segmented control over `month | quarter | year` —
// the OpenAPI contract takes one of those three; custom date ranges are
// not supported in MVP. Tapping a merchant row deep-links to the rewards
// tab so the user can drill into individual rewards (no per-merchant
// filter on the rewards list yet — we just navigate; reward filtering by
// merchant is open for follow-up).

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
import { ArrowLeft } from 'lucide-react-native';

import { useTheme } from '@/context/ThemeContext';
import { useCashbackStatement } from '@/hooks/useCashbackStatement';
import type {
  CashbackStatementMerchantGroup,
  CashbackStatementPeriodType,
} from '@/types/loyalty';
import { formatDate, formatMoney } from '@/utils/format';

const PERIOD_OPTIONS: { id: CashbackStatementPeriodType; label: string }[] = [
  { id: 'month', label: 'This month' },
  { id: 'quarter', label: 'Last 3 months' },
  { id: 'year', label: 'This year' },
];

export default function CashbackStatementScreen(): React.ReactElement {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [period, setPeriod] = useState<CashbackStatementPeriodType>('month');
  const query = useCashbackStatement(period);

  const data = query.data;

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
        <Text style={[styles.title, { color: colors.text }]}>Cashback statement</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 24 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={query.loading && !!query.data}
            onRefresh={query.refetch}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.segmented}>
          {PERIOD_OPTIONS.map((opt) => {
            const active = period === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                onPress={() => setPeriod(opt.id)}
                style={[
                  styles.segmentItem,
                  {
                    backgroundColor: active ? colors.primary : colors.surfaceAlt,
                  },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text
                  style={[
                    styles.segmentText,
                    { color: active ? '#fff' : colors.textSecondary },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {query.loading && !data ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />
        ) : !data ? (
          <Text style={[styles.empty, { color: colors.textSecondary }]}>
            {query.error
              ? query.error.message
              : 'No cashback data for this period.'}
          </Text>
        ) : (
          <>
            <View
              style={[
                styles.totalsCard,
                {
                  backgroundColor: colors.surface,
                  shadowColor: colors.shadowColor,
                },
              ]}
            >
              <View style={[styles.totalsRow, { borderBottomColor: colors.borderLight }]}>
                <Text
                  style={[styles.totalsLabel, { color: colors.textSecondary }]}
                >
                  Earned
                </Text>
                <Text style={[styles.totalsHero, { color: colors.text }]}>
                  {formatMoney(data.totals.earned.amountMinor, data.totals.earned.currency)}
                </Text>
              </View>
              <TotalsRow
                label="Claimed"
                amountMinor={data.totals.claimed.amountMinor}
                currency={data.totals.claimed.currency}
              />
              <TotalsRow
                label="Available"
                amountMinor={data.totals.available.amountMinor}
                currency={data.totals.available.currency}
              />
              <TotalsRow
                label="Pending"
                amountMinor={data.totals.pending.amountMinor}
                currency={data.totals.pending.currency}
              />
              <TotalsRow
                label="Expired"
                amountMinor={data.totals.expired.amountMinor}
                currency={data.totals.expired.currency}
                last
              />
            </View>

            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              By merchant
            </Text>

            {data.byMerchant.length === 0 ? (
              <Text style={[styles.empty, { color: colors.textTertiary }]}>
                No cashback earned this period
              </Text>
            ) : (
              data.byMerchant.map((g, idx) => (
                <MerchantRow
                  key={`${g.merchantName ?? 'other'}-${idx}`}
                  group={g}
                  isDark={isDark}
                  onPress={() => router.push('/(tabs)/rewards')}
                />
              ))
            )}

            <Text style={[styles.periodFooter, { color: colors.textTertiary }]}>
              Period: {formatDate(data.period.from, 'short')} –{' '}
              {formatDate(data.period.to, 'short')}
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

interface TotalsRowProps {
  label: string;
  amountMinor: number;
  currency: string;
  last?: boolean;
}

function TotalsRow({ label, amountMinor, currency, last }: TotalsRowProps): React.ReactElement {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.totalsRow,
        !last && { borderBottomColor: colors.borderLight },
        last && { borderBottomWidth: 0 },
      ]}
    >
      <Text style={[styles.totalsLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.totalsValue, { color: colors.text }]}>
        {formatMoney(amountMinor, currency)}
      </Text>
    </View>
  );
}

interface MerchantRowProps {
  group: CashbackStatementMerchantGroup;
  isDark: boolean;
  onPress: () => void;
}

function MerchantRow({ group, isDark, onPress }: MerchantRowProps): React.ReactElement {
  const { colors } = useTheme();
  const name = group.merchantName ?? 'Other';
  const initial = name.charAt(0).toUpperCase();
  return (
    <TouchableOpacity
      style={[
        styles.merchantRow,
        { backgroundColor: colors.surface, borderBottomColor: colors.borderLight },
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${group.rewardCount} rewards, ${formatMoney(
        group.earned.amountMinor,
        group.earned.currency,
      )}`}
    >
      <View
        style={[
          styles.merchantInitial,
          { backgroundColor: isDark ? colors.surfaceAlt : '#f1f5f9' },
        ]}
      >
        <Text style={[styles.merchantInitialText, { color: colors.text }]}>
          {initial}
        </Text>
      </View>
      <View style={styles.merchantInfo}>
        <Text style={[styles.merchantName, { color: colors.text }]}>{name}</Text>
        <Text style={[styles.merchantMeta, { color: colors.textSecondary }]}>
          {group.merchantCategory ? `${group.merchantCategory} · ` : ''}
          {group.rewardCount} reward{group.rewardCount === 1 ? '' : 's'}
        </Text>
      </View>
      <Text style={[styles.merchantAmount, { color: '#059669' }]}>
        +{formatMoney(group.earned.amountMinor, group.earned.currency)}
      </Text>
    </TouchableOpacity>
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
  empty: { textAlign: 'center', fontFamily: 'Inter-Regular', marginTop: 24 },
  segmented: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
  },
  segmentText: { fontSize: 13, fontFamily: 'Inter-Medium' },
  totalsCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  totalsLabel: { fontSize: 14, fontFamily: 'Inter-Medium' },
  totalsValue: { fontSize: 14, fontFamily: 'Inter-SemiBold' },
  totalsHero: { fontSize: 22, fontFamily: 'Inter-Bold', letterSpacing: -0.5 },
  sectionTitle: { fontSize: 16, fontFamily: 'Inter-Bold', marginBottom: 8 },
  merchantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 12,
    marginBottom: 8,
  },
  merchantInitial: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  merchantInitialText: { fontSize: 16, fontFamily: 'Inter-SemiBold' },
  merchantInfo: { flex: 1 },
  merchantName: { fontSize: 15, fontFamily: 'Inter-SemiBold' },
  merchantMeta: { fontSize: 13, fontFamily: 'Inter-Regular', marginTop: 2 },
  merchantAmount: { fontSize: 15, fontFamily: 'Inter-SemiBold' },
  periodFooter: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    marginTop: 16,
    textAlign: 'center',
  },
});
