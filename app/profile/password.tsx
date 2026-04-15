import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Eye, EyeOff, Check, X } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';

function PasswordInput({ label, value, onChange, colors }: { label: string; value: string; onChange: (v: string) => void; colors: any }) {
  const [show, setShow] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <View style={[styles.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TextInput
          style={[styles.input, { color: colors.text }]}
          value={value}
          onChangeText={onChange}
          secureTextEntry={!show}
          placeholderTextColor={colors.textTertiary}
          placeholder="Enter password"
          autoCapitalize="none"
        />
        <TouchableOpacity onPress={() => setShow((v) => !v)} style={styles.eyeBtn}>
          {show ? <EyeOff size={18} color={colors.textSecondary} /> : <Eye size={18} color={colors.textSecondary} />}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function StrengthMeter({ password, colors }: { password: string; colors: any }) {
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
            <Text style={[styles.ruleText, { color: colors.textTertiary }, pass && { color: colors.green }]}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function PasswordScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [current, setCurrent] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirm, setConfirm] = useState('');

  const mismatch = confirm.length > 0 && newPass !== confirm;
  const isValid = current.length > 0 && newPass.length >= 8 && newPass === confirm;

  const handleSave = () => {
    if (current !== 'password123') {
      Alert.alert('Wrong password', 'The current password you entered is incorrect.');
      return;
    }
    Alert.alert('Password changed', 'Your password has been updated successfully.');
    router.back();
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Change password</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <PasswordInput label="Current password" value={current} onChange={setCurrent} colors={colors} />
        <PasswordInput label="New password" value={newPass} onChange={setNewPass} colors={colors} />
        {newPass.length > 0 && <StrengthMeter password={newPass} colors={colors} />}
        <PasswordInput label="Confirm new password" value={confirm} onChange={setConfirm} colors={colors} />
        {mismatch && <Text style={[styles.errorText, { color: colors.red }]}>Passwords don't match</Text>}

        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.primary }, !isValid && styles.primaryBtnDisabled]}
          onPress={handleSave}
          disabled={!isValid}
        >
          <Text style={styles.primaryBtnText}>Save password</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontFamily: 'Inter-SemiBold' },
  scroll: { padding: 16, paddingBottom: 40 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontFamily: 'Inter-SemiBold', marginBottom: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 12 },
  input: { flex: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, fontFamily: 'Inter-Regular' },
  eyeBtn: { paddingRight: 14 },
  strengthContainer: { marginBottom: 16, gap: 8 },
  strengthBars: { flexDirection: 'row', gap: 4 },
  strengthBar: { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel: { fontSize: 12, fontFamily: 'Inter-SemiBold' },
  rules: { gap: 6 },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ruleText: { fontSize: 13, fontFamily: 'Inter-Regular' },
  errorText: { fontSize: 12, marginBottom: 8, fontFamily: 'Inter-Regular' },
  primaryBtn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { fontSize: 16, fontFamily: 'Inter-SemiBold', color: '#fff' },
});
