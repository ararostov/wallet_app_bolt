import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { X, ChevronRight, Smartphone, Building2, CreditCard, Plus } from 'lucide-react-native';
import { Platform } from 'react-native';
import { useWallet } from '@/context/WalletContext';
import { useTheme } from '@/context/ThemeContext';
import { formatCurrency } from '@/utils/format';

const QUICK_AMOUNTS = [20, 50, 100, 200];

const digitalWalletMethod = Platform.OS === 'android'
  ? { id: 'google_pay', label: 'Google Pay', icon: Smartphone, isAddCard: false }
  : { id: 'apple_pay', label: 'Apple Pay', icon: Smartphone, isAddCard: false };

const METHODS = [
  digitalWalletMethod,
  { id: 'bank', label: 'Pay By Bank (Open Banking)', icon: Building2, isAddCard: false },
  { id: 'card', label: 'Saved card ••4242', icon: CreditCard, isAddCard: false },
  { id: 'add_card', label: 'Add new card', icon: Plus, isAddCard: true },
];

export default function TopupScreen() {
  const router = useRouter();
  const { state } = useWallet();
  const { colors, isDark } = useTheme();
  const [selectedAmount, setSelectedAmount] = useState<number | null>(50);
  const [customAmount, setCustomAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState(METHODS[0]);
  const [methodModalOpen, setMethodModalOpen] = useState(false);

  const amount = selectedAmount ?? (parseFloat(customAmount) || 0);
  const isBonusPending = state.wallet.bonusState === 'pending' || state.wallet.bonusState === 'progress';
  const willUnlockBonus = isBonusPending && amount >= state.wallet.topUpTarget;
  const isValid = amount >= 5;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <X size={22} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Top Up</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {isBonusPending && (
          <View style={styles.bonusBanner}>
            <Text style={styles.bonusBannerText}>
              {'\uD83C\uDF81'} Top up {formatCurrency(state.wallet.topUpTarget)} to unlock your {formatCurrency(state.wallet.bonusAmount)} bonus reward
            </Text>
          </View>
        )}

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Select amount</Text>
        <View style={styles.amountsGrid}>
          {QUICK_AMOUNTS.map((amt) => (
            <TouchableOpacity
              key={amt}
              style={[styles.amountCard, { backgroundColor: colors.surface, borderColor: colors.border }, selectedAmount === amt && { borderColor: colors.primary, backgroundColor: isDark ? colors.surfaceAlt : '#eff6ff' }]}
              onPress={() => { setSelectedAmount(amt); setCustomAmount(''); }}
            >
              <Text style={[styles.amountValue, { color: colors.text }, selectedAmount === amt && { color: colors.primary }]}>
                {formatCurrency(amt)}
              </Text>
              {isBonusPending && amt >= state.wallet.topUpTarget && (
                <View style={styles.bonusChip}>
                  <Text style={styles.bonusChipText}>+{formatCurrency(state.wallet.bonusAmount)} bonus</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Or enter custom amount</Text>
        <View style={[styles.customAmountRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.poundSign, { color: colors.textSecondary }]}>{'\u00A3'}</Text>
          <TextInput
            style={[styles.customInput, { color: colors.text }]}
            placeholder="0.00"
            placeholderTextColor={colors.textTertiary}
            keyboardType="decimal-pad"
            value={customAmount}
            onChangeText={(t) => { setCustomAmount(t); setSelectedAmount(null); }}
          />
        </View>
        {customAmount !== '' && parseFloat(customAmount) < 5 && (
          <Text style={[styles.errorText, { color: colors.red }]}>Minimum top-up is {'\u00A3'}5</Text>
        )}

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Payment method</Text>
        <TouchableOpacity style={[styles.methodSelector, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setMethodModalOpen(true)}>
          <selectedMethod.icon size={18} color={colors.primary} />
          <Text style={[styles.methodLabel, { color: colors.text }]}>{selectedMethod.label}</Text>
          <ChevronRight size={18} color={colors.textTertiary} />
        </TouchableOpacity>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        {amount > 0 && (
          <Text style={[styles.footerSummary, { color: colors.textSecondary }]}>
            You'll pay <Text style={[styles.footerBold, { color: colors.text }]}>{formatCurrency(amount)}</Text>
            {willUnlockBonus && ` + receive ${formatCurrency(state.wallet.bonusAmount)} bonus`}
          </Text>
        )}
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.primary }, !isValid && styles.primaryBtnDisabled]}
          disabled={!isValid}
          onPress={() => router.push({ pathname: '/topup/review', params: { amount: amount.toString(), method: selectedMethod.label } } as any)}
        >
          <Text style={styles.primaryBtnText}>Continue</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={methodModalOpen} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalSafe, { backgroundColor: colors.surface }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Payment method</Text>
            <TouchableOpacity onPress={() => setMethodModalOpen(false)}>
              <X size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          {METHODS.map((method) => {
            const Icon = method.icon;
            return (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.methodOption,
                  { borderColor: colors.border },
                  method.isAddCard && { borderStyle: 'dashed' },
                  selectedMethod.id === method.id && { borderColor: colors.primary, backgroundColor: isDark ? colors.surfaceAlt : '#eff6ff' },
                ]}
                onPress={() => { setSelectedMethod(method); setMethodModalOpen(false); }}
              >
                <Icon size={20} color={method.isAddCard ? colors.textSecondary : colors.primary} />
                <Text style={[styles.methodOptionLabel, { color: method.isAddCard ? colors.textSecondary : colors.text }]}>{method.label}</Text>
                {selectedMethod.id === method.id && (
                  <View style={[styles.selectedDot, { backgroundColor: colors.primary }]} />
                )}
              </TouchableOpacity>
            );
          })}
        </SafeAreaView>
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
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: { fontSize: 19, fontFamily: 'Inter-SemiBold' },
  scroll: { padding: 16, paddingBottom: 120 },
  bonusBanner: {
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  bonusBannerText: { fontSize: 16, fontFamily: 'Inter-Medium', color: '#92400e', lineHeight: 20 },
  sectionLabel: { fontSize: 15, fontFamily: 'Inter-SemiBold', marginBottom: 10, letterSpacing: 0.3 },
  amountsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  amountCard: {
    width: '47%',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    gap: 6,
  },
  amountValue: { fontSize: 26, fontFamily: 'Inter-Bold' },
  bonusChip: { backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  bonusChipText: { fontSize: 15, fontFamily: 'Inter-SemiBold', color: '#15803d' },
  customAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  poundSign: { fontSize: 24, fontFamily: 'Inter-SemiBold', marginRight: 4 },
  customInput: { flex: 1, paddingVertical: 14, fontSize: 24, fontFamily: 'Inter-SemiBold' },
  errorText: { fontSize: 15, marginBottom: 16, fontFamily: 'Inter-Regular' },
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
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, borderTopWidth: 1, gap: 8 },
  footerSummary: { fontSize: 16, fontFamily: 'Inter-Regular', textAlign: 'center' },
  footerBold: { fontFamily: 'Inter-SemiBold' },
  primaryBtn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { fontSize: 18, fontFamily: 'Inter-SemiBold', color: '#fff' },
  modalSafe: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 19, fontFamily: 'Inter-Bold' },
  methodOption: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, marginHorizontal: 16, marginTop: 8, borderRadius: 12, borderWidth: 1.5 },
  methodOptionLabel: { flex: 1, fontSize: 17, fontFamily: 'Inter-Medium' },
  selectedDot: { width: 10, height: 10, borderRadius: 5 },
});
