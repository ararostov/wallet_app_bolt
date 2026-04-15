import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CircleCheck as CheckCircle, Clock } from 'lucide-react-native';
import { useWallet } from '@/context/WalletContext';
import { useTheme } from '@/context/ThemeContext';

export default function DisputeSubmittedScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state } = useWallet();
  const { colors, isDark } = useTheme();
  const dispute = state.disputes.find((d) => d.txId === id);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        <View style={styles.iconCircle}>
          <CheckCircle size={56} color="#059669" />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Dispute submitted</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          We've received your dispute and will investigate within 5-10 business days.
        </Text>

        {dispute && (
          <View style={[styles.refCard, { backgroundColor: colors.surface, shadowColor: colors.shadowColor }]}>
            <Text style={[styles.refLabel, { color: colors.textTertiary }]}>Case reference</Text>
            <Text style={[styles.refValue, { color: colors.text }]}>{dispute.reference}</Text>
          </View>
        )}

        <View style={[styles.timeline, { backgroundColor: colors.surface, shadowColor: colors.shadowColor }]}>
          {[
            ['Today', 'Dispute received and logged', true],
            ['1\u20133 days', 'Initial review by our team', false],
            ['3\u201310 days', 'Investigation and resolution', false],
          ].map(([day, label, done]: any) => (
            <View key={day} style={styles.timelineItem}>
              <View style={[styles.timelineDot, { backgroundColor: colors.border }, done && styles.timelineDotDone]}>
                {done && <CheckCircle size={12} color="#fff" />}
              </View>
              <View>
                <Text style={[styles.timelineDay, { color: colors.text }]}>{day}</Text>
                <Text style={[styles.timelineLabel, { color: colors.textSecondary }]}>{label}</Text>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primary }]} onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.primaryBtnText}>Back to home</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, alignItems: 'center', padding: 32, paddingTop: 60, gap: 16 },
  iconCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  title: { fontSize: 26, fontFamily: 'Inter-Bold', textAlign: 'center' },
  subtitle: { fontSize: 15, fontFamily: 'Inter-Regular', textAlign: 'center', lineHeight: 22 },
  refCard: { borderRadius: 14, padding: 16, alignItems: 'center', width: '100%', gap: 4, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  refLabel: { fontSize: 12, fontFamily: 'Inter-Regular' },
  refValue: { fontSize: 18, fontFamily: 'Inter-Bold', letterSpacing: 1 },
  timeline: { width: '100%', borderRadius: 14, padding: 16, gap: 16, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  timelineItem: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  timelineDot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  timelineDotDone: { backgroundColor: '#059669' },
  timelineDay: { fontSize: 13, fontFamily: 'Inter-Bold' },
  timelineLabel: { fontSize: 13, fontFamily: 'Inter-Regular', marginTop: 1 },
  primaryBtn: { width: '100%', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  primaryBtnText: { fontSize: 16, fontFamily: 'Inter-SemiBold', color: '#fff' },
});
