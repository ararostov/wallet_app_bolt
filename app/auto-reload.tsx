import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  X,
  ArrowLeft,
  Zap,
  Gift,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react-native';

import { useWallet } from '@/context/WalletContext';
import { useTheme } from '@/context/ThemeContext';
import { useUpdateAutoReload } from '@/hooks/useUpdateAutoReload';
import { ApiError, mapErrorCode } from '@/utils/errors';
import { formatMoney } from '@/utils/format';
import type { UpdateAutoReloadRequest } from '@/types/wallet';

// MVP program limits — until backend exposes these in /wallet/state.
// See docs/mobile/specs/02-wallet.ru.md §11.3 (open question).
const PROGRAM_MIN_TOPUP_MINOR = 1000; // £10
const PROGRAM_MAX_TOPUP_MINOR = 500_000; // £5,000
const TRIGGER_MIN_MINOR = 100; // £1

const TRIGGER_PRESETS_MINOR = [1000, 2000, 5000];
const RELOAD_PRESETS_MINOR = [2000, 5000, 10000];

type FieldErrors = Partial<{
  triggerBalance: string;
  reloadAmount: string;
  paymentMethod: string;
  dailyCap: string;
  monthlyCap: string;
  form: string;
}>;

export default function AutoReloadScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { state } = useWallet();

  const { wallet, autoReload, paymentMethods } = state;
  const currency = wallet?.currency ?? 'GBP';

  // Backend-shape payment-methods slice (spec 04). Stays null until the user
  // visits the payment-methods screen at least once; in that case the picker
  // shows an empty state with the "Add a method" CTA.
  type PickerOption = {
    id: string;
    label: string;
    last4: string | null;
    isDefault: boolean;
  };
  const pickerOptions: PickerOption[] = useMemo(() => {
    return (paymentMethods ?? [])
      .filter((pm) => pm.status === 'active')
      .map((pm) => {
        const brand =
          pm.brand?.charAt(0).toUpperCase() + (pm.brand?.slice(1) ?? '');
        const label = pm.bankName ?? brand ?? 'Card';
        return {
          id: pm.id,
          label,
          last4: pm.panLast4,
          isDefault: pm.isDefault,
        };
      });
  }, [paymentMethods]);

  // --- Local form state (initialised from cached autoReload, or defaults). -

  const [enabled, setEnabled] = useState<boolean>(autoReload?.enabled ?? false);
  const [setupMode, setSetupMode] = useState<boolean>(autoReload != null);

  const [triggerBalanceMinor, setTriggerBalanceMinor] = useState<number>(
    autoReload?.triggerBalance.amountMinor ?? 1000,
  );
  const [reloadAmountMinor, setReloadAmountMinor] = useState<number>(
    autoReload?.reloadAmount.amountMinor ?? 5000,
  );
  const [paymentMethodId, setPaymentMethodId] = useState<string | null>(
    autoReload?.paymentMethod?.id ??
      paymentMethods?.find((pm) => pm.isDefault)?.id ??
      null,
  );
  const [dailyCapMinor, setDailyCapMinor] = useState<number | null>(
    autoReload?.dailyCap?.amountMinor ?? null,
  );
  const [monthlyCapMinor, setMonthlyCapMinor] = useState<number | null>(
    autoReload?.monthlyCap?.amountMinor ?? null,
  );
  const [showCaps, setShowCaps] = useState<boolean>(
    autoReload?.dailyCap != null || autoReload?.monthlyCap != null,
  );

  const [sheetOpen, setSheetOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [toast, setToast] = useState<string | null>(null);

  // --- Mutation -----------------------------------------------------------

  const mutation = useUpdateAutoReload({
    onSuccess: () => {
      setFieldErrors({});
      router.back();
    },
    onError: (error) => {
      handleMutationError(error);
    },
  });

  function handleMutationError(error: Error) {
    if (!(error instanceof ApiError)) {
      setFieldErrors({ form: 'Network error. Please try again.' });
      return;
    }
    const map = mapErrorCode(error.code) ?? error.message;
    const next: FieldErrors = {};
    switch (error.code) {
      case 'AUTO_RELOAD_INVALID_THRESHOLD':
        next.reloadAmount = map;
        break;
      case 'AUTO_RELOAD_INVALID_AMOUNT':
      case 'AUTO_RELOAD_AMOUNT_INVALID':
        next.reloadAmount = map;
        break;
      case 'AUTO_RELOAD_PAYMENT_METHOD_REQUIRED':
      case 'AUTO_RELOAD_PAYMENT_METHOD_INVALID':
      case 'PAYMENT_METHOD_NOT_FOUND':
        next.paymentMethod = map;
        break;
      case 'AUTO_RELOAD_CURRENCY_MISMATCH':
        next.paymentMethod = map;
        break;
      case 'AUTO_RELOAD_LIMIT_EXCEEDED':
      case 'AUTO_RELOAD_DAILY_CAP_INVALID':
        next.dailyCap = map;
        break;
      case 'AUTO_RELOAD_MONTHLY_CAP_INVALID':
        next.monthlyCap = map;
        break;
      case 'WALLET_FROZEN':
        setToast(map);
        break;
      case 'IDEMPOTENCY_KEY_IN_PROGRESS':
        setToast(map);
        break;
      case 'VALIDATION_FAILED': {
        const fields = (error.details as Record<string, string[]> | undefined) ?? {};
        if (fields['reloadAmount.amountMinor']?.[0]) {
          next.reloadAmount = fields['reloadAmount.amountMinor'][0];
        }
        if (fields['triggerBalance.amountMinor']?.[0]) {
          next.triggerBalance = fields['triggerBalance.amountMinor'][0];
        }
        if (fields.paymentMethodId?.[0]) {
          next.paymentMethod = fields.paymentMethodId[0];
        }
        if (Object.keys(next).length === 0) next.form = map;
        break;
      }
      default:
        next.form = map;
    }
    if (Object.keys(next).length > 0) setFieldErrors(next);
  }

  // --- Validation ---------------------------------------------------------

  const selectedPaymentMethod = useMemo(
    () => pickerOptions.find((pm) => pm.id === paymentMethodId) ?? null,
    [pickerOptions, paymentMethodId],
  );

  const canSubmit = useMemo(() => {
    if (!enabled) return true;
    if (!paymentMethodId) return false;
    if (triggerBalanceMinor < TRIGGER_MIN_MINOR) return false;
    if (reloadAmountMinor <= triggerBalanceMinor) return false;
    if (reloadAmountMinor < PROGRAM_MIN_TOPUP_MINOR) return false;
    if (reloadAmountMinor > PROGRAM_MAX_TOPUP_MINOR) return false;
    if (dailyCapMinor != null && dailyCapMinor < reloadAmountMinor) return false;
    if (
      monthlyCapMinor != null &&
      dailyCapMinor != null &&
      monthlyCapMinor < dailyCapMinor
    )
      return false;
    return true;
  }, [
    enabled,
    paymentMethodId,
    triggerBalanceMinor,
    reloadAmountMinor,
    dailyCapMinor,
    monthlyCapMinor,
  ]);

  function handleSave() {
    setFieldErrors({});
    setToast(null);

    if (!enabled) {
      mutation.mutate({ enabled: false }).catch(() => undefined);
      return;
    }

    if (!canSubmit || !paymentMethodId) {
      const next: FieldErrors = {};
      if (!paymentMethodId) next.paymentMethod = 'Select a payment method.';
      if (triggerBalanceMinor < TRIGGER_MIN_MINOR)
        next.triggerBalance = 'Trigger must be at least £1.';
      if (reloadAmountMinor <= triggerBalanceMinor)
        next.reloadAmount = 'Top-up must exceed the trigger balance.';
      if (reloadAmountMinor < PROGRAM_MIN_TOPUP_MINOR)
        next.reloadAmount = `Top-up must be at least ${formatMoney(PROGRAM_MIN_TOPUP_MINOR, currency)}.`;
      if (reloadAmountMinor > PROGRAM_MAX_TOPUP_MINOR)
        next.reloadAmount = `Top-up must not exceed ${formatMoney(PROGRAM_MAX_TOPUP_MINOR, currency)}.`;
      if (dailyCapMinor != null && dailyCapMinor < reloadAmountMinor)
        next.dailyCap = 'Daily cap must be at least the reload amount.';
      if (
        monthlyCapMinor != null &&
        dailyCapMinor != null &&
        monthlyCapMinor < dailyCapMinor
      )
        next.monthlyCap = 'Monthly cap must be at least the daily cap.';
      setFieldErrors(next);
      return;
    }

    const payload: UpdateAutoReloadRequest = {
      enabled: true,
      paymentMethodId,
      triggerBalance: { amountMinor: triggerBalanceMinor, currency },
      reloadAmount: { amountMinor: reloadAmountMinor, currency },
      ...(dailyCapMinor != null
        ? { dailyCap: { amountMinor: dailyCapMinor, currency } }
        : {}),
      ...(monthlyCapMinor != null
        ? { monthlyCap: { amountMinor: monthlyCapMinor, currency } }
        : {}),
    };

    mutation.mutate(payload).catch(() => undefined);
  }

  function handleSetup() {
    setSetupMode(true);
    setEnabled(true);
  }

  // --- Upsell variant -----------------------------------------------------

  if (!setupMode && !autoReload) {
    return (
      <SafeAreaView edges={['left', 'right']} style={[styles.safe, { backgroundColor: colors.surface }]}>
        <TouchableOpacity
          style={[styles.closeBtn, { marginTop: insets.top }]}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <X size={22} color={colors.textSecondary} />
        </TouchableOpacity>

        <ScrollView contentContainerStyle={styles.upsellScroll} showsVerticalScrollIndicator={false}>
          <View style={[styles.upsellIcon, { backgroundColor: isDark ? '#1E293B' : '#f1f5f9' }]}>
            <Zap size={44} color={colors.primary} />
          </View>

          <Text style={[styles.upsellTitle, { color: colors.text }]}>
            Never run out.{'\n'}Earn more.
          </Text>
          <Text style={[styles.upsellSub, { color: colors.textSecondary }]}>
            Auto-reload tops up your Wallet automatically when your balance gets low — and earns you
            an extra +1% cashback on every auto top-up.
          </Text>

          <View style={styles.featureList}>
            {[
              {
                icon: Zap,
                color: colors.primary,
                bg: isDark ? '#1E3A5F' : '#eff6ff',
                text: 'Instant top-ups when you need them',
              },
              {
                icon: Gift,
                color: '#059669',
                bg: isDark ? '#064E3B' : '#f0fdf4',
                text: '+1% cashback on every auto top-up',
              },
              {
                icon: ShieldCheck,
                color: colors.textSecondary,
                bg: isDark ? '#334155' : '#f1f5f9',
                text: 'Turn off any time from Home',
              },
            ].map(({ icon: Icon, color, bg, text }) => (
              <View key={text} style={styles.featureRow}>
                <View style={[styles.featureIconBg, { backgroundColor: bg }]}>
                  <Icon size={20} color={color} />
                </View>
                <Text style={[styles.featureText, { color: colors.text }]}>{text}</Text>
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={[styles.upsellFooter, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={handleSetup}
            accessibilityRole="button"
            accessibilityLabel="Set up Auto-reload"
          >
            <Text style={styles.primaryBtnText}>Set up Auto-reload</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()} style={styles.maybeLaterBtn}>
            <Text style={[styles.maybeLaterText, { color: colors.textSecondary }]}>Maybe later</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // --- Config variant -----------------------------------------------------

  return (
    <SafeAreaView edges={['left', 'right']} style={[styles.safe, { backgroundColor: colors.background }]}>
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Back">
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Auto-reload</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}>
        <View
          style={[
            styles.enableCard,
            { backgroundColor: colors.surface, shadowColor: colors.shadowColor },
          ]}
        >
          <View>
            <Text style={[styles.enableTitle, { color: colors.text }]}>Auto-reload</Text>
            <Text style={[styles.enableSub, { color: colors.textSecondary }]}>
              {enabled ? 'Currently active' : 'Currently off'}
            </Text>
          </View>
          <Switch
            value={enabled}
            onValueChange={setEnabled}
            trackColor={{ false: colors.border, true: isDark ? '#1E3A5F' : '#bfdbfe' }}
            thumbColor={enabled ? colors.primary : colors.surface}
            accessibilityLabel="Auto-reload"
          />
        </View>

        {autoReload?.disableReason === 'consecutive_failures' && (
          <View style={[styles.warnCard, { backgroundColor: isDark ? '#7F1D1D' : '#fef2f2' }]}>
            <AlertTriangle size={18} color={colors.red} />
            <Text style={[styles.warnText, { color: colors.text }]}>
              Auto-reload was paused after {autoReload.consecutiveFailureCount} failed
              {autoReload.consecutiveFailureCount === 1 ? ' attempt' : ' attempts'}. Update your
              payment source and save to re-enable.
            </Text>
          </View>
        )}

        {enabled && (
          <>
            <AmountStepper
              label="When balance falls below"
              value={triggerBalanceMinor}
              onChange={setTriggerBalanceMinor}
              step={500}
              min={TRIGGER_MIN_MINOR}
              max={50_000}
              presets={TRIGGER_PRESETS_MINOR}
              currency={currency}
              error={fieldErrors.triggerBalance}
              colors={colors}
              isDark={isDark}
            />

            <AmountStepper
              label="Top up to"
              value={reloadAmountMinor}
              onChange={setReloadAmountMinor}
              step={1000}
              min={PROGRAM_MIN_TOPUP_MINOR}
              max={PROGRAM_MAX_TOPUP_MINOR}
              presets={RELOAD_PRESETS_MINOR}
              currency={currency}
              error={fieldErrors.reloadAmount}
              colors={colors}
              isDark={isDark}
            />

            <TouchableOpacity
              style={[
                styles.sourceCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={() => setSheetOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Select payment source"
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.sourceLabel, { color: colors.textSecondary }]}>Payment source</Text>
                <Text style={[styles.sourceValue, { color: colors.text }]}>
                  {selectedPaymentMethod
                    ? `${selectedPaymentMethod.label}${selectedPaymentMethod.last4 ? ` •••• ${selectedPaymentMethod.last4}` : ''}`
                    : 'Select payment source'}
                </Text>
              </View>
              <ChevronRight size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            {fieldErrors.paymentMethod && (
              <Text style={[styles.fieldError, { color: colors.red }]}>{fieldErrors.paymentMethod}</Text>
            )}

            <View
              style={[
                styles.bonusCard,
                {
                  backgroundColor: isDark ? '#1E3A5F' : '#eff6ff',
                  borderColor: isDark ? '#3B82F6' : '#bfdbfe',
                },
              ]}
            >
              <Zap size={16} color={colors.primary} />
              <Text style={[styles.bonusText, { color: colors.primary }]}>
                +1% cashback on every auto top-up
              </Text>
            </View>

            <TouchableOpacity
              style={styles.advancedHeader}
              onPress={() => setShowCaps((v) => !v)}
            >
              <Text style={[styles.advancedTitle, { color: colors.textSecondary }]}>
                {showCaps ? '▾' : '▸'} Advanced limits
              </Text>
            </TouchableOpacity>

            {showCaps && (
              <>
                <CapStepper
                  label="Daily cap (optional)"
                  value={dailyCapMinor}
                  onChange={setDailyCapMinor}
                  currency={currency}
                  error={fieldErrors.dailyCap}
                  colors={colors}
                  isDark={isDark}
                />
                <CapStepper
                  label="Monthly cap (optional)"
                  value={monthlyCapMinor}
                  onChange={setMonthlyCapMinor}
                  currency={currency}
                  error={fieldErrors.monthlyCap}
                  colors={colors}
                  isDark={isDark}
                />
              </>
            )}
          </>
        )}

        {fieldErrors.form && (
          <Text style={[styles.fieldError, { color: colors.red, paddingHorizontal: 4 }]}>
            {fieldErrors.form}
          </Text>
        )}
        {toast && (
          <Text style={[styles.fieldError, { color: colors.red, paddingHorizontal: 4 }]}>{toast}</Text>
        )}

        <TouchableOpacity
          style={[
            styles.primaryBtn,
            {
              backgroundColor: colors.primary,
              opacity: mutation.loading || (!enabled ? false : !canSubmit) ? 0.6 : 1,
            },
          ]}
          onPress={handleSave}
          disabled={mutation.loading || (enabled && !canSubmit)}
          accessibilityRole="button"
        >
          {mutation.loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>{enabled ? 'Save & activate' : 'Save'}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Payment-source picker (BottomSheet alternative — Modal slide-up). */}
      <Modal
        visible={sheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setSheetOpen(false)}
      >
        <View style={styles.sheetBackdrop}>
          <View style={[styles.sheetCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>Payment source</Text>
            {pickerOptions.length === 0 ? (
              <View style={{ paddingVertical: 16 }}>
                <Text style={[styles.sourceLabel, { color: colors.textSecondary }]}>
                  No payment methods on file. Add one first.
                </Text>
                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: colors.primary, marginTop: 12 }]}
                  onPress={() => {
                    setSheetOpen(false);
                    router.push('/payment-methods');
                  }}
                >
                  <Text style={styles.primaryBtnText}>Add a payment method</Text>
                </TouchableOpacity>
              </View>
            ) : (
              pickerOptions.map((pm) => (
                <TouchableOpacity
                  key={pm.id}
                  style={[styles.sheetRow, { borderBottomColor: colors.borderLight }]}
                  onPress={() => {
                    setPaymentMethodId(pm.id);
                    setSheetOpen(false);
                  }}
                >
                  <Text style={[styles.sheetRowLabel, { color: colors.text }]}>
                    {pm.label}
                    {pm.last4 ? ` •••• ${pm.last4}` : ''}
                  </Text>
                  {pm.id === paymentMethodId && (
                    <Text style={[styles.sheetRowCheck, { color: colors.primary }]}>✓</Text>
                  )}
                </TouchableOpacity>
              ))
            )}
            <TouchableOpacity
              onPress={() => setSheetOpen(false)}
              style={styles.sheetCloseBtn}
            >
              <Text style={[styles.sheetCloseText, { color: colors.textSecondary }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// --- Local components -----------------------------------------------------

interface StepperProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step: number;
  min: number;
  max: number;
  presets: number[];
  currency: string;
  error?: string;
  colors: { surface: string; text: string; textSecondary: string; textTertiary: string; primary: string; red: string; shadowColor: string };
  isDark: boolean;
}

function AmountStepper({
  label,
  value,
  onChange,
  step,
  min,
  max,
  presets,
  currency,
  error,
  colors,
  isDark,
}: StepperProps) {
  return (
    <View
      style={[
        styles.configCard,
        { backgroundColor: colors.surface, shadowColor: colors.shadowColor },
      ]}
    >
      <Text style={[styles.configTitle, { color: colors.textSecondary }]}>{label}</Text>
      <View style={styles.stepperRow}>
        <TouchableOpacity
          style={[styles.stepperBtn, { backgroundColor: isDark ? '#1E3A5F' : '#eff6ff' }]}
          onPress={() => onChange(Math.max(min, value - step))}
          accessibilityLabel="Decrease amount"
        >
          <ChevronLeft size={20} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.stepperValue, { color: colors.text }]}>
          {formatMoney(value, currency)}
        </Text>
        <TouchableOpacity
          style={[styles.stepperBtn, { backgroundColor: isDark ? '#1E3A5F' : '#eff6ff' }]}
          onPress={() => onChange(Math.min(max, value + step))}
          accessibilityLabel="Increase amount"
        >
          <ChevronRight size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>
      <View style={styles.presetsRow}>
        {presets.map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.presetBtn, { borderColor: colors.textTertiary }]}
            onPress={() => onChange(p)}
          >
            <Text style={[styles.presetLabel, { color: colors.text }]}>
              {formatMoney(p, currency)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={[styles.stepperRange, { color: colors.textTertiary }]}>
        {formatMoney(min, currency)} — {formatMoney(max, currency)}
      </Text>
      {error && <Text style={[styles.fieldError, { color: colors.red }]}>{error}</Text>}
    </View>
  );
}

interface CapProps {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  currency: string;
  error?: string;
  colors: StepperProps['colors'];
  isDark: boolean;
}

function CapStepper({ label, value, onChange, currency, error, colors, isDark }: CapProps) {
  const display = value == null ? 'Program default' : formatMoney(value, currency);
  return (
    <View
      style={[
        styles.configCard,
        { backgroundColor: colors.surface, shadowColor: colors.shadowColor },
      ]}
    >
      <Text style={[styles.configTitle, { color: colors.textSecondary }]}>{label}</Text>
      <View style={styles.stepperRow}>
        <TouchableOpacity
          style={[styles.stepperBtn, { backgroundColor: isDark ? '#1E3A5F' : '#eff6ff' }]}
          onPress={() => {
            if (value == null) return;
            const next = value - 1000;
            onChange(next < 1000 ? null : next);
          }}
          accessibilityLabel="Decrease cap"
        >
          <ChevronLeft size={20} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.stepperValue, { color: colors.text }]}>{display}</Text>
        <TouchableOpacity
          style={[styles.stepperBtn, { backgroundColor: isDark ? '#1E3A5F' : '#eff6ff' }]}
          onPress={() => onChange((value ?? 0) + 1000)}
          accessibilityLabel="Increase cap"
        >
          <ChevronRight size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>
      {error && <Text style={[styles.fieldError, { color: colors.red }]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  // Upsell screen
  closeBtn: {
    position: 'absolute',
    top: 56,
    right: 20,
    zIndex: 10,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upsellScroll: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 80,
    paddingBottom: 80,
  },
  upsellIcon: {
    width: 100,
    height: 100,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  upsellTitle: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 16,
    lineHeight: 38,
  },
  upsellSub: { fontSize: 17, fontFamily: 'Inter-Regular', textAlign: 'center', lineHeight: 24, marginBottom: 36 },
  featureList: { width: '100%', gap: 20 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  featureIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: { flex: 1, fontSize: 17, fontFamily: 'Inter-Regular', lineHeight: 22 },
  upsellFooter: { padding: 24, paddingTop: 16, gap: 4 },
  maybeLaterBtn: { alignItems: 'center', paddingVertical: 12 },
  maybeLaterText: { fontSize: 17, fontFamily: 'Inter-Medium' },
  // Settings screen
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 19, fontFamily: 'Inter-SemiBold' },
  scroll: { padding: 16, paddingBottom: 80 },
  enableCard: {
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  enableTitle: { fontSize: 18, fontFamily: 'Inter-SemiBold' },
  enableSub: { fontSize: 15, fontFamily: 'Inter-Regular', marginTop: 2 },
  warnCard: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  warnText: { flex: 1, fontSize: 14, fontFamily: 'Inter-Regular', lineHeight: 20 },
  configCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    gap: 8,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  configTitle: { fontSize: 16, fontFamily: 'Inter-Medium' },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  stepperBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: { fontSize: 28, fontFamily: 'Inter-Bold', minWidth: 120, textAlign: 'center' },
  stepperRange: { fontSize: 13, fontFamily: 'Inter-Regular' },
  presetsRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  presetBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  presetLabel: { fontSize: 13, fontFamily: 'Inter-Medium' },
  sourceCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
  },
  sourceLabel: { fontSize: 13, fontFamily: 'Inter-Regular' },
  sourceValue: { fontSize: 16, fontFamily: 'Inter-SemiBold', marginTop: 2 },
  bonusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  bonusText: { fontSize: 16, fontFamily: 'Inter-SemiBold' },
  advancedHeader: { paddingVertical: 8, marginBottom: 4 },
  advancedTitle: { fontSize: 14, fontFamily: 'Inter-Medium' },
  fieldError: { fontSize: 13, fontFamily: 'Inter-Regular', marginTop: 4 },
  primaryBtn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  primaryBtnText: { fontSize: 18, fontFamily: 'Inter-SemiBold', color: '#fff' },
  // Sheet
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheetCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  sheetTitle: { fontSize: 18, fontFamily: 'Inter-Bold', marginBottom: 12 },
  sheetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  sheetRowLabel: { fontSize: 16, fontFamily: 'Inter-Medium' },
  sheetRowCheck: { fontSize: 18, fontFamily: 'Inter-Bold' },
  sheetCloseBtn: { paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  sheetCloseText: { fontSize: 16, fontFamily: 'Inter-Medium' },
});
