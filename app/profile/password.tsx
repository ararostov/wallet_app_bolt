// Password screen — wired to PATCH /user/password.
// Two modes:
//  - hasPassword=false → "Set a password" (newPassword + confirm only).
//  - hasPassword=true  → "Change password" (current + newPassword + confirm).

import React, { useState } from 'react';
import {
  Alert,
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
import { ArrowLeft, Check, Eye, EyeOff, X } from 'lucide-react-native';

import { useTheme } from '@/context/ThemeContext';
import { useWallet } from '@/context/WalletContext';
import { useChangePassword } from '@/hooks/useChangePassword';
import { toast } from '@/components/ui/Toast';
import { ApiError } from '@/utils/errors';
import type { ChangePasswordRequest } from '@/types/profile';

interface PasswordInputProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  colors: ReturnType<typeof useTheme>['colors'];
  error?: string | null;
}

function PasswordInput({ label, value, onChange, colors, error }: PasswordInputProps) {
  const [show, setShow] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <View style={[styles.inputRow, { backgroundColor: colors.surface, borderColor: error ? colors.red : colors.border }]}>
        <TextInput
          style={[styles.input, { color: colors.text }]}
          value={value}
          onChangeText={onChange}
          secureTextEntry={!show}
          placeholderTextColor={colors.textTertiary}
          placeholder="Enter password"
          autoCapitalize="none"
          autoComplete="password"
        />
        <TouchableOpacity onPress={() => setShow((v) => !v)} style={styles.eyeBtn} accessibilityLabel="Toggle password visibility">
          {show ? <EyeOff size={18} color={colors.textSecondary} /> : <Eye size={18} color={colors.textSecondary} />}
        </TouchableOpacity>
      </View>
      {error && <Text style={[styles.errorText, { color: colors.red }]}>{error}</Text>}
    </View>
  );
}

interface StrengthMeterProps {
  password: string;
  colors: ReturnType<typeof useTheme>['colors'];
}

