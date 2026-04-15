import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useWallet } from '@/context/WalletContext';
import { useTheme } from '@/context/ThemeContext';

const PREFS_CONFIG = [
  {
    group: 'Transactions',
    key: 'transactions' as const,
    desc: 'Get notified about purchases, top-ups and refunds',
  },
  {
    group: 'Rewards',
    key: 'rewards' as const,
    desc: 'Cashback posted, rewards expiring soon, bonuses',
  },
  {
    group: 'Security',
    key: 'security' as const,
    desc: 'Login alerts, suspicious activity, password changes',
  },
  {
    group: 'Promotions',
    key: 'promotions' as const,
    desc: 'Special offers, new perks, limited-time deals',
  },
  {
    group: 'Tier updates',
    key: 'tier' as const,
    desc: 'Tier progress, upgrades, and resets',
  },
];

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const { state, updateNotificationSettings } = useWallet();
  const { colors, isDark } = useTheme();
  const settings = state.notificationSettings;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Notification settings</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Master toggle */}
        <View style={[styles.masterCard, { backgroundColor: colors.surface, shadowColor: colors.shadowColor }]}>
          <View style={styles.masterContent}>
            <Text style={[styles.masterTitle, { color: colors.text }]}>All notifications</Text>
            <Text style={[styles.masterDesc, { color: colors.textSecondary }]}>Enable or disable all notifications at once</Text>
          </View>
          <Switch
            value={settings.masterEnabled}
            onValueChange={(v) => updateNotificationSettings({ masterEnabled: v })}
            trackColor={{ false: colors.border, true: isDark ? '#1E40AF' : '#bfdbfe' }}
            thumbColor={settings.masterEnabled ? colors.primary : colors.surface}
          />
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.shadowColor }]}>
          {PREFS_CONFIG.map((pref, idx) => (
            <View key={pref.key} style={[styles.row, idx < PREFS_CONFIG.length - 1 && [styles.rowBorder, { borderBottomColor: colors.borderLight }]]}>
              <View style={styles.rowContent}>
                <Text style={[styles.rowLabel, { color: colors.text }, !settings.masterEnabled && { color: colors.textTertiary }]}>
                  {pref.group}
                </Text>
                <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>{pref.desc}</Text>
              </View>
              <Switch
                value={settings[pref.key] && settings.masterEnabled}
                onValueChange={(v) => updateNotificationSettings({ [pref.key]: v })}
                disabled={!settings.masterEnabled}
                trackColor={{ false: colors.border, true: isDark ? '#1E40AF' : '#bfdbfe' }}
                thumbColor={(settings[pref.key] && settings.masterEnabled) ? colors.primary : colors.surface}
              />
            </View>
          ))}
        </View>
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
  masterCard: { borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 16, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  masterContent: { flex: 1 },
  masterTitle: { fontSize: 16, fontFamily: 'Inter-SemiBold' },
  masterDesc: { fontSize: 13, fontFamily: 'Inter-Regular', marginTop: 2 },
  card: { borderRadius: 16, overflow: 'hidden', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  rowBorder: { borderBottomWidth: 1 },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 15, fontFamily: 'Inter-SemiBold' },
  rowDesc: { fontSize: 12, fontFamily: 'Inter-Regular', marginTop: 2, lineHeight: 16 },
});
