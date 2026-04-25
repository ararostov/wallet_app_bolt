// Legal document viewer — opened from the signup consents screen and
// (eventually) from the Profile menu. Implements the slice of spec 10 §4.6
// that the registration flow needs:
//
// - Fetches GET /legal/documents/{id} (public, only X-Merchant-Code).
// - If `contentMarkdown` is non-null → render via react-native-markdown-display.
// - If `contentMarkdown` is null AND `url` is set → open the URL in an
//   external browser and pop back automatically.
// - If both are null → show an inline error.
//
// External links inside the rendered Markdown are funnelled through
// expo-web-browser via `onLinkPress` so the in-app render stays neutral.

import React, { useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import Markdown from 'react-native-markdown-display';

import { useTheme } from '@/context/ThemeContext';
import { Badge } from '@/components/ui/Badge';
import { useQuery } from '@/hooks/useQuery';
import { legalApi } from '@/utils/api/legal';
import { ApiError } from '@/utils/errors';
import { formatDateLong } from '@/utils/format';

export default function LegalDocumentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
  const id = typeof rawId === 'string' && rawId.length > 0 ? rawId : null;

  const fetcher = useMemo(
    () => async () => {
      if (!id) throw new Error('Missing legal document id');
      const data = await legalApi.get(id);
      return { data };
    },
    [id],
  );

  const { data, loading, error, refetch } = useQuery(
    `legal/${id ?? 'missing'}`,
    fetcher,
    {
      enabled: id !== null,
      // Backend Cache-Control says 1h; align ttl with that. staleMs short so
      // refocusing reuses cache without spamming the network.
      ttlMs: 60 * 60 * 1000,
      staleMs: 5 * 60 * 1000,
      refetchOnFocus: false,
    },
  );

  // External-URL fallback: when the merchant hosts the canonical document on
  // its own website, the API returns `contentMarkdown: null` + `url`. In that
  // case we don't have anything meaningful to render in-app — open the URL
  // and pop the screen so back-stack feels natural.
  useEffect(() => {
    if (!data) return;
    if (data.contentMarkdown === null && data.url) {
      WebBrowser.openBrowserAsync(data.url)
        .catch(() => undefined)
        .finally(() => {
          router.back();
        });
    }
  }, [data, router]);

  const handleLinkPress = (url: string): boolean => {
    // Funnel any in-document link through the in-app browser.
    WebBrowser.openBrowserAsync(url).catch(() => undefined);
    return false;
  };

  const apiError = error instanceof ApiError ? error : null;
  const isNotFound = apiError?.status === 404;

  return (
    <SafeAreaView edges={['left', 'right']} style={[styles.safe, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
            paddingTop: insets.top + 14,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Go back">
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {data?.title ?? 'Document'}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        {!id && (
          <View
            style={[styles.banner, { backgroundColor: colors.redLight, borderColor: colors.red }]}
          >
            <Text style={[styles.bannerText, { color: colors.red }]}>
              Missing document identifier.
            </Text>
          </View>
        )}

        {loading && !data && id && (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primary} />
          </View>
        )}

        {error && (
          <View
            style={[styles.banner, { backgroundColor: colors.redLight, borderColor: colors.red }]}
          >
            <Text style={[styles.bannerText, { color: colors.red }]}>
              {isNotFound
                ? 'Document not found.'
                : 'We could not load this document. Please try again.'}
            </Text>
            {!isNotFound && (
              <Pressable onPress={() => refetch()} style={styles.retryBtn}>
                <Text style={[styles.retryText, { color: colors.red }]}>Retry</Text>
              </Pressable>
            )}
          </View>
        )}

        {data && (
          <>
            <View style={styles.metaRow}>
              <Badge label={`Version ${data.version}`} variant="neutral" size="sm" />
              {data.required && <Badge label="Required" variant="error" size="sm" />}
            </View>
            <Text style={[styles.publishedAt, { color: colors.textTertiary }]}>
              Last updated: {formatDateLong(data.publishedAt)}
            </Text>

            {data.contentMarkdown !== null ? (
              <Markdown
                style={buildMarkdownStyles(colors)}
                onLinkPress={handleLinkPress}
              >
                {data.contentMarkdown}
              </Markdown>
            ) : data.url ? (
              // Effect above is opening the URL in the external browser; show
              // a brief placeholder so the screen isn't empty on the way out.
              <Text style={[styles.body, { color: colors.textSecondary }]}>
                Opening the document in your browser…
              </Text>
            ) : (
              <View
                style={[
                  styles.banner,
                  { backgroundColor: colors.amberLight, borderColor: colors.amber },
                ]}
              >
                <Text style={[styles.bannerText, { color: colors.amber }]}>
                  Document unavailable. Please try again later.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// react-native-markdown-display takes a style map keyed by markdown nodes.
// Keep this minimal but theme-aware so Dark mode reads cleanly.
function buildMarkdownStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return {
    body: { color: colors.text, fontFamily: 'Inter-Regular', fontSize: 16, lineHeight: 24 },
    heading1: {
      color: colors.text,
      fontFamily: 'Inter-Bold',
      fontSize: 24,
      marginTop: 16,
      marginBottom: 8,
    },
    heading2: {
      color: colors.text,
      fontFamily: 'Inter-SemiBold',
      fontSize: 20,
      marginTop: 16,
      marginBottom: 6,
    },
    heading3: {
      color: colors.text,
      fontFamily: 'Inter-SemiBold',
      fontSize: 18,
      marginTop: 12,
      marginBottom: 4,
    },
    paragraph: { color: colors.text, marginTop: 0, marginBottom: 12 },
    list_item: { color: colors.text },
    bullet_list: { marginBottom: 12 },
    ordered_list: { marginBottom: 12 },
    link: { color: colors.primary, textDecorationLine: 'underline' as const },
    blockquote: {
      backgroundColor: colors.surfaceAlt,
      borderLeftColor: colors.primary,
      borderLeftWidth: 3,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginVertical: 8,
    },
    code_inline: {
      backgroundColor: colors.surfaceAlt,
      color: colors.text,
      borderRadius: 4,
      paddingHorizontal: 4,
    },
    fence: {
      backgroundColor: colors.surfaceAlt,
      color: colors.text,
      borderRadius: 8,
      padding: 12,
      marginVertical: 8,
    },
  };
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
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 19, fontFamily: 'Inter-SemiBold', flex: 1, textAlign: 'center' },
  scroll: { padding: 16, paddingBottom: 80 },
  loading: { paddingVertical: 48, alignItems: 'center' },
  banner: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 16, gap: 6 },
  bannerText: { fontSize: 15, fontFamily: 'Inter-Medium' },
  retryBtn: { alignSelf: 'flex-start', paddingVertical: 4 },
  retryText: { fontSize: 15, fontFamily: 'Inter-SemiBold' },
  metaRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  publishedAt: { fontSize: 14, fontFamily: 'Inter-Regular', marginBottom: 16 },
  body: { fontSize: 16, fontFamily: 'Inter-Regular', lineHeight: 24 },
});
