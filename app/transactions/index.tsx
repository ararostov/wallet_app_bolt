// Transactions list screen — wired to GET /transactions (cursor-paginated)
// and GET /transactions/search (debounced inline search). See spec
// docs/mobile/specs/06-transactions.ru.md §4.1.

import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  CircleArrowUp as ArrowUpCircle,
  Coins,
  RotateCcw,
  Search as SearchIcon,
  ShoppingBag,
  Tag,
  X,
} from 'lucide-react-native';

import { useTheme } from '@/context/ThemeContext';
import { useTransactions } from '@/hooks/useTransactions';
import { useSearchTransactions } from '@/hooks/useSearchTransactions';
import type { TransactionRecord, TransactionType } from '@/types/transactions';
import {
  formatMoney,
  getStatusColor,
  getStatusLabel,
  groupTransactionsByOccurredAt,
} from '@/utils/format';
import { mapErrorCode, ApiError } from '@/utils/errors';

const FILTERS: ReadonlyArray<{
  label: string;
  value: TransactionType | null;
}> = [
  { label: 'All', value: null },
  { label: 'Top-ups', value: 'topup' },
  { label: 'Purchases', value: 'purchase' },
  { label: 'Cashback', value: 'cashback' },
  { label: 'Refunds', value: 'refund' },
];

type Row =
  | { kind: 'header'; key: string; label: string }
  | { kind: 'item'; key: string; tx: TransactionRecord };

function txIcon(type: TransactionType) {
  switch (type) {
    case 'purchase':
      return ShoppingBag;
    case 'cashback':
    case 'bonus':
      return Coins;
    case 'topup':
    case 'auto_reload':
      return ArrowUpCircle;
    case 'refund':
      return RotateCcw;
    default:
      return Tag;
  }
}

function txIconBg(type: TransactionType, isDark: boolean) {
  switch (type) {
    case 'purchase':
      return isDark ? '#334155' : '#f1f5f9';
    case 'cashback':
    case 'bonus':
      return isDark ? '#064E3B' : '#f0fdf4';
    case 'topup':
    case 'auto_reload':
      return isDark ? '#1E3A5F' : '#eff6ff';
    case 'refund':
      return isDark ? '#3B0764' : '#f5f3ff';
    default:
      return isDark ? '#334155' : '#f1f5f9';
  }
}

function txIconColor(type: TransactionType, primary: string) {
  switch (type) {
    case 'purchase':
      return '#64748b';
    case 'cashback':
    case 'bonus':
      return '#059669';
    case 'topup':
    case 'auto_reload':
      return primary;
    case 'refund':
      return '#7c3aed';
    default:
      return '#64748b';
  }
}

function rowLabel(tx: TransactionRecord): string {
  if (tx.type === 'cashback') {
    return tx.merchantName ? `Cashback · ${tx.merchantName}` : 'Cashback';
  }
  if (tx.type === 'bonus') {
    return tx.merchantName ?? tx.description ?? 'Bonus';
  }
  if (tx.type === 'topup' || tx.type === 'auto_reload') {
    return tx.merchantName ?? 'Top-up';
  }
  return tx.merchantName ?? tx.type;
}

function amountColorFor(tx: TransactionRecord, base: string): string {
  if (tx.amount.amountMinor > 0) return '#059669';
  return base;
}

