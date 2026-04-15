import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 45;

export default function OtpScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [countdown, setCountdown] = useState(RESEND_SECONDS);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (countdown <= 0) { setCanResend(true); return; }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleChange = (text: string, index: number) => {
    const cleaned = text.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = cleaned;
    setOtp(newOtp);
    if (cleaned && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
    if (newOtp.every((d) => d !== '') && cleaned) {
      router.push('/(onboarding)/signup/profile');
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleResend = () => {
    setCountdown(RESEND_SECONDS);
    setCanResend(false);
    setOtp(Array(OTP_LENGTH).fill(''));
    inputRefs.current[0]?.focus();
  };

  const isComplete = otp.every((d) => d !== '');

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.container}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={[styles.backText, { color: colors.primary }]}>← Back</Text>
          </TouchableOpacity>

          <Text style={[styles.title, { color: colors.text }]}>Enter your code</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            We sent a 6-digit code to your phone. Enter it below to verify your account.
          </Text>

          <View style={styles.otpRow}>
            {otp.map((digit, i) => (
              <TextInput
                key={i}
                ref={(ref) => { inputRefs.current[i] = ref; }}
                style={[styles.otpBox, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text }, digit && { borderColor: colors.primary, backgroundColor: colors.primaryLight }]}
                value={digit}
                onChangeText={(t) => handleChange(t, i)}
                onKeyPress={(e) => handleKeyPress(e, i)}
                keyboardType="number-pad"
                maxLength={1}
                textAlign="center"
                autoFocus={i === 0}
                selectionColor={colors.primary}
              />
            ))}
          </View>

          <View style={styles.resendRow}>
            {canResend ? (
              <TouchableOpacity onPress={handleResend}>
                <Text style={[styles.resendLink, { color: colors.primary }]}>Resend code</Text>
              </TouchableOpacity>
            ) : (
              <Text style={[styles.countdown, { color: colors.textTertiary }]}>
                Resend in <Text style={[styles.countdownBold, { color: colors.textSecondary }]}>{countdown}s</Text>
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary }, !isComplete && styles.primaryBtnDisabled]}
            disabled={!isComplete}
            onPress={() => router.push('/(onboarding)/signup/profile')}
          >
            <Text style={styles.primaryBtnText}>Verify</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[styles.wrongNumber, { color: colors.textSecondary }]}>Wrong number?</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  container: { flex: 1, padding: 24 },
  backBtn: { marginBottom: 32 },
  backText: { fontSize: 18, fontFamily: 'Inter-Medium' },
  title: { fontSize: 30, fontFamily: 'Inter-Bold', marginBottom: 8, letterSpacing: -0.5 },
  subtitle: { fontSize: 17, fontFamily: 'Inter-Regular', lineHeight: 22, marginBottom: 36 },
  otpRow: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginBottom: 20 },
  otpBox: {
    width: 48,
    height: 56,
    borderRadius: 12,
    borderWidth: 1.5,
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    textAlign: 'center',
  },
  resendRow: { alignItems: 'center', marginBottom: 32 },
  countdown: { fontSize: 16, fontFamily: 'Inter-Regular' },
  countdownBold: { fontFamily: 'Inter-SemiBold' },
  resendLink: { fontSize: 16, fontFamily: 'Inter-SemiBold' },
  primaryBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { fontSize: 18, fontFamily: 'Inter-SemiBold', color: '#fff' },
  wrongNumber: { textAlign: 'center', fontSize: 16, fontFamily: 'Inter-Medium' },
});
