// Delete account screen — wired to POST /user/delete-account.
// State-driven: when state.accountDeletion.status === 'pending', the screen
// switches to the recovery-window countdown view ("scheduled for ...").

import React, { useState } from 'react';
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, TriangleAlert as AlertTriangle, Eye, EyeOff } from 'lucide-react-native';

import { useTheme } from '@/context/ThemeContext';
import { useWallet } from '@/context/WalletContext';
import { useRequestDeletion } from '@/hooks/useRequestDeletion';
import { ApiError } from '@/utils/errors';
import { formatDate } from '@/utils/format';
import type { DeletionReasonCode, RequestDeletionRequest } from '@/types/profile';

const REASONS: { code: DeletionReasonCode; label: string }[] = [
  { code: 'not_using_anymore', label: 'I no longer use the service' },
  { code: 'privacy_concerns', label: 'I have privacy concerns' },
  { code: 'duplicate_account', label: 'I have a duplicate account' },
  { code: 'switching_provider', label: 'Switching to another service' },
  { code: 'other', label: 'Other' },
];

export default function DeleteAccountScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state } = useWallet();
  const { colors, isDark } = useTheme();

  const requestDeletion = useRequestDeletion();
  const hasPassword = state.user?.hasPassword ?? false;

  const [step, setStep] = useState<1 | 2>(1);
  const [reason, setReason] = useState<DeletionReasonCode | null>(null);
  const [reasonText, setReasonText] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // --- Pending view -------------------------------------------------------

  if (state.accountDeletion?.status === 'pending') {
    const { scheduledFor, supportEmail, recoveryWindowDays } = state.accountDeletion;
    const daysRemaining = Math.max(
      0,
      Math.ceil((new Date(scheduledFor).getTime() - Date.now()) / 86_400_000),
    );

    const openSupport = () => {
      if (!supportEmail) return;
      const subject = encodeURIComponent('Restore account');
      const body = encodeURIComponent(
        state.user?.id ? `Customer ID: ${state.user.id}` : 'Please restore my account.',
      );
      Linking.openURL(`mailto:${supportEmail}?subject=${subject}&body=${body}`).catch(
        () => undefined,
      );
    };

    return (
      <SafeAreaView edges={['left', 'right']} style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border, paddingTop: insets.top + 14 }]}>
          <View style={{ width: 36 }} />
          <Text style={[styles.title, { color: colors.text }]}>Account deletion</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24, gap: 16 }]}>
          <View style={[styles.warningRow, { backgroundColor: colors.redLight }]}>
            <AlertTriangle size={20} color={colors.red} />
            <Text style={[styles.warningText, { color: colors.red }]}>
              Account scheduled for deletion
            </Text>
          </View>
          <Text style={[styles.copy, { color: colors.text }]}>
            {`Your account will be permanently deleted on ${formatDate(scheduledFor, 'long')} (${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} from now).`}
          </Text>
          <Text style={[styles.copy, { color: colors.textSecondary }]}>
            {`If you change your mind, contact our support team${supportEmail ? ` at ${supportEmail}` : ''} before this date to restore your account. The recovery window is ${recoveryWindowDays} days.`}
          </Text>

          {supportEmail && (
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              onPress={openSupport}
            >
              <Text style={styles.primaryBtnText}>Contact support</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => router.replace('/(onboarding)/intro' as never)}
          >
            <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Back to sign in</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // --- Step 1 / 2 forms ---------------------------------------------------

  const canDelete =
    confirmText === 'DELETE' && (!hasPassword || password.length > 0) && !requestDeletion.loading;

  const handleDelete = async () => {
    if (hasPassword && password.length === 0) {
      setPasswordError('Enter your password to confirm.');
      return;
    }
    setPasswordError(null);
    setGlobalError(null);

    const payload: RequestDeletionRequest = {};
    if (reason) payload.reasonCode = reason;
    if (reason === 'other' && reasonText.trim().length > 0) {
      payload.reasonText = reasonText.trim();
    }
    if (hasPassword) payload.confirmPassword = password;

    try {
      await requestDeletion.mutate(payload);
      // Hook's onSuccess already dispatches AUTH/LOGOUT and stores
      // accountDeletion, so the screen will re-render in the pending state.
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.code === 'INVALID_CURRENT_PASSWORD') {
          setPasswordError('The password is incorrect.');
          return;
        }
        if (e.code === 'ACCOUNT_DELETION_ALREADY_REQUESTED') {
          // Already pending — surface friendly message; status will refresh
          // via /me on next app load.
          Alert.alert('Already requested', e.message);
          return;
        }
        if (e.code === 'ACCOUNT_HAS_POSITIVE_BALANCE' || e.code === 'ACCOUNT_HAS_ACTIVE_CARD') {
          setGlobalError(e.message);
          return;
        }
        setGlobalError(e.message);
        return;
      }
      setGlobalError('Could not delete account. Please try again.');
    }
  };

  return (
    <SafeAreaView edges={['left', 'right']} style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border, paddingTop: insets.top + 14 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Back">
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Delete account</Text>
        <View style={{ width: 36 }} />
      </View>

      {step === 1 ? (
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}>
          <View style={[styles.warningRow, { backgroundColor: colors.redLight }]}>
            <AlertTriangle size={20} color={colors.red} />
            <Text style={[styles.warningText, { color: colors.red }]}>This action cannot be undone</Text>
          </View>
          <Text style={[styles.copy, { color: colors.text }]}>
            Your account will be scheduled for permanent deletion in 30 days. Until then, contact support to restore.
          </Text>

          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 16 }]}>Why are you leaving?</Text>
          {REASONS.map((r) => (
            <TouchableOpacity
              key={r.code}
              style={[styles.reasonRow, { backgroundColor: colors.surface, borderColor: colors.border }, reason === r.code && { borderColor: colors.primary, backgroundColor: isDark ? colors.surfaceAlt : '#eff6ff' }]}
              onPress={() => setReason(r.code)}
            >
              <View style={[styles.radio, { borderColor: colors.border }, reason === r.code && { borderColor: colors.primary }]}>
                {reason === r.code && <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />}
              </View>
              <Text style={[styles.reasonText, { color: colors.text }]}>{r.label}</Text>
            </TouchableOpacity>
          ))}

          {reason === 'other' && (
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Tell us more (optional)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text, minHeight: 96 }]}
                value={reasonText}
                onChangeText={setReasonText}
                multiline
                maxLength={500}
                placeholder="What could we have done better?"
                placeholderTextColor={colors.textTertiary}
              />
            </View>
          )}

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary }, !reason && styles.primaryBtnDisabled]}
            onPress={() => setStep(2)}
            disabled={!reason}
          >
            <Text style={styles.primaryBtnText}>Continue</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
          <Text style={[styles.step2Title, { color: colors.text }]}>Final confirmation</Text>
          <Text style={[styles.step2Sub, { color: colors.textSecondary }]}>
            Type <Text style={[styles.boldRed, { color: colors.red }]}>DELETE</Text>
            {hasPassword ? ' and enter your password' : ''} to confirm.
          </Text>

          {globalError && (
            <View style={[styles.warningRow, { backgroundColor: colors.redLight }]}>
              <AlertTriangle size={18} color={colors.red} />
              <Text style={[styles.warningText, { color: colors.red, fontSize: 14 }]}>{globalError}</Text>
            </View>
          )}

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Type "DELETE" to confirm</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: confirmText === 'DELETE' ? colors.red : colors.border, color: colors.text, letterSpacing: 3 }]}
              value={confirmText}
              onChangeText={setConfirmText}
              autoCapitalize="characters"
              placeholder="DELETE"
              placeholderTextColor={colors.textTertiary}
            />
          </View>

          {hasPassword && (
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Enter your password</Text>
              <View style={[styles.inputRow, { backgroundColor: colors.surface, borderColor: passwordError ? colors.red : colors.border }]}>
                <TextInput
                  style={[styles.input2, { color: colors.text }]}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPass}
                  placeholder="Your password"
                  placeholderTextColor={colors.textTertiary}
                  autoCapitalize="none"
                  autoComplete="password"
                />
                <TouchableOpacity onPress={() => setShowPass((v) => !v)} style={styles.eyeBtn}>
                  {showPass ? <EyeOff size={18} color={colors.textSecondary} /> : <Eye size={18} color={colors.textSecondary} />}
                </TouchableOpacity>
              </View>
              {passwordError && <Text style={[styles.errorText, { color: colors.red }]}>{passwordError}</Text>}
            </View>
          )}

          <TouchableOpacity
            style={[styles.deleteBtn, { backgroundColor: colors.red }, !canDelete && styles.deleteBtnDisabled]}
            onPress={handleDelete}
            disabled={!canDelete}
          >
            <Text style={styles.deleteBtnText}>
              {requestDeletion.loading ? 'Deleting...' : 'Permanently delete account'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => setStep(1)}>
            <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Go back</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 19, fontFamily: 'Inter-SemiBold' },
  scroll: { padding: 16, paddingBottom: 80 },
  warningRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, padding: 12, marginBottom: 12 },
  warningText: { fontSize: 16, fontFamily: 'Inter-SemiBold' },
  copy: { fontSize: 15, fontFamily: 'Inter-Regular', lineHeight: 22 },
  sectionTitle: { fontSize: 17, fontFamily: 'Inter-Bold', marginBottom: 10 },
  reasonRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, marginBottom: 8, borderWidth: 1.5 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  reasonText: { fontSize: 16, fontFamily: 'Inter-Medium', flex: 1 },
  primaryBtn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { fontSize: 18, fontFamily: 'Inter-SemiBold', color: '#fff' },
  step2Title: { fontSize: 24, fontFamily: 'Inter-Bold', marginBottom: 8 },
  step2Sub: { fontSize: 17, fontFamily: 'Inter-Regular', lineHeight: 22, marginBottom: 24 },
  boldRed: { fontFamily: 'Inter-Bold' },
  field: { marginBottom: 16 },
  label: { fontSize: 15, fontFamily: 'Inter-SemiBold', marginBottom: 6 },
  input: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 17, fontFamily: 'Inter-SemiBold' },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 12 },
  input2: { flex: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 17, fontFamily: 'Inter-Regular' },
  eyeBtn: { paddingRight: 14 },
  errorText: { fontSize: 13, fontFamily: 'Inter-Regular', marginTop: 6 },
  deleteBtn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 10 },
  deleteBtnDisabled: { opacity: 0.5 },
  deleteBtnText: { fontSize: 18, fontFamily: 'Inter-SemiBold', color: '#fff' },
  cancelBtn: { paddingVertical: 12, alignItems: 'center' },
  cancelBtnText: { fontSize: 17, fontFamily: 'Inter-Medium' },
});
