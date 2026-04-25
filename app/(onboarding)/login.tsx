// Login screen — channel + identifier → POST /auth/send-code → /login/otp.

import React, { useState } from 'react';
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
import { ChevronDown } from 'lucide-react-native';

import { useTheme } from '@/context/ThemeContext';
import { useSendLoginCode } from '@/hooks/useSendLoginCode';
import { ApiError, mapErrorCode } from '@/utils/errors';
import { isValidE164, isValidEmail } from '@/utils/validators';
import { logEvent } from '@/utils/logger';

const COUNTRIES = [
  { flag: '\u{1F1EC}\u{1F1E7}', code: '+44', name: 'GB' },
];

export default function LoginScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const sendCode = useSendLoginCode();

  const [method, setMethod] = useState<'phone' | 'email'>('phone');
  const [phoneValue, setPhoneValue] = useState('');
  const [emailValue, setEmailValue] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const formatUKPhone = (text: string) => {
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

  const buildPhone = () => {
    const digits = phoneValue.replace(/\D/g, '');
    return digits ? `+44${digits}` : '';
  };

  const isValid =
    method === 'phone'
      ? phoneValue.replace(/\D/g, '').length >= 7
      : isValidEmail(emailValue.trim());

  const handleSubmit = async () => {
    setSubmitError(null);
    const e: Record<string, string> = {};
    if (method === 'phone' && !isValidE164(buildPhone())) e.phone = 'Enter a valid phone';
    if (method === 'email' && !isValidEmail(emailValue.trim())) e.email = 'Enter a valid email';
    setErrors(e);
    if (Object.keys(e).length) return;

    logEvent('login_started', { method });
    try {
      await sendCode.mutate(
        method === 'phone' ? { phoneE164: buildPhone() } : { email: emailValue.trim() },
      );
      router.push('/(onboarding)/login/otp');
    } catch (err) {
      if (err instanceof ApiError) {
        setSubmitError(mapErrorCode(err.code) ?? err.message);
        return;
      }
      setSubmitError('Network error. Please check your connection and try again.');
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={[styles.backText, { color: colors.primary }]}>{'← Back'}</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Welcome back</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Sign in to your Wallet account.
          </Text>

          {submitError && (
            <View style={[styles.errorBanner, { backgroundColor: colors.redLight, borderColor: colors.red }]}>
              <Text style={[styles.errorBannerText, { color: colors.red }]}>{submitError}</Text>
            </View>
          )}

          <View style={[styles.toggle, { backgroundColor: colors.surfaceAlt }]}>
            {(['phone', 'email'] as const).map((m) => (
              <TouchableOpacity
                key={m}
                style={[
                  styles.toggleBtn,
                  method === m && [styles.toggleBtnActive, { backgroundColor: colors.surface }],
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
                  <Text style={styles.flag}>{COUNTRIES[0].flag}</Text>
                  <Text style={[styles.countryCode, { color: colors.text }]}>{COUNTRIES[0].code}</Text>
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
            style={[
              styles.primaryBtn,
              { backgroundColor: colors.primary },
              (!isValid || sendCode.loading) && styles.primaryBtnDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!isValid || sendCode.loading}
          >
            <Text style={styles.primaryBtnText}>
              {sendCode.loading ? 'Sending…' : 'Send code'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondary}
            onPress={() => router.replace('/(onboarding)/signup')}
          >
            <Text style={[styles.secondaryText, { color: colors.primary }]}>
              Don&apos;t have an account? Sign up
            </Text>
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
  subtitle: { fontSize: 17, fontFamily: 'Inter-Regular', marginBottom: 24, lineHeight: 22 },
  errorBanner: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 16 },
  errorBannerText: { fontSize: 15, fontFamily: 'Inter-Medium' },
  toggle: { flexDirection: 'row', borderRadius: 12, padding: 4, marginBottom: 20 },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  toggleBtnActive: { shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  toggleText: { fontSize: 16, fontFamily: 'Inter-Medium' },
  phoneRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
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
    fontFamily: 'Inter-Regular',
  },
  errorText: { fontSize: 14, fontFamily: 'Inter-Regular', marginTop: 4 },
  primaryBtn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 16 },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { fontSize: 18, fontFamily: 'Inter-SemiBold', color: '#fff' },
  secondary: { alignItems: 'center', paddingVertical: 16 },
  secondaryText: { fontSize: 16, fontFamily: 'Inter-Medium' },
});
