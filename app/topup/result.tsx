import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CircleCheck as CheckCircle, Clock, Circle as XCircle } from 'lucide-react-native';
import { useWallet } from '@/context/WalletContext';
import { useTheme } from '@/context/ThemeContext';
import { formatCurrency } from '@/utils/format';

export default function TopupResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ state: string; amount: string; method: string }>();
  const { state } = useWallet();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const resultState = (params.state as 'success' | 'pending' | 'failure') ?? 'success';
  const amount = parseFloat(params.amount ?? '50');

  const configs = {
    success: {
      icon: CheckCircle,
      iconColor: '#059669',
      iconBg: '#f0fdf4',
      title: 'Top-up successful!',
      subtitle: `${formatCurrency(amount)} has been added to your Tesco Wallet.`,
      ctaLabel: 'Back to home',
    },
    pending: {
      icon: Clock,
      iconColor: '#d97706',
      iconBg: '#fffbeb',
      title: 'Top-up pending',
      subtitle: 'Your top-up is being processed. We\'ll notify you when it arrives.',
      ctaLabel: 'Back to home',
    },
    failure: {
      icon: XCircle,
      iconColor: '#ef4444',
      iconBg: '#fef2f2',
      title: "Top-up didn't go through",
      subtitle: 'Something went wrong with your payment. Please try a different method.',
      ctaLabel: 'Try again',
    },
  };

  const cfg = configs[resultState];
  const Icon = cfg.icon;

  return (
    <SafeAreaView edges={['left', 'right']} style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={[styles.iconCircle, { backgroundColor: cfg.iconBg }]}>
          <Icon size={56} color={cfg.iconColor} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>{cfg.title}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{cfg.subtitle}</Text>

        {resultState === 'success' && (
          <View style={[styles.receiptCard, { backgroundColor: colors.surface, shadowColor: colors.shadowColor }]}>
            <View style={[styles.receiptRow, { borderBottomColor: colors.borderLight }]}>
              <Text style={[styles.receiptLabel, { color: colors.textSecondary }]}>Amount</Text>
              <Text style={[styles.receiptValue, { color: colors.text }]}>{formatCurrency(amount)}</Text>
            </View>
            <View style={[styles.receiptRow, { borderBottomColor: colors.borderLight }]}>
              <Text style={[styles.receiptLabel, { color: colors.textSecondary }]}>Method</Text>
              <Text style={[styles.receiptValue, { color: colors.text }]}>{params.method ?? 'Apple Pay'}</Text>
            </View>
            <View style={[styles.receiptRow, { borderBottomColor: colors.borderLight }]}>
              <Text style={[styles.receiptLabel, { color: colors.textSecondary }]}>New balance</Text>
              <Text style={[styles.receiptValue, styles.receiptValueBold]}>
                {formatCurrency(state.wallet.balance)}
              </Text>
            </View>
            <View style={[styles.receiptRow, { borderBottomColor: colors.borderLight }]}>
              <Text style={[styles.receiptLabel, { color: colors.textSecondary }]}>Reference</Text>
              <Text style={[styles.receiptValue, { color: colors.text }]}>REF-{Date.now().toString().slice(-8)}</Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
          onPress={() => {
            if (resultState === 'failure') {
              router.back();
            } else {
              router.replace('/(tabs)');
            }
          }}
        >
          <Text style={styles.primaryBtnText}>{cfg.ctaLabel}</Text>
        </TouchableOpacity>

        {resultState === 'failure' && (
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.replace('/(tabs)')}>
            <Text style={[styles.secondaryBtnText, { color: colors.textSecondary }]}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  iconCircle: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  title: { fontSize: 28, fontFamily: 'Inter-Bold', textAlign: 'center', letterSpacing: -0.5 },
  subtitle: { fontSize: 17, fontFamily: 'Inter-Regular', textAlign: 'center', lineHeight: 22, marginBottom: 8 },
  receiptCard: {
    width: '100%',
    borderRadius: 16,
    padding: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 8,
  },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1 },
  receiptLabel: { fontSize: 16, fontFamily: 'Inter-Regular' },
  receiptValue: { fontSize: 16, fontFamily: 'Inter-Medium' },
  receiptValueBold: { fontFamily: 'Inter-Bold', color: '#059669' },
  primaryBtn: { width: '100%', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  primaryBtnText: { fontSize: 18, fontFamily: 'Inter-SemiBold', color: '#fff' },
  secondaryBtn: { paddingVertical: 12 },
  secondaryBtnText: { fontSize: 17, fontFamily: 'Inter-Medium' },
});
