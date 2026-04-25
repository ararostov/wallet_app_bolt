// Add payment method — TrueLayer Open Banking hosted-consent flow
// (spec 04 §4.2 / §6, tech-debt §2.2).
//
// State machine:
//   idle → initializing → redirecting → creating → success
//                                    └→ failure (with retry)
//                                    └→ cancelled (back to /payment-methods)
//
// CRITICAL: this screen never sees PAN/CVV/expiry/banking credentials. The
// customer authorises the bank consent inside `WebBrowser.openAuthSessionAsync`;
// only the opaque PSP-returned `code` (TrueLayer authorization code) and
// `state` (TrueLayer session id) reach our backend in `POST /payment-methods`.
//
// On mount we initialise the TrueLayer session immediately and open the
// hosted consent page — no in-app channel-choice step (Adyen branches
// removed per tech-debt §2.2).

import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { ArrowLeft, Building2, ShieldCheck } from 'lucide-react-native';

import { useTheme } from '@/context/ThemeContext';
import { useCreatePaymentMethod } from '@/hooks/useCreatePaymentMethod';
import { useInitPaymentMethodSession } from '@/hooks/useInitPaymentMethodSession';
import type { CreatePaymentMethodRequest } from '@/types/paymentMethods';
import { ApiError, mapErrorCode } from '@/utils/errors';
import { logError, logEvent } from '@/utils/logger';

type Phase =
  | { kind: 'initializing' }
  | { kind: 'redirecting' }
  | { kind: 'creating' }
  | { kind: 'failure'; message: string; code?: string };

type ParamMap = Record<string, string | string[] | undefined>;

const RETURN_PATH = 'payment-methods/return';
const CHANNEL = 'truelayer_open_banking' as const;

function asString(value: unknown): string | null {
  if (typeof value === 'string' && value.length > 0) return value;
  if (Array.isArray(value)) {
    const first = value.find((v): v is string => typeof v === 'string' && v.length > 0);
    return first ?? null;
  }
  return null;
}

// TrueLayer redirects back with `code` (authorization code, opaque PSP token)
// and `state` (echoed session id). Some integrations also surface
// `accountId` when the bank pre-discloses the selected account; backend can
// use it to skip a follow-up account lookup.
function buildCreatePayload(
  params: ParamMap,
  setAsDefault: boolean,
  sessionId: string,
): CreatePaymentMethodRequest | null {
  const code = asString(params.code);
  const state = asString(params.state) ?? sessionId;
  const accountId =
    asString(params.accountId) ?? asString(params.account_id);
  if (!code) return null;
  return {
    channel: CHANNEL,
    pspToken: code,
    pspSessionId: state,
    trueLayerAccountId: accountId,
    setAsDefault,
  };
}

