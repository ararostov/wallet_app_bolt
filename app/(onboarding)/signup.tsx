// Signup step 1 — channel (phone/email) + identifier + optional referral code
// + inline legal consents + marketing opt-in toggle.
//
// No API call here; all inputs land in signupDraft and the user moves on to
// /signup/profile. The actual register request goes out from /signup/profile
// after the user provides name + DOB. PII therefore only leaves the device
// once the user has explicitly accepted the required legal documents on this
// screen — UK GDPR-driven UX: consent is visible at the moment it's given.
//
// Marketing opt-in is a SEPARATE field from legal documents — folded into a
// single boolean for the eventual register call (RegisterRequest.marketingOptIn).
// Channel-specific marketing consents (email / SMS / push) are not part of the
// legal-documents flow.

import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ChevronDown, ChevronRight } from 'lucide-react-native';

import { useTheme } from '@/context/ThemeContext';
import { useWallet } from '@/context/WalletContext';
import { isValidE164, isValidEmail } from '@/utils/validators';
import { useQuery } from '@/hooks/useQuery';
import { Checkbox } from '@/components/ui/Checkbox';
import { legalApi } from '@/utils/api/legal';
import type { LegalDocumentListItem, LegalDocumentType } from '@/types/legal';

// Friendly labels per type. Backend titles are merchant-prefixed
// ("Tesco Clubcard Pay+ Privacy Policy") which is too verbose for a single-line
// "I agree to the X" row — use the canonical type label instead.
const TYPE_LABEL: Record<LegalDocumentType, string> = {
  terms_of_service: 'Terms of Service',
  privacy_policy: 'Privacy Policy',
  cookie_policy: 'Cookie policy',
  rewards_terms: 'Rewards terms',
};

const COUNTRIES = [
  { flag: '\u{1F1EC}\u{1F1E7}', code: '+44', name: 'GB' },
  { flag: '\u{1F1FA}\u{1F1F8}', code: '+1', name: 'US' },
  { flag: '\u{1F1EA}\u{1F1FA}', code: '+33', name: 'EU' },
];

const REFERRAL_RE = /^[A-Z0-9-]{6,12}$/;

