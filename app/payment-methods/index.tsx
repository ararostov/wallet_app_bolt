// Payment methods list — backend-driven (spec 04 §4.1).
//
// - usePaymentMethods on mount + refetch on focus.
// - Tap row → BottomSheet (Modal slide-up) with "Set as default" / "Remove".
// - Remove uses optimistic archive; on PAYMENT_METHOD_ATTACHED_TO_AUTO_RELOAD
//   shows the dedicated dialog described in spec §3.4.

import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  CreditCard,
  Plus,
  Star,
  Trash2,
} from 'lucide-react-native';

import { useTheme } from '@/context/ThemeContext';
import { PaymentMethodRow } from '@/components/features/paymentMethods/PaymentMethodRow';
import { useArchivePaymentMethod } from '@/hooks/useArchivePaymentMethod';
import { usePaymentMethods } from '@/hooks/usePaymentMethods';
import { useSetDefaultPaymentMethod } from '@/hooks/useSetDefaultPaymentMethod';
import type { PaymentMethod } from '@/types/paymentMethods';
import { ApiError, mapErrorCode } from '@/utils/errors';
import { logEvent } from '@/utils/logger';

export default function PaymentMethodsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { data, loading, error, refetch } = usePaymentMethods();
  const { setDefault } = useSetDefaultPaymentMethod();
  const { archive } = useArchivePaymentMethod();

  const [sheetMethod, setSheetMethod] = useState<PaymentMethod | null>(null);
  const [busy, setBusy] = useState(false);

  const methods = data?.paymentMethods ?? [];

  const handleSetDefault = async (method: PaymentMethod): Promise<void> => {
    if (method.isDefault) {
      setSheetMethod(null);
      return;
    }
    setBusy(true);
    try {
      await setDefault(method.id);
      logEvent('pm_default_changed', { paymentMethodId: method.id });
    } catch (e) {
      const message =
        e instanceof ApiError ? mapErrorCode(e.code) ?? e.message : 'Could not set default.';
      Alert.alert('Could not set default', message);
    } finally {
      setBusy(false);
      setSheetMethod(null);
    }
  };

  const handleRemove = (method: PaymentMethod): void => {
    setSheetMethod(null);
    Alert.alert(
      `Remove ${method.bankName ?? method.brand ?? 'this method'}?`,
      "This can't be undone.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => void doArchive(method),
        },
      ],
    );
  };

  const doArchive = async (method: PaymentMethod): Promise<void> => {
    setBusy(true);
    try {
      await archive(method.id);
      logEvent('pm_deleted', { paymentMethodId: method.id });
    } catch (e) {
      if (e instanceof ApiError && e.code === 'PAYMENT_METHOD_ATTACHED_TO_AUTO_RELOAD') {
        Alert.alert(
          'This method is used for auto top-up',
          'Turn off auto top-up or switch to a different method to remove it.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Change auto top-up',
              onPress: () => router.push('/auto-reload'),
            },
          ],
        );
        return;
      }
      if (e instanceof ApiError && e.code === 'PAYMENT_METHOD_ALREADY_ARCHIVED') {
        // Treat as success — refetch to reconcile state.
        await refetch();
        return;
      }
      const message =
        e instanceof ApiError ? mapErrorCode(e.code) ?? e.message : 'Could not remove.';
      Alert.alert('Could not remove', message);
    } finally {
      setBusy(false);
    }
  };

  const showSkeleton = loading && methods.length === 0;
  const showEmpty = !loading && !error && methods.length === 0;

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
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Payment methods</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 96 },
        ]}
      >
        {error && (
          <View style={[styles.errorBanner, { backgroundColor: colors.redLight }]}>
            <Text style={[styles.errorText, { color: colors.red }]}>
              {error instanceof ApiError
                ? mapErrorCode(error.code) ?? error.message
                : "Couldn't load your methods."}
            </Text>
            <TouchableOpacity onPress={() => void refetch()}>
              <Text style={[styles.retryText, { color: colors.red }]}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {showSkeleton && (
          <View style={styles.skeletonGroup}>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={[
                  styles.skeletonRow,
                  {
                    backgroundColor: isDark ? colors.surfaceAlt : colors.borderLight,
                  },
                ]}
              />
            ))}
          </View>
        )}

        {showEmpty && (
          <View style={styles.emptyState}>
            <View
              style={[
                styles.emptyIcon,
                { backgroundColor: isDark ? colors.surfaceAlt : colors.primaryLight },
              ]}
            >
              <CreditCard size={32} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No payment methods yet
            </Text>
            <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
              Add a card or connect your bank to top up your wallet.
            </Text>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/payment-methods/add')}
              accessibilityRole="button"
            >
              <Text style={styles.primaryBtnText}>Add your first method</Text>
            </TouchableOpacity>
          </View>
        )}

        {methods.length > 0 && (
          <View style={styles.list}>
            {methods.map((m) => (
              <PaymentMethodRow
                key={m.id}
                method={m}
                onPress={() => setSheetMethod(m)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {methods.length > 0 && (
        <View
          style={[
            styles.fab,
            {
              backgroundColor: colors.surface,
              borderTopColor: colors.border,
              paddingBottom: insets.bottom + 12,
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/payment-methods/add')}
            accessibilityRole="button"
            accessibilityLabel="Add a payment method"
          >
            <Plus size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>Add a payment method</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal
        visible={sheetMethod != null}
        transparent
        animationType="slide"
        onRequestClose={() => setSheetMethod(null)}
      >
        <View style={styles.sheetBackdrop}>
          <View style={[styles.sheetCard, { backgroundColor: colors.surface }]}>
            <View
              style={[styles.sheetHandle, { backgroundColor: colors.borderLight }]}
            />
            {sheetMethod && (
              <>
                <Text style={[styles.sheetTitle, { color: colors.text }]}>
                  {sheetMethod.bankName ?? sheetMethod.brand ?? 'Payment method'}
                </Text>

                {!sheetMethod.isDefault && (
                  <TouchableOpacity
                    style={[styles.sheetRow, { borderBottomColor: colors.borderLight }]}
                    disabled={busy}
                    onPress={() => void handleSetDefault(sheetMethod)}
                    accessibilityRole="button"
                    accessibilityLabel="Set as default"
                  >
                    <Star size={20} color={colors.primary} />
                    <Text style={[styles.sheetRowText, { color: colors.text }]}>
                      Set as default
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.sheetRow, { borderBottomColor: colors.borderLight }]}
                  disabled={busy}
                  onPress={() => handleRemove(sheetMethod)}
                  accessibilityRole="button"
                  accessibilityLabel="Remove payment method"
                >
                  <Trash2 size={20} color={colors.red} />
                  <Text style={[styles.sheetRowText, { color: colors.red }]}>
                    Remove
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.sheetCancel}
                  onPress={() => setSheetMethod(null)}
                  disabled={busy}
                  accessibilityRole="button"
                >
                  <Text
                    style={[styles.sheetCancelText, { color: colors.textSecondary }]}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>

                {busy && (
                  <View style={styles.sheetBusy}>
                    <ActivityIndicator color={colors.primary} />
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
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
  scroll: { padding: 16 },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  errorText: { flex: 1, fontFamily: 'Inter-Regular', fontSize: 14 },
  retryText: { fontFamily: 'Inter-SemiBold', fontSize: 14, marginLeft: 12 },

  skeletonGroup: { gap: 12 },
  skeletonRow: { height: 76, borderRadius: 14 },

  emptyState: { alignItems: 'center', paddingVertical: 56, gap: 12 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 19, fontFamily: 'Inter-SemiBold' },
  emptyBody: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    paddingHorizontal: 32,
    marginBottom: 8,
  },

  list: { gap: 12 },

  fab: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Inter-SemiBold' },

  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheetCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    marginVertical: 8,
  },
  sheetTitle: {
    fontSize: 17,
    fontFamily: 'Inter-SemiBold',
    marginVertical: 12,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  sheetRowText: { fontSize: 16, fontFamily: 'Inter-SemiBold' },
  sheetCancel: { paddingVertical: 14, alignItems: 'center' },
  sheetCancelText: { fontSize: 16, fontFamily: 'Inter-SemiBold' },
  sheetBusy: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
