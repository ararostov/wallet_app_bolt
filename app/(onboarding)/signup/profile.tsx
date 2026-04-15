import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  type TextInput as TextInputType,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';

function Stepper({ current, total }: { current: number; total: number }) {
  const { colors } = useTheme();
  return (
    <View style={stepStyles.row}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={[stepStyles.step, { backgroundColor: colors.border }, i < current && { backgroundColor: colors.primary }]} />
      ))}
      <Text style={[stepStyles.label, { color: colors.textTertiary }]}>{current} of {total}</Text>
    </View>
  );
}

const stepStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 28 },
  step: { flex: 1, height: 4, borderRadius: 2 },
  label: { fontSize: 15, fontFamily: 'Inter-Regular', marginLeft: 4 },
});

function formatDob(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)} / ${digits.slice(2)}`;
  return `${digits.slice(0, 2)} / ${digits.slice(2, 4)} / ${digits.slice(4)}`;
}

function dobRawDigits(formatted: string): string {
  return formatted.replace(/\D/g, '');
}

export default function ProfileScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const lastNameRef = useRef<TextInputType>(null);
  const dobRef = useRef<TextInputType>(null);
  const emailRef = useRef<TextInputType>(null);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!firstName.trim()) e.firstName = 'Required';
    if (!lastName.trim()) e.lastName = 'Required';
    if (!dob.trim()) e.dob = 'Required';
    if (!email.trim()) e.email = 'Required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Invalid email';
    return e;
  };

  const handleContinue = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    router.push('/(onboarding)/signup/consents');
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={[styles.backText, { color: colors.primary }]}>← Back</Text>
          </TouchableOpacity>
          <Stepper current={2} total={4} />
          <Text style={[styles.title, { color: colors.text }]}>Tell us about yourself</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>We need a few details to set up your account securely.</Text>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>First name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }, errors.firstName && { borderColor: colors.red }]}
              placeholder="Alex"
              placeholderTextColor={colors.textTertiary}
              value={firstName}
              onChangeText={(text) => {
                setFirstName(text);
                // Auto-advance on iOS autofill (value filled all at once from empty)
                if (firstName.length === 0 && text.length > 1) {
                  setTimeout(() => lastNameRef.current?.focus(), 50);
                }
              }}
              autoCapitalize="words"
              textContentType="givenName"
              autoComplete="given-name"
              returnKeyType="next"
              onSubmitEditing={() => lastNameRef.current?.focus()}
              blurOnSubmit={false}
            />
            {errors.firstName && <Text style={[styles.errorText, { color: colors.red }]}>{errors.firstName}</Text>}
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Last name</Text>
            <TextInput
              ref={lastNameRef}
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }, errors.lastName && { borderColor: colors.red }]}
              placeholder="Johnson"
              placeholderTextColor={colors.textTertiary}
              value={lastName}
              onChangeText={(text) => {
                setLastName(text);
                if (lastName.length === 0 && text.length > 1) {
                  setTimeout(() => dobRef.current?.focus(), 50);
                }
              }}
              autoCapitalize="words"
              textContentType="familyName"
              autoComplete="family-name"
              returnKeyType="next"
              onSubmitEditing={() => dobRef.current?.focus()}
              blurOnSubmit={false}
            />
            {errors.lastName && <Text style={[styles.errorText, { color: colors.red }]}>{errors.lastName}</Text>}
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Date of birth</Text>
            <TextInput
              ref={dobRef}
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }, errors.dob && { borderColor: colors.red }]}
              placeholder="DD / MM / YYYY"
              placeholderTextColor={colors.textTertiary}
              value={dob}
              onChangeText={(text) => {
                const next = dobRawDigits(text);
                if (next.length <= 8) {
                  setDob(formatDob(next));
                  if (next.length === 8) {
                    setTimeout(() => emailRef.current?.focus(), 50);
                  }
                }
              }}
              keyboardType="number-pad"
              maxLength={14}
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
              blurOnSubmit={false}
            />
            {errors.dob && <Text style={[styles.errorText, { color: colors.red }]}>{errors.dob}</Text>}
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Email address</Text>
            <TextInput
              ref={emailRef}
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }, errors.email && { borderColor: colors.red }]}
              placeholder="alex@example.com"
              placeholderTextColor={colors.textTertiary}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (email.length === 0 && text.includes('@')) {
                  // autofilled email — stay on field, user can press Continue
                }
              }}
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={handleContinue}
            />
            {errors.email && <Text style={[styles.errorText, { color: colors.red }]}>{errors.email}</Text>}
          </View>

          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primary }]} onPress={handleContinue}>
            <Text style={styles.primaryBtnText}>Continue</Text>
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
  backBtn: { marginBottom: 16 },
  backText: { fontSize: 18, fontFamily: 'Inter-Medium' },
  title: { fontSize: 28, fontFamily: 'Inter-Bold', marginBottom: 6, letterSpacing: -0.5 },
  subtitle: { fontSize: 17, fontFamily: 'Inter-Regular', marginBottom: 28, lineHeight: 22 },
  field: { marginBottom: 16 },
  label: { fontSize: 16, fontFamily: 'Inter-SemiBold', marginBottom: 6 },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 17,
    fontFamily: 'Inter-Regular',
  },
  errorText: { fontSize: 15, marginTop: 4, fontFamily: 'Inter-Regular' },
  primaryBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryBtnText: { fontSize: 18, fontFamily: 'Inter-SemiBold', color: '#fff' },
});
