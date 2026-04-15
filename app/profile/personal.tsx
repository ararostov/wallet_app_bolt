import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Lock } from 'lucide-react-native';
import { useWallet } from '@/context/WalletContext';
import { useTheme } from '@/context/ThemeContext';

export default function PersonalInfoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, updateUser } = useWallet();
  const { colors, isDark } = useTheme();
  const user = state.user;

  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const isDirty = firstName !== user?.firstName || lastName !== user?.lastName;

  const handleSave = () => {
    updateUser({ firstName, lastName });
    Alert.alert('Saved', 'Your personal info has been updated.');
    router.back();
  };

  return (
    <SafeAreaView edges={['left', 'right']} style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border, paddingTop: insets.top + 14 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Personal info</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>First name</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
        </View>
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Last name</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} value={lastName} onChangeText={setLastName} autoCapitalize="words" />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Date of birth</Text>
          <View style={[styles.lockedField, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.lockedValue, { color: colors.textTertiary }]}>{user?.dob ?? '1990-01-15'}</Text>
            <Lock size={16} color={colors.textTertiary} />
          </View>
          <Text style={[styles.hint, { color: colors.textTertiary }]}>Contact support to change your date of birth</Text>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Contact details</Text>

        {[
          { label: 'Phone', value: user?.phone ?? '+44 7700 900000', action: 'Change phone' },
          { label: 'Email', value: user?.email ?? 'alex@example.com', action: 'Change email' },
        ].map(({ label, value, action }) => (
          <View key={label} style={styles.contactRow}>
            <View>
              <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
              <Text style={[styles.contactValue, { color: colors.text }]}>{value}</Text>
            </View>
            <TouchableOpacity onPress={() => Alert.alert(action, 'This feature will be available soon.')}>
              <Text style={[styles.changeLink, { color: colors.primary }]}>{action}</Text>
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.primary }, !isDirty && styles.primaryBtnDisabled]}
          onPress={handleSave}
          disabled={!isDirty}
        >
          <Text style={styles.primaryBtnText}>Save changes</Text>
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
  input: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 17, fontFamily: 'Inter-Regular' },
  lockedField: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14 },
  lockedValue: { fontSize: 17, fontFamily: 'Inter-Regular' },
  hint: { fontSize: 15, fontFamily: 'Inter-Regular', marginTop: 4 },
  divider: { height: 1, marginVertical: 20 },
  sectionTitle: { fontSize: 18, fontFamily: 'Inter-SemiBold', marginBottom: 14 },
  contactRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  contactValue: { fontSize: 17, fontFamily: 'Inter-Medium', marginTop: 2 },
  changeLink: { fontSize: 16, fontFamily: 'Inter-SemiBold' },
  primaryBtn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { fontSize: 18, fontFamily: 'Inter-SemiBold', color: '#fff' },
});
