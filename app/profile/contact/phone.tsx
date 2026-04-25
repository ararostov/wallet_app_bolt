// Change-phone request screen — POST /user/contact/phone/request.

import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, TriangleAlert as AlertTriangle } from 'lucide-react-native';

import { useTheme } from '@/context/ThemeContext';
import { useWallet } from '@/context/WalletContext';
import { useRequestPhoneChange } from '@/hooks/useRequestPhoneChange';
import { ApiError } from '@/utils/errors';
import { formatPhoneE164 } from '@/utils/format';
import { isValidE164 } from '@/utils/validators';

export default function ChangePhoneScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state } = useWallet();
  const { colors } = useTheme();

  const requestChange = useRequestPhoneChange();
  const [newPhone, setNewPhone] = useState('+44');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const currentPhone = state.user?.phoneE164 ?? state.user?.phone ?? '';

  const isValid = isValidE164(newPhone) && newPhone !== currentPhone;

  const handleSubmit = async () => {
    setFieldError(null);
    setGlobalError(null);
    if (!isValidE164(newPhone)) {
      setFieldError('Enter a valid phone number in international format (e.g. +447911123456).');
      return;
    }
    if (newPhone === currentPhone) {
      setFieldError('Enter a different phone.');
      return;
    }
    try {
      await requestChange.mutate({ newPhoneE164: newPhone });
      router.push('/profile/contact/phone-otp');
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.code === 'CONTACT_IDENTIFIER_SAME_AS_CURRENT') {
          setFieldError('Enter a different phone.');
          return;
        }
        if (e.code === 'CONTACT_IDENTIFIER_ALREADY_TAKEN') {
          setFieldError('This phone number is already in use.');
          return;
        }
        setGlobalError(e.message);
        return;
      }
      setGlobalError('Could not request phone change. Please try again.');
    }
  };

  return (
    <SafeAreaView edges={['left', 'right']} style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border, paddingTop: insets.top + 14 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Back">
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Change phone</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Current phone</Text>
          <Text style={[styles.readonly, { color: colors.text }]}>
            {currentPhone ? formatPhoneE164(currentPhone) : '—'}
          </Text>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>New phone</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: fieldError ? colors.red : colors.border, color: colors.text }]}
            value={newPhone}
            onChangeText={(v) => {
              setNewPhone(v.replace(/[^\d+]/g, ''));
              if (fieldError) setFieldError(null);
            }}
            keyboardType="phone-pad"
            autoComplete="tel"
            placeholder="+44..."
            placeholderTextColor={colors.textTertiary}
          />
          {fieldError && <Text style={[styles.errorText, { color: colors.red }]}>{fieldError}</Text>}
          <Text style={[styles.hint, { color: colors.textTertiary }]}>
            We'll send a 6-digit verification code by SMS to your new number.
          </Text>
        </View>

        {globalError && (
          <View style={[styles.warningRow, { backgroundColor: colors.redLight }]}>
            <AlertTriangle size={16} color={colors.red} />
            <Text style={{ color: colors.red, fontFamily: 'Inter-SemiBold' }}>{globalError}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.primary }, (!isValid || requestChange.loading) && styles.primaryBtnDisabled]}
          onPress={handleSubmit}
          disabled={!isValid || requestChange.loading}
        >
          <Text style={styles.primaryBtnText}>
            {requestChange.loading ? 'Sending...' : 'Send verification code'}
          </Text>
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
  scroll: { padding: 16, paddingBottom: 80 },
  field: { marginBottom: 16 },
  label: { fontSize: 15, fontFamily: 'Inter-SemiBold', marginBottom: 6 },
  readonly: { fontSize: 17, fontFamily: 'Inter-Medium' },
  input: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 17, fontFamily: 'Inter-Regular' },
  errorText: { fontSize: 13, fontFamily: 'Inter-Regular', marginTop: 6 },
  hint: { fontSize: 13, fontFamily: 'Inter-Regular', marginTop: 6 },
  warningRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, marginBottom: 12 },
  primaryBtn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { fontSize: 18, fontFamily: 'Inter-SemiBold', color: '#fff' },
});
