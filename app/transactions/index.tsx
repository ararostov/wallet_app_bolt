import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, ShoppingBag, Coins, CircleArrowUp as ArrowUpCircle, Tag, RotateCcw } from 'lucide-react-native';
import { useWallet } from '@/context/WalletContext';
import { useTheme } from '@/context/ThemeContext';
import { formatCurrency, groupTransactionsByDate, getTxColor, getStatusColor, getStatusLabel } from '@/utils/format';

const FILTERS = ['All', 'Top-ups', 'Purchases', 'Cashback', 'Refunds'] as const;
type Filter = typeof FILTERS[number];

const FILTER_MAP: Record<Filter, string | null> = {
  All: null,
  'Top-ups': 'topup',
  Purchases: 'purchase',
  Cashback: 'cashback',
  Refunds: 'refund',
};

function getTxIcon(type: string) {
  switch (type) {
    case 'purchase': return ShoppingBag;
    case 'cashback': return Coins;
    case 'topup': return ArrowUpCircle;
    case 'refund': return RotateCcw;
    default: return Tag;
  }
}

function getTxIconBg(type: string, isDark: boolean) {
  switch (type) {
    case 'purchase': return isDark ? '#334155' : '#f1f5f9';
    case 'cashback': return isDark ? '#064E3B' : '#f0fdf4';
    case 'topup': return isDark ? '#1E3A5F' : '#eff6ff';
    case 'refund': return isDark ? '#3B0764' : '#f5f3ff';
    default: return isDark ? '#334155' : '#f1f5f9';
  }
}

function getTxIconColor(type: string, primaryColor: string) {
  switch (type) {
    case 'purchase': return '#64748b';
    case 'cashback': return '#059669';
    case 'topup': return primaryColor;
    case 'refund': return '#7c3aed';
    default: return '#64748b';
  }
}

export default function TransactionsScreen() {
  const router = useRouter();
  const { state } = useWallet();
  const { colors, isDark } = useTheme();
  const [filter, setFilter] = useState<Filter>('All');

  const filtered = FILTER_MAP[filter]
    ? state.transactions.filter((t) => t.type === FILTER_MAP[filter])
    : state.transactions;

  const grouped = groupTransactionsByDate(filtered);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Transactions</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.filtersScroll, { backgroundColor: colors.surface, borderBottomColor: colors.border }]} contentContainerStyle={styles.filtersContent}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, { backgroundColor: colors.surfaceAlt }, filter === f && { backgroundColor: colors.primary }]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, { color: colors.textSecondary }, filter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {grouped.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textTertiary }]}>No transactions found</Text>
        ) : (
          grouped.map(({ date, items }) => (
            <View key={date}>
              <Text style={[styles.dateHeader, { color: colors.textTertiary }]}>{date}</Text>
              {items.map((tx) => {
                const isPositive = tx.amount > 0;
                const isCashback = tx.type === 'cashback' || tx.type === 'bonus';
                const isTopup = tx.type === 'topup';
                const amountColor = (isCashback || isTopup) ? '#059669' : colors.text;
                const statusColor = getStatusColor(tx.status);
                return (
                  <TouchableOpacity
                    key={tx.id}
                    style={[styles.txRow, { backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}
                    onPress={() => router.push(`/transactions/${tx.id}` as any)}
                  >
                    <View style={[styles.txIcon, { backgroundColor: getTxIconBg(tx.type, isDark) }]}>
                      {React.createElement(getTxIcon(tx.type), { size: 20, color: getTxIconColor(tx.type, colors.primary) })}
                    </View>
                    <View style={styles.txInfo}>
                      <Text style={[styles.txMerchant, { color: colors.text }]}>{tx.merchant ?? tx.type}</Text>
                      <View style={styles.txMetaRow}>
                        <Text style={[styles.txMethod, { color: colors.textTertiary }]}>
                          {tx.type === 'purchase' ? 'Groceries' : tx.method} · {new Date(tx.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </Text>
                        {tx.status !== 'completed' && (
                          <View style={[styles.statusChip, { backgroundColor: statusColor + '20' }]}>
                            <Text style={[styles.statusChipText, { color: statusColor }]}>
                              {getStatusLabel(tx.status)}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <Text style={[styles.txAmount, { color: amountColor }]}>
                      {isPositive ? '+' : ''}{formatCurrency(tx.amount)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontFamily: 'Inter-SemiBold' },
  filtersScroll: { borderBottomWidth: 1 },
  filtersContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  filterText: { fontSize: 13, fontFamily: 'Inter-Medium' },
  filterTextActive: { color: '#fff' },
  scroll: { paddingBottom: 32 },
  dateHeader: { fontSize: 12, fontFamily: 'Inter-SemiBold', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, letterSpacing: 0.3 },
  txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, gap: 12, borderBottomWidth: 1 },
  txIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  txInfo: { flex: 1, gap: 4 },
  txMerchant: { fontSize: 15, fontFamily: 'Inter-SemiBold' },
  txMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  txMethod: { fontSize: 12, fontFamily: 'Inter-Regular' },
  statusChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  statusChipText: { fontSize: 11, fontFamily: 'Inter-SemiBold' },
  txAmount: { fontSize: 15, fontFamily: 'Inter-SemiBold' },
  emptyText: { textAlign: 'center', fontFamily: 'Inter-Regular', paddingVertical: 40 },
});
