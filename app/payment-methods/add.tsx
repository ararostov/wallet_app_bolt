// Add payment method — PSP-safe hosted-page flow (spec 04 §4.2 / §6).
//
// State machine:
//   idle → initializing → redirecting → return-handling → creating → success
//                                    └→ failure (with retry)
//                                    └→ cancelled (back to idle)
//
// CRITICAL: this screen contains zero PAN/CVV/expiry inputs. Card data is
// captured by Adyen Drop-in inside `WebBrowser.openAuthSessionAsync`; bank
// consent by TrueLayer the same way. Only the opaque PSP-returned token
// reaches our backend in `POST /payment-methods`.

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
import {
  ArrowLeft,
  Building2,
  ChevronRight,
  CreditCard,
  ShieldCheck,
} from 'lucide-react-native';

import { useTheme } from '@/context/ThemeContext';
import { useCreatePaymentMethod } from '@/hooks/useCreatePaymentMethod';
import { useInitPaymentMethodSession } from '@/hooks/useInitPaymentMethodSession';
import type {
  CreatePaymentMethodRequest,
  PaymentMethodChannel,
} from '@/types/paymentMethods';
import { ApiError, mapErrorCode } from '@/utils/errors';
import { logError, logEvent } from '@/utils/logger';

type Phase =
  | { kind: 'idle' }
  | { kind: 'initializing'; channel: PaymentMethodChannel }
  | { kind: 'redirecting'; channel: PaymentMethodChannel }
  | { kind: 'creating'; channel: PaymentMethodChannel }
  | {
      kind: 'failure';
      channel: PaymentMethodChannel;
      message: string;
      code?: string;
    };

type ParamMap = Record<string, string | string[] | undefined>;

const RETURN_PATH = 'payment-methods/return';

function asString(value: unknown): string | null {
  if (typeof value === 'string' && value.length > 0) return value;
  if (Array.isArray(value)) {
    const first = value.find((v): v is string => typeof v === 'string' && v.length > 0);
    return first ?? null;
  }
  return null;
}

function buildCreatePayload(
  channel: PaymentMethodChannel,
  params: ParamMap,
  setAsDefault: boolean,
  sessionId: string,
): CreatePaymentMethodRequest | null {
  if (channel === 'truelayer_open_banking') {
    const code = asString(params.code);
    const state = asString(params.state) ?? sessionId;
    const accountId =
      asString(params.accountId) ?? asString(params.account_id);
    if (!code) return null;
    return {
      channel,
      pspToken: code,
      pspSessionId: state,
      trueLayerAccountId: accountId,
      setAsDefault,
    };
  }
  // adyen_card / adyen_apple_pay / adyen_google_pay — PSP token comes back
  // either as `redirectResult` (3DS callback style) or `sessionResult`
  // (Drop-in completion). Backend treats both as the opaque pspToken.
  const token =
    asString(params.redirectResult) ??
    asString(params.sessionResult) ??
    asString(params.resultCode);
  if (!token) return null;
  return {
    channel,
    pspToken: token,
    pspSessionId: asString(params.sessionId) ?? sessionId,
    setAsDefault,
  };
}

