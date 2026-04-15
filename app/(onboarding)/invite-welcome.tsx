import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Gift } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeContext';

export default function InviteWelcomeScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        <LinearGradient colors={['#065f46', '#059669']} style={styles.hero}>
          <View style={styles.iconCircle}>
            <Gift size={48} color="#fff" />
          </View>
          <Text style={styles.heroTitle}>You've been invited!</Text>
          <Text style={styles.heroSubtitle}>Your friend has gifted you a welcome bonus</Text>
        </LinearGradient>

        <View style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.shadowColor }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Here's your bonus</Text>
          <View style={styles.bonusRow}>
            <View style={styles.bonusItem}>
              <Text style={[styles.bonusAmount, { color: colors.green }]}>£5</Text>
              <Text style={[styles.bonusLabel, { color: colors.textSecondary }]}>Bonus reward</Text>
            </View>
            <View style={[styles.bonusDivider, { backgroundColor: colors.border }]} />
            <View style={styles.bonusItem}>
              <Text style={[styles.bonusAmount, { color: colors.green }]}>£20</Text>
              <Text style={[styles.bonusLabel, { color: colors.textSecondary }]}>Min. top-up</Text>
            </View>
            <View style={[styles.bonusDivider, { backgroundColor: colors.border }]} />
            <View style={styles.bonusItem}>
              <Text style={[styles.bonusAmount, { color: colors.green }]}>30</Text>
              <Text style={[styles.bonusLabel, { color: colors.textSecondary }]}>Days to use</Text>
            </View>
          </View>
          <Text style={[styles.bonusDesc, { color: colors.textSecondary, backgroundColor: colors.greenLight }]}>
            Top up £20 or more within 30 days of joining and we'll add £5 to your wallet as a bonus reward.
          </Text>
        </View>

        <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primary }]} onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.primaryBtnText}>Let's go!</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, padding: 24, gap: 20 },
  hero: {
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  heroTitle: { fontSize: 28, fontFamily: 'Inter-Bold', color: '#fff', textAlign: 'center' },
  heroSubtitle: { fontSize: 17, fontFamily: 'Inter-Regular', color: 'rgba(255,255,255,0.85)', textAlign: 'center' },
  card: {
    borderRadius: 20,
    padding: 24,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    gap: 16,
  },
  cardTitle: { fontSize: 19, fontFamily: 'Inter-Bold' },
  bonusRow: { flexDirection: 'row', alignItems: 'center' },
  bonusItem: { flex: 1, alignItems: 'center', gap: 4 },
  bonusDivider: { width: 1, height: 40 },
  bonusAmount: { fontSize: 30, fontFamily: 'Inter-Bold' },
  bonusLabel: { fontSize: 15, fontFamily: 'Inter-Regular' },
  bonusDesc: { fontSize: 16, fontFamily: 'Inter-Regular', lineHeight: 20, padding: 12, borderRadius: 10 },
  primaryBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 'auto',
  },
  primaryBtnText: { fontSize: 18, fontFamily: 'Inter-SemiBold', color: '#fff' },
});
