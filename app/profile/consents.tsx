// Consents screen — wired to GET/PATCH /user/consents.
// Mandatory documents are non-interactive (Lock icon); optional ones expose
// a Switch with optimistic update + rollback on error.

import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
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
import { useUpdateConsents } from '@/hooks/useUpdateConsents';
import { profileApi } from '@/utils/api/profile';
import { ApiError } from '@/utils/errors';
import type { ConsentsStatusResponse, ProfileConsent } from '@/types/profile';

export default function ConsentsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, dispatch } = useWallet();
  const { colors, isDark } = useTheme();

  const { data, loading, error, refetch } = useQuery<ConsentsStatusResponse>(
    'consents',
    () => profileApi.getConsents().then((res) => ({ data: res })),
  );

  // Hydrate the WalletContext consents slice on each successful read.
  useEffect(() => {
    if (!data) return;
    dispatch({
      type: 'CONSENTS/SET',
      payload: { documents: data.documents, marketingOptIn: data.marketingOptIn },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const update = useUpdateConsents();
  const [pendingId, setPendingId] = useState<number | null>(null);

  const documents = state.consents ?? data?.documents ?? [];
  const marketingOptIn = state.marketingOptIn ?? data?.marketingOptIn ?? false;

  const required = useMemo(() => documents.filter((c) => c.mandatory), [documents]);
  const optional = useMemo(() => documents.filter((c) => !c.mandatory), [documents]);

  const togglePending = pendingId !== null || update.loading;

  const buildConsentMap = (override?: { id: number; accepted: boolean }) => {
    const map: Record<string, boolean> = {};
    for (const c of documents) {
      map[String(c.id)] = c.accepted;
    }
    if (override) map[String(override.id)] = override.accepted;
    return map;
  };

  const persistConsents = async (
    next: ProfileConsent[],
    nextMarketing: boolean,
    override?: { id: number; accepted: boolean },
  ) => {
    // Optimistic dispatch.
    dispatch({
      type: 'CONSENTS/SET',
      payload: { documents: next, marketingOptIn: nextMarketing },
    });
    setPendingId(override ? override.id : -1);
    try {
      await update.mutate({
        consents: buildConsentMap(override),
        marketingOptIn: nextMarketing,
      });
    } catch (e) {
      // Rollback to previous state.
      dispatch({
        type: 'CONSENTS/SET',
        payload: {
          documents: documents,
          marketingOptIn,
        },
      });
      const message = e instanceof ApiError ? e.message : 'Could not update consent.';
      Alert.alert('Could not update', message);
    } finally {
      setPendingId(null);
    }
  };

  const onToggleOptional = (consent: ProfileConsent, value: boolean) => {
    const next = documents.map((c) =>
      c.id === consent.id ? { ...c, accepted: value } : c,
    );
    void persistConsents(next, marketingOptIn, { id: consent.id, accepted: value });
  };

  const onToggleMarketing = (value: boolean) => {
    void persistConsents(documents, value);
  };

  const openDocument = (consent: ProfileConsent) => {
    router.push(`/legal/${encodeURIComponent(String(consent.id))}` as never);
  };

  return (
    <SafeAreaView edges={['left', 'right']} style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border, paddingTop: insets.top + 14 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Back">
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Consents</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}>
        <Text style={[styles.intro, { color: colors.textSecondary }]}>
          Manage how we use your data and the terms you accept.
        </Text>

        {loading && documents.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : error && documents.length === 0 ? (
          <View style={styles.center}>
            <Text style={{ color: colors.red, marginBottom: 12 }}>
              Could not load consents.
            </Text>
            <TouchableOpacity onPress={() => void refetch()}>
              <Text style={{ color: colors.primary, fontFamily: 'Inter-SemiBold' }}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {required.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>Required</Text>
                <View style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.shadowColor }]}>
                  {required.map((consent, idx) => (
                    <TouchableOpacity
                      key={consent.id}
                      style={[styles.row, idx < required.length - 1 && [styles.rowBorder, { borderBottomColor: colors.borderLight }]]}
                      onPress={() => openDocument(consent)}
                      accessibilityRole="button"
                      accessibilityLabel={`${consent.title}, required`}
                    >
                      <View style={styles.rowContent}>
                        <Text style={[styles.rowLabel, { color: colors.text }]}>{consent.title}</Text>
                        <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>{`v${consent.version} · Required`}</Text>
                      </View>
                      <Lock size={16} color={colors.textTertiary} />
                      <ChevronRight size={16} color={colors.textTertiary} />
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {optional.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { color: colors.textTertiary, marginTop: 20 }]}>Optional</Text>
                <View style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.shadowColor }]}>
                  {optional.map((consent, idx) => (
                    <View key={consent.id} style={[styles.row, idx < optional.length - 1 && [styles.rowBorder, { borderBottomColor: colors.borderLight }]]}>
                      <TouchableOpacity style={styles.rowContent} onPress={() => openDocument(consent)} accessibilityRole="button">
                        <Text style={[styles.rowLabel, { color: colors.text }]}>{consent.title}</Text>
                        <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>{`v${consent.version}`}</Text>
                      </TouchableOpacity>
                      <Switch
                        value={consent.accepted}
                        onValueChange={(v) => onToggleOptional(consent, v)}
                        disabled={togglePending}
                        trackColor={{ false: colors.border, true: isDark ? colors.primaryLight : '#bfdbfe' }}
                        thumbColor={consent.accepted ? colors.primary : colors.surface}
                      />
                    </View>
                  ))}
                </View>
              </>
            )}

            <Text style={[styles.sectionTitle, { color: colors.textTertiary, marginTop: 20 }]}>Marketing</Text>
            <View style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.shadowColor }]}>
              <View style={styles.row}>
                <View style={styles.rowContent}>
                  <Text style={[styles.rowLabel, { color: colors.text }]}>Marketing communications</Text>
                  <Text style={[styles.rowDesc, { color: colors.textSecondary }]}>
                    Receive offers and updates from Tesco Wallet
                  </Text>
                </View>
                <Switch
                  value={marketingOptIn}
                  onValueChange={onToggleMarketing}
                  disabled={togglePending}
                  trackColor={{ false: colors.border, true: isDark ? colors.primaryLight : '#bfdbfe' }}
                  thumbColor={marketingOptIn ? colors.primary : colors.surface}
                />
              </View>
            </View>
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
  intro: { fontSize: 14, fontFamily: 'Inter-Regular', marginBottom: 16, lineHeight: 20 },
  sectionTitle: { fontSize: 13, fontFamily: 'Inter-SemiBold', letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' },
  card: { borderRadius: 16, overflow: 'hidden', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  rowBorder: { borderBottomWidth: 1 },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 16, fontFamily: 'Inter-SemiBold' },
  rowDesc: { fontSize: 13, fontFamily: 'Inter-Regular', marginTop: 4 },
  center: { padding: 32, alignItems: 'center' },
});
