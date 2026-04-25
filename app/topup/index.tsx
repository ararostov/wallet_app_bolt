// Top-up amount entry — spec 05-topup §4.1.
//
// Reads payment methods from `state.paymentMethods` (spec 04) and falls
// back to the legacy mock slice for screens that haven't migrated yet. No
// write-ops on this screen; it just collects amount + paymentMethodId and
// hands them to /topup/review.

import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Building2,
  ChevronRight,
  CreditCard,
  Plus,
  Smartphone,
  X,
} from 'lucide-react-native';

import { useWallet } from '@/context/WalletContext';
import { useTheme } from '@/context/ThemeContext';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { usePaymentMethods } from '@/hooks/usePaymentMethods';
import type { PaymentMethod as ApiPaymentMethod } from '@/types/paymentMethods';
import { formatMoney, parseAmountInput } from '@/utils/format';

// MVP fallback presets — minor units. Used when the program does not (yet)
// expose a tailored set in the wallet response. Mirrors spec 02 / 05 §4.1.
const FALLBACK_PRESETS_MINOR = [1000, 2500, 5000, 10000, 20000];
const DEFAULT_MIN_TOPUP_MINOR = 500; // £5
const DEFAULT_MAX_TOPUP_MINOR = 50000; // £500

function paymentMethodIcon(
  method: ApiPaymentMethod,
): typeof CreditCard {
  switch (method.type) {
    case 'apple_pay':
    case 'google_pay':
      return Smartphone;
    case 'open_banking':
      return Building2;
    case 'scheme':
    default:
      return CreditCard;
  }
}

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

