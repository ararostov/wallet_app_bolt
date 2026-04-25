// FAQ detail — GET /help/faqs/{id}. See spec 10 §4.2.
//
// Renders Markdown via react-native-markdown-display (already used by the
// legal viewer). We sanitise the body before render — strip images, dangerous
// schemes (`javascript:`/`data:`) and embedded scripts.

import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, ThumbsDown, ThumbsUp } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import Markdown from 'react-native-markdown-display';

import { useTheme } from '@/context/ThemeContext';
import { Badge } from '@/components/ui/Badge';
import { useFaq } from '@/hooks/useFaq';
import { Analytics } from '@/utils/analytics';
import { ApiError, mapErrorCode } from '@/utils/errors';
import { formatDateLong } from '@/utils/format';

// Strip images, neutralise dangerous link schemes, drop raw HTML tags that
// could carry script payloads. Spec §7.5 — defence in depth in addition to
// the renderer's own behaviour.
function sanitizeMarkdown(md: string): string {
  return md
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/<\/?(script|iframe|object|embed)[^>]*>/gi, '')
    .replace(/\]\((javascript|data|vbscript):[^)]*\)/gi, '](#)');
}

export default function FaqDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
  const id = typeof rawId === 'string' && rawId.length > 0 ? rawId : null;

  const { data, loading, error, refetch } = useFaq(id);

  const sanitisedBody = useMemo(
    () => (data?.answerMarkdown ? sanitizeMarkdown(data.answerMarkdown) : ''),
    [data?.answerMarkdown],
  );

  const apiError = error instanceof ApiError ? error : null;
  const isNotFound = apiError?.status === 404;

  const onLinkPress = (url: string): boolean => {
    WebBrowser.openBrowserAsync(url).catch(() => undefined);
    return false;
  };

  const onFeedback = (helpful: boolean) => {
    if (!id) return;
    Analytics.track('faq_feedback', { faqId: id, helpful });
  };

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
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} accessibilityLabel="Go back">
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {data?.question ?? 'Article'}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
      >
        {!id && (
          <View style={[styles.banner, { backgroundColor: colors.redLight, borderColor: colors.red }]}>
            <Text style={[styles.bannerText, { color: colors.red }]}>Missing article identifier.</Text>
          </View>
        )}

        {loading && !data && id && (
          <View style={styles.loading}><ActivityIndicator color={colors.primary} /></View>
        )}

        {error && (
          <View style={[styles.banner, { backgroundColor: colors.redLight, borderColor: colors.red }]}>
            <Text style={[styles.bannerText, { color: colors.red }]}>
              {isNotFound
                ? mapErrorCode('FAQ_NOT_FOUND') ?? 'This article is no longer available.'
                : apiError
                  ? mapErrorCode(apiError.code) ?? apiError.message
                  : 'Could not load this article.'}
            </Text>
            {!isNotFound && (
              <TouchableOpacity onPress={() => refetch()}>
                <Text style={[styles.bannerAction, { color: colors.red }]}>Retry</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {data && (
          <>
            <Text style={[styles.question, { color: colors.text }]}>{data.question}</Text>
            <View style={styles.metaRow}>
              {data.isPlatformWide && <Badge label="Platform" variant="neutral" size="sm" />}
              <Text style={[styles.updatedAt, { color: colors.textTertiary }]}>
                Updated {formatDateLong(data.updatedAt)}
              </Text>
            </View>

            <Markdown
              style={buildMarkdownStyles(colors)}
              onLinkPress={onLinkPress}
            >
              {sanitisedBody}
            </Markdown>

            <Text style={[styles.feedbackLabel, { color: colors.textSecondary }]}>
              Was this helpful?
            </Text>
            <View style={styles.feedbackRow}>
              <TouchableOpacity
                style={[styles.feedbackBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
                onPress={() => onFeedback(true)}
                accessibilityRole="button"
                accessibilityLabel="Yes, this was helpful"
              >
                <ThumbsUp size={16} color={colors.green} />
                <Text style={[styles.feedbackBtnText, { color: colors.text }]}>Yes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.feedbackBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
                onPress={() => onFeedback(false)}
                accessibilityRole="button"
                accessibilityLabel="No, this was not helpful"
              >
                <ThumbsDown size={16} color={colors.red} />
                <Text style={[styles.feedbackBtnText, { color: colors.text }]}>No</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.contactCta, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/help/contact')}
            >
              <Text style={styles.contactCtaText}>Contact support</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function buildMarkdownStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return {
    body: { color: colors.text, fontFamily: 'Inter-Regular', fontSize: 16, lineHeight: 24 },
    heading1: { color: colors.text, fontFamily: 'Inter-Bold', fontSize: 24, marginTop: 16, marginBottom: 8 },
    heading2: { color: colors.text, fontFamily: 'Inter-SemiBold', fontSize: 20, marginTop: 16, marginBottom: 6 },
    heading3: { color: colors.text, fontFamily: 'Inter-SemiBold', fontSize: 18, marginTop: 12, marginBottom: 4 },
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
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 17, fontFamily: 'Inter-SemiBold', textAlign: 'center', marginHorizontal: 8 },
  scroll: { padding: 16 },
  loading: { paddingVertical: 48, alignItems: 'center' },
  banner: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 16, gap: 6 },
  bannerText: { fontSize: 15, fontFamily: 'Inter-Medium' },
  bannerAction: { fontSize: 14, fontFamily: 'Inter-SemiBold' },
  question: { fontSize: 22, fontFamily: 'Inter-Bold', marginBottom: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  updatedAt: { fontSize: 13, fontFamily: 'Inter-Regular' },
  feedbackLabel: { fontSize: 14, fontFamily: 'Inter-SemiBold', marginTop: 24 },
  feedbackRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  feedbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  feedbackBtnText: { fontSize: 14, fontFamily: 'Inter-SemiBold' },
  contactCta: { marginTop: 24, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  contactCtaText: { color: '#fff', fontFamily: 'Inter-SemiBold', fontSize: 16 },
});
