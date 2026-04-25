// Dispute submitted confirmation. See spec §4.4.

import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CircleCheck as CheckCircle } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';

import { toast } from '@/components/ui/Toast';
import { useTheme } from '@/context/ThemeContext';

export default function DisputeSubmittedScreen() {
  const router = useRouter();
  const { id, ref } = useLocalSearchParams<{ id: string; ref?: string }>();
  const { colors } = useTheme();

  const reference = ref ?? null;

  const copyRef = async () => {
    if (!reference) return;
    await Clipboard.setStringAsync(reference);
    toast.show({ message: 'Case reference copied', variant: 'success' });
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        <View style={styles.iconCircle}>
          <CheckCircle size={56} color="#059669" />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Dispute submitted</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          We'll review your case and reply within 5–10 business days. You'll get a
          notification once we have an update.
        </Text>

        {reference && (
          <TouchableOpacity
            style={[
              styles.refCard,
              { backgroundColor: colors.surface, shadowColor: colors.shadowColor },
            ]}
            onLongPress={copyRef}
            onPress={copyRef}
          >
            <Text style={[styles.refLabel, { color: colors.textTertiary }]}>
              Case reference
            </Text>
            <Text style={[styles.refValue, { color: colors.text }]}>{reference}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.replace(`/transactions/${id}` as never)}
        >
          <Text style={styles.primaryBtnText}>Back to transaction</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: {
    flex: 1,
    alignItems: 'center',
    padding: 32,
    paddingTop: 60,
    gap: 16,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: { fontSize: 28, fontFamily: 'Inter-Bold', textAlign: 'center' },
  subtitle: {
    fontSize: 17,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 22,
  },
  refCard: {
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    width: '100%',
    gap: 4,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  refLabel: { fontSize: 15, fontFamily: 'Inter-Regular' },
  refValue: { fontSize: 18, fontFamily: 'Inter-Bold', letterSpacing: 0.5 },
  primaryBtn: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  primaryBtnText: { fontSize: 18, fontFamily: 'Inter-SemiBold', color: '#fff' },
});
