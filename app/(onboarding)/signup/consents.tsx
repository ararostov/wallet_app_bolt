// Signup step 3 — review consents, submit register, navigate to OTP.
//
// In MVP we don't yet have GET /legal/documents wired (spec 10), so the
// consentedDocumentIds we send to the backend are placeholder numeric IDs
// keyed off the local consent definitions. Replace with the real fetch when
// 10-help-legal lands.

import React, { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';

import { useTheme } from '@/context/ThemeContext';
import { useWallet } from '@/context/WalletContext';
import { useRegister } from '@/hooks/useRegister';
import { ProgressStepper } from '@/components/ui/ProgressStepper';
import { Checkbox } from '@/components/ui/Checkbox';
import { mapErrorCode } from '@/utils/errors';
import { ApiError } from '@/utils/errors';
import { logEvent } from '@/utils/logger';
import type { RegisterRequest } from '@/types/auth';

interface ConsentDef {
  id: string;
  // Numeric ID expected by the backend payload. In a real MVP this comes
  // from GET /legal/documents — see TODO above.
  legalId: number;
  label: string;
  required: boolean;
  marketing: boolean;
  description: string;
}

const CONSENTS: ConsentDef[] = [
  {
    id: 'terms',
    legalId: 1,
    label: 'Terms & Conditions',
    required: true,
    marketing: false,
    description: 'I agree to the Terms and Conditions governing use of the Wallet service.',
  },
  {
    id: 'privacy',
    legalId: 2,
    label: 'Privacy Policy',
    required: true,
    marketing: false,
    description: 'I have read and accept the Privacy Policy, including how my personal data is processed.',
  },
  {
    id: 'age',
    legalId: 3,
    label: 'I confirm I am 18 or over',
    required: true,
    marketing: false,
    description: 'You must be at least 18 to use this service.',
  },
  {
    id: 'marketing_email',
    legalId: 4,
    label: 'Marketing emails',
    required: false,
    marketing: true,
    description: 'Send me product updates and personalised offers via email.',
  },
  {
    id: 'marketing_sms',
    legalId: 5,
    label: 'Marketing SMS',
    required: false,
    marketing: true,
    description: 'Send me product updates and personalised offers via SMS.',
  },
  {
    id: 'marketing_push',
    legalId: 6,
    label: 'Promotional push',
    required: false,
    marketing: true,
    description: 'Send me promotional push notifications about rewards and offers.',
  },
  {
    id: 'analytics',
    legalId: 7,
    label: 'Product analytics & personalisation',
    required: false,
    marketing: false,
    description: 'Allow anonymised usage data to improve the product.',
  },
];

export default function ConsentsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { state } = useWallet();
  const draft = state.signupDraft;

  const initialAccepted = useMemo<Record<string, boolean>>(
    () => Object.fromEntries(CONSENTS.map((c) => [c.id, false])),
    [],
  );
  const [accepted, setAccepted] = useState<Record<string, boolean>>(initialAccepted);
  const [modalConsent, setModalConsent] = useState<ConsentDef | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const register = useRegister();

  const requiredOk = CONSENTS.filter((c) => c.required).every((c) => accepted[c.id]);

  const toggle = (id: string) => {
    setAccepted((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSubmit = async () => {
    if (!requiredOk) return;
    setSubmitError(null);

    if (!draft.firstName || !draft.lastName) {
      setSubmitError('Please complete your profile first.');
      router.back();
      return;
    }

    const consentedDocumentIds = CONSENTS.filter((c) => accepted[c.id]).map(
      (c) => c.legalId,
    );
    const marketingOptIn = CONSENTS.some(
      (c) => c.marketing && accepted[c.id],
    );

    const body: RegisterRequest = {
      firstName: draft.firstName,
      lastName: draft.lastName,
      email: draft.email ?? undefined,
      phoneE164: draft.phoneE164 ?? undefined,
      dateOfBirth: draft.dateOfBirth ?? undefined,
      marketingOptIn,
      consentedDocumentIds,
      referralCode: draft.referralCode ?? undefined,
    };

    try {
      logEvent('signup_otp_requested', { method: draft.method });
      await register.mutate(body);
      router.replace('/(onboarding)/signup/otp');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409 && err.code === 'CUSTOMER_ALREADY_REGISTERED') {
          Alert.alert(
            'Already registered',
            mapErrorCode(err.code) ?? err.message,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Log in',
                onPress: () => router.replace('/(onboarding)/login'),
              },
            ],
          );
          return;
        }
        if (err.status === 422 && err.code === 'UNDERAGE_CUSTOMER') {
          Alert.alert('Underage', mapErrorCode(err.code) ?? err.message);
          router.back();
          return;
        }
        setSubmitError(mapErrorCode(err.code) ?? err.message);
        return;
      }
      setSubmitError('Network error. Please check your connection and try again.');
    }
  };

  const handleBack = () => {
    Alert.alert('Discard your progress?', 'You will need to start over.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => router.back() },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <Text style={[styles.backText, { color: colors.primary }]}>{'← Back'}</Text>
        </TouchableOpacity>
        <ProgressStepper current={2} total={3} />
        <Text style={[styles.title, { color: colors.text }]}>Almost there</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Please review and accept the following to continue.
        </Text>

        {submitError && (
          <View style={[styles.errorBanner, { backgroundColor: colors.redLight, borderColor: colors.red }]}>
            <Text style={[styles.errorBannerText, { color: colors.red }]}>{submitError}</Text>
          </View>
        )}

        {CONSENTS.map((consent) => (
          <Pressable
            key={consent.id}
            style={styles.consentRow}
            onPress={() => toggle(consent.id)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: !!accepted[consent.id] }}
            accessibilityLabel={`${consent.label}, ${consent.required ? 'required' : 'optional'}`}
          >
            <View style={{ marginTop: 2 }}>
              <Checkbox
                checked={!!accepted[consent.id]}
                onToggle={() => toggle(consent.id)}
                accessibilityLabel={consent.label}
              />
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
          </Pressable>
        ))}

        <TouchableOpacity
          style={[
            styles.primaryBtn,
            { backgroundColor: colors.primary },
            (!requiredOk || register.loading) && styles.primaryBtnDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!requiredOk || register.loading}
        >
          <Text style={styles.primaryBtnText}>
            {register.loading ? 'Sending code…' : 'Agree and continue'}
          </Text>
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
              {modalConsent?.description}
              {'\n\n'}
              The full document text will be loaded from /legal/documents in a future update.
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
  backText: { fontSize: 18, fontFamily: 'Inter-Medium' },
  title: { fontSize: 28, fontFamily: 'Inter-Bold', marginBottom: 6, letterSpacing: -0.5 },
  subtitle: { fontSize: 17, fontFamily: 'Inter-Regular', marginBottom: 20, lineHeight: 22 },
  errorBanner: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 16 },
  errorBannerText: { fontSize: 15, fontFamily: 'Inter-Medium' },
  consentRow: { flexDirection: 'row', gap: 14, marginBottom: 20, alignItems: 'flex-start' },
  consentContent: { flex: 1, gap: 4 },
  consentLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  consentLabel: { fontSize: 17, fontFamily: 'Inter-SemiBold' },
  requiredBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  requiredText: { fontSize: 13, fontFamily: 'Inter-SemiBold' },
  consentDesc: { fontSize: 15, fontFamily: 'Inter-Regular', lineHeight: 18 },
  readLink: { fontSize: 15, fontFamily: 'Inter-Medium', marginTop: 2 },
  primaryBtn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 16 },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { fontSize: 18, fontFamily: 'Inter-SemiBold', color: '#fff' },
  modalSafe: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 20, fontFamily: 'Inter-Bold' },
  modalContent: { paddingHorizontal: 16, paddingVertical: 20, paddingBottom: 40 },
  modalBody: { fontSize: 17, fontFamily: 'Inter-Regular', lineHeight: 24 },
  modalFooter: { paddingHorizontal: 16, paddingVertical: 20, borderTopWidth: 1 },
});
