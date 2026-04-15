import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { X, ArrowLeft, Zap, Gift, ShieldCheck, ChevronLeft, ChevronRight } from 'lucide-react-native';
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
  const [setupMode, setSetupMode] = useState(!autoReload.enabled);

  const handleSave = () => {
    updateAutoReload({ enabled, triggerBelow, topUpTo });
    Alert.alert('Saved', `Auto-reload has been ${enabled ? 'activated' : 'deactivated'}.`);
    router.back();
  };

  const handleSetup = () => {
    setSetupMode(false);
    setEnabled(true);
  };

  // Upsell screen when not yet enabled
  if (setupMode) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface }]}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <X size={22} color={colors.textSecondary} />
        </TouchableOpacity>

        <ScrollView contentContainerStyle={styles.upsellScroll} showsVerticalScrollIndicator={false}>
          <View style={[styles.upsellIcon, { backgroundColor: isDark ? '#1E293B' : '#f1f5f9' }]}>
            <Zap size={44} color={colors.primary} />
          </View>

          <Text style={[styles.upsellTitle, { color: colors.text }]}>Never run out.{'\n'}Earn more.</Text>
          <Text style={[styles.upsellSub, { color: colors.textSecondary }]}>
            Auto-reload tops up your Wallet automatically when your balance gets low — and earns you an extra +1% cashback on every auto top-up.
          </Text>

          <View style={styles.featureList}>
            {[
              { icon: Zap, color: colors.primary, bg: isDark ? '#1E3A5F' : '#eff6ff', text: 'Instant top-ups when you need them' },
              { icon: Gift, color: '#059669', bg: isDark ? '#064E3B' : '#f0fdf4', text: '+1% cashback on every auto top-up' },
              { icon: ShieldCheck, color: colors.textSecondary, bg: isDark ? '#334155' : '#f1f5f9', text: 'Turn off any time from Home' },
            ].map(({ icon: Icon, color, bg, text }) => (
              <View key={text} style={styles.featureRow}>
                <View style={[styles.featureIconBg, { backgroundColor: bg }]}>
                  <Icon size={20} color={color} />
                </View>
                <Text style={[styles.featureText, { color: colors.text }]}>{text}</Text>
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={[styles.upsellFooter, { borderTopColor: colors.border }]}>
          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primary }]} onPress={handleSetup}>
            <Text style={styles.primaryBtnText}>Set up Auto-reload</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()} style={styles.maybeLaterBtn}>
            <Text style={[styles.maybeLaterText, { color: colors.textSecondary }]}>Maybe later</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Settings screen when enabled/configuring
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
        <View style={[styles.enableCard, { backgroundColor: colors.surface, shadowColor: colors.shadowColor }]}>
          <View>
            <Text style={[styles.enableTitle, { color: colors.text }]}>Auto-reload</Text>
            <Text style={[styles.enableSub, { color: colors.textSecondary }]}>{enabled ? 'Currently active' : 'Currently off'}</Text>
          </View>
          <Switch
            value={enabled}
            onValueChange={setEnabled}
            trackColor={{ false: colors.border, true: isDark ? '#1E3A5F' : '#bfdbfe' }}
            thumbColor={enabled ? colors.primary : colors.surface}
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

            <View style={[styles.bonusCard, { backgroundColor: isDark ? '#1E3A5F' : '#eff6ff', borderColor: isDark ? '#3B82F6' : '#bfdbfe' }]}>
              <Zap size={16} color={colors.primary} />
              <Text style={[styles.bonusText, { color: colors.primary }]}>+{autoReload.bonusRate}% cashback on every auto top-up</Text>
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
  // Upsell screen
  closeBtn: { position: 'absolute', top: 56, right: 20, zIndex: 10, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  upsellScroll: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 32, paddingTop: 80, paddingBottom: 20 },
  upsellIcon: { width: 100, height: 100, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  upsellTitle: { fontSize: 32, fontFamily: 'Inter-Bold', textAlign: 'center', letterSpacing: -0.5, marginBottom: 16, lineHeight: 38 },
  upsellSub: { fontSize: 17, fontFamily: 'Inter-Regular', textAlign: 'center', lineHeight: 24, marginBottom: 36 },
  featureList: { width: '100%', gap: 20 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  featureIconBg: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  featureText: { flex: 1, fontSize: 17, fontFamily: 'Inter-Regular', lineHeight: 22 },
  upsellFooter: { padding: 24, paddingTop: 16, gap: 4 },
  maybeLaterBtn: { alignItems: 'center', paddingVertical: 12 },
  maybeLaterText: { fontSize: 17, fontFamily: 'Inter-Medium' },
  // Settings screen
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 19, fontFamily: 'Inter-SemiBold' },
  scroll: { padding: 16, paddingBottom: 40 },
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
