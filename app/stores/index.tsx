// Store locator — GET /stores (spec 10 §4.7).
//
// Search input is debounced 300ms; tapping a row reveals the inline detail
// modal with phone / Apple Maps / Google Maps actions. Geo-location and
// distance display are out of scope for MVP (backend doesn't return
// lat/lng yet).

import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  ListRenderItem,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, ChevronRight, MapPin, Search, X } from 'lucide-react-native';

import { useTheme } from '@/context/ThemeContext';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useStores } from '@/hooks/useStores';
import type { Store } from '@/types/stores';
import { ApiError, mapErrorCode } from '@/utils/errors';
import { logError } from '@/utils/logger';

function buildAddress(store: Store): string {
  return [store.addressLine1, store.addressLine2, store.city, store.postalCode, store.countryCode]
    .filter(Boolean)
    .join(', ');
}

export default function StoresScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ city?: string | string[] }>();
  const initialCity = useMemo(() => {
    const raw = Array.isArray(params.city) ? params.city[0] : params.city;
    return typeof raw === 'string' && raw.length > 0 ? raw : '';
  }, [params.city]);

  const [cityInput, setCityInput] = useState(initialCity);
  const [debouncedCity, setDebouncedCity] = useState(initialCity);
  const [selected, setSelected] = useState<Store | null>(null);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedCity(cityInput.trim()), 300);
    return () => clearTimeout(handle);
  }, [cityInput]);

  const { data, loading, error, refetch } = useStores({
    city: debouncedCity.length > 0 ? debouncedCity : undefined,
  });

  const apiError = error instanceof ApiError ? error : null;
  const errorMessage = apiError
    ? mapErrorCode(apiError.code) ?? apiError.message
    : error
      ? 'Could not load stores.'
      : null;

  const items = data ?? [];

  const renderItem: ListRenderItem<Store> = ({ item }) => (
    <TouchableOpacity
      style={[styles.storeCard, { backgroundColor: colors.surface, shadowColor: colors.shadowColor }]}
      onPress={() => setSelected(item)}
      accessibilityRole="button"
      accessibilityLabel={`${item.name} in ${item.city}`}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.storeName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
        <Text style={[styles.storeAddress, { color: colors.textSecondary }]} numberOfLines={1}>
          {item.addressLine1}
        </Text>
        <Text style={[styles.storeMeta, { color: colors.textTertiary }]} numberOfLines={1}>
          {item.city}{item.postalCode ? `, ${item.postalCode}` : ''}
        </Text>
      </View>
      <ChevronRight size={16} color={colors.textTertiary} />
    </TouchableOpacity>
  );

  const isInitialLoading = loading && items.length === 0 && !errorMessage;
  const showEmpty = !loading && !errorMessage && items.length === 0;

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
        <Text style={[styles.title, { color: colors.text }]}>Stores</Text>
        <View style={{ width: 36 }} />
      </View>

      <View
        style={[styles.searchRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <Search size={16} color={colors.textTertiary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search by city or postcode"
          placeholderTextColor={colors.textTertiary}
          value={cityInput}
          onChangeText={setCityInput}
          accessibilityRole="search"
          accessibilityLabel="Filter stores by city"
          autoCorrect={false}
          autoCapitalize="words"
          returnKeyType="search"
        />
      </View>

      {errorMessage && (
        <View style={[styles.banner, { backgroundColor: colors.redLight, borderColor: colors.red }]}>
          <Text style={[styles.bannerText, { color: colors.red }]}>{errorMessage}</Text>
          <TouchableOpacity onPress={() => refetch()}>
            <Text style={[styles.bannerAction, { color: colors.red }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {isInitialLoading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : showEmpty ? (
        <View style={styles.center}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No stores found</Text>
          <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
            No stores in your area yet. Contact support to suggest a location.
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
        />
      )}

      <StoreDetailModal
        store={selected}
        onClose={() => setSelected(null)}
        colors={colors}
      />
    </SafeAreaView>
  );
}

interface StoreDetailModalProps {
  store: Store | null;
  onClose: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
}

function StoreDetailModal({ store, onClose, colors }: StoreDetailModalProps) {
  // store === null collapses the bottom sheet. We keep the wrapper mounted so
  // the slide-down animation plays even on the last render before unmount.
  const visible = store !== null;
  const address = store ? buildAddress(store) : '';

  const openAppleMaps = () => {
    const url = `http://maps.apple.com/?address=${encodeURIComponent(address)}`;
    Linking.openURL(url).catch((e) => logError(e, { where: 'stores.openAppleMaps' }));
  };

  const openGoogleMaps = () => {
    const url = `https://maps.google.com/?q=${encodeURIComponent(address)}`;
    Linking.openURL(url).catch((e) => logError(e, { where: 'stores.openGoogleMaps' }));
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      enableDynamicSizing
      accessibilityLabel="Store details"
    >
      {store ? (
        <View style={{ backgroundColor: colors.surface }}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]} numberOfLines={1}>
              {store.name}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={10} accessibilityLabel="Close">
              <X size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.modalRow}>
              <MapPin size={18} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalRowLabel, { color: colors.textTertiary }]}>Address</Text>
                <Text style={[styles.modalRowValue, { color: colors.text }]}>{address}</Text>
              </View>
            </View>

            {store.timezone && (
              <View style={styles.modalRow}>
                <View style={{ width: 18 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalRowLabel, { color: colors.textTertiary }]}>Timezone</Text>
                  <Text style={[styles.modalRowValue, { color: colors.text }]}>{store.timezone}</Text>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.primary }]}
              onPress={openAppleMaps}
              accessibilityRole="button"
            >
              <MapPin size={18} color="#fff" />
              <Text style={styles.actionBtnText}>Open in Apple Maps</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtnSecondary, { borderColor: colors.primary }]}
              onPress={openGoogleMaps}
              accessibilityRole="button"
            >
              <MapPin size={18} color={colors.primary} />
              <Text style={[styles.actionBtnTextSecondary, { color: colors.primary }]}>
                Open in Google Maps
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </BottomSheet>
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
  banner: { marginHorizontal: 16, marginVertical: 8, borderWidth: 1, borderRadius: 12, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  bannerText: { flex: 1, fontSize: 14, fontFamily: 'Inter-Medium' },
  bannerAction: { fontSize: 14, fontFamily: 'Inter-SemiBold' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
  emptyTitle: { fontSize: 17, fontFamily: 'Inter-SemiBold' },
  emptyBody: { fontSize: 15, fontFamily: 'Inter-Regular', textAlign: 'center' },
  contactCta: { marginTop: 12, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  contactCtaText: { color: '#fff', fontFamily: 'Inter-SemiBold', fontSize: 15 },
  listContent: { paddingHorizontal: 16, paddingTop: 8, gap: 8 },
  storeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 8,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  storeName: { fontSize: 15, fontFamily: 'Inter-SemiBold' },
  storeAddress: { fontSize: 14, fontFamily: 'Inter-Regular', marginTop: 2 },
  storeMeta: { fontSize: 12, fontFamily: 'Inter-Regular', marginTop: 2 },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, gap: 12,
  },
  modalTitle: { flex: 1, fontSize: 18, fontFamily: 'Inter-Bold' },
  modalContent: { padding: 16, gap: 16 },
  modalRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  modalRowLabel: { fontSize: 12, fontFamily: 'Inter-SemiBold', textTransform: 'uppercase', letterSpacing: 0.4 },
  modalRowValue: { fontSize: 15, fontFamily: 'Inter-Regular', marginTop: 2, lineHeight: 22 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 14, marginTop: 8,
  },
  actionBtnText: { color: '#fff', fontFamily: 'Inter-SemiBold', fontSize: 16 },
  actionBtnSecondary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 14, borderWidth: 1.5,
  },
  actionBtnTextSecondary: { fontFamily: 'Inter-SemiBold', fontSize: 16 },
});
