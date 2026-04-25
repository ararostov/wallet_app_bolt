// Submit support ticket — POST /support/ticket (spec 10 §4.4).
//
// Authenticated. Idempotency key minted once per screen mount via useRef and
// rotated on 409 conflict per spec §6.5. Success → /help/ticket/submitted
// with the human-readable reference.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/context/ThemeContext';
import { useWallet } from '@/context/WalletContext';
import { useSubmitTicket } from '@/hooks/useSubmitTicket';
import type { SupportTicketCategory } from '@/types/help';
import { ApiError, mapErrorCode } from '@/utils/errors';
import { newIdempotencyKey } from '@/utils/idempotency';
import { getAppVersion, getDeviceId, getPlatform } from '@/utils/device';

interface CategoryOption {
  value: SupportTicketCategory;
  label: string;
}

// Closed enum from OpenAPI — see help-legal.yaml `SupportTicketCategory`.
const CATEGORY_OPTIONS: readonly CategoryOption[] = [
  { value: 'account', label: 'Account' },
  { value: 'payment', label: 'Payments' },
  { value: 'card', label: 'Card' },
  { value: 'transaction', label: 'Transaction' },
  { value: 'general', label: 'General' },
  { value: 'other', label: 'Something else' },
];

// Bounds match the OpenAPI schema (spec §4.4 mentions slightly different
// numbers; OpenAPI is canonical and is what backend enforces).
const SUBJECT_MIN = 3;
const SUBJECT_MAX = 200;
const BODY_MIN = 10;
const BODY_MAX = 5000;
const RATE_LIMIT_COOLDOWN_MS = 60 * 1000;

