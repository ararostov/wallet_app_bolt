import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { X, ArrowRight } from 'lucide-react-native';
import { useWallet } from '@/context/WalletContext';
import { useTheme } from '@/context/ThemeContext';
import { formatCurrency } from '@/utils/format';

export default function TopupReviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ amount: string; method: string }>();
  const { topUp, state } = useWallet();
  const { colors, isDark } = useTheme();
  const [loading, setLoading] = useState(false);

  const amount = parseFloat(params.amount ?? '50');
  const method = params.method ?? 'Apple Pay';
  const isBonusPending = state.wallet.bonusState === 'pending' || state.wallet.bonusState === 'progress';
  const willUnlockBonus = isBonusPending && amount >= state.wallet.topUpTarget;
  const bonusAmount = willUnlockBonus ? state.wallet.bonusAmount : 0;
  const CASHBACK_RATE = 0.05;
  const cashbackEarned = parseFloat((amount * CASHBACK_RATE).toFixed(2));
  const youGet = amount + cashbackEarned;

  const handleConfirm = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    topUp(amount, method);
    setLoading(false);
    router.replace({ pathname: '/topup/result', params: { state: 'success', amount: amount.toString(), method } } as any);
  };

  return (
    <SafeAreaView edges={['left', 'right']} style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border, paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <X size={22} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Review</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.container}>
        <View style={[styles.payGetCard, { backgroundColor: colors.surface, shadowColor: colors.shadowColor }]}>
          <View style={styles.payGetSide}>
            <Text style={[styles.payGetLabel, { color: colors.textSecondary }]}>You Pay</Text>
            <Text style={[styles.payGetAmount, { color: colors.text }]}>{formatCurrency(amount)}</Text>
          </View>
          <ArrowRight size={22} color={colors.textTertiary} style={styles.payGetArrow} />
          <View style={styles.payGetSide}>
            <Text style={[styles.payGetLabel, { color: colors.textSecondary }]}>You Get</Text>
            <Text style={[styles.payGetAmount, { color: colors.text }]}>{formatCurrency(youGet)}</Text>
            <Text style={styles.payGetCashback}>+{formatCurrency(cashbackEarned)} cashback</Text>
          </View>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: colors.surface, shadowColor: colors.shadowColor }]}>
          {[
            { label: 'You pay', value: formatCurrency(amount), bold: true },
            { label: 'Payment method', value: method },
            { label: 'Fee', value: 'Free' },
            ...(willUnlockBonus ? [{ label: 'Welcome bonus', value: `+${formatCurrency(bonusAmount)}`, green: true }] : []),
            { label: 'New balance', value: formatCurrency(state.wallet.balance + amount + bonusAmount), bold: true },
          ].map(({ label, value, bold, green }: any) => (
            <View key={label} style={[styles.summaryRow, { borderBottomColor: colors.borderLight }]}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{label}</Text>
              <Text style={[styles.summaryValue, { color: colors.text }, bold && { fontFamily: 'Inter-SemiBold', color: colors.text }, green && styles.summaryValueGreen]}>
                {value}
              </Text>
            </View>
          ))}
        </View>

        {amount < state.wallet.topUpTarget && isBonusPending && (
          <View style={styles.upsellBanner}>
            <Text style={styles.upsellText}>
              {'\uD83D\uDCA1'} Top up {formatCurrency(state.wallet.topUpTarget)} instead to unlock a {formatCurrency(state.wallet.bonusAmount)} bonus!
            </Text>
          </View>
        )}
      </View>

      <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.primary }, loading && styles.primaryBtnDisabled]}
          onPress={handleConfirm}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>Pay {formatCurrency(amount)}</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1 },
  title: { fontSize: 19, fontFamily: 'Inter-SemiBold' },
  container: { flex: 1, padding: 16, gap: 16 },
  payGetCard: { borderRadius: 20, padding: 24, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  payGetSide: { flex: 1, alignItems: 'center', gap: 4 },
  payGetLabel: { fontSize: 15, fontFamily: 'Inter-Medium' },
  payGetAmount: { fontSize: 30, fontFamily: 'Inter-Bold', letterSpacing: -1 },
  payGetCashback: { fontSize: 15, fontFamily: 'Inter-SemiBold', color: '#059669' },
  payGetArrow: { marginTop: 20 },
  summaryCard: { borderRadius: 16, overflow: 'hidden', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1 },
  summaryLabel: { fontSize: 16, fontFamily: 'Inter-Regular' },
  summaryValue: { fontSize: 16, fontFamily: 'Inter-Medium' },
  summaryValueGreen: { color: '#059669', fontFamily: 'Inter-SemiBold' },
  upsellBanner: { backgroundColor: '#fffbeb', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#fde68a' },
  upsellText: { fontSize: 16, fontFamily: 'Inter-Medium', color: '#92400e', lineHeight: 20 },
  footer: { padding: 16, borderTopWidth: 1 },
  primaryBtn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  primaryBtnDisabled: { opacity: 0.7 },
  primaryBtnText: { fontSize: 18, fontFamily: 'Inter-SemiBold', color: '#fff' },
});
