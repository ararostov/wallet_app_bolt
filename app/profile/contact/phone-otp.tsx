// Phone-change OTP screen — POST /user/contact/phone/verify.

import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { OtpInput } from '@/components/ui/OtpInput';
import { toast } from '@/components/ui/Toast';
import { useTheme } from '@/context/ThemeContext';
import { useWallet } from '@/context/WalletContext';
import { useOtpCountdown } from '@/hooks/useOtpCountdown';
import { useRequestPhoneChange } from '@/hooks/useRequestPhoneChange';
import { useVerifyPhoneChange } from '@/hooks/useVerifyPhoneChange';
import { ApiError } from '@/utils/errors';

const RESEND_COOLDOWN_MS = 45_000;

export default function PhoneChangeOtpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, dispatch } = useWallet();
  const { colors } = useTheme();

  const inProgress = state.contactChangeInProgress;
  const verify = useVerifyPhoneChange();
  const resend = useRequestPhoneChange();

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [resendDeadlineMs, setResendDeadlineMs] = useState<number>(
    Date.now() + RESEND_COOLDOWN_MS,
  );

  const expiresAtMs = inProgress?.expiresAt ? new Date(inProgress.expiresAt).getTime() : null;
  const codeCountdown = useOtpCountdown(expiresAtMs);
  const resendCountdown = useOtpCountdown(resendDeadlineMs);

  useEffect(() => {
    if (!inProgress || inProgress.field !== 'phone') {
      router.replace('/profile/contact/phone');
    }
  }, [inProgress, router]);

  const handleSubmit = async (value: string) => {
    setError(null);
    try {
      await verify.mutate({ code: value });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      toast.show({ message: 'Phone updated', variant: 'success' });
      router.replace('/profile/personal');
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
      setCode('');
      if (e instanceof ApiError) {
        if (e.code === 'INVALID_VERIFICATION_CODE') {
          setError('The code is incorrect. Please try again.');
          return;
        }
        if (e.code === 'VERIFICATION_CODE_EXPIRED') {
          setError('The code has expired. Request a new one.');
          return;
        }
        if (e.code === 'TOO_MANY_VERIFICATION_ATTEMPTS') {
          setError('Too many attempts. Please request a new code.');
          return;
        }
        if (e.code === 'CONTACT_IDENTIFIER_ALREADY_TAKEN') {
          dispatch({ type: 'CONTACT_CHANGE/ABORT' });
          Alert.alert(
            'Phone already taken',
            'This phone was claimed while you were verifying. Please choose another.',
          );
          router.replace('/profile/contact/phone');
          return;
        }
        if (e.status === 404) {
          dispatch({ type: 'CONTACT_CHANGE/ABORT' });
          Alert.alert('Verification expired', 'Please start the phone change again.');
          router.replace('/profile/contact/phone');
          return;
        }
        setError(e.message);
        return;
      }
      setError('Could not verify code. Please try again.');
    }
  };

  const handleResend = async () => {
    if (!inProgress) return;
    if (resendCountdown.remainingSeconds > 0) return;
    try {
      resend.rotateKey();
      await resend.mutate({ newPhoneE164: inProgress.newValue });
      setResendDeadlineMs(Date.now() + RESEND_COOLDOWN_MS);
      setError(null);
      setCode('');
    } catch (e) {
      const message = e instanceof ApiError ? e.message : 'Could not resend code.';
      Alert.alert('Could not resend', message);
    }
  };

  if (!inProgress) return null;

  const minutes = Math.floor(codeCountdown.remainingSeconds / 60);
  const seconds = codeCountdown.remainingSeconds % 60;

  return (
    <SafeAreaView edges={['left', 'right']} style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border, paddingTop: insets.top + 14 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Back">
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Verify new phone</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
        <Text style={[styles.intro, { color: colors.textSecondary }]}>
          {`We sent a 6-digit code to ${inProgress.maskedTarget}.`}
        </Text>

        <OtpInput
          value={code}
          onChange={setCode}
          onComplete={(v) => void handleSubmit(v)}
          hasError={!!error}
          disabled={verify.loading || codeCountdown.isExpired}
        />

        {error && <Text style={[styles.errorText, { color: colors.red }]}>{error}</Text>}

        <Text style={[styles.countdown, { color: codeCountdown.isExpired ? colors.red : colors.textSecondary }]}>
          {codeCountdown.isExpired
            ? 'Code expired. Request a new one.'
            : `Code expires in ${minutes}:${String(seconds).padStart(2, '0')}`}
        </Text>

        <TouchableOpacity
          style={styles.resendBtn}
          onPress={handleResend}
          disabled={resendCountdown.remainingSeconds > 0 || resend.loading}
        >
          <Text style={[styles.resendText, { color: resendCountdown.remainingSeconds > 0 ? colors.textTertiary : colors.primary }]}>
            {resendCountdown.remainingSeconds > 0
              ? `Resend code in ${resendCountdown.remainingSeconds}s`
              : 'Resend code'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            dispatch({ type: 'CONTACT_CHANGE/ABORT' });
            router.replace('/profile/contact/phone');
          }}
          style={styles.changeBtn}
        >
          <Text style={[styles.changeText, { color: colors.textSecondary }]}>
            Use a different phone
          </Text>
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
  scroll: { padding: 16, paddingBottom: 80, gap: 16 },
  intro: { fontSize: 15, fontFamily: 'Inter-Regular', textAlign: 'center', marginBottom: 8 },
  errorText: { fontSize: 14, fontFamily: 'Inter-Regular', textAlign: 'center' },
  countdown: { fontSize: 14, fontFamily: 'Inter-Medium', textAlign: 'center' },
  resendBtn: { paddingVertical: 8, alignItems: 'center' },
  resendText: { fontSize: 16, fontFamily: 'Inter-SemiBold' },
  changeBtn: { paddingVertical: 8, alignItems: 'center', marginTop: 8 },
  changeText: { fontSize: 15, fontFamily: 'Inter-Medium' },
});
