// Signup step 2 — first/last name, DOB (native picker, age >= 18) and the
// secondary identifier (email if user signed up with phone, vice versa).
//
// This screen now owns the `POST /auth/register` call. Legal consents and
// marketing pref were captured on the previous screen and live in
// `signupDraft.acceptedConsentIds` / `marketingOptIn`. On Continue we build
// the full RegisterRequest from the draft and fire the mutation; on success
// we replace to the OTP screen.

import React, { useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type TextInput as TextInputType,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Calendar } from 'lucide-react-native';

import { useTheme } from '@/context/ThemeContext';
import { useWallet } from '@/context/WalletContext';
import { ProgressStepper } from '@/components/ui/ProgressStepper';
import { isValidDob18plus, isValidE164, isValidEmail } from '@/utils/validators';
import { formatDate } from '@/utils/format';
import { useRegister } from '@/hooks/useRegister';
import { ApiError, mapErrorCode } from '@/utils/errors';
import { logEvent } from '@/utils/logger';
import type { RegisterRequest } from '@/types/auth';

function isoFromDate(d: Date): string {
  const yyyy = d.getFullYear().toString().padStart(4, '0');
  const mm = (d.getMonth() + 1).toString().padStart(2, '0');
  const dd = d.getDate().toString().padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { state, dispatch } = useWallet();
  const draft = state.signupDraft;

  const [firstName, setFirstName] = useState(draft.firstName ?? '');
  const [lastName, setLastName] = useState(draft.lastName ?? '');
  const [dob, setDob] = useState<Date | null>(
    draft.dateOfBirth ? new Date(draft.dateOfBirth) : null,
  );
  const [secondary, setSecondary] = useState(
    draft.method === 'phone' ? (draft.email ?? '') : (draft.phoneE164 ?? ''),
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const lastNameRef = useRef<TextInputType>(null);
  const secondaryRef = useRef<TextInputType>(null);

  const register = useRegister();

  const maxDob = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    return d;
  }, []);
  const minDob = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 120);
    return d;
  }, []);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!firstName.trim() || firstName.trim().length > 60) e.firstName = 'Required';
    if (!lastName.trim() || lastName.trim().length > 60) e.lastName = 'Required';
    if (!dob) {
      e.dob = 'Required';
    } else if (!isValidDob18plus(isoFromDate(dob))) {
      e.dob = 'You must be at least 18 to join';
    }
    // Secondary identifier is optional in MVP but if provided, must be valid.
    if (secondary.trim()) {
      if (draft.method === 'phone') {
        if (!isValidEmail(secondary.trim())) e.secondary = 'Enter a valid email address';
      } else if (!isValidE164(secondary.trim())) {
        e.secondary = 'Enter a valid phone number in international format (e.g. +447...)';
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleContinue = async () => {
    if (register.loading) return;
    if (!validate()) return;
    setSubmitError(null);

    const dobIso = dob ? isoFromDate(dob) : null;
    const isPhoneMethod = draft.method === 'phone';
    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    const finalEmail = isPhoneMethod ? (secondary.trim() || null) : draft.email;
    const finalPhoneE164 = isPhoneMethod ? draft.phoneE164 : (secondary.trim() || null);

    // Persist the latest profile fields back to the draft before firing the
    // mutation — so a transient failure doesn't lose what the user typed.
    dispatch({
      type: 'AUTH/UPDATE_DRAFT',
      payload: {
        firstName: trimmedFirst,
        lastName: trimmedLast,
        dateOfBirth: dobIso,
        email: finalEmail,
        phoneE164: finalPhoneE164,
      },
    });

    if (!dobIso) {
      // validate() already covers this; defensive.
      return;
    }

    const body: RegisterRequest = {
      firstName: trimmedFirst,
      lastName: trimmedLast,
      email: finalEmail ?? undefined,
      phoneE164: finalPhoneE164 ?? undefined,
      dateOfBirth: dobIso,
      marketingOptIn: draft.marketingOptIn,
      consentedDocumentIds: draft.acceptedConsentIds,
      referralCode: draft.referralCode ?? undefined,
    };

    try {
      logEvent('signup_otp_requested', { method: draft.method });
      await register.mutate(body);
      router.replace('/(onboarding)/signup/otp');
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
                onPress: () => router.replace('/(onboarding)/login'),
              },
            ],
          );
          return;
        }
        if (err.status === 422 && err.code === 'UNDERAGE_CUSTOMER') {
          Alert.alert('Underage', mapErrorCode(err.code) ?? err.message);
          return;
        }
        if (err.status === 422 && err.code === 'VALIDATION_FAILED') {
          // Most common case: backend rejected the consent set — typically
          // because Terms of Service was missing from consentedDocumentIds, or
          // a new required document was published since we cached the list.
          // Send the user back to screen 1 to re-review the legal docs.
          const fields = err.details as
            | Record<string, string[] | undefined>
            | undefined;
          const consentMessage = fields?.consentedDocumentIds?.[0];
          Alert.alert(
            'Please review your consents',
            consentMessage ??
              'Some required consents are missing. Please review and try again.',
            [
              {
                text: 'Review',
                onPress: () => router.replace('/(onboarding)/signup'),
              },
            ],
          );
          return;
        }
        setSubmitError(mapErrorCode(err.code) ?? err.message);
        return;
      }
      setSubmitError('Network error. Please check your connection and try again.');
    }
  };

  const onDobChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') {
      setPickerOpen(false);
      if (event.type === 'set' && selected) {
        setDob(selected);
      }
    } else if (selected) {
      setDob(selected);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={[styles.backText, { color: colors.primary }]}>{'← Back'}</Text>
          </TouchableOpacity>
          <ProgressStepper current={1} total={2} />
          <Text style={[styles.title, { color: colors.text }]}>Tell us about yourself</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            We need a few details to set up your account securely.
          </Text>

          {submitError && (
            <View
              style={[
                styles.errorBanner,
                { backgroundColor: colors.redLight, borderColor: colors.red },
              ]}
            >
              <Text style={[styles.errorBannerText, { color: colors.red }]}>{submitError}</Text>
            </View>
          )}

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>First name</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.background,
                  borderColor: errors.firstName ? colors.red : colors.border,
                  color: colors.text,
                },
              ]}
              placeholder="Alex"
              placeholderTextColor={colors.textTertiary}
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
              textContentType="givenName"
              autoComplete="given-name"
              returnKeyType="next"
              onSubmitEditing={() => lastNameRef.current?.focus()}
              blurOnSubmit={false}
              maxLength={60}
            />
            {errors.firstName && <Text style={[styles.errorText, { color: colors.red }]}>{errors.firstName}</Text>}
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Last name</Text>
            <TextInput
              ref={lastNameRef}
              style={[
                styles.input,
                {
                  backgroundColor: colors.background,
                  borderColor: errors.lastName ? colors.red : colors.border,
                  color: colors.text,
                },
              ]}
              placeholder="Johnson"
              placeholderTextColor={colors.textTertiary}
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
              textContentType="familyName"
              autoComplete="family-name"
              returnKeyType="next"
              blurOnSubmit={false}
              maxLength={60}
            />
            {errors.lastName && <Text style={[styles.errorText, { color: colors.red }]}>{errors.lastName}</Text>}
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Date of birth</Text>
            <Pressable
              onPress={() => setPickerOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Date of birth"
              accessibilityHint="Opens a date picker"
              style={[
                styles.dateBtn,
                {
                  backgroundColor: colors.background,
                  borderColor: errors.dob ? colors.red : colors.border,
                },
              ]}
            >
              <Calendar size={18} color={colors.textSecondary} />
              <Text
                style={[
                  styles.dateText,
                  { color: dob ? colors.text : colors.textTertiary },
                ]}
              >
                {dob ? formatDate(dob.toISOString(), 'long') : 'Select date'}
              </Text>
            </Pressable>
            {errors.dob && <Text style={[styles.errorText, { color: colors.red }]}>{errors.dob}</Text>}
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>
              {draft.method === 'phone' ? 'Email address' : 'Phone number'}
            </Text>
            <TextInput
              ref={secondaryRef}
              style={[
                styles.input,
                {
                  backgroundColor: colors.background,
                  borderColor: errors.secondary ? colors.red : colors.border,
                  color: colors.text,
                },
              ]}
              placeholder={
                draft.method === 'phone' ? 'alex@example.com' : '+447700900000'
              }
              placeholderTextColor={colors.textTertiary}
              value={secondary}
              onChangeText={setSecondary}
              keyboardType={draft.method === 'phone' ? 'email-address' : 'phone-pad'}
              autoCapitalize="none"
              textContentType={
                draft.method === 'phone' ? 'emailAddress' : 'telephoneNumber'
              }
              autoComplete={draft.method === 'phone' ? 'email' : 'tel'}
              returnKeyType="done"
              onSubmitEditing={handleContinue}
            />
            {errors.secondary && <Text style={[styles.errorText, { color: colors.red }]}>{errors.secondary}</Text>}
          </View>

          <TouchableOpacity
            style={[
              styles.primaryBtn,
              { backgroundColor: colors.primary },
              register.loading && styles.primaryBtnDisabled,
            ]}
            onPress={handleContinue}
            disabled={register.loading}
            accessibilityState={{ busy: register.loading, disabled: register.loading }}
          >
            <Text style={styles.primaryBtnText}>
              {register.loading ? 'Sending code…' : 'Continue'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* iOS picker is rendered inline in a sheet for ergonomics; Android pops native dialog. */}
      {pickerOpen && Platform.OS === 'ios' && (
        <Modal animationType="fade" transparent visible={pickerOpen}>
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
              <DateTimePicker
                value={dob ?? maxDob}
                mode="date"
                display="spinner"
                maximumDate={maxDob}
                minimumDate={minDob}
                onChange={onDobChange}
              />
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                onPress={() => setPickerOpen(false)}
              >
                <Text style={styles.primaryBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
      {pickerOpen && Platform.OS === 'android' && (
        <DateTimePicker
          value={dob ?? maxDob}
          mode="date"
          display="calendar"
          maximumDate={maxDob}
          minimumDate={minDob}
          onChange={onDobChange}
        />
      )}
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
  errorBanner: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 16, gap: 6 },
  errorBannerText: { fontSize: 15, fontFamily: 'Inter-Medium' },
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
  dateBtn: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateText: { fontSize: 17, fontFamily: 'Inter-Regular' },
  errorText: { fontSize: 15, marginTop: 4, fontFamily: 'Inter-Regular' },
  primaryBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { fontSize: 18, fontFamily: 'Inter-SemiBold', color: '#fff' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { padding: 16, borderTopLeftRadius: 24, borderTopRightRadius: 24, gap: 12 },
});
