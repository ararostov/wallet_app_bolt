import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Zap, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useWallet } from '@/context/WalletContext';
import { formatCurrency } from '@/utils/format';
import { useTheme } from '@/context/ThemeContext';

export default function AutoReloadScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { state, updateAutoReload } = useWallet();
  const { autoReload } = state;

  const [enabled, setEnabled] = useState(autoReload.enabled);
  const [triggerBelow, setTriggerBelow] = useState(autoReload.triggerBelow);
  const [topUpTo, setTopUpTo] = useState(autoReload.topUpTo);

  const handleSave = () => {
    updateAutoReload({ enabled, triggerBelow, topUpTo });
    Alert.alert('Saved', `Auto-reload has been ${enabled ? 'activated' : 'deactivated'}.`);
    router.back();
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Auto-reload</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Hero */}
        {!autoReload.enabled && (
          <View style={styles.hero}>
            <View style={[styles.heroIcon, { backgroundColor: isDark ? '#78350F' : '#fffbeb' }]}>
              <Zap size={40} color={colors.amber} />
            </View>
            <Text style={[styles.heroTitle, { color: colors.text }]}>Never run out of balance</Text>
            <Text style={[styles.heroSub, { color: colors.textSecondary }]}>
              Auto-reload automatically tops up your wallet when your balance gets low. Plus earn +1% bonus cashback on every auto top-up.
            </Text>
          </View>
        )}

        {/* Enable toggle */}
        <View style={[styles.enableCard, { backgroundColor: colors.surface, shadowColor: colors.shadowColor }]}>
          <View>
            <Text style={[styles.enableTitle, { color: colors.text }]}>Auto-reload</Text>
            <Text style={[styles.enableSub, { color: colors.textSecondary }]}>{enabled ? 'Currently active' : 'Currently off'}</Text>
          </View>
          <Switch
            value={enabled}
            onValueChange={setEnabled}
            trackColor={{ false: colors.border, true: isDark ? '#78350F' : '#fde68a' }}
            thumbColor={enabled ? colors.amber : colors.surface}
          />
        </View>

        {enabled && (
          <>
            <View style={[styles.configCard, { backgroundColor: colors.surface, shadowColor: colors.shadowColor }]}>
              <Text style={[styles.configTitle, { color: colors.textSecondary }]}>When balance falls below</Text>
              <View style={styles.stepperRow}>
                <TouchableOpacity
                  style={[styles.stepperBtn, { backgroundColor: isDark ? '#1E3A5F' : '#eff6ff' }]}
                  onPress={() => setTriggerBelow(Math.max(5, triggerBelow - 5))}
                >
                  <ChevronLeft size={20} color={colors.primary} />
                </TouchableOpacity>
                <Text style={[styles.stepperValue, { color: colors.text }]}>{formatCurrency(triggerBelow)}</Text>
                <TouchableOpacity
                  style={[styles.stepperBtn, { backgroundColor: isDark ? '#1E3A5F' : '#eff6ff' }]}
                  onPress={() => setTriggerBelow(Math.min(50, triggerBelow + 5))}
                >
                  <ChevronRight size={20} color={colors.primary} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.stepperRange, { color: colors.textTertiary }]}>£5 — £50</Text>
            </View>

            <View style={[styles.configCard, { backgroundColor: colors.surface, shadowColor: colors.shadowColor }]}>
              <Text style={[styles.configTitle, { color: colors.textSecondary }]}>Top up to</Text>
              <View style={styles.stepperRow}>
                <TouchableOpacity
                  style={[styles.stepperBtn, { backgroundColor: isDark ? '#1E3A5F' : '#eff6ff' }]}
                  onPress={() => setTopUpTo(Math.max(20, topUpTo - 10))}
                >
                  <ChevronLeft size={20} color={colors.primary} />
                </TouchableOpacity>
                <Text style={[styles.stepperValue, { color: colors.text }]}>{formatCurrency(topUpTo)}</Text>
                <TouchableOpacity
                  style={[styles.stepperBtn, { backgroundColor: isDark ? '#1E3A5F' : '#eff6ff' }]}
                  onPress={() => setTopUpTo(Math.min(200, topUpTo + 10))}
                >
                  <ChevronRight size={20} color={colors.primary} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.stepperRange, { color: colors.textTertiary }]}>£20 — £200</Text>
            </View>

            <View style={[styles.sourceCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sourceLabel, { color: colors.textSecondary }]}>Payment source</Text>
              <Text style={[styles.sourceValue, { color: colors.text }]}>{autoReload.source}</Text>
            </View>

            <View style={[styles.bonusCard, { backgroundColor: isDark ? '#78350F' : '#fffbeb', borderColor: isDark ? '#FBBF24' : '#fde68a' }]}>
              <Zap size={16} color={colors.amber} />
              <Text style={[styles.bonusText, { color: isDark ? '#FBBF24' : '#92400e' }]}>+{autoReload.bonusRate}% cashback on every auto top-up</Text>
            </View>
          </>
        )}

        <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primary }]} onPress={handleSave}>
          <Text style={styles.primaryBtnText}>{enabled ? 'Save & activate' : 'Save'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 19, fontFamily: 'Inter-SemiBold' },
  scroll: { padding: 16, paddingBottom: 40 },
  hero: { alignItems: 'center', gap: 10, paddingVertical: 20 },
  heroIcon: { width: 72, height: 72, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 24, fontFamily: 'Inter-Bold' },
  heroSub: { fontSize: 17, fontFamily: 'Inter-Regular', textAlign: 'center', lineHeight: 22 },
  enableCard: { borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  enableTitle: { fontSize: 18, fontFamily: 'Inter-SemiBold' },
  enableSub: { fontSize: 15, fontFamily: 'Inter-Regular', marginTop: 2 },
  configCard: { borderRadius: 14, padding: 16, marginBottom: 12, alignItems: 'center', gap: 8, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  configTitle: { fontSize: 16, fontFamily: 'Inter-Medium' },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  stepperBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  stepperValue: { fontSize: 30, fontFamily: 'Inter-Bold', minWidth: 80, textAlign: 'center' },
  stepperRange: { fontSize: 15, fontFamily: 'Inter-Regular' },
  sourceCard: { borderRadius: 12, padding: 14, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', borderWidth: 1 },
  sourceLabel: { fontSize: 16, fontFamily: 'Inter-Regular' },
  sourceValue: { fontSize: 16, fontFamily: 'Inter-SemiBold' },
  bonusCard: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, padding: 12, marginBottom: 20, borderWidth: 1 },
  bonusText: { fontSize: 16, fontFamily: 'Inter-SemiBold' },
  primaryBtn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  primaryBtnText: { fontSize: 18, fontFamily: 'Inter-SemiBold', color: '#fff' },
});
