import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, TriangleAlert as AlertTriangle, Eye, EyeOff } from 'lucide-react-native';
import { useWallet } from '@/context/WalletContext';
import { useTheme } from '@/context/ThemeContext';

const REASONS = [
  'I no longer use the service',
  'I have privacy concerns',
  'Too many technical issues',
  'Switching to another service',
  'Other',
];

export default function DeleteAccountScreen() {
  const router = useRouter();
  const { state, logout } = useWallet();
  const { colors, isDark } = useTheme();
  const [step, setStep] = useState(1);
  const [reason, setReason] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  const canDelete = confirmText === 'DELETE' && password.length > 0;

  const handleDelete = () => {
    if (password !== 'password123') {
      Alert.alert('Wrong password', 'Please enter your correct password.');
      return;
    }
    logout();
    router.replace('/(onboarding)/intro');
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Delete account</Text>
        <View style={{ width: 36 }} />
      </View>

      {step === 1 ? (
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={[styles.warningRow, { backgroundColor: colors.redLight }]}>
            <AlertTriangle size={20} color={colors.red} />
            <Text style={[styles.warningText, { color: colors.red }]}>This action cannot be undone</Text>
          </View>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>Before you go, please check:</Text>
          <View style={[styles.checkCard, { backgroundColor: colors.surface }]}>
            {[
              ['Balance', `Current balance: £${state.wallet.balance.toFixed(2)}. Must be £0 to delete.`, state.wallet.balance > 0],
              ['Open disputes', `${state.disputes.filter((d) => d.status === 'open').length} open dispute(s). All must be resolved.`, state.disputes.some((d) => d.status === 'open')],
              ['Data retention', 'Transaction history is kept for 7 years for legal compliance.', false],
            ].map(([label, desc, blocked]: any) => (
              <View key={label} style={[styles.checkRow, blocked && styles.checkRowBlocked]}>
                <View style={[styles.checkDot, { backgroundColor: blocked ? colors.red : colors.green }]} />
                <View>
                  <Text style={[styles.checkLabel, { color: colors.text }]}>{label}</Text>
                  <Text style={[styles.checkDesc, { color: colors.textSecondary }]}>{desc}</Text>
                </View>
              </View>
            ))}
          </View>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>Why are you leaving?</Text>
          {REASONS.map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.reasonRow, { backgroundColor: colors.surface, borderColor: colors.border }, reason === r && { borderColor: colors.primary, backgroundColor: isDark ? colors.surfaceAlt : '#eff6ff' }]}
              onPress={() => setReason(r)}
            >
              <View style={[styles.radio, { borderColor: colors.border }, reason === r && { borderColor: colors.primary }]}>
                {reason === r && <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />}
              </View>
              <Text style={[styles.reasonText, { color: colors.text }]}>{r}</Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary }, !reason && styles.primaryBtnDisabled]}
            onPress={() => setStep(2)}
            disabled={!reason}
          >
            <Text style={styles.primaryBtnText}>Continue</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={[styles.step2Title, { color: colors.text }]}>Final confirmation</Text>
          <Text style={[styles.step2Sub, { color: colors.textSecondary }]}>
            Type <Text style={[styles.boldRed, { color: colors.red }]}>DELETE</Text> and enter your password to permanently delete your account.
          </Text>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Type "DELETE" to confirm</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }, confirmText === 'DELETE' && { borderColor: colors.red }]}
              value={confirmText}
              onChangeText={setConfirmText}
              autoCapitalize="characters"
              placeholder="DELETE"
              placeholderTextColor={colors.textTertiary}
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Enter your password</Text>
            <View style={[styles.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TextInput
                style={[styles.input2, { color: colors.text }]}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
                placeholder="Your password"
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPass((v) => !v)} style={styles.eyeBtn}>
                {showPass ? <EyeOff size={18} color={colors.textSecondary} /> : <Eye size={18} color={colors.textSecondary} />}
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.deleteBtn, { backgroundColor: colors.red }, !canDelete && styles.deleteBtnDisabled]}
            onPress={handleDelete}
            disabled={!canDelete}
          >
            <Text style={styles.deleteBtnText}>Permanently delete account</Text>
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
  scroll: { padding: 16, paddingBottom: 40 },
  warningRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, padding: 12, marginBottom: 20 },
  warningText: { fontSize: 16, fontFamily: 'Inter-SemiBold' },
  sectionTitle: { fontSize: 17, fontFamily: 'Inter-Bold', marginBottom: 10 },
  checkCard: { borderRadius: 14, padding: 14, gap: 12, marginBottom: 20 },
  checkRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  checkRowBlocked: {},
  checkDot: { width: 12, height: 12, borderRadius: 6, marginTop: 3 },
  checkLabel: { fontSize: 16, fontFamily: 'Inter-SemiBold' },
  checkDesc: { fontSize: 15, fontFamily: 'Inter-Regular', marginTop: 2, lineHeight: 16 },
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
  input: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 17, fontFamily: 'Inter-SemiBold', letterSpacing: 3 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 12 },
  input2: { flex: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 17, fontFamily: 'Inter-Regular' },
  eyeBtn: { paddingRight: 14 },
  deleteBtn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 10 },
  deleteBtnDisabled: { opacity: 0.5 },
  deleteBtnText: { fontSize: 18, fontFamily: 'Inter-SemiBold', color: '#fff' },
  cancelBtn: { paddingVertical: 12, alignItems: 'center' },
  cancelBtnText: { fontSize: 17, fontFamily: 'Inter-Medium' },
});
