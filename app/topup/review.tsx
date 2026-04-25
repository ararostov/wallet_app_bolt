// Top-up review & submit — spec 05-topup §4.2.
//
// State machine:
//   idle → submitting → completed (router.replace -> result)
//                    → pending   (router.replace -> result, status polled)
//                    → action_required (WebBrowser → result)
//                    → failed    (inline error, retry with same key)
//
// Idempotency-Key is owned by this screen via useRef and is rotated whenever
// the route's `amountMinor` or `paymentMethodId` changes. The same key is
// reused across:
//   - automatic retries inside useInitiateTopup (502/503/504),
//   - the "Retry" CTA after a 5xx / network error,
//   - the WebBrowser return path (we never re-issue POST /wallet/topup after
//     a successful redirect — only poll).

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import * as Haptics from 'expo-haptics';
import { ArrowRight, X } from 'lucide-react-native';

import { useTheme } from '@/context/ThemeContext';
import { useWallet } from '@/context/WalletContext';
import { useInitiateTopup } from '@/hooks/useInitiateTopup';
import type {
  PaymentMethod as ApiPaymentMethod,
} from '@/types/paymentMethods';
import type { TopupInitiationResponse } from '@/types/topup';
import { ApiError, NetworkError, mapErrorCode } from '@/utils/errors';
import { formatMoney } from '@/utils/format';
import { newIdempotencyKey } from '@/utils/idempotency';
import { logError, logEvent } from '@/utils/logger';

const RETURN_PATH = 'topup/return';

function paymentMethodLabel(method: ApiPaymentMethod): string {
  if (method.type === 'apple_pay') return 'Apple Pay';
  if (method.type === 'google_pay') return 'Google Pay';
  if (method.type === 'open_banking') {
    return method.bankName
      ? `${method.bankName} (Open Banking)`
      : 'Pay by Bank';
  }
  const brand = method.brand ?? 'Card';
  const last4 = method.panLast4 ?? '••••';
  return `${brand} ••${last4}`;
}

interface InlineError {
  code: string;
  message: string;
}

