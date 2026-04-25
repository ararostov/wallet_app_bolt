// Personal info screen — wired to GET/PATCH /user/profile.
// Editable: firstName, lastName, marketingOptIn.
// Read-only with deep links: dateOfBirth (immutable), email/phone (OTP flow).

import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
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
import { ArrowLeft, ChevronRight, Lock } from 'lucide-react-native';

import { useTheme } from '@/context/ThemeContext';
import { useWallet } from '@/context/WalletContext';
import { useQuery } from '@/hooks/useQuery';
import { useUpdateProfile } from '@/hooks/useUpdateProfile';
import { profileApi } from '@/utils/api/profile';
import { ApiError } from '@/utils/errors';
import { formatDate, formatPhoneE164 } from '@/utils/format';
import type { UpdateProfileRequest, UserProfile } from '@/types/profile';

export default function PersonalInfoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, dispatch } = useWallet();
  const { colors } = useTheme();

  const { data: profile, loading: profileLoading } = useQuery<UserProfile>(
    'profile/me',
    () => profileApi.getProfile().then((data) => ({ data })),
  );

  const baseFirstName = profile?.firstName ?? state.user?.firstName ?? '';
  const baseLastName = profile?.lastName ?? state.user?.lastName ?? '';
  const baseMarketingOptIn =
    profile?.marketingOptIn ?? state.user?.marketingOptIn ?? false;

  const [firstName, setFirstName] = useState(baseFirstName);
  const [lastName, setLastName] = useState(baseLastName);
  const [marketingOptIn, setMarketingOptIn] = useState<boolean>(baseMarketingOptIn);
  const [firstNameError, setFirstNameError] = useState<string | null>(null);
  const [lastNameError, setLastNameError] = useState<string | null>(null);

  // Sync local form state to fresh server payload on first/refetched load.
  useEffect(() => {
    if (!profile) return;
    setFirstName(profile.firstName ?? '');
    setLastName(profile.lastName ?? '');
    setMarketingOptIn(profile.marketingOptIn);
    // Mirror canonical profile into WalletContext.user for cross-screen reads.
    dispatch({
      type: 'UPDATE_USER',
      payload: {
        id: profile.id,
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email ?? '',
        phone: profile.phoneE164 ?? undefined,
        phoneE164: profile.phoneE164 ?? undefined,
        dob: profile.dateOfBirth ?? '',
        emailVerified: profile.emailVerified,
        phoneVerified: profile.phoneVerified,
        hasPassword: profile.hasPassword,
        hasDateOfBirth: profile.hasDateOfBirth,
        marketingOptIn: profile.marketingOptIn,
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, profile?.updatedAt]);

  const update = useUpdateProfile();

  const isDirty = useMemo(
    () =>
      firstName !== baseFirstName ||
      lastName !== baseLastName ||
      marketingOptIn !== baseMarketingOptIn,
    [firstName, lastName, marketingOptIn, baseFirstName, baseLastName, baseMarketingOptIn],
  );

  const validate = (): boolean => {
    let ok = true;
    if (firstName.trim().length === 0 || firstName.trim().length > 60) {
      setFirstNameError('Enter a valid first name (1-60 characters).');
      ok = false;
    } else {
      setFirstNameError(null);
    }
    if (lastName.trim().length === 0 || lastName.trim().length > 60) {
      setLastNameError('Enter a valid last name (1-60 characters).');
      ok = false;
    } else {
      setLastNameError(null);
    }
    return ok;
  };

  const handleSave = async () => {
    if (!validate()) return;
    const payload: UpdateProfileRequest = {};
    if (firstName !== baseFirstName) payload.firstName = firstName.trim();
    if (lastName !== baseLastName) payload.lastName = lastName.trim();
    if (marketingOptIn !== baseMarketingOptIn) payload.marketingOptIn = marketingOptIn;
    if (Object.keys(payload).length === 0) return;

    try {
      await update.mutate(payload);
      Alert.alert('Saved', 'Your personal info has been updated.');
      router.back();
    } catch (e) {
      const message =
        e instanceof ApiError
          ? e.message
          : 'Could not save your changes. Please try again.';
      Alert.alert('Could not save', message);
    }
  };

  const phoneDisplay = profile?.phoneE164
    ? formatPhoneE164(profile.phoneE164)
    : state.user?.phone ?? '—';
  const emailDisplay = profile?.email ?? state.user?.email ?? '—';
  const dobDisplay =
    profile?.dateOfBirth || state.user?.dob
      ? formatDate(profile?.dateOfBirth ?? state.user?.dob ?? '', 'long')
      : '—';

  return (
    <SafeAreaView edges={['left', 'right']} style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border, paddingTop: insets.top + 14 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Back" accessibilityRole="button">
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Personal info</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>First name</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: firstNameError ? colors.red : colors.border, color: colors.text }]}
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
            autoComplete="given-name"
            maxLength={60}
            editable={!profileLoading}
          />
          {firstNameError && <Text style={[styles.errorText, { color: colors.red }]}>{firstNameError}</Text>}
        </View>
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Last name</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: lastNameError ? colors.red : colors.border, color: colors.text }]}
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize="words"
            autoComplete="family-name"
            maxLength={60}
            editable={!profileLoading}
          />
          {lastNameError && <Text style={[styles.errorText, { color: colors.red }]}>{lastNameError}</Text>}
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Date of birth</Text>
          <View style={[styles.lockedField, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.lockedValue, { color: colors.textTertiary }]}>{dobDisplay}</Text>
            <Lock size={16} color={colors.textTertiary} />
          </View>
          <Text style={[styles.hint, { color: colors.textTertiary }]}>Contact support to change your date of birth</Text>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Contact details</Text>

        <TouchableOpacity
          style={styles.contactRow}
          onPress={() => router.push('/profile/contact/email')}
          accessibilityRole="button"
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
            <Text style={[styles.contactValue, { color: colors.text }]}>{emailDisplay}</Text>
            {profile?.emailVerified && (
              <Text style={[styles.verifiedHint, { color: colors.green }]}>Verified</Text>
            )}
          </View>
          <Text style={[styles.changeLink, { color: colors.primary }]}>Change</Text>
          <ChevronRight size={16} color={colors.textTertiary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.contactRow}
          onPress={() => router.push('/profile/contact/phone')}
          accessibilityRole="button"
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Phone</Text>
            <Text style={[styles.contactValue, { color: colors.text }]}>{phoneDisplay}</Text>
            {profile?.phoneVerified && (
              <Text style={[styles.verifiedHint, { color: colors.green }]}>Verified</Text>
            )}
          </View>
          <Text style={[styles.changeLink, { color: colors.primary }]}>Change</Text>
          <ChevronRight size={16} color={colors.textTertiary} />
        </TouchableOpacity>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.contactValue, { color: colors.text }]}>Marketing communications</Text>
            <Text style={[styles.hint, { color: colors.textTertiary }]}>Receive offers and updates from Tesco Wallet</Text>
          </View>
          <Switch
            value={marketingOptIn}
            onValueChange={setMarketingOptIn}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#fff"
          />
        </View>

        <TouchableOpacity
          style={[
            styles.primaryBtn,
            { backgroundColor: colors.primary },
            (!isDirty || update.loading) && styles.primaryBtnDisabled,
          ]}
          onPress={handleSave}
          disabled={!isDirty || update.loading}
        >
          <Text style={styles.primaryBtnText}>
            {update.loading ? 'Saving...' : 'Save changes'}
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
  input: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 17, fontFamily: 'Inter-Regular' },
  errorText: { fontSize: 13, fontFamily: 'Inter-Regular', marginTop: 6 },
  lockedField: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14 },
  lockedValue: { fontSize: 17, fontFamily: 'Inter-Regular' },
  hint: { fontSize: 13, fontFamily: 'Inter-Regular', marginTop: 4 },
  divider: { height: 1, marginVertical: 20 },
  sectionTitle: { fontSize: 18, fontFamily: 'Inter-SemiBold', marginBottom: 14 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  contactValue: { fontSize: 17, fontFamily: 'Inter-Medium', marginTop: 2 },
  verifiedHint: { fontSize: 13, fontFamily: 'Inter-SemiBold', marginTop: 4 },
  changeLink: { fontSize: 16, fontFamily: 'Inter-SemiBold' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  primaryBtn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { fontSize: 18, fontFamily: 'Inter-SemiBold', color: '#fff' },
});