export default function SubmitTicketScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { state } = useWallet();

  // Auth guard — redirect logged-out users to login with a `next` hint.
  useEffect(() => {
    if (state.user === null && state.initialized) {
      router.replace('/(onboarding)/login?next=/help/ticket' as never);
    }
  }, [state.user, state.initialized, router]);

  const [category, setCategory] = useState<SupportTicketCategory | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [conflictBanner, setConflictBanner] = useState<string | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  // Idempotency-Key minted once per mount; rotated only after 409 conflict
  // (per spec §6.5).
  const idemKey = useRef(newIdempotencyKey());

  // Device metadata for the metadata block.
  const [deviceId, setDeviceId] = useState<string | null>(null);
  useEffect(() => {
    void getDeviceId().then(setDeviceId);
  }, []);

  // Tick once a second while in cooldown so the disabled state lifts.
  useEffect(() => {
    if (cooldownUntil === null) return;
    const handle = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(handle);
  }, [cooldownUntil]);

  const inCooldown = cooldownUntil !== null && cooldownUntil > now;
  const cooldownSeconds = inCooldown
    ? Math.max(0, Math.ceil(((cooldownUntil ?? 0) - now) / 1000))
    : 0;

  const { mutate, loading } = useSubmitTicket();

  const trimmedSubject = subject.trim();
  const trimmedBodyLength = body.trim().length;

  const isValid = useMemo(
    () =>
      category !== null &&
      trimmedSubject.length >= SUBJECT_MIN &&
      trimmedSubject.length <= SUBJECT_MAX &&
      trimmedBodyLength >= BODY_MIN &&
      body.length <= BODY_MAX &&
      !loading &&
      !inCooldown,
    [category, trimmedSubject, trimmedBodyLength, body.length, loading, inCooldown],
  );

  const submit = async () => {
    if (!isValid || !category) return;
    setFieldError(null);
    setConflictBanner(null);
    try {
      const result = await mutate({
        idempotencyKey: idemKey.current,
        payload: {
          subject: trimmedSubject,
          category,
          body: body.trim(),
          priority: 'normal',
          metadata: {
            deviceId: deviceId ?? undefined,
            appVersion: getAppVersion(),
            platform: getPlatform(),
            osVersion: String(Platform.Version ?? ''),
          },
        },
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      router.replace({
        pathname: '/help/ticket/submitted',
        params: { ref: result.reference },
      });
    } catch (e) {
      if (e instanceof ApiError) {
        const friendly = mapErrorCode(e.code);
        if (e.code === 'IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD') {
          // Rotate the key so the user can resubmit cleanly.
          idemKey.current = newIdempotencyKey();
          setConflictBanner(
            friendly ?? 'A similar ticket is already being processed. Tap submit again to try with a fresh key.',
          );
          return;
        }
        if (e.status === 429 || e.code === 'RATE_LIMITED' || e.code === 'SUPPORT_TICKET_RATE_LIMITED') {
          setCooldownUntil(Date.now() + RATE_LIMIT_COOLDOWN_MS);
          setNow(Date.now());
          setFieldError(
            friendly ?? mapErrorCode('RATE_LIMITED') ?? 'Too many requests. Please try later.',
          );
          return;
        }
        setFieldError(friendly ?? e.message);
        return;
      }
      setFieldError(e instanceof Error ? e.message : 'Something went wrong.');
    }
  };

  if (!state.initialized || state.user === null) {
    return (
      <SafeAreaView edges={['left', 'right']} style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['left', 'right']} style={[styles.safe, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { backgroundColor: colors.surface, borderBottomColor: colors.border, paddingTop: insets.top + 14 },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} accessibilityLabel="Go back">
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Submit a ticket</Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Category</Text>
          {CATEGORY_OPTIONS.map((opt) => {
            const active = category === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.radioRow,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  active && {
                    borderColor: colors.primary,
                    backgroundColor: isDark ? colors.surfaceAlt : '#eff6ff',
                  },
                ]}
                onPress={() => setCategory(opt.value)}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
              >
                <View
                  style={[
                    styles.radio,
                    { borderColor: isDark ? colors.textTertiary : '#cbd5e1' },
                    active && { borderColor: colors.primary },
                  ]}
                >
                  {active && <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />}
                </View>
                <Text style={[styles.radioText, { color: colors.text }]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}

          <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: 16 }]}>
            Subject
          </Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
            ]}
            value={subject}
            onChangeText={setSubject}
            maxLength={SUBJECT_MAX}
            placeholder="Short summary"
            placeholderTextColor={colors.textTertiary}
            accessibilityLabel="Ticket subject"
          />
          <Text style={[styles.counter, { color: colors.textTertiary }]}>
            {trimmedSubject.length < SUBJECT_MIN
              ? `At least ${SUBJECT_MIN} characters (${trimmedSubject.length}/${SUBJECT_MIN})`
              : `${subject.length} / ${SUBJECT_MAX}`}
          </Text>

          <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: 16 }]}>
            Describe the issue
          </Text>
          <TextInput
            style={[
              styles.textArea,
              { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
            ]}
            value={body}
            onChangeText={setBody}
            multiline
            numberOfLines={6}
            maxLength={BODY_MAX}
            textAlignVertical="top"
            placeholder="Describe the issue in detail (at least 10 characters)..."
            placeholderTextColor={colors.textTertiary}
            accessibilityLabel="Ticket body"
          />
          <Text style={[styles.counter, { color: colors.textTertiary }]}>
            {trimmedBodyLength < BODY_MIN
              ? `At least ${BODY_MIN} characters (${trimmedBodyLength}/${BODY_MIN})`
              : `${body.length} / ${BODY_MAX}`}
          </Text>
          <Text style={[styles.piiHint, { color: colors.amber }]}>
            Never share your card number, CVV, or one-time password.
          </Text>

          {conflictBanner && (
            <View style={[styles.banner, { backgroundColor: colors.amberLight, borderColor: colors.amber }]}>
              <Text style={[styles.bannerText, { color: colors.amber }]}>{conflictBanner}</Text>
            </View>
          )}

          {fieldError && (
            <Text style={styles.errorText}>{fieldError}</Text>
          )}

          <TouchableOpacity
            style={[
              styles.submitBtn,
              { backgroundColor: colors.primary },
              !isValid && styles.submitBtnDisabled,
            ]}
            onPress={submit}
            disabled={!isValid}
            accessibilityRole="button"
            accessibilityState={{ disabled: !isValid, busy: loading }}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>
                {inCooldown ? `Try again in ${cooldownSeconds}s` : 'Submit'}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 19, fontFamily: 'Inter-SemiBold' },
  scroll: { padding: 16 },
  sectionLabel: { fontSize: 13, fontFamily: 'Inter-SemiBold', marginBottom: 8, letterSpacing: 0.4, textTransform: 'uppercase' },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 8,
  },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  radioText: { fontSize: 15, fontFamily: 'Inter-SemiBold' },
  input: { borderWidth: 1.5, borderRadius: 12, padding: 14, fontSize: 16, fontFamily: 'Inter-Regular' },
  textArea: { borderWidth: 1.5, borderRadius: 12, padding: 14, fontSize: 16, fontFamily: 'Inter-Regular', minHeight: 120 },
  counter: { fontSize: 12, fontFamily: 'Inter-Regular', textAlign: 'right', marginTop: 4 },
  piiHint: { fontSize: 13, fontFamily: 'Inter-Medium', marginTop: 12 },
  banner: { borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 16 },
  bannerText: { fontSize: 14, fontFamily: 'Inter-Medium' },
  errorText: { marginTop: 12, color: '#b91c1c', fontFamily: 'Inter-Medium', fontSize: 14 },
  submitBtn: { marginTop: 24, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#fff', fontFamily: 'Inter-SemiBold', fontSize: 16 },
});