export default function TopupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state } = useWallet();
  const { colors, isDark } = useTheme();

  // Hydrate state.paymentMethods via /payment-methods on mount; refetch-on-focus
  // is handled inside the hook.
  const paymentMethodsQuery = usePaymentMethods();

  const activeMethods = useMemo<ApiPaymentMethod[]>(() => {
    const list = state.paymentMethods ?? [];
    return list.filter((m) => m.status === 'active');
  }, [state.paymentMethods]);

  const defaultMethodId = useMemo<string | null>(() => {
    const def = activeMethods.find((m) => m.isDefault);
    return def?.id ?? activeMethods[0]?.id ?? null;
  }, [activeMethods]);

  const [selectedAmountMinor, setSelectedAmountMinor] = useState<number | null>(
    5000,
  );
  const [customAmount, setCustomAmount] = useState('');
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [methodModalOpen, setMethodModalOpen] = useState(false);

  // Sync selectedMethodId when the methods list resolves.
  useEffect(() => {
    if (selectedMethodId === null && defaultMethodId) {
      setSelectedMethodId(defaultMethodId);
    } else if (
      selectedMethodId !== null &&
      !activeMethods.some((m) => m.id === selectedMethodId)
    ) {
      // Selected method was archived/removed in another screen — drop it.
      setSelectedMethodId(defaultMethodId);
    }
  }, [defaultMethodId, activeMethods, selectedMethodId]);

  const currency = state.wallet?.currency ?? 'GBP';

  // Derived amount in minor units. Custom input wins when present; otherwise
  // the chip value, otherwise 0.
  const amountMinor = useMemo<number>(() => {
    if (customAmount.trim() !== '') {
      try {
        return parseAmountInput(customAmount, currency);
      } catch {
        return 0;
      }
    }
    return selectedAmountMinor ?? 0;
  }, [customAmount, selectedAmountMinor, currency]);

  const validationError = useMemo<string | null>(() => {
    if (customAmount.trim() === '' && selectedAmountMinor === null) return null;
    if (amountMinor === 0) return null;
    if (amountMinor < DEFAULT_MIN_TOPUP_MINOR) {
      return `Minimum top-up is ${formatMoney(DEFAULT_MIN_TOPUP_MINOR, currency)}`;
    }
    if (amountMinor > DEFAULT_MAX_TOPUP_MINOR) {
      return `Maximum top-up is ${formatMoney(DEFAULT_MAX_TOPUP_MINOR, currency)}`;
    }
    return null;
  }, [amountMinor, customAmount, selectedAmountMinor, currency]);

  const selectedMethod = useMemo(
    () => activeMethods.find((m) => m.id === selectedMethodId),
    [activeMethods, selectedMethodId],
  );

  // TODO(tech-debt §2.9): wire bonus rule from /wallet/state when backend
  // starts returning `bonusRule`. Until then we don't show the bonus banner /
  // chip — the legacy mock-shape signal is gone and there is no API substitute.
  const isBonusPending = false;
  const bonusTargetMinor = 0;
  const bonusAmountMinor = 0;
  const willUnlockBonus = false;

  const canContinue =
    validationError === null &&
    amountMinor >= DEFAULT_MIN_TOPUP_MINOR &&
    selectedMethod !== undefined;

  const handleContinue = (): void => {
    if (!canContinue || !selectedMethod) return;
    router.push({
      pathname: '/topup/review',
      params: {
        amountMinor: String(amountMinor),
        currency,
        paymentMethodId: selectedMethod.id,
      },
    });
  };

  const noMethods =
    !paymentMethodsQuery.loading && activeMethods.length === 0;

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
          accessibilityRole="button"
          accessibilityLabel="Close top-up"
        >
          <X size={22} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Top Up</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 140 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {isBonusPending && (
          <View style={styles.bonusBanner}>
            <Text style={styles.bonusBannerText}>
              {'🎁'} Top up{' '}
              {formatMoney(bonusTargetMinor, currency)} to unlock your{' '}
              {formatMoney(bonusAmountMinor, currency)} bonus reward
            </Text>
          </View>
        )}

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          Select amount
        </Text>
        <View style={styles.amountsGrid}>
          {FALLBACK_PRESETS_MINOR.map((presetMinor) => {
            const selected =
              customAmount.trim() === '' && selectedAmountMinor === presetMinor;
            return (
              <TouchableOpacity
                key={presetMinor}
                style={[
                  styles.amountCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                  selected && {
                    borderColor: colors.primary,
                    backgroundColor: isDark ? colors.surfaceAlt : '#eff6ff',
                  },
                ]}
                onPress={() => {
                  setSelectedAmountMinor(presetMinor);
                  setCustomAmount('');
                }}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`Top up ${formatMoney(presetMinor, currency)}`}
              >
                <Text
                  style={[
                    styles.amountValue,
                    { color: colors.text },
                    selected && { color: colors.primary },
                  ]}
                >
                  {formatMoney(presetMinor, currency)}
                </Text>
                {isBonusPending && presetMinor >= bonusTargetMinor && (
                  <View style={styles.bonusChip}>
                    <Text style={styles.bonusChipText}>
                      +{formatMoney(bonusAmountMinor, currency)} bonus
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          Or enter custom amount
        </Text>
        <View
          style={[
            styles.customAmountRow,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.poundSign, { color: colors.textSecondary }]}>
            {'£'}
          </Text>
          <TextInput
            style={[styles.customInput, { color: colors.text }]}
            placeholder="0.00"
            placeholderTextColor={colors.textTertiary}
            keyboardType="decimal-pad"
            value={customAmount}
            onChangeText={(text) => {
              setCustomAmount(text);
              setSelectedAmountMinor(null);
            }}
            accessibilityLabel="Custom top-up amount"
          />
        </View>
        {validationError !== null && (
          <Text style={[styles.errorText, { color: colors.red }]}>
            {validationError}
          </Text>
        )}

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          Payment method
        </Text>
        {paymentMethodsQuery.loading && !state.paymentMethods ? (
          <View
            style={[
              styles.methodSelector,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                justifyContent: 'center',
              },
            ]}
          >
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : noMethods ? (
          <TouchableOpacity
            style={[
              styles.methodSelector,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderStyle: 'dashed',
              },
            ]}
            onPress={() => router.push('/payment-methods/add')}
            accessibilityRole="button"
            accessibilityLabel="Add a payment method"
          >
            <Plus size={18} color={colors.primary} />
            <Text style={[styles.methodLabel, { color: colors.text }]}>
              Add a payment method
            </Text>
            <ChevronRight size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        ) : selectedMethod ? (
          <TouchableOpacity
            style={[
              styles.methodSelector,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
            onPress={() => setMethodModalOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={`Selected payment method: ${paymentMethodLabel(
              selectedMethod,
            )}. Tap to change.`}
          >
            {(() => {
              const Icon = paymentMethodIcon(selectedMethod);
              return <Icon size={18} color={colors.primary} />;
            })()}
            <Text style={[styles.methodLabel, { color: colors.text }]}>
              {paymentMethodLabel(selectedMethod)}
            </Text>
            <ChevronRight size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        ) : null}
      </ScrollView>

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
        {amountMinor > 0 && (
          <Text style={[styles.footerSummary, { color: colors.textSecondary }]}>
            You'll pay{' '}
            <Text style={[styles.footerBold, { color: colors.text }]}>
              {formatMoney(amountMinor, currency)}
            </Text>
            {willUnlockBonus &&
              ` + receive ${formatMoney(bonusAmountMinor, currency)} bonus`}
          </Text>
        )}
        {noMethods ? (
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/payment-methods/add')}
            accessibilityRole="button"
          >
            <Text style={styles.primaryBtnText}>Add payment method</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.primaryBtn,
              { backgroundColor: colors.primary },
              !canContinue && styles.primaryBtnDisabled,
            ]}
            disabled={!canContinue}
            onPress={handleContinue}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canContinue }}
          >
            <Text style={styles.primaryBtnText}>Continue</Text>
          </TouchableOpacity>
        )}
      </View>

      <BottomSheet
        visible={methodModalOpen}
        onClose={() => setMethodModalOpen(false)}
        snapPoints={['50%', '80%']}
        accessibilityLabel="Payment method picker"
      >
        <View
          style={[styles.modalHeader, { borderBottomColor: colors.border }]}
        >
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            Payment method
          </Text>
          <TouchableOpacity
            onPress={() => setMethodModalOpen(false)}
            accessibilityRole="button"
            accessibilityLabel="Close payment method picker"
          >
            <X size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.modalScroll}>
          {activeMethods.map((method) => {
            const Icon = paymentMethodIcon(method);
            const selected = method.id === selectedMethodId;
            return (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.methodOption,
                  { borderColor: colors.border },
                  selected && {
                    borderColor: colors.primary,
                    backgroundColor: isDark ? colors.surfaceAlt : '#eff6ff',
                  },
                ]}
                onPress={() => {
                  setSelectedMethodId(method.id);
                  setMethodModalOpen(false);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <Icon size={20} color={colors.primary} />
                <Text
                  style={[
                    styles.methodOptionLabel,
                    { color: colors.text },
                  ]}
                >
                  {paymentMethodLabel(method)}
                </Text>
                {selected && (
                  <View
                    style={[
                      styles.selectedDot,
                      { backgroundColor: colors.primary },
                    ]}
                  />
                )}
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            style={[
              styles.methodOption,
              { borderColor: colors.border, borderStyle: 'dashed' },
            ]}
            onPress={() => {
              setMethodModalOpen(false);
              router.push('/payment-methods/add');
            }}
            accessibilityRole="button"
            accessibilityLabel="Add new payment method"
          >
            <Plus size={20} color={colors.textSecondary} />
            <Text
              style={[
                styles.methodOptionLabel,
                { color: colors.textSecondary },
              ]}
            >
              Add new payment method
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </BottomSheet>
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
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: { fontSize: 19, fontFamily: 'Inter-SemiBold' },
  scroll: { padding: 16 },
  bonusBanner: {
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  bonusBannerText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#92400e',
    lineHeight: 20,
  },
  sectionLabel: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  amountsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  amountCard: {
    width: '47%',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    gap: 6,
  },
  amountValue: { fontSize: 26, fontFamily: 'Inter-Bold' },
  bonusChip: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  bonusChipText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#15803d',
  },
  customAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  poundSign: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    marginRight: 4,
  },
  customInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
  },
  errorText: {
    fontSize: 15,
    marginBottom: 16,
    fontFamily: 'Inter-Regular',
  },
  methodSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    marginBottom: 20,
  },
  methodLabel: { flex: 1, fontSize: 17, fontFamily: 'Inter-Medium' },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: 1,
    gap: 8,
  },
  footerSummary: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  footerBold: { fontFamily: 'Inter-SemiBold' },
  primaryBtn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 19, fontFamily: 'Inter-Bold' },
  modalScroll: { padding: 16, gap: 8 },
  methodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  methodOptionLabel: { flex: 1, fontSize: 17, fontFamily: 'Inter-Medium' },
  selectedDot: { width: 10, height: 10, borderRadius: 5 },
});
