// Signup step 3 — fetch the merchant's active legal documents from the
// backend, render them as consent rows, and submit POST /auth/register with
// the accepted document ids in `consentedDocumentIds`.
//
// Marketing opt-in is a SEPARATE field from legal documents — kept as local
// UI on this screen and folded into a single boolean for the register call,
// matching `RegisterRequest.marketingOptIn`. Channel-specific marketing
// consents (email / SMS / push) are not part of the legal-documents flow.

import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { useTheme } from '@/context/ThemeContext';
import { useWallet } from '@/context/WalletContext';
import { useRegister } from '@/hooks/useRegister';
import { useQuery } from '@/hooks/useQuery';
import { ProgressStepper } from '@/components/ui/ProgressStepper';
import { Checkbox } from '@/components/ui/Checkbox';
import { Badge } from '@/components/ui/Badge';
import { legalApi } from '@/utils/api/legal';
import { ApiError , mapErrorCode } from '@/utils/errors';
import { logEvent } from '@/utils/logger';
import type { RegisterRequest } from '@/types/auth';
import type { LegalDocumentListItem } from '@/types/legal';

export default function ConsentsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { state } = useWallet();
  const draft = state.signupDraft;

  const legalQuery = useQuery<LegalDocumentListItem[]>(
    'legal-documents',
    async () => {
      const data = await legalApi.list();
      return { data };
    },
    {
      // Backend Cache-Control says 10 min — match it.
      ttlMs: 10 * 60 * 1000,
      staleMs: 60 * 1000,
      refetchOnFocus: false,
    },
  );

  const documents = useMemo(() => legalQuery.data ?? [], [legalQuery.data]);

  // Sort: required first (so the user can't miss them), then by published
  // date descending. Stable enough for the small list (<= 4 rows on MVP).
  const sortedDocuments = useMemo(() => {
    return [...documents].sort((a, b) => {
      if (a.required !== b.required) return a.required ? -1 : 1;
      return b.publishedAt.localeCompare(a.publishedAt);
    });
  }, [documents]);

  const [accepted, setAccepted] = useState<Record<string, boolean>>({});
  const [marketingOptIn, setMarketingOptIn] = useState<boolean>(draft.marketingOptIn ?? false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Reset acceptance state when the document set changes (e.g. after retry
  // or when versions changed since last visit).
  useEffect(() => {
    setAccepted((prev) => {
      const next: Record<string, boolean> = {};
      for (const doc of documents) {
        next[doc.id] = prev[doc.id] ?? false;
      }
      return next;
    });
  }, [documents]);

  const register = useRegister();

  const requiredOk = sortedDocuments
    .filter((d) => d.required)
    .every((d) => accepted[d.id]);

  const hasDocuments = sortedDocuments.length > 0;
  const submitDisabled =
    legalQuery.loading || !!legalQuery.error || !hasDocuments || !requiredOk || register.loading;

  const toggle = (id: string) => {
    setAccepted((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const openDocument = (doc: LegalDocumentListItem) => {
    router.push({ pathname: '/legal/[id]', params: { id: doc.id } });
  };

  const handleSubmit = async () => {
    if (submitDisabled) return;
    setSubmitError(null);

    if (!draft.firstName || !draft.lastName) {
      setSubmitError('Please complete your profile first.');
      router.back();
      return;
    }

    // Backend `consentedDocumentIds` items are typed as `integer`. The list
    // endpoint serialises ids as strings (project bigint-as-string convention)
    // — convert once at the boundary.
    const consentedDocumentIds = sortedDocuments
      .filter((d) => accepted[d.id])
      .map((d) => Number(d.id))
      .filter((n) => Number.isFinite(n));

    const body: RegisterRequest = {
      firstName: draft.firstName,
      lastName: draft.lastName,
      email: draft.email ?? undefined,
      phoneE164: draft.phoneE164 ?? undefined,
      dateOfBirth: draft.dateOfBirth ?? undefined,
      marketingOptIn,
      consentedDocumentIds,
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
          router.back();
          return;
        }
        if (err.status === 422 && err.code === 'VALIDATION_FAILED') {
          // Most common case here: the backend rejected our consent set —
          // typically because Terms of Service was missing from
          // consentedDocumentIds, or a new required document was published
          // since we cached the list. Re-fetch and ask the user to review.
          const fields = err.details as
            | Record<string, string[] | undefined>
            | undefined;
          const consentMessage = fields?.consentedDocumentIds?.[0];
          setSubmitError(
            consentMessage ??
              'Some required consents are missing. Please review and try again.',
          );
          legalQuery.refetch().catch(() => undefined);
          return;
        }
        setSubmitError(mapErrorCode(err.code) ?? err.message);
        return;
      }
      setSubmitError('Network error. Please check your connection and try again.');
    }
  };

  const handleBack = () => {
    Alert.alert('Discard your progress?', 'You will need to start over.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => router.back() },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <Text style={[styles.backText, { color: colors.primary }]}>{'← Back'}</Text>
        </TouchableOpacity>
        <ProgressStepper current={2} total={3} />
        <Text style={[styles.title, { color: colors.text }]}>Almost there</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Please review and accept the following to continue.
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

        {legalQuery.loading && !hasDocuments && (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Loading legal documents…
            </Text>
          </View>
        )}

        {legalQuery.error && (
          <View
            style={[styles.errorBanner, { backgroundColor: colors.redLight, borderColor: colors.red }]}
          >
            <Text style={[styles.errorBannerText, { color: colors.red }]}>
              We couldn't load the legal documents. Please check your connection and try again.
            </Text>
            <Pressable
              onPress={() => legalQuery.refetch()}
              style={styles.retryBtn}
              accessibilityRole="button"
            >
              <Text style={[styles.retryText, { color: colors.red }]}>Retry</Text>
            </Pressable>
          </View>
        )}

        {!legalQuery.loading && !legalQuery.error && !hasDocuments && (
          <View
            style={[
              styles.errorBanner,
              { backgroundColor: colors.amberLight, borderColor: colors.amber },
            ]}
          >
            <Text style={[styles.errorBannerText, { color: colors.amber }]}>
              Legal documents are not available right now — please try again later.
            </Text>
            <Pressable
              onPress={() => legalQuery.refetch()}
              style={styles.retryBtn}
              accessibilityRole="button"
            >
              <Text style={[styles.retryText, { color: colors.amber }]}>Retry</Text>
            </Pressable>
          </View>
        )}

        {sortedDocuments.map((doc) => (
          <Pressable
            key={doc.id}
            style={styles.consentRow}
            onPress={() => toggle(doc.id)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: !!accepted[doc.id] }}
            accessibilityLabel={`${doc.title}, ${doc.required ? 'required' : 'optional'}`}
          >
            <View style={{ marginTop: 2 }}>
              <Checkbox
                checked={!!accepted[doc.id]}
                onToggle={() => toggle(doc.id)}
                accessibilityLabel={doc.title}
              />
            </View>
            <View style={styles.consentContent}>
              <View style={styles.consentLabelRow}>
                <Text style={[styles.consentLabel, { color: colors.text }]}>{doc.title}</Text>
                {doc.required && <Badge label="Required" variant="error" size="sm" />}
              </View>
              <Text style={[styles.consentDesc, { color: colors.textSecondary }]}>
                Version {doc.version}
              </Text>
              <TouchableOpacity onPress={() => openDocument(doc)} accessibilityRole="link">
                <Text style={[styles.readLink, { color: colors.primary }]}>Read full text →</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        ))}

        {hasDocuments && (
          <Pressable
            style={styles.consentRow}
            onPress={() => setMarketingOptIn((v) => !v)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: marketingOptIn }}
            accessibilityLabel="Marketing communications, optional"
          >
            <View style={{ marginTop: 2 }}>
              <Checkbox
                checked={marketingOptIn}
                onToggle={() => setMarketingOptIn((v) => !v)}
                accessibilityLabel="Marketing communications"
              />
            </View>
            <View style={styles.consentContent}>
              <View style={styles.consentLabelRow}>
                <Text style={[styles.consentLabel, { color: colors.text }]}>
                  Marketing communications
                </Text>
              </View>
              <Text style={[styles.consentDesc, { color: colors.textSecondary }]}>
                Receive product updates, personalised offers, and rewards news. You can change this
                later in your profile.
              </Text>
            </View>
          </Pressable>
        )}

        <TouchableOpacity
          style={[
            styles.primaryBtn,
            { backgroundColor: colors.primary },
            submitDisabled && styles.primaryBtnDisabled,
          ]}
          onPress={handleSubmit}
          disabled={submitDisabled}
          accessibilityState={{ disabled: submitDisabled, busy: register.loading }}
        >
          <Text style={styles.primaryBtnText}>
            {register.loading ? 'Sending code…' : 'Agree and continue'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flexGrow: 1, padding: 24, paddingBottom: 40 },
  backBtn: { marginBottom: 16 },
  backText: { fontSize: 18, fontFamily: 'Inter-Medium' },
  title: { fontSize: 28, fontFamily: 'Inter-Bold', marginBottom: 6, letterSpacing: -0.5 },
  subtitle: { fontSize: 17, fontFamily: 'Inter-Regular', marginBottom: 20, lineHeight: 22 },
  errorBanner: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 16, gap: 6 },
  errorBannerText: { fontSize: 15, fontFamily: 'Inter-Medium' },
  retryBtn: { alignSelf: 'flex-start', paddingVertical: 4 },
  retryText: { fontSize: 15, fontFamily: 'Inter-SemiBold' },
  loading: { paddingVertical: 24, alignItems: 'center', gap: 8 },
  loadingText: { fontSize: 15, fontFamily: 'Inter-Regular' },
  consentRow: { flexDirection: 'row', gap: 14, marginBottom: 20, alignItems: 'flex-start' },
  consentContent: { flex: 1, gap: 4 },
  consentLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  consentLabel: { fontSize: 17, fontFamily: 'Inter-SemiBold' },
  consentDesc: { fontSize: 15, fontFamily: 'Inter-Regular', lineHeight: 18 },
  readLink: { fontSize: 15, fontFamily: 'Inter-Medium', marginTop: 2 },
  primaryBtn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 16 },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { fontSize: 18, fontFamily: 'Inter-SemiBold', color: '#fff' },
});
