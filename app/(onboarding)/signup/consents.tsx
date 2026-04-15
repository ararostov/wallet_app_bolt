import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Check, X } from 'lucide-react-native';
import { useWallet } from '@/context/WalletContext';
import { useTheme } from '@/context/ThemeContext';

const CONSENTS = [
  { id: 'terms', label: 'Terms & Conditions', required: true, description: 'I agree to the Terms and Conditions governing use of the Tesco Wallet service.' },
  { id: 'privacy', label: 'Privacy Policy', required: true, description: 'I have read and accept the Privacy Policy, including how my personal data is processed.' },
  { id: 'data', label: 'Data Processing', required: true, description: 'I consent to the processing of my personal data as described in the Data Processing Agreement.' },
  { id: 'marketing', label: 'Marketing communications', required: false, description: 'I\'d like to receive personalised offers, promotions and news about Tesco Wallet via email, SMS and push notifications.' },
];

function Stepper({ current, total }: { current: number; total: number }) {
  const { colors } = useTheme();
  return (
    <View style={stepStyles.row}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={[stepStyles.step, { backgroundColor: colors.border }, i < current && { backgroundColor: colors.primary }]} />
      ))}
      <Text style={[stepStyles.label, { color: colors.textTertiary }]}>{current} of {total}</Text>
    </View>
  );
}
const stepStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 28 },
  step: { flex: 1, height: 4, borderRadius: 2 },
  label: { fontSize: 12, fontFamily: 'Inter-Regular', marginLeft: 4 },
});

export default function ConsentsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { completeOnboarding } = useWallet();
  const [accepted, setAccepted] = useState<Record<string, boolean>>({
    terms: false, privacy: false, data: false, marketing: false,
  });
  const [modalConsent, setModalConsent] = useState<typeof CONSENTS[0] | null>(null);

  const requiredAll = CONSENTS.filter((c) => c.required).every((c) => accepted[c.id]);

  const toggle = (id: string, required: boolean) => {
    if (required && accepted[id]) return;
    setAccepted((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAgree = () => {
    completeOnboarding({
      firstName: 'Alex',
      lastName: 'Johnson',
      dob: '1990-01-15',
      email: 'alex@example.com',
      signupMethod: 'phone',
    });
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={[styles.backText, { color: colors.primary }]}>← Back</Text>
        </TouchableOpacity>
        <Stepper current={3} total={4} />
        <Text style={[styles.title, { color: colors.text }]}>Almost there</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Please review and accept the following to continue.</Text>

        {CONSENTS.map((consent) => (
          <TouchableOpacity
            key={consent.id}
            style={styles.consentRow}
            onPress={() => toggle(consent.id, consent.required)}
            activeOpacity={0.8}
          >
            <View style={[styles.checkbox, { borderColor: colors.border }, accepted[consent.id] && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
              {accepted[consent.id] && <Check size={14} color="#fff" strokeWidth={3} />}
            </View>
            <View style={styles.consentContent}>
              <View style={styles.consentLabelRow}>
                <Text style={[styles.consentLabel, { color: colors.text }]}>{consent.label}</Text>
                {consent.required && (
                  <View style={[styles.requiredBadge, { backgroundColor: colors.redLight }]}>
                    <Text style={[styles.requiredText, { color: colors.red }]}>Required</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.consentDesc, { color: colors.textSecondary }]}>{consent.description}</Text>
              <TouchableOpacity onPress={() => setModalConsent(consent)}>
                <Text style={[styles.readLink, { color: colors.primary }]}>Read full text →</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.primary }, !requiredAll && styles.primaryBtnDisabled]}
          onPress={handleAgree}
          disabled={!requiredAll}
        >
          <Text style={styles.primaryBtnText}>Agree and continue</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={!!modalConsent} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalSafe, { backgroundColor: colors.surface }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{modalConsent?.label}</Text>
            <TouchableOpacity onPress={() => setModalConsent(null)}>
              <X size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={[styles.modalBody, { color: colors.textSecondary }]}>
              {modalConsent?.description}{'\n\n'}
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.{'\n\n'}
              Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
            </Text>
          </ScrollView>
          <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              onPress={() => {
                if (modalConsent) {
                  setAccepted((prev) => ({ ...prev, [modalConsent.id]: true }));
                  setModalConsent(null);
                }
              }}
            >
              <Text style={styles.primaryBtnText}>Accept</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flexGrow: 1, padding: 24, paddingBottom: 40 },
  backBtn: { marginBottom: 16 },
  backText: { fontSize: 16, fontFamily: 'Inter-Medium' },
  title: { fontSize: 26, fontFamily: 'Inter-Bold', marginBottom: 6, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, fontFamily: 'Inter-Regular', marginBottom: 28, lineHeight: 22 },
  consentRow: { flexDirection: 'row', gap: 14, marginBottom: 20, alignItems: 'flex-start' },
  checkbox: {
    width: 24, height: 24, borderRadius: 6, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', marginTop: 2,
  },
  consentContent: { flex: 1, gap: 4 },
  consentLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  consentLabel: { fontSize: 15, fontFamily: 'Inter-SemiBold' },
  requiredBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  requiredText: { fontSize: 11, fontFamily: 'Inter-SemiBold' },
  consentDesc: { fontSize: 13, fontFamily: 'Inter-Regular', lineHeight: 18 },
  readLink: { fontSize: 13, fontFamily: 'Inter-Medium', marginTop: 2 },
  primaryBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { fontSize: 16, fontFamily: 'Inter-SemiBold', color: '#fff' },
  modalSafe: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontFamily: 'Inter-Bold' },
  modalContent: { paddingHorizontal: 16, paddingVertical: 20, paddingBottom: 40 },
  modalBody: { fontSize: 15, fontFamily: 'Inter-Regular', lineHeight: 24 },
  modalFooter: { paddingHorizontal: 16, paddingVertical: 20, borderTopWidth: 1 },
});