function amountText(tx: TransactionRecord): string {
  const sign = tx.amount.amountMinor > 0 ? '+' : '';
  return `${sign}${formatMoney(tx.amount.amountMinor, tx.amount.currency)}`;
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

function flatten(
  groups: { key: string; items: TransactionRecord[] }[],
): Row[] {
  const out: Row[] = [];
  for (const g of groups) {
    out.push({ kind: 'header', key: `h:${g.key}`, label: g.key });
    for (const tx of g.items) {
      out.push({ kind: 'item', key: tx.id, tx });
    }
  }
  return out;
}

export default function TransactionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const [filterIdx, setFilterIdx] = useState(0);
  const filter = FILTERS[filterIdx];

  const [searchActive, setSearchActive] = useState(false);
  const [query, setQuery] = useState('');

  const list = useTransactions({ type: filter.value ?? undefined });
  const search = useSearchTransactions(query, {
    type: filter.value ?? undefined,
  });

  const showingSearch = searchActive && query.trim().length >= 2;
  const items = showingSearch ? search.data : list.data;
  const groups = useMemo(() => groupTransactionsByOccurredAt(items), [items]);
  const rows = useMemo(() => flatten(groups), [groups]);

  const error = showingSearch ? search.error : list.error;
  const errorMessage =
    error instanceof ApiError ? mapErrorCode(error.code) ?? error.message : error?.message;

  const renderItem = ({ item }: { item: Row }) => {
    if (item.kind === 'header') {
      return (
        <View
          style={[
            styles.groupHeader,
            { backgroundColor: colors.background },
          ]}
        >
          <Text style={[styles.groupHeaderText, { color: colors.textTertiary }]}>
            {item.label}
          </Text>
        </View>
      );
    }
    const tx = item.tx;
    const Icon = txIcon(tx.type);
    const statusColor = getStatusColor(tx.status);
    return (
      <TouchableOpacity
        style={[
          styles.txRow,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.borderLight,
          },
        ]}
        onPress={() => router.push(`/transactions/${tx.id}` as never)}
        accessibilityRole="button"
        accessibilityLabel={`${rowLabel(tx)}, ${amountText(tx)}, ${getStatusLabel(tx.status)}, ${shortDate(tx.occurredAt)}`}
      >
        <View style={[styles.txIcon, { backgroundColor: txIconBg(tx.type, isDark) }]}>
          <Icon size={20} color={txIconColor(tx.type, colors.primary)} />
        </View>
        <View style={styles.txInfo}>
          <Text style={[styles.txMerchant, { color: colors.text }]} numberOfLines={1}>
            {rowLabel(tx)}
          </Text>
          <View style={styles.txMetaRow}>
            <Text style={[styles.txMeta, { color: colors.textTertiary }]}>
              {shortDate(tx.occurredAt)}
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
        <Text style={[styles.txAmount, { color: amountColorFor(tx, colors.text) }]}>
          {amountText(tx)}
        </Text>
      </TouchableOpacity>
    );
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
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Transactions</Text>
        <TouchableOpacity
          onPress={() => {
            setSearchActive((v) => !v);
            if (searchActive) setQuery('');
          }}
          style={styles.iconBtn}
          accessibilityLabel="Search transactions"
        >
          {searchActive ? (
            <X size={20} color={colors.text} />
          ) : (
            <SearchIcon size={20} color={colors.text} />
          )}
        </TouchableOpacity>
      </View>

      {searchActive && (
        <View
          style={[
            styles.searchBar,
            { backgroundColor: colors.surface, borderBottomColor: colors.border },
          ]}
        >
          <SearchIcon size={16} color={colors.textTertiary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search merchant or reference"
            placeholderTextColor={colors.textTertiary}
            style={[styles.searchInput, { color: colors.text }]}
            autoFocus
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <X size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      )}

      <View
        style={[
          styles.filterBar,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContent}
          data={FILTERS}
          keyExtractor={(f) => f.label}
          renderItem={({ item, index }) => {
            const active = index === filterIdx;
            return (
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
                  active && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => setFilterIdx(index)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text
                  style={[
                    styles.filterText,
                    { color: colors.textSecondary },
                    active && styles.filterTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {errorMessage && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      <FlatList
        data={rows}
        keyExtractor={(r) => r.key}
        renderItem={renderItem}
        onEndReached={() => {
          if (!showingSearch) void list.loadMore();
        }}
        onEndReachedThreshold={0.6}
        refreshControl={
          showingSearch ? undefined : (
            <RefreshControl
              refreshing={list.refreshing}
              onRefresh={() => void list.refresh()}
              tintColor={colors.primary}
            />
          )
        }
        ListFooterComponent={
          !showingSearch && list.loadingMore ? (
            <View style={styles.footer}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          (showingSearch ? search.loading : list.loading) ? (
            <View style={styles.empty}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
                {showingSearch
                  ? 'No matching transactions'
                  : filter.value
                  ? 'No transactions match this filter'
                  : 'No transactions yet'}
              </Text>
            </View>
          )
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={7}
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
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 19, fontFamily: 'Inter-SemiBold' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    paddingVertical: 0,
  },
  filterBar: { borderBottomWidth: 1 },
  filtersContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
  },
  filterText: { fontSize: 15, fontFamily: 'Inter-Medium' },
  filterTextActive: { color: '#fff' },
  errorBanner: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  errorText: { color: '#b91c1c', fontFamily: 'Inter-Medium' },
  groupHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  groupHeaderText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
    borderBottomWidth: 1,
  },
  txIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txInfo: { flex: 1, gap: 4 },
  txMerchant: { fontSize: 16, fontFamily: 'Inter-SemiBold' },
  txMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  txMeta: { fontSize: 13, fontFamily: 'Inter-Regular' },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
  statusChipText: { fontSize: 12, fontFamily: 'Inter-SemiBold' },
  txAmount: { fontSize: 16, fontFamily: 'Inter-SemiBold' },
  empty: { paddingVertical: 60, alignItems: 'center' },
  emptyText: { fontSize: 15, fontFamily: 'Inter-Regular' },
  footer: { paddingVertical: 24, alignItems: 'center' },
});
