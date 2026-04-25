// Login OTP — verify the code via POST /auth/verify-login.

import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { useTheme } from '@/context/ThemeContext';
import { useWallet } from '@/context/WalletContext';
import { OtpInput } from '@/components/ui/OtpInput';
import { useVerifyLogin } from '@/hooks/useVerifyLogin';
import { useSendLoginCode } from '@/hooks/useSendLoginCode';
import { useOtpCountdown } from '@/hooks/useOtpCountdown';
import { ApiError, mapErrorCode } from '@/utils/errors';
import { getDeviceInfo } from '@/utils/device';
import { maskIdentifier } from '@/utils/format';

export default function LoginOtpScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { state, dispatch } = useWallet();
  const draft = state.signupDraft;

  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);

  const verify = useVerifyLogin();
  const resend = useSendLoginCode();
  const { remainingSeconds, isExpired } = useOtpCountdown(draft.resendDeadlineMs);

  const target =
    draft.verificationTarget ??
    (draft.email ? maskIdentifier(draft.email) : draft.phoneE164 ? maskIdentifier(draft.phoneE164) : '');

  useEffect(() => {
    if (!draft.email && !draft.phoneE164) {
      router.replace('/(onboarding)/login');
    }
  }, [draft.email, draft.phoneE164, router]);

  const handleSubmit = async (code: string) => {
    setError(null);
    try {
      const device = await getDeviceInfo();
      await verify.mutate({
        email: draft.email ?? undefined,
        phoneE164: draft.phoneE164 ?? undefined,
        code,
        deviceId: device.deviceId,
        platform: device.platform,
        appVersion: device.appVersion,
      });
      // navigation handled inside hook
    } catch (err) {
      setAttempts((n) => n + 1);
      if (err instanceof ApiError) {
        if (err.status === 429) setOtp('');
        setError(mapErrorCode(err.code) ?? err.message);
        return;
      }
      setError('Network error. Please retry.');
    }
  };

  const handleResend = async () => {
    if (!isExpired || resend.loading) return;
    setError(null);
    try {
      await resend.mutate(
        draft.email ? { email: draft.email } : { phoneE164: draft.phoneE164 ?? '' },
      );
      dispatch({
        type: 'AUTH/UPDATE_DRAFT',
        payload: { resendDeadlineMs: Date.now() + 45_000 },
      });
      setOtp('');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(mapErrorCode(err.code) ?? err.message);
        return;
      }
      setError('Could not resend the code.');
    }
  };

  const handleBack = () => {
    Alert.alert('Go back?', "You'll need to request a new code.", [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Go back', onPress: () => router.back() },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.container}>
          <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
            <Text style={[styles.backText, { color: colors.primary }]}>{'← Back'}</Text>
          </TouchableOpacity>

          <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">
            Enter your code
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            We sent a 6-digit code to {target || 'your contact'}.
          </Text>

          <OtpInput
            value={otp}
            onChange={setOtp}
            onComplete={handleSubmit}
            length={6}
            hasError={!!error}
            disabled={verify.loading}
          />

          {error && <Text style={[styles.errorText, { color: colors.red }]}>{error}</Text>}

          {attempts >= 3 && (
            <TouchableOpacity onPress={() => router.replace('/(onboarding)/signup')}>
              <Text style={[styles.signUpHint, { color: colors.primary }]}>
                Don&apos;t have an account? Sign up
              </Text>
            </TouchableOpacity>
          )}

          <View style={styles.resendRow}>
            {isExpired ? (
              <TouchableOpacity onPress={handleResend} accessibilityHint="Sends a new code">
                <Text style={[styles.resendLink, { color: colors.primary }]}>
                  {resend.loading ? 'Sending…' : 'Resend code'}
                </Text>
              </TouchableOpacity>
            ) : (
              <Text
                style={[styles.countdown, { color: colors.textTertiary }]}
                accessibilityLiveRegion="polite"
              >
                Resend in{' '}
                <Text style={[styles.countdownBold, { color: colors.textSecondary }]}>
                  {remainingSeconds}s
                </Text>
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.primaryBtn,
              { backgroundColor: colors.primary },
              (otp.length < 6 || verify.loading) && styles.primaryBtnDisabled,
            ]}
            disabled={otp.length < 6 || verify.loading}
            onPress={() => handleSubmit(otp)}
          >
            <Text style={styles.primaryBtnText}>
              {verify.loading ? 'Verifying…' : 'Verify'}
            </Text>
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
  backBtn: { marginBottom: 16 },
  backText: { fontSize: 18, fontFamily: 'Inter-Medium' },
  title: { fontSize: 30, fontFamily: 'Inter-Bold', marginBottom: 8, letterSpacing: -0.5 },
  subtitle: { fontSize: 17, fontFamily: 'Inter-Regular', lineHeight: 22, marginBottom: 28 },
  errorText: { fontSize: 15, marginTop: 12, fontFamily: 'Inter-Medium', textAlign: 'center' },
  signUpHint: { textAlign: 'center', fontSize: 16, fontFamily: 'Inter-Medium', marginTop: 12 },
  resendRow: { alignItems: 'center', marginVertical: 24 },
  countdown: { fontSize: 16, fontFamily: 'Inter-Regular' },
  countdownBold: { fontFamily: 'Inter-SemiBold' },
  resendLink: { fontSize: 16, fontFamily: 'Inter-SemiBold' },
  primaryBtn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { fontSize: 18, fontFamily: 'Inter-SemiBold', color: '#fff' },
});
