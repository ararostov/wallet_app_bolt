// Signup step 4 (final) — enter OTP and call verify-registration.
// On success: tokens are stored, WalletContext is hydrated and navigation
// goes to home (or invite-welcome if a referral code was applied).

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
import { ProgressStepper } from '@/components/ui/ProgressStepper';
import { OtpInput } from '@/components/ui/OtpInput';
import { useVerifyRegistration } from '@/hooks/useVerifyRegistration';
import { useOtpCountdown } from '@/hooks/useOtpCountdown';
import { authApi } from '@/utils/api/auth';
import { ApiError, mapErrorCode } from '@/utils/errors';
import { getDeviceInfo } from '@/utils/device';
import { logEvent } from '@/utils/logger';
import { maskIdentifier } from '@/utils/format';

export default function SignupOtpScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { state, dispatch } = useWallet();
  const draft = state.signupDraft;

  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);

  const verify = useVerifyRegistration();
  const [resending, setResending] = useState(false);

  const { remainingSeconds, isExpired } = useOtpCountdown(draft.resendDeadlineMs);

  const target =
    draft.verificationTarget ??
    (draft.email ? maskIdentifier(draft.email) : draft.phoneE164 ? maskIdentifier(draft.phoneE164) : '');

  // If the user reaches this screen without a pending customer (e.g. cold-start
  // hydration), bounce back to the start of signup.
  useEffect(() => {
    if (!draft.pendingCustomerId) {
      router.replace('/(onboarding)/signup');
    }
  }, [draft.pendingCustomerId, router]);

  const handleSubmit = async (code: string) => {
    if (!draft.pendingCustomerId) return;
    setError(null);
    try {
      const device = await getDeviceInfo();
      logEvent('signup_otp_verified');
      await verify.mutate({
        customerId: draft.pendingCustomerId,
        code,
        deviceId: device.deviceId,
        platform: device.platform,
        appVersion: device.appVersion,
      });
      // navigation handled inside the hook
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 429) {
          setOtp('');
        }
        setError(mapErrorCode(err.code) ?? err.message);
        return;
      }
      setError('Network error. Please retry.');
    }
  };

  const handleResend = async () => {
    if (!isExpired || resending) return;
    if (!draft.pendingCustomerId) {
      // No active pending registration — bounce to start.
      router.replace('/(onboarding)/signup');
      return;
    }
    setError(null);
    setResending(true);
    try {
      const result = await authApi.resendVerification(draft.pendingCustomerId);
      logEvent('signup_otp_resent');
      dispatch({
        type: 'AUTH/UPDATE_DRAFT',
        payload: {
          verificationTarget: result.verificationTarget,
          otpExpiresAt: new Date(
            Date.now() + result.expiresInSeconds * 1000,
          ).toISOString(),
          resendDeadlineMs: Date.now() + 45_000,
        },
      });
      setOtp('');
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
                onPress: () => {
                  dispatch({ type: 'AUTH/RESET_DRAFT' });
                  router.replace('/(onboarding)/login');
                },
              },
            ],
          );
          return;
        }
        if (err.status === 404 && err.code === 'CUSTOMER_NOT_FOUND') {
          // Pending customer was garbage-collected or wrong customerId —
          // start over.
          Alert.alert('Session expired', 'Please start the signup again.', [
            {
              text: 'OK',
              onPress: () => {
                dispatch({ type: 'AUTH/RESET_DRAFT' });
                router.replace('/(onboarding)/signup');
              },
            },
          ]);
          return;
        }
        setError(mapErrorCode(err.code) ?? err.message);
        return;
      }
      setError('Could not resend the code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  const handleBack = () => {
    Alert.alert('Go back?', "You'll need to start again.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => {
          dispatch({ type: 'AUTH/RESET_DRAFT' });
          router.replace('/(onboarding)/intro');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.container}>
          <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
            <Text style={[styles.backText, { color: colors.primary }]}>{'← Back'}</Text>
          </TouchableOpacity>
          <ProgressStepper current={2} total={2} />

          <Text
            style={[styles.title, { color: colors.text }]}
            accessibilityRole="header"
          >
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

          {error && (
            <Text style={[styles.errorText, { color: colors.red }]}>{error}</Text>
          )}

          <View style={styles.resendRow}>
            {isExpired ? (
              <TouchableOpacity onPress={handleResend} accessibilityHint="Sends a new code">
                <Text style={[styles.resendLink, { color: colors.primary }]}>
                  {resending ? 'Sending…' : 'Resend code'}
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

          <TouchableOpacity onPress={() => router.replace('/(onboarding)/signup')}>
            <Text style={[styles.wrongLink, { color: colors.textSecondary }]}>
              {draft.method === 'phone' ? 'Wrong number?' : 'Wrong email?'}
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
  resendRow: { alignItems: 'center', marginVertical: 24 },
  countdown: { fontSize: 16, fontFamily: 'Inter-Regular' },
  countdownBold: { fontFamily: 'Inter-SemiBold' },
  resendLink: { fontSize: 16, fontFamily: 'Inter-SemiBold' },
  primaryBtn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 16 },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { fontSize: 18, fontFamily: 'Inter-SemiBold', color: '#fff' },
  wrongLink: { textAlign: 'center', fontSize: 16, fontFamily: 'Inter-Medium' },
});
