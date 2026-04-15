import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Copy, TriangleAlert as AlertTriangle } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { useWallet } from '@/context/WalletContext';
import { useTheme } from '@/context/ThemeContext';
import { formatCurrency, formatDateLong, getTxColor, getTransactionIcon, getStatusColor, getStatusLabel } from '@/utils/format';

export default function TransactionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state } = useWallet();
  const { colors, isDark } = useTheme();

  const tx = state.transactions.find((t) => t.id === id);

  if (!tx) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()}><ArrowLeft size={22} color={colors.text} /></TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Transaction</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.notFound}>
          <Text style={[styles.notFoundText, { color: colors.textTertiary }]}>Transaction not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isPositive = tx.amount > 0;
  const statusColor = getStatusColor(tx.status);
  const linkedTx = tx.linkedTxId ? state.transactions.find((t) => t.id === tx.linkedTxId) : null;
  const existingDispute = state.disputes.find((d) => d.txId === tx.id);

  const copyRef = async () => {
    await Clipboard.setStringAsync(tx.reference);
    Alert.alert('Copied', 'Reference copied to clipboard');
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Transaction</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
          <View style={[styles.heroIcon, { backgroundColor: getTxColor(tx.type) + '20' }]}>
            <Text style={styles.heroIconText}>{getTransactionIcon(tx.type)}</Text>
          </View>
          <Text style={[styles.heroMerchant, { color: colors.text }]}>{tx.merchant ?? tx.type}</Text>
          <Text style={[styles.heroAmount, isPositive ? styles.heroAmountPositive : { color: colors.text }]}>
            {isPositive ? '+' : ''}{formatCurrency(tx.amount)}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>{getStatusLabel(tx.status)}</Text>
          </View>
        </View>

        {/* Details */}
        <View style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.shadowColor }]}>
          {[
            { label: 'Date & time', value: formatDateLong(tx.date) },
            { label: 'Method', value: tx.method === 'digital_wallet' ? (Platform.OS === 'android' ? 'Google Wallet' : 'Apple Wallet') : tx.method },
            { label: 'Category', value: tx.category ?? '\u2014' },
          ].map(({ label, value }) => (
            <View key={label} style={[styles.infoRow, { borderBottomColor: colors.borderLight }]}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
            </View>
          ))}
          <View style={[styles.infoRow, { borderBottomColor: colors.borderLight }]}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Reference</Text>
            <TouchableOpacity style={styles.refRow} onPress={copyRef}>
              <Text style={[styles.infoValueMono, { color: colors.text }]}>{tx.reference}</Text>
              <Copy size={14} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Cashback earned */}
        {tx.cashbackEarned && tx.cashbackEarned > 0 && (
          <View style={styles.cashbackCard}>
            <View style={styles.cashbackHeader}>
              <Text style={styles.cashbackTitle}>Cashback earned</Text>
              <Text style={styles.cashbackAmount}>+{formatCurrency(tx.cashbackEarned)}</Text>
            </View>
            {tx.cashbackAvailableFrom && (
              <Text style={styles.cashbackNote}>
                Available from {formatDateLong(tx.cashbackAvailableFrom)}
              </Text>
            )}
          </View>
        )}

        {/* Linked transaction */}
        {linkedTx && (
          <TouchableOpacity
            style={[styles.linkedCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.push(`/transactions/${linkedTx.id}` as any)}
          >
            <Text style={[styles.linkedLabel, { color: colors.textTertiary }]}>Linked transaction</Text>
            <View style={styles.linkedRow}>
              <Text style={[styles.linkedMerchant, { color: colors.text }]}>{linkedTx.merchant ?? linkedTx.type}</Text>
              <Text style={[styles.linkedAmount, { color: colors.text }]}>{formatCurrency(linkedTx.amount)}</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Dispute info */}
        {existingDispute && (
          <View style={styles.disputeCard}>
            <AlertTriangle size={16} color="#d97706" />
            <View style={styles.disputeInfo}>
              <Text style={styles.disputeTitle}>Dispute open</Text>
              <Text style={styles.disputeRef}>Ref: {existingDispute.reference}</Text>
            </View>
          </View>
        )}

        {/* Actions */}
        {tx.type === 'purchase' && !existingDispute && (
          <TouchableOpacity
            style={styles.reportBtn}
            onPress={() => router.push(`/transactions/${tx.id}/report` as any)}
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontFamily: 'Inter-SemiBold' },
  scroll: { paddingBottom: 40 },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontSize: 16, fontFamily: 'Inter-Regular' },
  hero: { padding: 32, alignItems: 'center', gap: 10, borderBottomWidth: 1 },
  heroIcon: { width: 72, height: 72, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  heroIconText: { fontSize: 32 },
  heroMerchant: { fontSize: 20, fontFamily: 'Inter-Bold' },
  heroAmount: { fontSize: 36, fontFamily: 'Inter-Bold', letterSpacing: -1 },
  heroAmountPositive: { color: '#059669' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 13, fontFamily: 'Inter-SemiBold' },
  card: { marginHorizontal: 16, marginTop: 16, borderRadius: 16, overflow: 'hidden', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 16, borderBottomWidth: 1 },
  infoLabel: { fontSize: 14, fontFamily: 'Inter-Regular' },
  infoValue: { fontSize: 14, fontFamily: 'Inter-SemiBold', textAlign: 'right', flex: 1, marginLeft: 16 },
  infoValueMono: { fontSize: 13, fontFamily: 'Inter-Medium' },
  refRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cashbackCard: { marginHorizontal: 16, marginTop: 12, backgroundColor: '#f0fdf4', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#bbf7d0' },
  cashbackHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cashbackTitle: { fontSize: 15, fontFamily: 'Inter-SemiBold', color: '#15803d' },
  cashbackAmount: { fontSize: 18, fontFamily: 'Inter-Bold', color: '#059669' },
  cashbackNote: { fontSize: 12, color: '#16a34a', fontFamily: 'Inter-Regular', marginTop: 6 },
  linkedCard: { marginHorizontal: 16, marginTop: 12, borderRadius: 14, padding: 14, borderWidth: 1 },
  linkedLabel: { fontSize: 12, fontFamily: 'Inter-SemiBold', marginBottom: 6 },
  linkedRow: { flexDirection: 'row', justifyContent: 'space-between' },
  linkedMerchant: { fontSize: 14, fontFamily: 'Inter-SemiBold' },
  linkedAmount: { fontSize: 14, fontFamily: 'Inter-SemiBold' },
  disputeCard: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginTop: 12, backgroundColor: '#fffbeb', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#fde68a' },
  disputeInfo: {},
  disputeTitle: { fontSize: 14, fontFamily: 'Inter-SemiBold', color: '#92400e' },
  disputeRef: { fontSize: 12, color: '#a16207', fontFamily: 'Inter-Regular' },
  reportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 16, marginTop: 20, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#fde68a', backgroundColor: '#fffbeb' },
  reportBtnText: { fontSize: 14, fontFamily: 'Inter-SemiBold', color: '#d97706' },
});
