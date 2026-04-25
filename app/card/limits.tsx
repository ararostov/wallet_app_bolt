// Card limits screen — backend-wired per docs/mobile/specs/03-cards.ru.md §4.2.
//
// Reads the current effective limits from `state.cardApi` and lets the user
// override (or reset) daily / monthly caps. Both values are entered as
// numeric strings (£X.XX) and converted to minor units before submit.
//
// Validation (client-side, mirrors backend):
//   - dailyMinor >= bounds.dailyMin and <= bounds.dailyMax
//   - monthlyMinor >= bounds.monthlyMin and <= bounds.monthlyMax
//   - dailyMinor <= monthlyMinor (CARD_LIMIT_INVALID_HIERARCHY)
//
// `null` payload entries reset to program default.

import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

import { useTheme } from '@/context/ThemeContext';
import { useWallet } from '@/context/WalletContext';
import { useUpdateCardLimits } from '@/hooks/useUpdateCardLimits';
import type { Card as ApiCard } from '@/types/card';
import { DEFAULT_CARD_LIMIT_BOUNDS } from '@/types/card';
import { ApiError, mapErrorCode } from '@/utils/errors';
import { formatMoney, parseAmountInput } from '@/utils/format';

function fullCard(value: unknown): ApiCard | null {
  if (!value) return null;
  if (typeof value === 'object' && 'lifecycleStatus' in (value as object)) {
    return value as ApiCard;
  }
  return null;
}

function formatMinorAsInput(amountMinor: number): string {
  return (amountMinor / 100).toFixed(2);
}

function parseInputOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  try {
    return parseAmountInput(trimmed);
  } catch {
    return Number.NaN;
  }
}