export default function TopupReviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { state, dispatch } = useWallet();

  const params = useLocalSearchParams<{
    amountMinor?: string;
    currency?: string;
    paymentMethodId?: string;
  }>();

  const amountMinor = useMemo(() => {
    const raw = params.amountMinor ?? '0';
    const n = Number(raw);
    return Number.isFinite(n) ? Math.floor(n) : 0;
  }, [params.amountMinor]);
  const currency = params.currency ?? state.walletApi?.currency ?? 'GBP';
  const paymentMethodId = params.paymentMethodId ?? '';

  // Idempotency-Key — rotated whenever the logical request changes
  // (different amount or different payment method). Reused on every retry of
  // the same logical request, including the user-driven "Retry" CTA below.
  const idempotencyKeyRef = useRef<string>(newIdempotencyKey());
  const lastSignatureRef = useRef<string>(`${amountMinor}|${paymentMethodId}`);
  useEffect(() => {
    const signature = `${amountMinor}|${paymentMethodId}`;
    if (signature !== lastSignatureRef.current) {
      idempotencyKeyRef.current = newIdempotencyKey();
      lastSignatureRef.current = signature;
    }
  }, [amountMinor, paymentMethodId]);

  // Mount-stable return URL — shared by every redirect this screen triggers.
  const returnUrlRef = useRef<string>(Linking.createURL(RETURN_PATH));

  const initiate = useInitiateTopup();

  const [inlineError, setInlineError] = useState<InlineError | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Warm up the in-app browser so the first launch is snappy on Android.
  useEffect(() => {
    void WebBrowser.warmUpAsync().catch(() => undefined);
    return () => {
      void WebBrowser.coolDownAsync().catch(() => undefined);
    };
  }, []);

  const selectedMethod = useMemo<ApiPaymentMethod | undefined>(() => {
    const list = state.paymentMethodsApi ?? [];
    return list.find((m) => m.id === paymentMethodId);
  }, [state.paymentMethodsApi, paymentMethodId]);

  // Optimistic preview values. Cashback is best-effort — backend has the
  // authoritative rate. Skip the row entirely when we don't know the rate.
  const cashbackBps = state.tierApi?.currentCashbackRateBps ?? null;
  const cashbackMinor =
    cashbackBps !== null
      ? Math.floor((amountMinor * cashbackBps) / 10000)
      : null;

  const isBonusPending =
    state.wallet.bonusState === 'pending' || state.wallet.bonusState === 'progress';
  const bonusTargetMinor = state.wallet.topUpTarget * 100;
  const bonusAmountMinor = state.wallet.bonusAmount * 100;
  const willUnlockBonus = isBonusPending && amountMinor >= bonusTargetMinor;
  const bonusMinor = willUnlockBonus ? bonusAmountMinor : 0;

  const currentBalanceMinor = state.walletApi?.balance.amountMinor ?? null;
  const newBalanceMinor =
    currentBalanceMinor !== null
      ? currentBalanceMinor + amountMinor + bonusMinor
      : null;

  // Handle a TopupInitiationResponse — branches into nav / WebBrowser as
  // appropriate. Does NOT update wallet state for non-completed outcomes.
  const handleResponse = async (
    response: TopupInitiationResponse,
  ): Promise<void> => {
    switch (response.status) {
      case 'completed': {
        if (response.walletBalance) {
          dispatch({
            type: 'WALLET/SET_BALANCE',
            payload: {
              available: response.walletBalance.available,
              pending: response.walletBalance.pending,
              status: response.walletBalance.status,
            },
          });
        }
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
        router.replace({
          pathname: '/topup/result',
          params: { paymentOrderId: response.paymentOrderId },
        });
        return;
      }

      case 'pending': {
        router.replace({
          pathname: '/topup/result',
          params: { paymentOrderId: response.paymentOrderId },
        });
        return;
      }

      case 'action_required': {
        if (!response.redirectUrl) {
          // TrueLayer Open Banking always returns a redirect URL for the
          // bank consent flow (tech-debt §2.2). Reaching this branch means
          // backend emitted action_required without a URL — recoverable,
          // ask the customer to retry.
          setInlineError({
            code: 'ACTION_REQUIRED_NO_REDIRECT',
            message:
              'We could not start the bank consent page. Please try again.',
          });
          void Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Warning,
          );
          return;
        }

        try {
          const browserResult = await WebBrowser.openAuthSessionAsync(
            response.redirectUrl,
            returnUrlRef.current,
            { showInRecents: false, preferEphemeralSession: true },
          );
          logEvent('topup_browser_result', {
            type: browserResult.type,
            paymentOrderId: response.paymentOrderId,
          });
        } catch (e) {
          logError(e, {
            where: 'topup_browser',
            paymentOrderId: response.paymentOrderId,
          });
        }
        // Whether the browser closed via success / dismiss / cancel, the
        // payment order exists on the backend and the result screen will
        // poll status to disambiguate.
        router.replace({
          pathname: '/topup/result',
          params: { paymentOrderId: response.paymentOrderId },
        });
        return;
      }

      case 'failed':
      case 'cancelled': {
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Warning,
        );
        router.replace({
          pathname: '/topup/result',
          params: { paymentOrderId: response.paymentOrderId },
        });
        return;
      }
    }
  };

  const handleSubmit = async (): Promise<void> => {
    if (submitting) return;
    if (!selectedMethod) {
      setInlineError({
        code: 'PAYMENT_METHOD_NOT_FOUND',
        message:
          mapErrorCode('PAYMENT_METHOD_NOT_FOUND') ??
          'Payment method unavailable.',
      });
      return;
    }
    setInlineError(null);
    setSubmitting(true);
    try {
      const response = await initiate.mutate({
        payload: {
          amount: { amountMinor, currency },
          paymentMethodId,
          returnUrl: returnUrlRef.current,
        },
        idempotencyKey: idempotencyKeyRef.current,
      });
      await handleResponse(response);
    } catch (e) {
      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Warning,
      );
      if (e instanceof ApiError) {
        if (e.code === 'IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD') {
          // Defensive rotation — should not happen unless body drifted while
          // the key stayed put. Do not auto-retry; the next user-driven
          // submit picks up the new key.
          idempotencyKeyRef.current = newIdempotencyKey();
        }
        setInlineError({
          code: e.code,
          message: mapErrorCode(e.code) ?? e.message,
        });
      } else if (e instanceof NetworkError) {
        setInlineError({
          code: 'NETWORK',
          message: 'Check your connection and try again.',
        });
      } else {
        logError(e, { where: 'topup_submit' });
        setInlineError({
          code: 'SERVER_ERROR',
          message:
            mapErrorCode('SERVER_ERROR') ??
            'Something went wrong on our side. Please try again.',
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const methodLabel = selectedMethod
    ? paymentMethodLabel(selectedMethod)
    : 'Payment method unavailable';

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
            paddingTop: insets.top + 16,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          disabled={submitting}
          accessibilityRole="button"
          accessibilityLabel="Cancel review"
        >
          <X size={22} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Review</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.container}>
        <View
          style={[
            styles.payGetCard,
            { backgroundColor: colors.surface, shadowColor: colors.shadowColor },
          ]}
        >
          <View style={styles.payGetSide}>
            <Text style={[styles.payGetLabel, { color: colors.textSecondary }]}>
              You Pay
            </Text>
            <Text style={[styles.payGetAmount, { color: colors.text }]}>
              {formatMoney(amountMinor, currency)}
            </Text>
          </View>
          <ArrowRight
            size={22}
            color={colors.textTertiary}
            style={styles.payGetArrow}
          />
          <View style={styles.payGetSide}>
            <Text style={[styles.payGetLabel, { color: colors.textSecondary }]}>
              You Get
            </Text>
            <Text style={[styles.payGetAmount, { color: colors.text }]}>
              {formatMoney(amountMinor + (cashbackMinor ?? 0), currency)}
            </Text>
            {cashbackMinor !== null && cashbackMinor > 0 && (
              <Text style={styles.payGetCashback}>
                +{formatMoney(cashbackMinor, currency)} cashback
              </Text>
            )}
          </View>
        </View>

        <View
          style={[
            styles.summaryCard,
            { backgroundColor: colors.surface, shadowColor: colors.shadowColor },
          ]}
        >
          <SummaryRow
            label="You pay"
            value={formatMoney(amountMinor, currency)}
            bold
            colors={colors}
          />
          <SummaryRow label="Payment method" value={methodLabel} colors={colors} />
          <SummaryRow label="Fee" value="Free" colors={colors} />
          {cashbackMinor !== null && cashbackMinor > 0 && (
            <SummaryRow
              label="Expected cashback"
              value={`+${formatMoney(cashbackMinor, currency)}`}
              green
              colors={colors}
            />
          )}
          {willUnlockBonus && (
            <SummaryRow
              label="Welcome bonus"
              value={`+${formatMoney(bonusMinor, currency)}`}
              green
              colors={colors}
            />
          )}
          {newBalanceMinor !== null && (
            <SummaryRow
              label="New balance"
              value={formatMoney(newBalanceMinor, currency)}
              bold
              colors={colors}
            />
          )}
        </View>

        {inlineError !== null && (
          <View
            style={[styles.errorBanner, { backgroundColor: colors.redLight }]}
            accessibilityLiveRegion="polite"
          >
            <Text style={[styles.errorBannerText, { color: colors.red }]}>
              {inlineError.message}
            </Text>
          </View>
        )}
      </View>

      <View
        style={[
          styles.footer,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom + 8,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.primaryBtn,
            { backgroundColor: colors.primary },
            (submitting || !selectedMethod) && styles.primaryBtnDisabled,
          ]}
          onPress={() => void handleSubmit()}
          disabled={submitting || !selectedMethod}
          accessibilityRole="button"
          accessibilityLabel={`Confirm top-up of ${formatMoney(amountMinor, currency)}`}
          accessibilityState={{ busy: submitting, disabled: !selectedMethod }}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>
              Pay {formatMoney(amountMinor, currency)}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

interface SummaryRowProps {
  label: string;
  value: string;
  bold?: boolean;
  green?: boolean;
  colors: ReturnType<typeof useTheme>['colors'];
}

function SummaryRow({ label, value, bold, green, colors }: SummaryRowProps) {
  return (
    <View style={[styles.summaryRow, { borderBottomColor: colors.borderLight }]}>
      <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
        {label}
      </Text>
      <Text
        style={[
          styles.summaryValue,
          { color: colors.text },
          bold && { fontFamily: 'Inter-SemiBold', color: colors.text },
          green && styles.summaryValueGreen,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: { fontSize: 19, fontFamily: 'Inter-SemiBold' },
  container: { flex: 1, padding: 16, gap: 16 },
  payGetCard: {
    borderRadius: 20,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  payGetSide: { flex: 1, alignItems: 'center', gap: 4 },
  payGetLabel: { fontSize: 15, fontFamily: 'Inter-Medium' },
  payGetAmount: {
    fontSize: 30,
    fontFamily: 'Inter-Bold',
    letterSpacing: -1,
  },
  payGetCashback: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#059669',
  },
  payGetArrow: { marginTop: 20 },
  summaryCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  summaryLabel: { fontSize: 16, fontFamily: 'Inter-Regular' },
  summaryValue: { fontSize: 16, fontFamily: 'Inter-Medium' },
  summaryValueGreen: { color: '#059669', fontFamily: 'Inter-SemiBold' },
  errorBanner: { padding: 14, borderRadius: 12 },
  errorBannerText: { fontSize: 14, fontFamily: 'Inter-Medium', lineHeight: 20 },
  footer: { padding: 16, borderTopWidth: 1 },
  primaryBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnDisabled: { opacity: 0.7 },
  primaryBtnText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#fff',
  },
});
