// Signup step 1 — channel (phone/email) + identifier + optional referral code.
// No API call here; the data lands in signupDraft and the user moves on to
// /signup/profile. The actual register request goes out from /signup/consents.

import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronDown, ChevronRight } from 'lucide-react-native';

import { useTheme } from '@/context/ThemeContext';
import { useWallet } from '@/context/WalletContext';
import { isValidE164, isValidEmail } from '@/utils/validators';

const COUNTRIES = [
  { flag: '\u{1F1EC}\u{1F1E7}', code: '+44', name: 'GB' },
  { flag: '\u{1F1FA}\u{1F1F8}', code: '+1', name: 'US' },
  { flag: '\u{1F1EA}\u{1F1FA}', code: '+33', name: 'EU' },
];

const REFERRAL_RE = /^[A-Z0-9-]{6,12}$/;

export default function SignupScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { state, dispatch } = useWallet();
  const draft = state.signupDraft;

  const [method, setMethod] = useState<'phone' | 'email'>(draft.method ?? 'phone');
  const [phoneValue, setPhoneValue] = useState(
    draft.phoneE164 ? draft.phoneE164.replace(/^\+44/, '') : '',
  );
  const [emailValue, setEmailValue] = useState(draft.email ?? '');
  const [selectedCountry] = useState(COUNTRIES[0]);
  const [referralExpanded, setReferralExpanded] = useState(
    Boolean(draft.referralCode),
  );
  const [referralCode, setReferralCode] = useState(draft.referralCode ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Re-prefill referral if a deep link arrives mid-screen.
  useEffect(() => {
    if (draft.referralCode && draft.referralCode !== referralCode) {
      setReferralCode(draft.referralCode);
      setReferralExpanded(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.referralCode]);

  const formatUKPhone = (text: string): string => {
    const digits = text.replace(/\D/g, '').slice(0, 10);
    if (digits.length <= 4) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  };

  const handlePhoneChange = (text: string) => {
    let digits = text.replace(/\D/g, '');
    if (digits.startsWith('44')) digits = digits.slice(2);
    setPhoneValue(formatUKPhone(digits));
  };

  const buildPhoneE164 = (raw: string): string => {
    const digits = raw.replace(/\D/g, '');
    return digits.length > 0 ? `${selectedCountry.code}${digits}` : '';
  };

  const validate = (): { ok: boolean; phoneE164: string | null; email: string | null } => {
    const e: Record<string, string> = {};
    let phoneE164: string | null = null;
    let email: string | null = null;

    if (method === 'phone') {
      const candidate = buildPhoneE164(phoneValue);
      if (!isValidE164(candidate)) {
        e.phone = 'Enter a valid phone number';
      } else {
        phoneE164 = candidate;
      }
    } else if (!isValidEmail(emailValue.trim())) {
      e.email = 'Enter a valid email address';
    } else {
      email = emailValue.trim();
    }

    if (referralCode.trim() && !REFERRAL_RE.test(referralCode.trim())) {
      e.referral = 'Referral code looks invalid';
    }

    setErrors(e);
    return { ok: Object.keys(e).length === 0, phoneE164, email };
  };

  const handleContinue = () => {
    const { ok, phoneE164, email } = validate();
    if (!ok) return;
    dispatch({
      type: 'AUTH/UPDATE_DRAFT',
      payload: {
        method,
        phoneE164,
        email,
        referralCode: referralCode.trim() || null,
      },
    });
    router.push('/(onboarding)/signup/profile');
  };

  const isValid =
    method === 'phone'
      ? phoneValue.replace(/\D/g, '').length >= 7
      : isValidEmail(emailValue.trim());

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={[styles.backText, { color: colors.primary }]}>{'← Back'}</Text>
          </TouchableOpacity>

          <Text style={[styles.title, { color: colors.text }]}>Create your Wallet Account</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Sign up to start earning cashback with Tesco Wallet.
          </Text>

          <View style={[styles.toggle, { backgroundColor: colors.surfaceAlt }]}>
            {(['phone', 'email'] as const).map((m) => (
              <TouchableOpacity
                key={m}
                style={[
                  styles.toggleBtn,
                  method === m && [
                    styles.toggleBtnActive,
                    { backgroundColor: colors.surface, shadowColor: colors.shadowColor },
                  ],
                ]}
                onPress={() => setMethod(m)}
              >
                <Text
                  style={[
                    styles.toggleText,
                    { color: colors.textSecondary },
                    method === m && { color: colors.text },
                  ]}
                >
                  {m === 'phone' ? 'Phone' : 'Email'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {method === 'phone' ? (
            <View>
              <View style={styles.phoneRow}>
                <View
                  style={[
                    styles.countryPicker,
                    { backgroundColor: colors.background, borderColor: colors.border },
                  ]}
                >
                  <Text style={styles.flag}>{selectedCountry.flag}</Text>
                  <Text style={[styles.countryCode, { color: colors.text }]}>
                    {selectedCountry.code}
                  </Text>
                  <ChevronDown size={14} color={colors.textSecondary} />
                </View>
                <TextInput
                  style={[
                    styles.phoneInput,
                    {
                      backgroundColor: colors.background,
                      borderColor: errors.phone ? colors.red : colors.border,
                      color: colors.text,
                    },
                  ]}
                  placeholder="7700 900 000"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="phone-pad"
                  textContentType="telephoneNumber"
                  autoComplete="tel"
                  value={phoneValue}
                  onChangeText={handlePhoneChange}
                />
              </View>
              {errors.phone && <Text style={[styles.errorText, { color: colors.red }]}>{errors.phone}</Text>}
            </View>
          ) : (
            <View>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    borderColor: errors.email ? colors.red : colors.border,
                    color: colors.text,
                  },
                ]}
                placeholder="Email address"
                placeholderTextColor={colors.textTertiary}
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
                autoCapitalize="none"
                value={emailValue}
                onChangeText={setEmailValue}
              />
              {errors.email && <Text style={[styles.errorText, { color: colors.red }]}>{errors.email}</Text>}
            </View>
          )}

          <TouchableOpacity
            style={styles.referralToggle}
            onPress={() => setReferralExpanded((v) => !v)}
          >
            <Text style={[styles.referralToggleText, { color: colors.primary }]}>
              Have a referral code?
            </Text>
            <ChevronRight
              size={16}
              color={colors.primary}
              style={{ transform: [{ rotate: referralExpanded ? '90deg' : '0deg' }] }}
            />
          </TouchableOpacity>

          {referralExpanded && (
            <View>
              <TextInput
                style={[
                  styles.input,
                  styles.referralInput,
                  {
                    backgroundColor: colors.background,
                    borderColor: errors.referral ? colors.red : colors.border,
                    color: colors.text,
                  },
                ]}
                placeholder="Enter referral code"
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="characters"
                value={referralCode}
                onChangeText={(v) => setReferralCode(v.toUpperCase())}
                maxLength={12}
              />
              {errors.referral && (
                <Text style={[styles.errorText, { color: colors.red }]}>{errors.referral}</Text>
              )}
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.primaryBtn,
              { backgroundColor: colors.primary },
              !isValid && styles.primaryBtnDisabled,
            ]}
            onPress={handleContinue}
            disabled={!isValid}
          >
            <Text style={styles.primaryBtnText}>Continue</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, padding: 24, paddingBottom: 40 },
  backBtn: { marginBottom: 24 },
  backText: { fontSize: 18, fontFamily: 'Inter-Medium' },
  title: { fontSize: 30, fontFamily: 'Inter-Bold', marginBottom: 8, letterSpacing: -0.5 },
  subtitle: { fontSize: 17, fontFamily: 'Inter-Regular', marginBottom: 28, lineHeight: 22 },
  toggle: { flexDirection: 'row', borderRadius: 12, padding: 4, marginBottom: 20 },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  toggleBtnActive: { shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  toggleText: { fontSize: 16, fontFamily: 'Inter-Medium' },
  phoneRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  countryPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  flag: { fontSize: 22 },
  countryCode: { fontSize: 16, fontFamily: 'Inter-Medium' },
  phoneInput: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 17,
    fontFamily: 'Inter-Regular',
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 17,
    marginBottom: 8,
    fontFamily: 'Inter-Regular',
  },
  referralToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 16,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  referralToggleText: { fontSize: 16, fontFamily: 'Inter-Medium' },
  referralInput: { marginTop: 0 },
  errorText: { fontSize: 14, fontFamily: 'Inter-Regular', marginBottom: 4 },
  primaryBtn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 16 },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { fontSize: 18, fontFamily: 'Inter-SemiBold', color: '#fff' },
});
