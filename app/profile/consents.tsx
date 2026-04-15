import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Lock } from 'lucide-react-native';
import { useWallet } from '@/context/WalletContext';
import { useTheme } from '@/context/ThemeContext';

export default function ConsentsScreen() {
  const router = useRouter();
  const { state, updateConsent } = useWallet();
  const { colors, isDark } = useTheme();

  const required = state.consents.filter((c) => c.required);
  const optional = state.consents.filter((c) => !c.required);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Consents</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>Required</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.shadowColor }]}>
          {required.map((consent, idx) => (
            <View key={consent.id} style={[styles.row, idx < required.length - 1 && [styles.rowBorder, { borderBottomColor: colors.borderLight }]]}>
              <View style={styles.rowContent}>
                <Text style={[styles.rowLabel, { color: colors.text }]}>{consent.label}</Text>
                <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>{consent.description}</Text>
              </View>
              <Lock size={16} color={colors.textTertiary} />
            </View>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textTertiary, marginTop: 20 }]}>Optional</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.shadowColor }]}>
          {optional.map((consent, idx) => (
            <View key={consent.id} style={[styles.row, idx < optional.length - 1 && [styles.rowBorder, { borderBottomColor: colors.borderLight }]]}>
              <View style={styles.rowContent}>
                <Text style={[styles.rowLabel, { color: colors.text }]}>{consent.label}</Text>
                <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>{consent.description}</Text>
              </View>
              <Switch
                value={consent.accepted}
                onValueChange={(v) => updateConsent(consent.id, v)}
                trackColor={{ false: colors.border, true: isDark ? colors.primaryLight : '#bfdbfe' }}
                thumbColor={consent.accepted ? colors.primary : colors.surface}
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
  title: { fontSize: 19, fontFamily: 'Inter-SemiBold' },
  scroll: { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 15, fontFamily: 'Inter-SemiBold', letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' },
  card: { borderRadius: 16, overflow: 'hidden', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  rowBorder: { borderBottomWidth: 1 },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 17, fontFamily: 'Inter-SemiBold' },
  rowDesc: { fontSize: 15, fontFamily: 'Inter-Regular', marginTop: 2, lineHeight: 16 },
});
