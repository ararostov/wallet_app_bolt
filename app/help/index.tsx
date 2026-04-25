// Help & FAQ screen — wired to GET /help/faqs (spec 10 §4.1).
//
// Search input is debounced 300ms; category chips read distinct slugs from
// `meta.categories` so there is no hardcoded category list. Cold-launch deep
// link `walletapp://help?category=payments` arrives via `useLocalSearchParams`
// and pre-seeds the filter before the first fetch.

import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ListRenderItem,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, ChevronRight, MessageCircle, Search } from 'lucide-react-native';

import { useTheme } from '@/context/ThemeContext';
import { useFaqs } from '@/hooks/useFaqs';
import type { FaqListItem } from '@/types/help';
import { Analytics } from '@/utils/analytics';
import { ApiError, mapErrorCode } from '@/utils/errors';
// Pretty label for an arbitrary category slug. Not a closed enum — backend
// can introduce new slugs at any time, and we render whatever it returns.
function formatCategoryLabel(slug: string): string {
  return slug
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function HelpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const params = useLocalSearchParams<{ category?: string | string[] }>();

  const initialCategory = useMemo(() => {
    const raw = Array.isArray(params.category) ? params.category[0] : params.category;
    return typeof raw === 'string' && raw.length > 0 ? raw : null;
  }, [params.category]);

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState<string | null>(initialCategory);

  // Debounce search input (300ms per spec §4.1).
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const { data, loading, error, refetch, categories } = useFaqs({
    category: category ?? undefined,
    q: debouncedSearch.length > 0 ? debouncedSearch : undefined,
  });

  const items = data ?? [];
  const apiError = error instanceof ApiError ? error : null;
  const errorMessage = apiError
    ? mapErrorCode(apiError.code) ?? apiError.message
    : error
      ? 'Could not load articles.'
      : null;

  const onPressFaq = (item: FaqListItem) => {
    Analytics.track('help_faq_opened', { faqId: item.id, category: item.category });
    router.push({ pathname: '/help/faq/[id]', params: { id: item.id } });
  };

  const renderItem: ListRenderItem<FaqListItem> = ({ item }) => (
    <TouchableOpacity
      style={[styles.faqRow, { backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}
      onPress={() => onPressFaq(item)}
      accessibilityRole="button"
      accessibilityLabel={`${item.question}, open answer`}
    >
      <View style={{ flex: 1 }}>
        <View style={styles.faqRowTop}>
          <Text style={[styles.faqQuestion, { color: colors.text }]} numberOfLines={2}>
            {item.question}
          </Text>
          {item.isPlatformWide && (
            <View style={[styles.platformBadge, { backgroundColor: colors.surfaceAlt }]}>
              <Text style={[styles.platformBadgeText, { color: colors.textSecondary }]}>
                Platform
              </Text>
            </View>
          )}
        </View>
        <Text style={[styles.faqPreview, { color: colors.textSecondary }]} numberOfLines={2}>
          {item.answerPreview}
        </Text>
      </View>
      <ChevronRight size={16} color={colors.textTertiary} />
    </TouchableOpacity>
  );

  // "All" chip + the dynamic categories returned by backend.
  const chipValues: { value: string | null; label: string }[] = [
    { value: null, label: 'All' },
    ...categories.map((slug) => ({ value: slug, label: formatCategoryLabel(slug) })),
  ];

  const isInitialLoading = loading && items.length === 0 && !errorMessage;
  const showEmpty =
    !loading && !errorMessage && items.length === 0;

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
        <Text style={[styles.title, { color: colors.text }]}>Help & FAQ</Text>
        <View style={{ width: 36 }} />
      </View>

      <View
        style={[
          styles.searchRow,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Search size={16} color={colors.textTertiary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search for help..."
          placeholderTextColor={colors.textTertiary}
          value={searchInput}
          onChangeText={setSearchInput}
          accessibilityRole="search"
          accessibilityLabel="Search help articles"
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>

      {chipValues.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {chipValues.map((chip) => {
            const active = (chip.value ?? null) === (category ?? null);
            return (
              <TouchableOpacity
                key={chip.value ?? 'all'}
                onPress={() => setCategory(chip.value)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[
                  styles.chip,
                  { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
                  active && {
                    backgroundColor: colors.primary,
                    borderColor: colors.primary,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: colors.textSecondary },
                    active && { color: '#fff' },
                  ]}
                >
                  {chip.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {errorMessage && (
        <View style={[styles.banner, { backgroundColor: colors.redLight, borderColor: colors.red }]}>
          <Text style={[styles.bannerText, { color: colors.red }]}>{errorMessage}</Text>
          <TouchableOpacity onPress={() => refetch()}>
            <Text style={[styles.bannerAction, { color: colors.red }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {isInitialLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : showEmpty ? (
        <View style={styles.center}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No articles found</Text>
          <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
            {debouncedSearch
              ? `Try a different search term.`
              : `No articles in this category yet.`}
          </Text>
          <TouchableOpacity
            style={[styles.contactCta, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/help/contact')}
          >
            <Text style={styles.contactCtaText}>Contact support</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
          refreshControl={
            <RefreshControl refreshing={loading && items.length > 0} onRefresh={refetch} tintColor={colors.primary} />
          }
          ListFooterComponent={
            <TouchableOpacity
              style={[
                styles.contactCard,
                { backgroundColor: colors.surface, shadowColor: colors.shadowColor },
              ]}
              onPress={() => router.push('/help/contact')}
              accessibilityRole="button"
              accessibilityLabel="Contact support"
            >
              <View
                style={[
                  styles.contactIcon,
                  { backgroundColor: isDark ? colors.primaryLight : '#eff6ff' },
                ]}
              >
                <MessageCircle size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.contactTitle, { color: colors.text }]}>
                  Still need help?
                </Text>
                <Text style={[styles.contactSub, { color: colors.textSecondary }]}>
                  Our team usually responds within 24 hours.
                </Text>
              </View>
              <ChevronRight size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          }
        />
      )}
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1.5,
  },
  searchInput: { flex: 1, fontSize: 16, fontFamily: 'Inter-Regular' },
  chipsRow: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 8,
  },
  chipText: { fontSize: 13, fontFamily: 'Inter-SemiBold' },
  banner: {
    margin: 16,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  bannerText: { flex: 1, fontSize: 14, fontFamily: 'Inter-Medium' },
  bannerAction: { fontSize: 14, fontFamily: 'Inter-SemiBold' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
  emptyTitle: { fontSize: 17, fontFamily: 'Inter-SemiBold' },
  emptyBody: { fontSize: 15, fontFamily: 'Inter-Regular', textAlign: 'center' },
  contactCta: { marginTop: 12, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  contactCtaText: { color: '#fff', fontFamily: 'Inter-SemiBold', fontSize: 15 },
  listContent: { paddingHorizontal: 16, paddingTop: 8 },
  faqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  faqRowTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  faqQuestion: { flex: 1, fontSize: 16, fontFamily: 'Inter-SemiBold' },
  faqPreview: { fontSize: 13, fontFamily: 'Inter-Regular', marginTop: 4 },
  platformBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  platformBadgeText: { fontSize: 11, fontFamily: 'Inter-SemiBold' },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    marginTop: 8,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  contactIcon: {
    width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  contactTitle: { fontSize: 15, fontFamily: 'Inter-SemiBold' },
  contactSub: { fontSize: 13, fontFamily: 'Inter-Regular', marginTop: 2 },
});
