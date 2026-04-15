import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useWallet } from '@/context/WalletContext';
import { formatCurrency } from '@/utils/format';
import { useTheme } from '@/context/ThemeContext';

export default function CardLimitsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { state } = useWallet();
  const { card } = state;

  const sections = [
    {
      title: 'Spending limits',
      items: [
        { label: 'Daily spending', used: card.dailySpent, cap: card.dailyLimit },
        { label: 'Monthly spending', used: card.monthlySpent, cap: card.monthlyLimit },
      ],
    },
    {
      title: 'Top-up limits',
      items: [
        { label: 'Daily top-up', used: 50, cap: 1000 },
        { label: 'Monthly top-up', used: 425, cap: 5000 },
      ],
    },
  ];

  const perTxLimits = [
    { label: 'Single purchase', value: '£2,000' },
    { label: 'Single top-up', value: '£2,500' },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Card limits</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>
            <View style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.shadowColor }]}>
              {section.items.map((item, idx) => {
                const pct = Math.min(item.used / item.cap, 1);
                return (
                  <View key={item.label} style={[styles.limitRow, idx > 0 && [styles.limitRowBorder, { borderTopColor: colors.borderLight }]]}>
                    <View style={styles.limitTop}>
                      <Text style={[styles.limitLabel, { color: colors.textSecondary }]}>{item.label}</Text>
                      <Text style={styles.limitValues}>
                        <Text style={[styles.limitUsed, { color: colors.text }]}>{formatCurrency(item.used)}</Text>
                        <Text style={[styles.limitSep, { color: colors.textTertiary }]}> / </Text>
                        <Text style={[styles.limitCap, { color: colors.textTertiary }]}>{formatCurrency(item.cap)}</Text>
                      </Text>
                    </View>
                    <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${pct * 100}%` as any, backgroundColor: colors.primary },
                          pct > 0.8 && styles.progressFillWarning,
                        ]}
                      />
                    </View>
                    <Text style={[styles.limitRemaining, { color: colors.textSecondary }]}>
                      {formatCurrency(item.cap - item.used)} remaining
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        ))}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Per transaction limits</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.shadowColor }]}>
            {perTxLimits.map(({ label, value }, idx) => (
              <View key={label} style={[styles.perTxRow, idx > 0 && [styles.limitRowBorder, { borderTopColor: colors.borderLight }]]}>
                <Text style={[styles.limitLabel, { color: colors.textSecondary }]}>{label}</Text>
                <Text style={[styles.perTxValue, { color: colors.text }]}>{value}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={[styles.note, { color: colors.textTertiary }]}>
          Limits reset daily at midnight UTC and monthly on the 1st. Contact support to request a limit increase.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontFamily: 'Inter-SemiBold' },
  scroll: { padding: 16, paddingBottom: 40 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontFamily: 'Inter-Bold', marginBottom: 10 },
  card: { borderRadius: 16, overflow: 'hidden', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  limitRow: { padding: 14, gap: 8 },
  limitRowBorder: { borderTopWidth: 1 },
  limitTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  limitLabel: { fontSize: 14, fontFamily: 'Inter-Medium' },
  limitValues: {},
  limitUsed: { fontSize: 14, fontFamily: 'Inter-Bold' },
  limitSep: { fontSize: 14 },
  limitCap: { fontSize: 14, fontFamily: 'Inter-Regular' },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
  progressFillWarning: { backgroundColor: '#f59e0b' },
  limitRemaining: { fontSize: 12, fontFamily: 'Inter-Regular' },
  perTxRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  perTxValue: { fontSize: 14, fontFamily: 'Inter-SemiBold' },
  note: { fontSize: 13, fontFamily: 'Inter-Regular', textAlign: 'center', lineHeight: 18 },
});
