// Top-up result — spec 05-topup §4.3.
//
// Reads `paymentOrderId` from the route, polls
// `GET /wallet/topup-status/{paymentOrderId}` every 5s for up to 60s, and
// renders the appropriate terminal / pending / failed UI.
//
// On a `completed` status (synchronous or via poll) the wallet balance
// slice is updated from the response so the Home tab reflects the new
// available balance immediately.

import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Clock, CircleCheck as CheckCircle, Circle as XCircle } from 'lucide-react-native';

import { useTheme } from '@/context/ThemeContext';
import { useWallet } from '@/context/WalletContext';
import { useTopupStatus } from '@/hooks/useTopupStatus';
import type { TopupClientStatus } from '@/types/topup';
import { mapErrorCode } from '@/utils/errors';
import { formatMoney } from '@/utils/format';

type DisplayState =
  | { kind: 'pending_live' }
  | { kind: 'pending_timeout' }
  | { kind: 'completed' }
  | { kind: 'failed'; failureCode: string | null; failureMessage: string | null }
  | { kind: 'cancelled'; failureCode: string | null; failureMessage: string | null };

const TERMINAL_STATUSES: ReadonlySet<TopupClientStatus> = new Set([
  'completed',
  'failed',
  'cancelled',
]);

export default function TopupResultScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { state, dispatch } = useWallet();

  const params = useLocalSearchParams<{ paymentOrderId?: string }>();
  const paymentOrderId = params.paymentOrderId ?? null;

  const status = useTopupStatus(paymentOrderId, {
    enabled: paymentOrderId !== null,
    intervalMs: 5_000,
    timeoutMs: 60_000,
  });

  // Reflect a `completed` outcome into wallet state once. Guarded by a ref
  // so the dispatch fires exactly when status flips, not on every poll.
  const lastAppliedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!status.data || !paymentOrderId) return;
    const key = `${paymentOrderId}:${status.data.status}`;
    if (lastAppliedRef.current === key) return;
    lastAppliedRef.current = key;

    if (status.data.status === 'completed' && status.data.walletBalance) {
      dispatch({
        type: 'WALLET/SET_BALANCE',
        payload: {
          available: status.data.walletBalance.available,
          pending: status.data.walletBalance.pending,
          status: status.data.walletBalance.status,
        },
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (
      status.data.status === 'failed' ||
      status.data.status === 'cancelled'
    ) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  }, [status.data, paymentOrderId, dispatch]);

  const display: DisplayState = (() => {
    if (!status.data) {
      return status.timedOut
        ? { kind: 'pending_timeout' }
        : { kind: 'pending_live' };
    }
    switch (status.data.status) {
      case 'completed':
        return { kind: 'completed' };
      case 'failed':
        return {
          kind: 'failed',
          failureCode: status.data.failureCode,
          failureMessage: status.data.failureMessage,
        };
      case 'cancelled':
        return {
          kind: 'cancelled',
          failureCode: status.data.failureCode,
          failureMessage: status.data.failureMessage,
        };
      case 'action_required':
      case 'pending':
      default:
        return status.timedOut
          ? { kind: 'pending_timeout' }
          : { kind: 'pending_live' };
    }
  })();

  const terminal =
    status.data !== undefined && TERMINAL_STATUSES.has(status.data.status);

  const amountMinor = status.data?.amount.amountMinor ?? 0;
  const currency = status.data?.amount.currency ?? state.walletApi?.currency ?? 'GBP';

  const handlePrimary = (): void => {
    switch (display.kind) {
      case 'completed':
      case 'pending_live':
      case 'pending_timeout':
      case 'cancelled':
        router.replace('/(tabs)');
        return;
      case 'failed':
        router.replace('/topup');
        return;
    }
  };

  const handleSecondary = (): void => {
    router.replace('/(tabs)');
  };

  const renderIcon = (): React.ReactElement => {
    switch (display.kind) {
      case 'completed':
        return (
          <View style={[styles.iconCircle, { backgroundColor: '#f0fdf4' }]}>
            <CheckCircle size={56} color="#059669" />
          </View>
        );
      case 'pending_live':
      case 'pending_timeout':
        return (
          <View style={[styles.iconCircle, { backgroundColor: '#fffbeb' }]}>
            <Clock size={56} color="#d97706" />
          </View>
        );
      case 'failed':
      case 'cancelled':
        return (
          <View style={[styles.iconCircle, { backgroundColor: '#fef2f2' }]}>
            <XCircle size={56} color="#ef4444" />
          </View>
        );
    }
  };

  const renderTitleSubtitle = (): { title: string; subtitle: string } => {
    switch (display.kind) {
      case 'completed':
        return {
          title: 'Top-up successful!',
          subtitle: `${formatMoney(amountMinor, currency)} has been added to your wallet.`,
        };
      case 'pending_live':
        return {
          title: 'Top-up is processing',
          subtitle: 'This usually takes up to a minute.',
        };
      case 'pending_timeout':
        return {
          title: 'Still processing',
          subtitle: "We'll notify you as soon as this completes.",
        };
      case 'failed': {
        const mapped =
          display.failureCode !== null
            ? mapErrorCode(display.failureCode)
            : null;
        return {
          title: "Top-up didn't go through",
          subtitle:
            display.failureMessage ??
            mapped ??
            'Something went wrong with your payment. Please try a different method.',
        };
      }
      case 'cancelled':
        return {
          title: 'Top-up cancelled',
          subtitle:
            display.failureMessage ??
            'The payment was not completed in time. You can try again.',
        };
    }
  };

  const titleSubtitle = renderTitleSubtitle();

  const primaryLabel: string = (() => {
    switch (display.kind) {
      case 'completed':
        return 'Done';
      case 'pending_live':
        return 'Close — notify me';
      case 'pending_timeout':
        return 'Close';
      case 'cancelled':
        return 'Close';
      case 'failed':
        return 'Try again';
    }
  })();

  return (
    <SafeAreaView
      edges={['left', 'right']}
      style={[styles.safe, { backgroundColor: colors.background }]}
    >
      <View style={[styles.container, { paddingTop: insets.top + 24 }]}>
        {renderIcon()}
        <Text
          style={[styles.title, { color: colors.text }]}
          accessibilityLabel={titleSubtitle.title}
        >
          {titleSubtitle.title}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {titleSubtitle.subtitle}
        </Text>

        {display.kind === 'pending_live' && (
          <ActivityIndicator
            color={colors.primary}
            style={{ marginVertical: 12 }}
          />
        )}

        {display.kind === 'completed' && status.data && (
          <View
            style={[
              styles.receiptCard,
              { backgroundColor: colors.surface, shadowColor: colors.shadowColor },
            ]}
          >
            <View
              style={[styles.receiptRow, { borderBottomColor: colors.borderLight }]}
            >
              <Text style={[styles.receiptLabel, { color: colors.textSecondary }]}>
                Amount
              </Text>
              <Text style={[styles.receiptValue, { color: colors.text }]}>
                {formatMoney(amountMinor, currency)}
              </Text>
            </View>
            {status.data.walletBalance && (
              <View
                style={[styles.receiptRow, { borderBottomColor: colors.borderLight }]}
              >
                <Text
                  style={[styles.receiptLabel, { color: colors.textSecondary }]}
                >
                  New balance
                </Text>
                <Text style={[styles.receiptValue, styles.receiptValueBold]}>
                  {formatMoney(
                    status.data.walletBalance.available.amountMinor,
                    status.data.walletBalance.available.currency,
                  )}
                </Text>
              </View>
            )}
            <View
              style={[styles.receiptRow, { borderBottomColor: colors.borderLight }]}
            >
              <Text style={[styles.receiptLabel, { color: colors.textSecondary }]}>
                Reference
              </Text>
              <Text style={[styles.receiptValue, { color: colors.text }]}>
                {status.data.paymentOrderId}
              </Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
          onPress={handlePrimary}
          accessibilityRole="button"
        >
          <Text style={styles.primaryBtnText}>{primaryLabel}</Text>
        </TouchableOpacity>

        {(display.kind === 'failed' || display.kind === 'cancelled') && (
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={handleSecondary}
            accessibilityRole="button"
          >
            <Text style={[styles.secondaryBtnText, { color: colors.textSecondary }]}>
              Close
            </Text>
          </TouchableOpacity>
        )}

        {!terminal && status.error && (
          <Text
            style={[styles.errorHint, { color: colors.textTertiary }]}
            accessibilityLiveRegion="polite"
          >
            Reconnecting…
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 17,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  receiptCard: {
    width: '100%',
    borderRadius: 16,
    padding: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 8,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  receiptLabel: { fontSize: 16, fontFamily: 'Inter-Regular' },
  receiptValue: { fontSize: 16, fontFamily: 'Inter-Medium' },
  receiptValueBold: { fontFamily: 'Inter-Bold', color: '#059669' },
  primaryBtn: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#fff',
  },
  secondaryBtn: { paddingVertical: 12 },
  secondaryBtnText: { fontSize: 17, fontFamily: 'Inter-Medium' },
  errorHint: { fontSize: 13, fontFamily: 'Inter-Regular' },
});
