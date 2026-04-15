import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, TriangleAlert as AlertTriangle, Eye, EyeOff } from 'lucide-react-native';
import { useWallet } from '@/context/WalletContext';
import { useTheme } from '@/context/ThemeContext';

export default function DeleteCardScreen() {
  const router = useRouter();
  const { deleteCard } = useWallet();
  const { colors, isDark } = useTheme();
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  const handleDelete = () => {
    if (password !== '1234') {
      Alert.alert('Wrong password', 'Please enter your correct password to confirm.');
      return;
    }
    deleteCard();
    Alert.alert('Card deleted', 'Your Tesco Wallet card has been deleted.');
    router.replace('/(tabs)/card');
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Delete card</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.warningIcon, { backgroundColor: colors.redLight }]}>
          <AlertTriangle size={48} color={colors.red} />
        </View>
        <Text style={[styles.warningTitle, { color: colors.text }]}>Delete this card?</Text>

        <View style={[styles.consequenceCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.consequenceTitle, { color: colors.textSecondary }]}>What will happen:</Text>
          {[
            'Your Tesco Wallet card will be permanently deleted',
            'Auto-reload will be turned off',
            'Apple/Google Wallet provisioning will be removed',
            'Your wallet balance will not be affected',
          ].map((item) => (
            <View key={item} style={styles.consequenceRow}>
              <View style={[styles.bullet, { backgroundColor: colors.textSecondary }]} />
              <Text style={[styles.consequenceText, { color: colors.textSecondary }]}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Enter password to confirm</Text>
          <View style={[styles.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPass}
              placeholder="Your password"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowPass((v) => !v)} style={styles.eyeBtn}>
              {showPass ? <EyeOff size={18} color={colors.textSecondary} /> : <Eye size={18} color={colors.textSecondary} />}
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.deleteBtn, { backgroundColor: colors.red }, !password && styles.deleteBtnDisabled]}
          onPress={handleDelete}
          disabled={!password}
        >
          <Text style={styles.deleteBtnText}>Delete card</Text>
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
  scroll: { padding: 16, paddingBottom: 40, alignItems: 'center' },
  warningIcon: { width: 88, height: 88, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  warningTitle: { fontSize: 24, fontFamily: 'Inter-Bold', marginBottom: 20 },
  consequenceCard: { borderRadius: 14, padding: 16, width: '100%', marginBottom: 24, gap: 10 },
  consequenceTitle: { fontSize: 16, fontFamily: 'Inter-SemiBold', marginBottom: 4 },
  consequenceRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  bullet: { width: 6, height: 6, borderRadius: 3, marginTop: 6 },
  consequenceText: { fontSize: 16, fontFamily: 'Inter-Regular', flex: 1, lineHeight: 20 },
  field: { width: '100%', marginBottom: 16 },
  label: { fontSize: 15, fontFamily: 'Inter-SemiBold', marginBottom: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 12 },
  input: { flex: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 17, fontFamily: 'Inter-Regular' },
  eyeBtn: { paddingRight: 14 },
  deleteBtn: { width: '100%', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 10 },
  deleteBtnDisabled: { opacity: 0.5 },
  deleteBtnText: { fontSize: 18, fontFamily: 'Inter-SemiBold', color: '#fff' },
  cancelBtn: { paddingVertical: 12 },
  cancelBtnText: { fontSize: 17, fontFamily: 'Inter-Medium' },
});