export default function AddPaymentMethodScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const initSession = useInitPaymentMethodSession();
  const createMethod = useCreatePaymentMethod();

  const [phase, setPhase] = useState<Phase>({ kind: 'initializing' });
  const [setAsDefault, setSetAsDefault] = useState<boolean>(false);
  // Mount-stable return URL — Linking.createURL is pure but we cache to keep
  // a single value across re-renders.
  const returnUrlRef = useRef<string>(Linking.createURL(RETURN_PATH));
  // Guard against double-launch under React 18 strict-mode dev re-mount.
  const startedRef = useRef<boolean>(false);

  // Warm up the in-app browser so the first launch is snappy on Android.
  useEffect(() => {
    void WebBrowser.warmUpAsync().catch(() => undefined);
    return () => {
      void WebBrowser.coolDownAsync().catch(() => undefined);
    };
  }, []);

  const start = async (): Promise<void> => {
    logEvent('pm_add_started', { channel: CHANNEL });
    setPhase({ kind: 'initializing' });

    let initData;
    try {
      initData = await initSession.mutate({
        channel: CHANNEL,
        returnUrl: returnUrlRef.current,
        locale: 'en-GB',
      });
    } catch (e) {
      const message =
        e instanceof ApiError
          ? mapErrorCode(e.code) ?? e.message
          : "Couldn't reach the payment provider. Please try again.";
      const code = e instanceof ApiError ? e.code : undefined;
      logError(e, { where: 'pm_add_init', channel: CHANNEL });
      setPhase({ kind: 'failure', message, code });
      return;
    }

    const launchUrl = initData.authorizationUrl;
    if (!launchUrl) {
      logError(new Error('No authorizationUrl from /payment-methods/init'), {
        channel: CHANNEL,
      });
      setPhase({
        kind: 'failure',
        message:
          "We couldn't start the secure consent page. Please try again later.",
      });
      return;
    }

    setPhase({ kind: 'redirecting' });

    let result: WebBrowser.WebBrowserAuthSessionResult;
    try {
      result = await WebBrowser.openAuthSessionAsync(
        launchUrl,
        returnUrlRef.current,
        { showInRecents: false, preferEphemeralSession: true },
      );
    } catch (e) {
      logError(e, { where: 'pm_add_browser', channel: CHANNEL });
      setPhase({
        kind: 'failure',
        message: "We couldn't open the secure consent page.",
      });
      return;
    }

    if (result.type !== 'success' || !result.url) {
      logEvent('pm_add_cancelled', { channel: CHANNEL, type: result.type });
      // User backed out — return to list quietly.
      router.replace('/payment-methods');
      return;
    }

    const parsed = Linking.parse(result.url);
    const params: ParamMap = parsed.queryParams ?? {};
    const payload = buildCreatePayload(params, setAsDefault, initData.sessionId);
    if (!payload) {
      logEvent('pm_add_incomplete_return', {
        channel: CHANNEL,
        params: Object.keys(params),
      });
      setPhase({
        kind: 'failure',
        message: 'Setup incomplete. Please try again.',
      });
      return;
    }

    setPhase({ kind: 'creating' });
    try {
      const response = await createMethod.mutate(payload);
      logEvent('pm_add_completed', {
        channel: CHANNEL,
        paymentMethodId: response.paymentMethod.id,
      });
      Alert.alert(
        'Payment method added',
        `${response.paymentMethod.bankName ?? 'Bank account'} is ready to use.`,
      );
      router.replace('/payment-methods');
    } catch (e) {
      const code = e instanceof ApiError ? e.code : undefined;
      const message =
        e instanceof ApiError
          ? mapErrorCode(e.code) ?? e.message
          : 'Could not save this method. Please try again.';
      // Duplicate token is a soft-success — the existing record is already
      // visible on the list. Bounce back rather than show a hard error.
      if (code === 'PAYMENT_METHOD_DUPLICATE_TOKEN') {
        Alert.alert("You've already added this method.", '', [
          { text: 'OK', onPress: () => router.replace('/payment-methods') },
        ]);
        return;
      }
      logError(e, { where: 'pm_add_create', channel: CHANNEL });
      setPhase({ kind: 'failure', message, code });
    }
  };

  // Auto-launch the consent flow on mount. The screen has no idle UI — it's
  // a pure state-machine bridge between the list screen and the bank.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isBusy =
    phase.kind === 'initializing' ||
    phase.kind === 'redirecting' ||
    phase.kind === 'creating';

  return (
    <SafeAreaView
      edges={['left', 'right']}
      style={[styles.safe, { backgroundColor: colors.background }]}
    >
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
            paddingTop: insets.top + 14,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          disabled={isBusy}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ArrowLeft
            size={22}
            color={isBusy ? colors.textTertiary : colors.text}
          />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>
          Add bank account
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={[
            styles.heroIcon,
            { backgroundColor: isDark ? colors.surfaceAlt : colors.primaryLight },
          ]}
        >
          <Building2 size={28} color={colors.primary} />
        </View>

        <Text style={[styles.intro, { color: colors.textSecondary }]}>
          We use Open Banking to link your bank account. You'll authorise the
          connection in your bank's app or website — we never see your
          credentials.
        </Text>

        <View
          style={[
            styles.defaultRow,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.defaultLabel, { color: colors.text }]}>
              Set as default
            </Text>
            <Text
              style={[styles.defaultHint, { color: colors.textTertiary }]}
            >
              Use this method first for top-ups and auto top-up.
            </Text>
          </View>
          <Switch
            value={setAsDefault}
            onValueChange={setSetAsDefault}
            disabled={isBusy}
            accessibilityLabel="Set as default payment method"
          />
        </View>

        <View
          style={[
            styles.security,
            { backgroundColor: isDark ? colors.surfaceAlt : colors.greenLight },
          ]}
        >
          <ShieldCheck size={18} color={colors.green} />
          <Text style={[styles.securityText, { color: colors.green }]}>
            Secured by TrueLayer Open Banking. We never store your banking
            credentials.
          </Text>
        </View>

        {phase.kind === 'failure' && (
          <View
            style={[
              styles.failureBanner,
              { backgroundColor: colors.redLight },
            ]}
          >
            <Text style={[styles.failureText, { color: colors.red }]}>
              {phase.message}
            </Text>
            <View style={styles.failureActions}>
              <TouchableOpacity
                onPress={() => router.replace('/payment-methods')}
                accessibilityRole="button"
              >
                <Text style={[styles.failureCancel, { color: colors.red }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => void start()}
                accessibilityRole="button"
              >
                <Text style={[styles.failureRetry, { color: colors.red }]}>
                  Try again
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {(phase.kind === 'initializing' ||
        phase.kind === 'redirecting' ||
        phase.kind === 'creating') && (
        <View style={styles.fullScreenSpinner} pointerEvents="auto">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.spinnerText, { color: colors.text }]}>
            {phase.kind === 'creating' ? 'Saving…' : 'Connecting…'}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 19, fontFamily: 'Inter-SemiBold' },
  scroll: { padding: 16, gap: 12 },

  heroIcon: {
    alignSelf: 'center',
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    marginBottom: 8,
  },

  intro: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 8,
  },

  defaultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 8,
  },
  defaultLabel: { fontSize: 16, fontFamily: 'Inter-SemiBold' },
  defaultHint: { fontSize: 13, fontFamily: 'Inter-Regular', marginTop: 2 },

  security: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  securityText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    lineHeight: 18,
  },

  failureBanner: {
    padding: 14,
    borderRadius: 12,
    marginTop: 12,
    gap: 12,
  },
  failureText: { fontSize: 14, fontFamily: 'Inter-Regular' },
  failureActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16 },
  failureCancel: { fontSize: 14, fontFamily: 'Inter-SemiBold' },
  failureRetry: { fontSize: 14, fontFamily: 'Inter-SemiBold' },

  fullScreenSpinner: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  spinnerText: { fontSize: 16, fontFamily: 'Inter-SemiBold' },
});
