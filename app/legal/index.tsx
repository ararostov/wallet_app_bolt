// Legal documents list — GET /legal/documents (spec 10 §4.5).
//
// Detects newer versions vs the per-device `seenLegalVersions` map in
// AsyncStorage and surfaces a banner. Dismissing the banner stamps the
// current version map so it stays dismissed until backend publishes a new
// revision.

import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AlertTriangle, ArrowLeft, ChevronRight, X } from 'lucide-react-native';

import { useTheme } from '@/context/ThemeContext';
import { Badge } from '@/components/ui/Badge';
import { useQuery } from '@/hooks/useQuery';
import { legalApi } from '@/utils/api/legal';
import type { LegalDocumentListItem, LegalDocumentType } from '@/types/legal';
import { ApiError, mapErrorCode } from '@/utils/errors';
import { formatDateShort } from '@/utils/format';
import { Storage } from '@/utils/storage';
import { logError } from '@/utils/logger';

const SEEN_VERSIONS_KEY = 'legal_seen_versions_v1';
const TTL_MS = 24 * 60 * 60 * 1000;
const STALE_MS = 60 * 1000;

type SeenVersions = Partial<Record<LegalDocumentType, string>>;

export default function LegalListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const { data, loading, error, refetch } = useQuery<LegalDocumentListItem[]>(
    'legal:documents',
    async () => {
      const list = await legalApi.list();
      return { data: list };
    },
    { ttlMs: TTL_MS, staleMs: STALE_MS, refetchOnFocus: true },
  );

  const [seen, setSeen] = useState<SeenVersions>({});
  const [seenLoaded, setSeenLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void Storage.get<SeenVersions>(SEEN_VERSIONS_KEY)
      .then((stored) => {
        if (cancelled) return;
        setSeen(stored ?? {});
        setSeenLoaded(true);
      })
      .catch((e) => {
        if (cancelled) return;
        logError(e, { where: 'legal.seenVersions.read' });
        setSeenLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const updatedDocs = useMemo<LegalDocumentListItem[]>(() => {
    if (!data || !seenLoaded) return [];
    return data.filter((d) => seen[d.type] !== undefined && seen[d.type] !== d.version);
  }, [data, seen, seenLoaded]);

  const dismissBanner = async () => {
    if (!data) return;
    const next: SeenVersions = { ...seen };
    for (const doc of data) {
      next[doc.type] = doc.version;
    }
    setSeen(next);
    try {
      await Storage.set(SEEN_VERSIONS_KEY, next);
    } catch (e) {
      logError(e, { where: 'legal.seenVersions.write' });
    }
  };

  const apiError = error instanceof ApiError ? error : null;
  const errorMessage = apiError
    ? mapErrorCode(apiError.code) ?? apiError.message
    : error
      ? 'Could not load legal documents.'
      : null;

  const items = data ?? [];
  const showBanner = updatedDocs.length > 0;

  return (
    <SafeAreaView edges={['left', 'right']} style={[styles.safe, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { backgroundColor: colors.surface, borderBottomColor: colors.border, paddingTop: insets.top + 14 },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} accessibilityLabel="Go back">
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Legal</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}>
        {showBanner && (
          <View style={[styles.updateBanner, { backgroundColor: colors.amberLight, borderColor: colors.amber }]}>
            <AlertTriangle size={18} color={colors.amber} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.updateBannerTitle, { color: colors.amber }]}>
                {updatedDocs.length === 1 ? 'A document was updated' : 'Documents were updated'}
              </Text>
              <Text style={[styles.updateBannerBody, { color: colors.amber }]}>
                Please review the latest version{updatedDocs.length === 1 ? '' : 's'}.
              </Text>
            </View>
            <TouchableOpacity onPress={dismissBanner} accessibilityLabel="Dismiss banner" hitSlop={10}>
              <X size={18} color={colors.amber} />
            </TouchableOpacity>
          </View>
        )}

        {loading && items.length === 0 && (
          <View style={styles.loading}><ActivityIndicator color={colors.primary} /></View>
        )}

        {errorMessage && (
          <View style={[styles.banner, { backgroundColor: colors.redLight, borderColor: colors.red }]}>
            <Text style={[styles.bannerText, { color: colors.red }]}>{errorMessage}</Text>
            <TouchableOpacity onPress={() => refetch()}>
              <Text style={[styles.bannerAction, { color: colors.red }]}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {items.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.shadowColor }]}>
            {items.map((doc, idx) => {
              const isUpdated = seenLoaded && seen[doc.type] !== undefined && seen[doc.type] !== doc.version;
              return (
                <TouchableOpacity
                  key={doc.id}
                  style={[
                    styles.docRow,
                    idx > 0 && { borderTopWidth: 1, borderTopColor: colors.borderLight },
                  ]}
                  onPress={() => router.push({ pathname: '/legal/[id]', params: { id: doc.id } })}
                  accessibilityRole="button"
                  accessibilityLabel={`${doc.title}, version ${doc.version}`}
                >
                  <View style={{ flex: 1 }}>
                    <View style={styles.docTitleRow}>
                      <Text style={[styles.docTitle, { color: colors.text }]} numberOfLines={1}>
                        {doc.title}
                      </Text>
                      {doc.required && <Badge label="Required" variant="error" size="sm" />}
                      {isUpdated && <Badge label="Updated" variant="warning" size="sm" />}
                    </View>
                    <Text style={[styles.docMeta, { color: colors.textTertiary }]}>
                      v{doc.version} · {formatDateShort(doc.publishedAt)}
                    </Text>
                  </View>
                  <ChevronRight size={16} color={colors.textTertiary} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {items.length > 0 && (
          <Text style={[styles.footnote, { color: colors.textTertiary }]}>
            Last viewed versions are stored on this device.
          </Text>
        )}
      </ScrollView>
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
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 19, fontFamily: 'Inter-SemiBold' },
  scroll: { padding: 16 },
  loading: { paddingVertical: 48, alignItems: 'center' },
  banner: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 16, gap: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bannerText: { flex: 1, fontSize: 14, fontFamily: 'Inter-Medium' },
  bannerAction: { fontSize: 14, fontFamily: 'Inter-SemiBold' },
  updateBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 16,
  },
  updateBannerTitle: { fontSize: 15, fontFamily: 'Inter-SemiBold' },
  updateBannerBody: { fontSize: 13, fontFamily: 'Inter-Regular', marginTop: 2 },
  card: {
    borderRadius: 14, overflow: 'hidden',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  docTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  docTitle: { fontSize: 15, fontFamily: 'Inter-SemiBold' },
  docMeta: { fontSize: 13, fontFamily: 'Inter-Regular', marginTop: 4 },
  footnote: { fontSize: 12, fontFamily: 'Inter-Regular', marginTop: 12, textAlign: 'center' },
});
