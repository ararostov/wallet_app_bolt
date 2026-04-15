import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronDown, ChevronRight } from 'lucide-react-native';
import Svg, { Path, G, Circle, Rect } from 'react-native-svg';
import { FontAwesome } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';

const COUNTRIES = [
  { flag: '🇬🇧', code: '+44', name: 'GB' },
  { flag: '🇺🇸', code: '+1', name: 'US' },
  { flag: '🇪🇺', code: '+33', name: 'EU' },
];

export default function SignupScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [method, setMethod] = useState<'phone' | 'email'>('phone');
  const [phoneValue, setPhoneValue] = useState('');
  const [emailValue, setEmailValue] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [referralExpanded, setReferralExpanded] = useState(false);
  const [referralCode, setReferralCode] = useState('');

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

  const isValid =
    method === 'phone'
      ? phoneValue.replace(/\D/g, '').length === 10
      : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue);

  const handleSend = () => {
    if (!isValid) return;
    router.push('/(onboarding)/signup/otp');
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={[styles.backText, { color: colors.primary }]}>← Back</Text>
          </TouchableOpacity>

          <Text style={[styles.title, { color: colors.text }]}>Create your Wallet Account</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Sign up to start earning cashback with Tesco Wallet.</Text>

          <View style={[styles.toggle, { backgroundColor: colors.surfaceAlt }]}>
            {(['phone', 'email'] as const).map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.toggleBtn, method === m && [styles.toggleBtnActive, { backgroundColor: colors.surface, shadowColor: colors.shadowColor }]]}
                onPress={() => setMethod(m)}
              >
                <Text style={[styles.toggleText, { color: colors.textSecondary }, method === m && { color: colors.text }]}>
                  {m === 'phone' ? 'Phone' : 'Email'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {method === 'phone' ? (
            <View style={styles.phoneRow}>
              <TouchableOpacity style={[styles.countryPicker, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={styles.flag}>{selectedCountry.flag}</Text>
                <Text style={[styles.countryCode, { color: colors.text }]}>{selectedCountry.code}</Text>
                <ChevronDown size={14} color={colors.textSecondary} />
              </TouchableOpacity>
              <TextInput
                style={[styles.phoneInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                placeholder="7700 900 000"
                placeholderTextColor={colors.textTertiary}
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                autoComplete="tel"
                value={phoneValue}
                onChangeText={handlePhoneChange}
              />
            </View>
          ) : (
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              placeholder="Email address"
              placeholderTextColor={colors.textTertiary}
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
              autoCapitalize="none"
              value={emailValue}
              onChangeText={setEmailValue}
            />
          )}

          <TouchableOpacity
            style={styles.referralToggle}
            onPress={() => setReferralExpanded((v) => !v)}
          >
            <Text style={[styles.referralToggleText, { color: colors.primary }]}>Have a referral code?</Text>
            <ChevronRight
              size={16}
              color={colors.primary}
              style={{ transform: [{ rotate: referralExpanded ? '90deg' : '0deg' }] }}
            />
          </TouchableOpacity>

          {referralExpanded && (
            <TextInput
              style={[styles.input, styles.referralInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              placeholder="Enter referral code (e.g. ARA-7K2)"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="characters"
              value={referralCode}
              onChangeText={(v) => setReferralCode(v.toUpperCase())}
              maxLength={10}
            />
          )}

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary }, !isValid && styles.primaryBtnDisabled]}
            onPress={handleSend}
            disabled={!isValid}
          >
            <Text style={styles.primaryBtnText}>Send code</Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.textTertiary }]}>or continue with</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          <View style={styles.socialRow}>
            <TouchableOpacity style={[styles.appleSocialBtn, isDark && { backgroundColor: '#fff' }]}>
              <FontAwesome name="apple" size={18} color={isDark ? '#000' : '#fff'} />
              <Text style={[styles.appleSocialBtnText, isDark && { color: '#000' }]}>Apple</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.googleSocialBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Svg width={18} height={18} viewBox="0 0 533.5 544.3">
                <Path fill="#4285f4" d="M533.5 278.4c0-18.5-1.5-37.1-4.7-55.3H272.1v104.8h147c-6.1 33.8-25.7 63.7-54.4 82.7v68h87.7c51.5-47.4 81.1-117.4 81.1-200.2z"/>
                <Path fill="#34a853" d="M272.1 544.3c73.4 0 135.3-24.1 180.4-65.7l-87.7-68c-24.4 16.6-55.9 26-92.6 26-71 0-131.2-47.9-152.8-112.3H28.9v70.1c46.2 91.9 140.3 149.9 243.2 149.9z"/>
                <Path fill="#fbbc04" d="M119.3 324.3c-11.4-33.8-11.4-70.4 0-104.2V150H28.9c-38.6 76.9-38.6 167.5 0 244.4l90.4-70.1z"/>
                <Path fill="#ea4335" d="M272.1 107.7c38.8-.6 76.3 14 104.4 40.8l77.7-77.7C405 24.6 339.7-.8 272.1 0 169.2 0 75.1 58 28.9 150l90.4 70.1c21.5-64.5 81.8-112.4 152.8-112.4z"/>
              </Svg>
              <Text style={[styles.googleSocialBtnText, { color: colors.text }]}>Google</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.legal, { color: colors.textTertiary }]}>
            By continuing you agree to our{' '}
            <Text style={[styles.legalLink, { color: colors.primary }]}>Terms</Text> and{' '}
            <Text style={[styles.legalLink, { color: colors.primary }]}>Privacy Policy</Text>
          </Text>
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
  toggle: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  toggleBtnActive: { shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  toggleText: { fontSize: 16, fontFamily: 'Inter-Medium' },
  phoneRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
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
    marginBottom: 16,
    fontFamily: 'Inter-Regular',
  },
  referralToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  referralToggleText: { fontSize: 16, fontFamily: 'Inter-Medium' },
  referralInput: { marginTop: 0 },
  primaryBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { fontSize: 18, fontFamily: 'Inter-SemiBold', color: '#fff' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 24 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 15, fontFamily: 'Inter-Regular' },
  socialRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  appleSocialBtn: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  appleSocialBtnText: { fontSize: 16, fontFamily: 'Inter-SemiBold', color: '#fff' },
  googleSocialBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  googleSocialBtnText: { fontSize: 16, fontFamily: 'Inter-SemiBold' },
  legal: { fontSize: 15, textAlign: 'center', lineHeight: 18 },
  legalLink: {},
});
