import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Plus, Smartphone, Building2, CreditCard, Check, Trash2 } from 'lucide-react-native';
import { useWallet } from '@/context/WalletContext';
import { useTheme } from '@/context/ThemeContext';

export default function PaymentMethodsScreen() {
  const router = useRouter();
  const { state, removePaymentMethod, setDefaultPaymentMethod } = useWallet();
  const { colors, isDark } = useTheme();

  const { paymentMethods } = state;

  const getIcon = (type: string) => {
    if (type === 'apple_pay' || type === 'google_pay') return Smartphone;
    if (type === 'bank_transfer') return Building2;
    return CreditCard;
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Payment methods</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.shadowColor }]}>
          {paymentMethods.map((pm, idx) => {
            const Icon = getIcon(pm.type);
            return (
              <View key={pm.id} style={[styles.row, idx < paymentMethods.length - 1 && [styles.rowBorder, { borderBottomColor: colors.borderLight }]]}>
                <View style={[styles.iconBox, { backgroundColor: isDark ? colors.surfaceAlt : '#eff6ff' }]}>
                  <Icon size={18} color={colors.primary} />
                </View>
                <View style={styles.pmInfo}>
                  <Text style={[styles.pmLabel, { color: colors.text }]}>{pm.label}</Text>
                  {pm.last4 && <Text style={[styles.pmSub, { color: colors.textTertiary }]}>Ending ••{pm.last4}</Text>}
                </View>
                <View style={styles.actions}>
                  {pm.isDefault ? (
                    <View style={[styles.defaultBadge, { backgroundColor: colors.greenLight }]}>
                      <Check size={12} color={colors.green} />
                      <Text style={[styles.defaultText, { color: colors.green }]}>Default</Text>
                    </View>
                  ) : (
                    <TouchableOpacity onPress={() => setDefaultPaymentMethod(pm.id)}>
                      <Text style={[styles.setDefaultText, { color: colors.primary }]}>Set default</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() => Alert.alert('Remove', `Remove ${pm.label}?`, [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Remove', style: 'destructive', onPress: () => removePaymentMethod(pm.id) },
                    ])}
                  >
                    <Trash2 size={16} color={colors.red} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.addRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => router.push('/payment-methods/add')}
        >
          <View style={[styles.addIcon, { backgroundColor: isDark ? colors.surfaceAlt : '#eff6ff' }]}>
            <Plus size={18} color={colors.primary} />
          </View>
          <Text style={[styles.addText, { color: colors.primary }]}>Add new card</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontFamily: 'Inter-SemiBold' },
  scroll: { padding: 16, paddingBottom: 40 },
  card: { borderRadius: 16, overflow: 'hidden', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  rowBorder: { borderBottomWidth: 1 },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  pmInfo: { flex: 1 },
  pmLabel: { fontSize: 15, fontFamily: 'Inter-SemiBold' },
  pmSub: { fontSize: 12, fontFamily: 'Inter-Regular', marginTop: 2 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  defaultBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  defaultText: { fontSize: 11, fontFamily: 'Inter-SemiBold' },
  setDefaultText: { fontSize: 12, fontFamily: 'Inter-SemiBold' },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14, borderWidth: 1.5, borderStyle: 'dashed' },
  addIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  addText: { fontSize: 15, fontFamily: 'Inter-SemiBold' },
});