function StrengthMeter({ password, colors }: StrengthMeterProps) {
  const checks = [
    { label: '8+ characters', pass: password.length >= 8 },
    { label: 'Uppercase letter', pass: /[A-Z]/.test(password) },
    { label: 'Number', pass: /[0-9]/.test(password) },
    { label: 'Special character', pass: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter((c) => c.pass).length;
  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = [colors.border, '#ef4444', '#f59e0b', '#3b82f6', '#22c55e'];

  return (
    <View style={styles.strengthContainer}>
      <View style={styles.strengthBars}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={[styles.strengthBar, { backgroundColor: i <= score ? strengthColors[score] : colors.border }]} />
        ))}
      </View>
      {password.length > 0 && (
        <Text style={[styles.strengthLabel, { color: strengthColors[score] }]}>{strengthLabels[score]}</Text>
      )}
      <View style={styles.rules}>
        {checks.map(({ label, pass }) => (
          <View key={label} style={styles.ruleRow}>
            {pass ? <Check size={14} color={colors.green} /> : <X size={14} color={colors.textTertiary} />}
            <Text style={[styles.ruleText, { color: pass ? colors.green : colors.textTertiary }]}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function isStrongPasswordStrict(value: string): boolean {
  return (
    value.length >= 8 &&
    /[A-Z]/.test(value) &&
    /[0-9]/.test(value) &&
    /[^A-Za-z0-9]/.test(value)
  );
}

export default function PasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { state } = useWallet();
  const change = useChangePassword();

  const hasPassword = state.user?.hasPassword ?? false;

  const [current, setCurrent] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [currentError, setCurrentError] = useState<string | null>(null);
  const [newError, setNewError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const mismatch = confirm.length > 0 && newPass !== confirm;
  const isValid =
    isStrongPasswordStrict(newPass) &&
    newPass === confirm &&
    (!hasPassword || current.length >= 1);

  const handleSave = async () => {
    setCurrentError(null);
    setNewError(null);
    setConfirmError(null);

    if (!isStrongPasswordStrict(newPass)) {
      setNewError('Use at least 8 characters with an uppercase letter, digit and special character.');
      return;
    }
    if (mismatch) {
      setConfirmError("Passwords don't match.");
      return;
    }

    const payload: ChangePasswordRequest = { newPassword: newPass };
    if (hasPassword) payload.currentPassword = current;

    try {
      const result = await change.mutate(payload);
      const otherSessions = result.otherSessionsRevoked ?? 0;
      const message = hasPassword
        ? otherSessions > 0
          ? `Password updated. ${otherSessions} other ${otherSessions === 1 ? 'session' : 'sessions'} signed out.`
          : 'Password updated'
        : 'Password set';
      toast.show({ message, variant: 'success' });
      router.back();
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.code === 'INVALID_CURRENT_PASSWORD') {
          setCurrentError('The current password is incorrect.');
          return;
        }
        if (e.code === 'WEAK_PASSWORD') {
          setNewError('Password is too weak. Please follow the strength rules.');
          return;
        }
        if (e.code === 'PASSWORD_SAME_AS_CURRENT') {
          setNewError('New password must be different from the current one.');
          return;
        }
        Alert.alert('Could not change password', e.message);
        return;
      }
      Alert.alert('Could not change password', 'Please try again.');
    }
  };

  return (
    <SafeAreaView edges={['left', 'right']} style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border, paddingTop: insets.top + 14 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Back" accessibilityRole="button">
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>
          {hasPassword ? 'Change password' : 'Set a password'}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
        <Text style={[styles.intro, { color: colors.textSecondary }]}>
          {hasPassword
            ? "Choose a strong password. We'll sign out your other sessions when you save."
            : 'Add a password to your account for extra security.'}
        </Text>

        {hasPassword && (
          <PasswordInput
            label="Current password"
            value={current}
            onChange={setCurrent}
            colors={colors}
            error={currentError}
          />
        )}
        <PasswordInput
          label="New password"
          value={newPass}
          onChange={setNewPass}
          colors={colors}
          error={newError}
        />
        {newPass.length > 0 && <StrengthMeter password={newPass} colors={colors} />}
        <PasswordInput
          label="Confirm new password"
          value={confirm}
          onChange={setConfirm}
          colors={colors}
          error={confirmError ?? (mismatch ? "Passwords don't match" : null)}
        />

        <TouchableOpacity
          style={[
            styles.primaryBtn,
            { backgroundColor: colors.primary },
            (!isValid || change.loading) && styles.primaryBtnDisabled,
          ]}
          onPress={handleSave}
          disabled={!isValid || change.loading}
        >
          <Text style={styles.primaryBtnText}>
            {change.loading
              ? 'Saving...'
              : hasPassword
                ? 'Save password'
                : 'Set password'}
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
  scroll: { padding: 16, paddingBottom: 80 },
  intro: { fontSize: 15, fontFamily: 'Inter-Regular', marginBottom: 16, lineHeight: 20 },
  field: { marginBottom: 16 },
  label: { fontSize: 15, fontFamily: 'Inter-SemiBold', marginBottom: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 12 },
  input: { flex: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 17, fontFamily: 'Inter-Regular' },
  eyeBtn: { paddingRight: 14 },
  errorText: { fontSize: 13, fontFamily: 'Inter-Regular', marginTop: 6 },
  strengthContainer: { marginBottom: 16, gap: 8 },
  strengthBars: { flexDirection: 'row', gap: 4 },
  strengthBar: { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel: { fontSize: 14, fontFamily: 'Inter-SemiBold' },
  rules: { gap: 6 },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ruleText: { fontSize: 14, fontFamily: 'Inter-Regular' },
  primaryBtn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { fontSize: 18, fontFamily: 'Inter-SemiBold', color: '#fff' },
});
