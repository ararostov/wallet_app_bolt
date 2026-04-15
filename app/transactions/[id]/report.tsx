import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useWallet } from '@/context/WalletContext';
import { useTheme } from '@/context/ThemeContext';

const REASONS = [
  'I don\'t recognise this transaction',
  'Wrong amount charged',
  'Item not received',
  'Item not as described',
  'Duplicate charge',
  'Other',
];

export default function ReportScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { submitDispute } = useWallet();
  const { colors, isDark } = useTheme();
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = () => {
    if (!reason) return;
    const dispute = {
      txId: id!,
      reason,
      description,
      submittedAt: new Date().toISOString(),
      reference: `DSP-${Date.now().toString().slice(-8)}`,
      status: 'open' as const,
    };
    submitDispute(dispute);
    router.replace(`/transactions/${id}/report/submitted` as any);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Report an issue</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>What's the issue?</Text>
        {REASONS.map((r) => (
          <TouchableOpacity
            key={r}
            style={[styles.reasonRow, { backgroundColor: colors.surface, borderColor: colors.border }, reason === r && { borderColor: colors.primary, backgroundColor: isDark ? colors.surfaceAlt : '#eff6ff' }]}
            onPress={() => setReason(r)}
          >
            <View style={[styles.radio, { borderColor: isDark ? colors.textTertiary : '#cbd5e1' }, reason === r && { borderColor: colors.primary }]}>
              {reason === r && <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />}
            </View>
            <Text style={[styles.reasonText, { color: colors.text }]}>{r}</Text>
          </TouchableOpacity>
        ))}

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Additional details (optional)</Text>
        <TextInput
          style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
          multiline
          numberOfLines={4}
          placeholder="Describe the issue in more detail..."
          placeholderTextColor={colors.textTertiary}
          value={description}
          onChangeText={setDescription}
          textAlignVertical="top"
        />

        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.primary }, !reason && styles.primaryBtnDisabled]}
          onPress={handleSubmit}
          disabled={!reason}
        >
          <Text style={styles.primaryBtnText}>Submit dispute</Text>
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
  sectionLabel: { fontSize: 15, fontFamily: 'Inter-SemiBold', marginBottom: 10, letterSpacing: 0.3 },
  reasonRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, marginBottom: 8, borderWidth: 1.5 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  reasonText: { fontSize: 16, fontFamily: 'Inter-Medium', flex: 1 },
  textArea: { borderWidth: 1.5, borderRadius: 12, padding: 14, fontSize: 17, fontFamily: 'Inter-Regular', minHeight: 100, marginBottom: 20 },
  primaryBtn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { fontSize: 18, fontFamily: 'Inter-SemiBold', color: '#fff' },
});