export default function SignupScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { state, dispatch } = useWallet();
  const draft = state.signupDraft;

  const [method, setMethod] = useState<'phone' | 'email'>(draft.method ?? 'phone');
  const [phoneValue, setPhoneValue] = useState(
    draft.phoneE164 ? draft.phoneE164.replace(/^\+44/, '') : '',
  );
  const [emailValue, setEmailValue] = useState(draft.email ?? '');
  const [selectedCountry] = useState(COUNTRIES[0]);
  const [referralExpanded, setReferralExpanded] = useState(
    Boolean(draft.referralCode),
  );
  const [referralCode, setReferralCode] = useState(draft.referralCode ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // --- Legal documents -------------------------------------------------------
  // Same query key as `/legal/index.tsx` so the cache is shared across the app.
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

  const [accepted, setAccepted] = useState<Record<string, boolean>>(() => {
    // Pre-seed from the persisted draft so a returning user keeps their ticks.
    const seeded: Record<string, boolean> = {};
    for (const id of draft.acceptedConsentIds) {
      seeded[String(id)] = true;
    }
    return seeded;
  });
  const [marketingOptIn, setMarketingOptIn] = useState<boolean>(
    draft.marketingOptIn ?? false,
  );

  // Reconcile the acceptance map with the latest document set — drop entries
  // for documents that no longer appear, keep ticks for documents that do.
  useEffect(() => {
    if (documents.length === 0) return;
    setAccepted((prev) => {
      const next: Record<string, boolean> = {};
      for (const doc of documents) {
        next[doc.id] = prev[doc.id] ?? false;
      }
      return next;
    });
  }, [documents]);

  // Re-prefill referral if a deep link arrives mid-screen.
  useEffect(() => {
    if (draft.referralCode && draft.referralCode !== referralCode) {
      setReferralCode(draft.referralCode);
      setReferralExpanded(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.referralCode]);

  const formatUKPhone = (text: string): string => {
    const digits = text.replace(/\D/g, '').slice(0, 10);
    if (digits.length <= 4) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  };

  const handlePhoneChange = (text: string) => {
    let digits = text.replace(/\D/g, '');
    if (digits.startsWith('44')) digits = digits.slice(2);
    setPhoneValue(formatUKPhone(digits));
  };

  const buildPhoneE164 = (raw: string): string => {
    const digits = raw.replace(/\D/g, '');
    return digits.length > 0 ? `${selectedCountry.code}${digits}` : '';
  };

  const validate = (): { ok: boolean; phoneE164: string | null; email: string | null } => {
    const e: Record<string, string> = {};
    let phoneE164: string | null = null;
    let email: string | null = null;

    if (method === 'phone') {
      const candidate = buildPhoneE164(phoneValue);
      if (!isValidE164(candidate)) {
        e.phone = 'Enter a valid phone number';
      } else {
        phoneE164 = candidate;
      }
    } else if (!isValidEmail(emailValue.trim())) {
      e.email = 'Enter a valid email address';
    } else {
      email = emailValue.trim();
    }

    if (referralCode.trim() && !REFERRAL_RE.test(referralCode.trim())) {
      e.referral = 'Referral code looks invalid';
    }

    setErrors(e);
    return { ok: Object.keys(e).length === 0, phoneE164, email };
  };

  const requiredOk =
    sortedDocuments.length > 0 &&
    sortedDocuments
      .filter((d) => d.required)
      .every((d) => accepted[d.id]);

  const hasDocuments = sortedDocuments.length > 0;

  const contactValid =
    method === 'phone'
      ? phoneValue.replace(/\D/g, '').length >= 7
      : isValidEmail(emailValue.trim());

  // CTA enable rule: contact valid AND legal documents loaded AND all required
  // docs accepted. Loading and error states keep the CTA muted.
  const ctaDisabled =
    !contactValid ||
    legalQuery.loading ||
    !!legalQuery.error ||
    !hasDocuments ||
    !requiredOk;

  const toggleConsent = (id: string) => {
    setAccepted((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const openDocument = (doc: LegalDocumentListItem) => {
    // Most merchant docs (incl. all Tesco ones) are hosted externally —
    // contentMarkdown is null and url points at the canonical merchant page.
    // Open it directly in the in-app browser so the user can read and come
    // straight back to the form. Only fall back to the in-app viewer when
    // the doc is markdown-only.
    if (doc.url) {
      WebBrowser.openBrowserAsync(doc.url).catch(() => undefined);
      return;
    }
    router.push({ pathname: '/legal/[id]', params: { id: doc.id } });
  };

  const handleContinue = () => {
    if (ctaDisabled) return;
    const { ok, phoneE164, email } = validate();
    if (!ok) return;

    // Backend `consentedDocumentIds` items are typed as `integer`. The list
    // endpoint serialises ids as strings (project bigint-as-string convention)
    // — convert once at the boundary.
    const consentedDocumentIds = sortedDocuments
      .filter((d) => accepted[d.id])
      .map((d) => Number(d.id))
      .filter((n) => Number.isFinite(n));

    dispatch({
      type: 'AUTH/UPDATE_DRAFT',
      payload: {
        method,
        phoneE164,
        email,
        referralCode: referralCode.trim() || null,
        acceptedConsentIds: consentedDocumentIds,
        marketingOptIn,
      },
    });
    router.push('/(onboarding)/signup/profile');
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => {
              if (router.canGoBack()) router.back();
              else router.replace('/(onboarding)/intro');
            }}
          >
            <Text style={[styles.backText, { color: colors.primary }]}>{'← Back'}</Text>
          </TouchableOpacity>

          <Text style={[styles.title, { color: colors.text }]}>Create your Wallet Account</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Sign up to start earning cashback with Tesco Wallet.
          </Text>

          <View style={[styles.toggle, { backgroundColor: colors.surfaceAlt }]}>
            {(['phone', 'email'] as const).map((m) => (
              <TouchableOpacity
                key={m}
                style={[
                  styles.toggleBtn,
                  method === m && [
                    styles.toggleBtnActive,
                    { backgroundColor: colors.surface, shadowColor: colors.shadowColor },
                  ],
                ]}
                onPress={() => setMethod(m)}
              >
                <Text
                  style={[
                    styles.toggleText,
                    { color: colors.textSecondary },
                    method === m && { color: colors.text },
                  ]}
                >
                  {m === 'phone' ? 'Phone' : 'Email'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {method === 'phone' ? (
            <View>
              <View style={styles.phoneRow}>
                <View
                  style={[
                    styles.countryPicker,
                    { backgroundColor: colors.background, borderColor: colors.border },
                  ]}
                >
                  <Text style={styles.flag}>{selectedCountry.flag}</Text>
                  <Text style={[styles.countryCode, { color: colors.text }]}>
                    {selectedCountry.code}
                  </Text>
                  <ChevronDown size={14} color={colors.textSecondary} />
                </View>
                <TextInput
                  style={[
                    styles.phoneInput,
                    {
                      backgroundColor: colors.background,
                      borderColor: errors.phone ? colors.red : colors.border,
                      color: colors.text,
                    },
                  ]}
                  placeholder="7700 900 000"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="phone-pad"
                  textContentType="telephoneNumber"
                  autoComplete="tel"
                  value={phoneValue}
                  onChangeText={handlePhoneChange}
                />
              </View>
              {errors.phone && <Text style={[styles.errorText, { color: colors.red }]}>{errors.phone}</Text>}
            </View>
          ) : (
            <View>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    borderColor: errors.email ? colors.red : colors.border,
                    color: colors.text,
                  },
                ]}
                placeholder="Email address"
                placeholderTextColor={colors.textTertiary}
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
                autoCapitalize="none"
                value={emailValue}
                onChangeText={setEmailValue}
              />
              {errors.email && <Text style={[styles.errorText, { color: colors.red }]}>{errors.email}</Text>}
            </View>
          )}

          <TouchableOpacity
            style={styles.referralToggle}
            onPress={() => setReferralExpanded((v) => !v)}
          >
            <Text style={[styles.referralToggleText, { color: colors.primary }]}>
              Have a referral code?
            </Text>
            <ChevronRight
              size={16}
              color={colors.primary}
              style={{ transform: [{ rotate: referralExpanded ? '90deg' : '0deg' }] }}
            />
          </TouchableOpacity>

          {referralExpanded && (
            <View>
              <TextInput
                style={[
                  styles.input,
                  styles.referralInput,
                  {
                    backgroundColor: colors.background,
                    borderColor: errors.referral ? colors.red : colors.border,
                    color: colors.text,
                  },
                ]}
                placeholder="Enter referral code"
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="characters"
                value={referralCode}
                onChangeText={(v) => setReferralCode(v.toUpperCase())}
                maxLength={12}
              />
              {errors.referral && (
                <Text style={[styles.errorText, { color: colors.red }]}>{errors.referral}</Text>
              )}
            </View>
          )}

          {/* --- Legal documents ----------------------------------------- */}

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
              style={[
                styles.banner,
                { backgroundColor: colors.redLight, borderColor: colors.red },
              ]}
            >
              <Text style={[styles.bannerText, { color: colors.red }]}>
                We couldn&apos;t load the legal documents. Please check your connection and try again.
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
                styles.banner,
                { backgroundColor: colors.amberLight, borderColor: colors.amber },
              ]}
            >
              <Text style={[styles.bannerText, { color: colors.amber }]}>
                Legal documents are not available — please try again later.
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

          {sortedDocuments.map((doc) => {
            const label = TYPE_LABEL[doc.type] ?? doc.title;
            const optional = !doc.required;
            return (
              <Pressable
                key={doc.id}
                style={styles.consentRow}
                onPress={() => toggleConsent(doc.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: !!accepted[doc.id] }}
                accessibilityLabel={`I agree to the ${label}${optional ? ', optional' : ''}`}
              >
                <Checkbox
                  checked={!!accepted[doc.id]}
                  onToggle={() => toggleConsent(doc.id)}
                  accessibilityLabel={label}
                />
                <Text style={[styles.consentText, { color: colors.text }]}>
                  I agree to the{' '}
                  <Text
                    style={[styles.consentLink, { color: colors.primary }]}
                    onPress={() => openDocument(doc)}
                  >
                    {label}
                  </Text>
                  {optional && (
                    <Text style={{ color: colors.textTertiary }}> (optional)</Text>
                  )}
                </Text>
              </Pressable>
            );
          })}

          {/* --- Marketing as inline optional row -------------------------- */}
          {hasDocuments && (
            <Pressable
              style={styles.consentRow}
              onPress={() => setMarketingOptIn((v) => !v)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: marketingOptIn }}
              accessibilityLabel="I agree to receive marketing communications, optional"
            >
              <Checkbox
                checked={marketingOptIn}
                onToggle={() => setMarketingOptIn((v) => !v)}
                accessibilityLabel="Marketing communications"
              />
              <Text style={[styles.consentText, { color: colors.text }]}>
                I agree to receive marketing communications
                <Text style={{ color: colors.textTertiary }}> (optional)</Text>
              </Text>
            </Pressable>
          )}

          <TouchableOpacity
            style={[
              styles.primaryBtn,
              { backgroundColor: colors.primary },
              ctaDisabled && styles.primaryBtnDisabled,
            ]}
            onPress={handleContinue}
            disabled={ctaDisabled}
            accessibilityState={{ disabled: ctaDisabled }}
          >
            <Text style={styles.primaryBtnText}>Agree and continue</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, padding: 24, paddingBottom: 64 },
  backBtn: { marginBottom: 24 },
  backText: { fontSize: 18, fontFamily: 'Inter-Medium' },
  title: { fontSize: 30, fontFamily: 'Inter-Bold', marginBottom: 8, letterSpacing: -0.5 },
  subtitle: { fontSize: 17, fontFamily: 'Inter-Regular', marginBottom: 28, lineHeight: 22 },
  toggle: { flexDirection: 'row', borderRadius: 12, padding: 4, marginBottom: 20 },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  toggleBtnActive: { shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  toggleText: { fontSize: 16, fontFamily: 'Inter-Medium' },
  phoneRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  countryPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  flag: { fontSize: 22 },
  countryCode: { fontSize: 16, fontFamily: 'Inter-Medium' },
  phoneInput: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 17,
    fontFamily: 'Inter-Regular',
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 17,
    marginBottom: 8,
    fontFamily: 'Inter-Regular',
  },
  referralToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 16,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  referralToggleText: { fontSize: 16, fontFamily: 'Inter-Medium' },
  referralInput: { marginTop: 0 },
  errorText: { fontSize: 14, fontFamily: 'Inter-Regular', marginBottom: 4 },
  banner: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 16, gap: 6 },
  bannerText: { fontSize: 15, fontFamily: 'Inter-Medium' },
  retryBtn: { alignSelf: 'flex-start', paddingVertical: 4 },
  retryText: { fontSize: 15, fontFamily: 'Inter-SemiBold' },
  loading: { paddingVertical: 16, alignItems: 'center', gap: 8 },
  loadingText: { fontSize: 15, fontFamily: 'Inter-Regular' },
  consentRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  consentText: { flex: 1, fontSize: 16, fontFamily: 'Inter-Regular', lineHeight: 22 },
  consentLink: { fontFamily: 'Inter-Medium', textDecorationLine: 'underline' },
  primaryBtn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 16 },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { fontSize: 18, fontFamily: 'Inter-SemiBold', color: '#fff' },
});