export default function AddPaymentMethodScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const initSession = useInitPaymentMethodSession();
  const createMethod = useCreatePaymentMethod();

  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [setAsDefault, setSetAsDefault] = useState<boolean>(false);
  // Mount-stable return URL — Linking.createURL is pure but we cache to keep
  // a single value across re-renders.
  const returnUrlRef = useRef<string>(Linking.createURL(RETURN_PATH));

  // Warm up the in-app browser so the first launch is snappy on Android.
  useEffect(() => {
    void WebBrowser.warmUpAsync().catch(() => undefined);
    return () => {
      void WebBrowser.coolDownAsync().catch(() => undefined);
    };
  }, []);

  const start = async (channel: PaymentMethodChannel): Promise<void> => {
    logEvent('pm_add_started', { channel });
    setPhase({ kind: 'initializing', channel });

    let initData;
    try {
      initData = await initSession.mutate({
        channel,
        returnUrl: returnUrlRef.current,
        locale: 'en-GB',
      });
    } catch (e) {
      const message =
        e instanceof ApiError
          ? mapErrorCode(e.code) ?? e.message
          : "Couldn't reach the payment provider. Please try again.";
      const code = e instanceof ApiError ? e.code : undefined;
      logError(e, { where: 'pm_add_init', channel });
      setPhase({ kind: 'failure', channel, message, code });
      return;
    }

    const launchUrl =
      channel === 'truelayer_open_banking'
        ? initData.authorizationUrl
        : initData.hostedPaymentPageUrl ?? initData.authorizationUrl;

    if (!launchUrl) {
      logError(new Error('No launch URL from /payment-methods/init'), {
        channel,
      });
      setPhase({
        kind: 'failure',
        channel,
        message:
          "We couldn't start the secure payment page. Please try again later.",
      });
      return;
    }

    setPhase({ kind: 'redirecting', channel });

    let result: WebBrowser.WebBrowserAuthSessionResult;
    try {
      result = await WebBrowser.openAuthSessionAsync(
        launchUrl,
        returnUrlRef.current,
        { showInRecents: false, preferEphemeralSession: true },
      );
    } catch (e) {
      logError(e, { where: 'pm_add_browser', channel });
      setPhase({
        kind: 'failure',
        channel,
        message: "We couldn't open the secure payment page.",
      });
      return;
    }

    if (result.type !== 'success' || !result.url) {
      logEvent('pm_add_cancelled', { channel, type: result.type });
      // User backed out — return to idle without an error toast.
      setPhase({ kind: 'idle' });
      return;
    }

    const parsed = Linking.parse(result.url);
    const params: ParamMap = parsed.queryParams ?? {};
    const payload = buildCreatePayload(
      channel,
      params,
      setAsDefault,
      initData.sessionId,
    );
    if (!payload) {
      logEvent('pm_add_incomplete_return', {
        channel,
        params: Object.keys(params),
      });
      setPhase({
        kind: 'failure',
        channel,
        message: 'Setup incomplete. Please try again.',
      });
      return;
    }

    setPhase({ kind: 'creating', channel });
    try {
      const response = await createMethod.mutate(payload);
      logEvent('pm_add_completed', {
        channel,
        paymentMethodId: response.paymentMethod.id,
      });
      Alert.alert(
        'Payment method added',
        `${response.paymentMethod.bankName ?? response.paymentMethod.brand ?? 'Method'} is ready to use.`,
      );
      router.replace('/payment-methods');
    } catch (e) {
      const code = e instanceof ApiError ? e.code : undefined;
      const message =
        e instanceof ApiError
          ? mapErrorCode(e.code) ?? e.message
          : 'Could not save this method. Please try again.';
      // Duplicate token is a soft-success — refetch on the list will show
      // the existing record. Bounce back rather than showing a hard error.
      if (code === 'PAYMENT_METHOD_DUPLICATE_TOKEN') {
        Alert.alert("You've already added this method.", '', [
          { text: 'OK', onPress: () => router.replace('/payment-methods') },
        ]);
        return;
      }
      logError(e, { where: 'pm_add_create', channel });
      setPhase({ kind: 'failure', channel, message, code });
    }
  };

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
          Add payment method
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
        <Text style={[styles.intro, { color: colors.textSecondary }]}>
          Choose how you'd like to pay. Your details are handled securely by
          our payment provider — we never see your card number or banking
          credentials.
        </Text>

        <ChannelChoice
          icon={CreditCard}
          title="Debit or credit card"
          subtitle="Visa, Mastercard"
          disabled={isBusy}
          loading={
            phase.kind !== 'idle' &&
            phase.kind !== 'failure' &&
            phase.channel.startsWith('adyen_')
          }
          onPress={() => void start('adyen_card')}
        />
        <ChannelChoice
          icon={Building2}
          title="Bank transfer"
          subtitle="Pay with your bank via Open Banking"
          disabled={isBusy}
          loading={
            phase.kind !== 'idle' &&
            phase.kind !== 'failure' &&
            phase.channel === 'truelayer_open_banking'
          }
          onPress={() => void start('truelayer_open_banking')}
        />

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
            Secured by Adyen and TrueLayer. We never store card details.
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
                onPress={() => setPhase({ kind: 'idle' })}
                accessibilityRole="button"
              >
                <Text style={[styles.failureCancel, { color: colors.red }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => void start(phase.channel)}
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

      {phase.kind === 'creating' && (
        <View style={styles.fullScreenSpinner} pointerEvents="auto">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.spinnerText, { color: colors.text }]}>
            Connecting…
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

interface ChannelChoiceProps {
  icon: typeof CreditCard;
  title: string;
  subtitle: string;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
}

function ChannelChoice({
  icon: Icon,
  title,
  subtitle,
  loading,
  disabled,
  onPress,
}: ChannelChoiceProps) {
  const { colors, isDark } = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.choice,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        disabled && !loading && { opacity: 0.5 },
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${subtitle}`}
      accessibilityHint="Opens secure payment provider"
    >
      <View
        style={[
          styles.choiceIcon,
          { backgroundColor: isDark ? colors.surfaceAlt : colors.primaryLight },
        ]}
      >
        <Icon size={22} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.choiceTitle, { color: colors.text }]}>{title}</Text>
        <Text
          style={[styles.choiceSubtitle, { color: colors.textTertiary }]}
        >
          {subtitle}
        </Text>
      </View>
      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <ChevronRight size={20} color={colors.textTertiary} />
      )}
    </TouchableOpacity>
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

  intro: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
    marginBottom: 8,
  },

  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  choiceIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceTitle: { fontSize: 17, fontFamily: 'Inter-SemiBold' },
  choiceSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginTop: 2,
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
