// Delete card screen — backend-wired per docs/mobile/specs/03-cards.ru.md §4.3.
//
// Backend `DELETE /card` body carries only an optional `reason`. The PIN
// field on this screen is a UX gate (MVP stub: "1234") — never sent to the
// backend. PIN is held in local useState only and cleared on unmount /
// success.
//
// On 204: dispatch `CARD/CLEAR_API` (handled inside useCloseCard) and
// redirect back to the (tabs)/card empty state.

import React, { useEffect, useState } from 'react';
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
import { ArrowLeft, TriangleAlert as AlertTriangle, Eye, EyeOff } from 'lucide-react-native';

import { useTheme } from '@/context/ThemeContext';
import { useWallet } from '@/context/WalletContext';
import { useCloseCard } from '@/hooks/useCloseCard';
import type { Card as ApiCard, CardCloseReason } from '@/types/card';
import { ApiError, mapErrorCode } from '@/utils/errors';
import { formatMoney } from '@/utils/format';

const CLOSE_REASONS: { value: CardCloseReason; label: string }[] = [
  { value: 'user_request', label: 'User request' },
  { value: 'lost', label: 'Lost' },
  { value: 'stolen', label: 'Stolen' },
  { value: 'replaced', label: 'Replaced' },
  { value: 'other', label: 'Other' },
];

function fullCard(value: unknown): ApiCard | null {
  if (!value) return null;
  if (typeof value === 'object' && 'lifecycleStatus' in (value as object)) {
    return value as ApiCard;
  }
  return null;
}

export default function DeleteCardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state } = useWallet();
  const { colors } = useTheme();
  const closeCard = useCloseCard();

  const card = fullCard(state.card);
  const balance = state.wallet?.balance;
  const balanceLabel = balance
    ? formatMoney(balance.amountMinor, balance.currency)
    : null;

  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [reason, setReason] = useState<CardCloseReason>('user_request');

  // Make absolutely sure PIN never persists past this screen.
  useEffect(() => {
    return () => setPin('');
  }, []);

  const handleDelete = async () => {
    if (pin !== '1234') {
      setPinError('Incorrect PIN. Please try again.');
      return;
    }
    setPinError(null);
    try {
      await closeCard.mutate({ reason });
      setPin('');
      Alert.alert('Card closed', 'Your card has been closed. You can request a new one anytime.');
      router.replace('/(tabs)/card');
    } catch (e) {
      const msg = e instanceof ApiError ? mapErrorCode(e.code) ?? e.message : 'Try again later.';
      Alert.alert('Couldn’t close card', msg);
    }
  };

  return (
    <SafeAreaView edges={['left', 'right']} style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border, paddingTop: insets.top + 14 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Back">
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Delete card</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}>
        <View style={[styles.warningIcon, { backgroundColor: colors.redLight }]}>
          <AlertTriangle size={48} color={colors.red} />
        </View>
        <Text style={[styles.warningTitle, { color: colors.text }]}>Delete this card?</Text>

        <View style={[styles.consequenceCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.consequenceTitle, { color: colors.textSecondary }]}>What will happen:</Text>
          {[
            'Your card will be permanently closed',
            'Auto-reload will be turned off',
            'Apple/Google Wallet tokens will be removed from all devices',
            balanceLabel
              ? `Your wallet balance (${balanceLabel}) will remain untouched`
              : 'Your wallet balance will remain untouched',
          ].map((item) => (
            <View key={item} style={styles.consequenceRow}>
              <View style={[styles.bullet, { backgroundColor: colors.textSecondary }]} />
              <Text style={[styles.consequenceText, { color: colors.textSecondary }]}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Reason</Text>
          <View style={[styles.reasonGroup, { backgroundColor: colors.surface }]}>
            {CLOSE_REASONS.map(({ value, label }) => {
              const selected = reason === value;
              return (
                <TouchableOpacity
                  key={value}
                  style={styles.reasonRow}
                  onPress={() => setReason(value)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                >
                  <View
                    style={[
                      styles.radio,
                      { borderColor: selected ? colors.primary : colors.border },
                    ]}
                  >
                    {selected && (
                      <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />
                    )}
                  </View>
                  <Text style={[styles.reasonLabel, { color: colors.text }]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Enter your card PIN</Text>
          <View style={[styles.inputRow, { backgroundColor: colors.surface, borderColor: pinError ? colors.red : colors.border }]}>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              value={pin}
              onChangeText={(v) => {
                setPin(v.replace(/\D/g, '').slice(0, 6));
                if (pinError) setPinError(null);
              }}
              secureTextEntry={!showPin}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="••••"
              placeholderTextColor={colors.textTertiary}
              accessibilityLabel="Card PIN"
            />
            <TouchableOpacity
              onPress={() => setShowPin((v) => !v)}
              style={styles.eyeBtn}
              accessibilityLabel={showPin ? 'Hide PIN' : 'Show PIN'}
            >
              {showPin
                ? <EyeOff size={18} color={colors.textSecondary} />
                : <Eye size={18} color={colors.textSecondary} />}
            </TouchableOpacity>
          </View>
          {pinError && (
            <Text style={[styles.fieldError, { color: colors.red }]}>{pinError}</Text>
          )}
        </View>

        <TouchableOpacity
          style={[styles.deleteBtn, { backgroundColor: colors.red }, (!pin || closeCard.loading || !card) && styles.deleteBtnDisabled]}
          onPress={handleDelete}
          disabled={!pin || closeCard.loading || !card}
          accessibilityLabel="Delete card"
        >
          {closeCard.loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.deleteBtnText}>Delete card</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
          <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 19, fontFamily: 'Inter-SemiBold' },
  scroll: { padding: 16, paddingBottom: 80, alignItems: 'center' },
  warningIcon: { width: 88, height: 88, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  warningTitle: { fontSize: 24, fontFamily: 'Inter-Bold', marginBottom: 20 },
  consequenceCard: { borderRadius: 14, padding: 16, width: '100%', marginBottom: 24, gap: 10 },
  consequenceTitle: { fontSize: 16, fontFamily: 'Inter-SemiBold', marginBottom: 4 },
  consequenceRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  bullet: { width: 6, height: 6, borderRadius: 3, marginTop: 6 },
  consequenceText: { fontSize: 16, fontFamily: 'Inter-Regular', flex: 1, lineHeight: 20 },
  field: { width: '100%', marginBottom: 16 },
  label: { fontSize: 15, fontFamily: 'Inter-SemiBold', marginBottom: 6 },
  reasonGroup: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
  reasonRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 6 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 12, height: 12, borderRadius: 6 },
  reasonLabel: { fontSize: 16, fontFamily: 'Inter-Medium' },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 12 },
  input: { flex: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 17, fontFamily: 'Inter-Regular' },
  eyeBtn: { paddingRight: 14 },
  fieldError: { marginTop: 6, fontSize: 14, fontFamily: 'Inter-Medium' },
  deleteBtn: { width: '100%', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 10 },
  deleteBtnDisabled: { opacity: 0.5 },
  deleteBtnText: { fontSize: 18, fontFamily: 'Inter-SemiBold', color: '#fff' },
  cancelBtn: { paddingVertical: 12 },
  cancelBtnText: { fontSize: 17, fontFamily: 'Inter-Medium' },
});
