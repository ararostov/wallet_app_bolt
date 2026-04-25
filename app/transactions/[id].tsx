// Transaction detail screen — wired to GET /transactions/{id}.
// See spec docs/mobile/specs/06-transactions.ru.md §4.2.

import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Copy,
  TriangleAlert as AlertTriangle,
} from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';

import { toast } from '@/components/ui/Toast';
import { useTheme } from '@/context/ThemeContext';
import { useTransaction } from '@/hooks/useTransaction';
import type { TransactionRecord, TransactionStatus } from '@/types/transactions';
import {
  formatDateLong,
  formatMoney,
  getStatusColor,
  getStatusLabel,
  getTransactionIcon,
} from '@/utils/format';
import { ApiError, mapErrorCode } from '@/utils/errors';

const DISPUTABLE_TYPES = new Set([
  'purchase',
  'topup',
  'auto_reload',
  'refund',
]);

function isDisputable(
  tx: TransactionRecord,
  hasActiveDispute: boolean,
): boolean {
  return (
    DISPUTABLE_TYPES.has(tx.type) &&
    tx.status === 'completed' &&
    !hasActiveDispute
  );
}

function statusBadgeColor(status: TransactionStatus): string {
  return getStatusColor(status);
}

export default function TransactionDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { data, loading, error } = useTransaction(id);

  if (loading && !data) {
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
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Transaction</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !data) {
    const apiErr = error instanceof ApiError ? error : null;
    const message =
      (apiErr ? mapErrorCode(apiErr.code) : null) ??
      error?.message ??
      'Transaction not found';
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
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Transaction</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.center}>
          <Text style={[styles.notFoundText, { color: colors.textTertiary }]}>
            {message}
          </Text>
          <TouchableOpacity
            style={[styles.backBtn, { borderColor: colors.border }]}
            onPress={() => router.back()}
          >
            <Text style={{ color: colors.text, fontFamily: 'Inter-SemiBold' }}>
              Go back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const { transaction: tx, linkedTransaction, activeDispute, paymentMethod } =
    data;
  const isPositive = tx.amount.amountMinor > 0;
  const statusColor = statusBadgeColor(tx.status);
  const sign = isPositive ? '+' : '';
  const amountLabel = `${sign}${formatMoney(tx.amount.amountMinor, tx.amount.currency)}`;
  const disputable = isDisputable(tx, activeDispute !== null);
  const cashbackEarned =
    tx.cashbackEarnedMinor && tx.cashbackEarnedMinor > 0
      ? {
          amount: tx.cashbackEarnedMinor,
          currency: tx.cashbackCurrency ?? tx.amount.currency,
          availableAt: tx.cashbackAvailableAt,
        }
      : null;

  const copyReference = async () => {
    if (!tx.reference) return;
    await Clipboard.setStringAsync(tx.reference);
    toast.show({ message: 'Reference copied', variant: 'success' });
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
        <Text style={[styles.title, { color: colors.text }]}>Transaction</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.hero,
            { backgroundColor: colors.surface, borderBottomColor: colors.borderLight },
          ]}
        >
          <View style={[styles.heroIcon, { backgroundColor: '#f1f5f9' }]}>
            <Text style={styles.heroIconText}>{getTransactionIcon(tx.type)}</Text>
          </View>
          <Text style={[styles.heroMerchant, { color: colors.text }]}>
            {tx.merchantName ?? tx.type}
          </Text>
          <Text
            style={[
              styles.heroAmount,
              {
                color: isPositive ? '#059669' : colors.text,
                opacity: tx.status === 'pending' ? 0.7 : 1,
              },
            ]}
          >
            {amountLabel}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {getStatusLabel(tx.status)}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, shadowColor: colors.shadowColor },
          ]}
        >
          {[
            { label: 'Date & time', value: formatDateLong(tx.occurredAt) },
            paymentMethod
              ? {
                  label: 'Method',
                  value: `${paymentMethod.brand ?? paymentMethod.channel}${paymentMethod.last4 ? ` ····${paymentMethod.last4}` : ''}`,
                }
              : null,
            tx.merchantCategory
              ? { label: 'Category', value: tx.merchantCategory }
              : null,
          ]
            .filter((row): row is { label: string; value: string } => row !== null)
            .map(({ label, value }) => (
              <View
                key={label}
                style={[styles.infoRow, { borderBottomColor: colors.borderLight }]}
              >
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                  {label}
                </Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
              </View>
            ))}
          {tx.reference && (
            <View style={[styles.infoRow, { borderBottomColor: colors.borderLight }]}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                Reference
              </Text>
              <TouchableOpacity
                style={styles.refRow}
                onPress={copyReference}
                onLongPress={copyReference}
              >
                <Text style={[styles.infoValueMono, { color: colors.text }]}>
                  {tx.reference}
                </Text>
                <Copy size={14} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {cashbackEarned && (
          <View style={styles.cashbackCard}>
            <View style={styles.cashbackHeader}>
              <Text style={styles.cashbackTitle}>Cashback earned</Text>
              <Text style={styles.cashbackAmount}>
                +{formatMoney(cashbackEarned.amount, cashbackEarned.currency)}
              </Text>
            </View>
            {cashbackEarned.availableAt && (
              <Text style={styles.cashbackNote}>
                Available from {formatDateLong(cashbackEarned.availableAt)}
              </Text>
            )}
          </View>
        )}

        {linkedTransaction && (
          <TouchableOpacity
            style={[
              styles.linkedCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={() =>
              router.push(`/transactions/${linkedTransaction.id}` as never)
            }
          >
            <Text style={[styles.linkedLabel, { color: colors.textTertiary }]}>
              Linked transaction
            </Text>
            <View style={styles.linkedRow}>
              <Text style={[styles.linkedMerchant, { color: colors.text }]}>
                {linkedTransaction.merchantName ?? linkedTransaction.type}
              </Text>
              <Text style={[styles.linkedAmount, { color: colors.text }]}>
                {linkedTransaction.amount.amountMinor > 0 ? '+' : ''}
                {formatMoney(
                  linkedTransaction.amount.amountMinor,
                  linkedTransaction.amount.currency,
                )}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {activeDispute && (
          <View style={styles.disputeCard}>
            <AlertTriangle size={16} color="#d97706" />
            <View style={styles.disputeInfo}>
              <Text style={styles.disputeTitle}>Dispute open</Text>
              <Text style={styles.disputeRef}>Ref: {activeDispute.reference}</Text>
            </View>
          </View>
        )}

        {disputable && (
          <TouchableOpacity
            style={styles.reportBtn}
            onPress={() => router.push(`/transactions/${tx.id}/report` as never)}
          >
            <AlertTriangle size={16} color="#d97706" />
            <Text style={styles.reportBtnText}>Request Refund</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
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
  scroll: { paddingBottom: 80 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 32,
  },
  notFoundText: { fontSize: 18, fontFamily: 'Inter-Regular' },
  backBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  hero: {
    padding: 32,
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  heroIconText: { fontSize: 35 },
  heroMerchant: { fontSize: 22, fontFamily: 'Inter-Bold' },
  heroAmount: { fontSize: 38, fontFamily: 'Inter-Bold', letterSpacing: -1 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 15, fontFamily: 'Inter-SemiBold' },
  card: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  infoLabel: { fontSize: 16, fontFamily: 'Inter-Regular' },
  infoValue: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  infoValueMono: { fontSize: 15, fontFamily: 'Inter-Medium' },
  refRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cashbackCard: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#f0fdf4',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  cashbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cashbackTitle: { fontSize: 17, fontFamily: 'Inter-SemiBold', color: '#15803d' },
  cashbackAmount: { fontSize: 20, fontFamily: 'Inter-Bold', color: '#059669' },
  cashbackNote: {
    fontSize: 15,
    color: '#16a34a',
    fontFamily: 'Inter-Regular',
    marginTop: 6,
  },
  linkedCard: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  linkedLabel: { fontSize: 15, fontFamily: 'Inter-SemiBold', marginBottom: 6 },
  linkedRow: { flexDirection: 'row', justifyContent: 'space-between' },
  linkedMerchant: { fontSize: 16, fontFamily: 'Inter-SemiBold' },
  linkedAmount: { fontSize: 16, fontFamily: 'Inter-SemiBold' },
  disputeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  disputeInfo: {},
  disputeTitle: { fontSize: 16, fontFamily: 'Inter-SemiBold', color: '#92400e' },
  disputeRef: { fontSize: 15, color: '#a16207', fontFamily: 'Inter-Regular' },
  reportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#fde68a',
    backgroundColor: '#fffbeb',
  },
  reportBtnText: { fontSize: 16, fontFamily: 'Inter-SemiBold', color: '#d97706' },
});