export default function CardLimitsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { state } = useWallet();
  const card = fullCard(state.cardApi);
  const updateLimits = useUpdateCardLimits();

  const bounds = DEFAULT_CARD_LIMIT_BOUNDS;
  const currency = card?.currency ?? state.walletApi?.currency ?? bounds.currency;

  const initialDaily = card?.dailyLimit?.amountMinor ?? null;
  const initialMonthly = card?.monthlyLimit?.amountMinor ?? null;

  const [dailyInput, setDailyInput] = useState<string>(
    initialDaily !== null ? formatMinorAsInput(initialDaily) : '',
  );
  const [monthlyInput, setMonthlyInput] = useState<string>(
    initialMonthly !== null ? formatMinorAsInput(initialMonthly) : '',
  );
  const [dailyError, setDailyError] = useState<string | null>(null);
  const [monthlyError, setMonthlyError] = useState<string | null>(null);

  // Re-sync local fields if the underlying card changes (e.g. WalletContext
  // hydrated from a fresh /wallet/state response while the screen was open).
  useEffect(() => {
    if (initialDaily !== null) {
      setDailyInput(formatMinorAsInput(initialDaily));
    }
    if (initialMonthly !== null) {
      setMonthlyInput(formatMinorAsInput(initialMonthly));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDaily, initialMonthly]);

  const isFrozen = card?.lifecycleStatus === 'frozen';
  const readOnly = isFrozen || !card;

  const dailyMinor = parseInputOrNull(dailyInput);
  const monthlyMinor = parseInputOrNull(monthlyInput);

  const validationErrors = useMemo(() => {
    const errs: { daily?: string; monthly?: string } = {};
    if (dailyMinor !== null && Number.isNaN(dailyMinor)) {
      errs.daily = 'Enter a valid amount.';
    } else if (dailyMinor !== null) {
      if (dailyMinor < bounds.dailyMin || dailyMinor > bounds.dailyMax) {
        errs.daily = `Between ${formatMoney(bounds.dailyMin, currency)} and ${formatMoney(bounds.dailyMax, currency)}.`;
      }
    }
    if (monthlyMinor !== null && Number.isNaN(monthlyMinor)) {
      errs.monthly = 'Enter a valid amount.';
    } else if (monthlyMinor !== null) {
      if (monthlyMinor < bounds.monthlyMin || monthlyMinor > bounds.monthlyMax) {
        errs.monthly = `Between ${formatMoney(bounds.monthlyMin, currency)} and ${formatMoney(bounds.monthlyMax, currency)}.`;
      }
    }
    if (
      !errs.daily &&
      !errs.monthly &&
      dailyMinor !== null &&
      monthlyMinor !== null &&
      !Number.isNaN(dailyMinor) &&
      !Number.isNaN(monthlyMinor) &&
      dailyMinor > monthlyMinor
    ) {
      errs.monthly = 'Monthly limit must be at least the daily limit.';
    }
    return errs;
  }, [dailyMinor, monthlyMinor, bounds, currency]);

  const isDirty =
    (initialDaily ?? -1) !== (dailyMinor ?? -1) ||
    (initialMonthly ?? -1) !== (monthlyMinor ?? -1);

  const canSave =
    !readOnly &&
    isDirty &&
    !validationErrors.daily &&
    !validationErrors.monthly &&
    !updateLimits.loading;

  const onSave = async () => {
    setDailyError(validationErrors.daily ?? null);
    setMonthlyError(validationErrors.monthly ?? null);
    if (validationErrors.daily || validationErrors.monthly) return;

    try {
      await updateLimits.mutate({
        dailyLimit:
          dailyMinor === null
            ? null
            : { amountMinor: dailyMinor, currency },
        monthlyLimit:
          monthlyMinor === null
            ? null
            : { amountMinor: monthlyMinor, currency },
      });
      Alert.alert('Limits updated', 'Your card limits have been saved.');
      router.back();
    } catch (e) {
      if (e instanceof ApiError) {
        const msg = mapErrorCode(e.code) ?? e.message;
        if (e.code === 'CARD_LIMIT_INVALID_HIERARCHY') {
          setMonthlyError(msg);
          return;
        }
        if (e.code === 'CARD_LIMIT_OUT_OF_RANGE') {
          setDailyError(msg);
          setMonthlyError(msg);
          return;
        }
        Alert.alert('Couldn’t update limits', msg);
        return;
      }
      Alert.alert('Couldn’t update limits', 'Try again later.');
    }
  };

  const onResetDefaults = () => {
    setDailyInput('');
    setMonthlyInput('');
    setDailyError(null);
    setMonthlyError(null);
  };

  return (
    <SafeAreaView edges={['left', 'right']} style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border, paddingTop: insets.top + 14 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Back">
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Card limits</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}>
        {!card ? (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.note, { color: colors.textSecondary }]}>
              No card yet. Issue a card to set spending limits.
            </Text>
          </View>
        ) : (
          <>
            {isFrozen && (
              <View style={[styles.bannerInfo, { backgroundColor: colors.surfaceAlt }]}>
                <Text style={[styles.bannerInfoText, { color: colors.textSecondary }]}>
                  Limits can be changed when the card is active. Unfreeze first.
                </Text>
              </View>
            )}

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Spending limits</Text>
              <View style={[styles.card, { backgroundColor: colors.surface }]}>
                <View style={styles.limitRow}>
                  <Text style={[styles.limitLabel, { color: colors.textSecondary }]}>Daily limit</Text>
                  <View
                    style={[
                      styles.inputRow,
                      { backgroundColor: colors.background, borderColor: dailyError ? colors.red : colors.border },
                      readOnly && styles.inputDisabled,
                    ]}
                  >
                    <Text style={[styles.currencyPrefix, { color: colors.textSecondary }]}>£</Text>
                    <TextInput
                      style={[styles.input, { color: colors.text }]}
                      value={dailyInput}
                      onChangeText={(v) => {
                        setDailyInput(v);
                        if (dailyError) setDailyError(null);
                      }}
                      keyboardType="decimal-pad"
                      placeholder={formatMinorAsInput(bounds.dailyMin)}
                      placeholderTextColor={colors.textTertiary}
                      editable={!readOnly}
                      accessibilityLabel="Daily spending limit"
                    />
                    <Text style={[styles.currencySuffix, { color: colors.textTertiary }]}>{currency}</Text>
                  </View>
                  {(dailyError ?? validationErrors.daily) && (
                    <Text style={[styles.fieldError, { color: colors.red }]}>
                      {dailyError ?? validationErrors.daily}
                    </Text>
                  )}
                  <Text style={[styles.fieldHint, { color: colors.textTertiary }]}>
                    Between {formatMoney(bounds.dailyMin, currency)} and {formatMoney(bounds.dailyMax, currency)}. Leave empty to use the default.
                  </Text>
                </View>

                <View style={[styles.limitRow, styles.limitRowBorder, { borderTopColor: colors.borderLight }]}>
                  <Text style={[styles.limitLabel, { color: colors.textSecondary }]}>Monthly limit</Text>
                  <View
                    style={[
                      styles.inputRow,
                      { backgroundColor: colors.background, borderColor: monthlyError ? colors.red : colors.border },
                      readOnly && styles.inputDisabled,
                    ]}
                  >
                    <Text style={[styles.currencyPrefix, { color: colors.textSecondary }]}>£</Text>
                    <TextInput
                      style={[styles.input, { color: colors.text }]}
                      value={monthlyInput}
                      onChangeText={(v) => {
                        setMonthlyInput(v);
                        if (monthlyError) setMonthlyError(null);
                      }}
                      keyboardType="decimal-pad"
                      placeholder={formatMinorAsInput(bounds.monthlyMin)}
                      placeholderTextColor={colors.textTertiary}
                      editable={!readOnly}
                      accessibilityLabel="Monthly spending limit"
                    />
                    <Text style={[styles.currencySuffix, { color: colors.textTertiary }]}>{currency}</Text>
                  </View>
                  {(monthlyError ?? validationErrors.monthly) && (
                    <Text style={[styles.fieldError, { color: colors.red }]}>
                      {monthlyError ?? validationErrors.monthly}
                    </Text>
                  )}
                  <Text style={[styles.fieldHint, { color: colors.textTertiary }]}>
                    Between {formatMoney(bounds.monthlyMin, currency)} and {formatMoney(bounds.monthlyMax, currency)}. Leave empty to use the default.
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                onPress={onResetDefaults}
                disabled={readOnly}
                style={[styles.secondaryBtn, { borderColor: colors.border, backgroundColor: colors.surface }, readOnly && styles.btnDisabled]}
                accessibilityLabel="Reset to default limits"
              >
                <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Reset to defaults</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onSave}
                disabled={!canSave}
                style={[styles.primaryBtn, { backgroundColor: colors.primary }, !canSave && styles.btnDisabled]}
                accessibilityLabel="Save limits"
              >
                {updateLimits.loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Save changes</Text>
                )}
              </TouchableOpacity>
            </View>

            <Text style={[styles.note, { color: colors.textTertiary }]}>
              Limits reset daily at midnight UTC and monthly on the 1st. Contact support to request a limit increase.
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 19, fontFamily: 'Inter-SemiBold' },
  scroll: { padding: 16, paddingBottom: 80 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontFamily: 'Inter-Bold', marginBottom: 10 },
  card: { borderRadius: 16, overflow: 'hidden' },
  limitRow: { padding: 14, gap: 8 },
  limitRowBorder: { borderTopWidth: 1 },
  limitLabel: { fontSize: 16, fontFamily: 'Inter-Medium' },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 12 },
  inputDisabled: { opacity: 0.5 },
  input: { flex: 1, paddingVertical: 12, fontSize: 17, fontFamily: 'Inter-Regular' },
  currencyPrefix: { fontSize: 17, fontFamily: 'Inter-Medium', marginRight: 4 },
  currencySuffix: { fontSize: 14, fontFamily: 'Inter-Medium', marginLeft: 6 },
  fieldError: { fontSize: 14, fontFamily: 'Inter-Medium' },
  fieldHint: { fontSize: 13, fontFamily: 'Inter-Regular' },
  bannerInfo: { borderRadius: 12, padding: 14, marginBottom: 16 },
  bannerInfoText: { fontSize: 15, fontFamily: 'Inter-Medium' },
  actions: { flexDirection: 'row', gap: 12, marginVertical: 16 },
  primaryBtn: { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { fontSize: 17, fontFamily: 'Inter-SemiBold', color: '#fff' },
  secondaryBtn: { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  secondaryBtnText: { fontSize: 17, fontFamily: 'Inter-SemiBold' },
  btnDisabled: { opacity: 0.5 },
  note: { fontSize: 13, fontFamily: 'Inter-Regular', textAlign: 'center', lineHeight: 18, marginTop: 4 },
});
