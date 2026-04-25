// Contact support — GET /support/contact (spec 10 §4.3).
//
// Each scalar may be null on the merchant config — hide the matching row
// gracefully. Phone/email open the device handler; chat URL opens in the
// in-app browser.

import React from 'react';
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  ChevronRight,
  Clock,
  Globe,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
} from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';

import { useTheme } from '@/context/ThemeContext';
import { useSupportContact } from '@/hooks/useSupportContact';
import { ApiError, mapErrorCode } from '@/utils/errors';
import { logError } from '@/utils/logger';

export default function ContactSupportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { data, loading, error, refetch } = useSupportContact({ storeLimit: 3 });

  const apiError = error instanceof ApiError ? error : null;
  const errorMessage = apiError
    ? mapErrorCode(apiError.code) ?? apiError.message
    : error
      ? 'Could not load contact details.'
      : null;

  const openMail = () => {
    if (!data?.email) return;
    const subject = encodeURIComponent('Support request');
    Linking.openURL(`mailto:${data.email}?subject=${subject}`).catch((e) =>
      logError(e, { where: 'contact.openMail' }),
    );
  };

  const openTel = () => {
    if (!data?.phone) return;
    const cleaned = data.phone.replace(/\s+/g, '');
    Linking.openURL(`tel:${cleaned}`).catch((e) =>
      logError(e, { where: 'contact.openTel' }),
    );
  };

  const openWeb = () => {
    if (!data?.url) return;
    WebBrowser.openBrowserAsync(data.url).catch((e) =>
      logError(e, { where: 'contact.openWeb' }),
    );
  };

  const everythingNull =
    data && data.email === null && data.phone === null && data.hours === null && data.url === null;

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
        <Text style={[styles.title, { color: colors.text }]}>Contact support</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}>
        {loading && !data && (
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

        {everythingNull && (
          <View style={[styles.banner, { backgroundColor: colors.amberLight, borderColor: colors.amber }]}>
            <Text style={[styles.bannerText, { color: colors.amber }]}>
              Contact information is being updated. Please try later.
            </Text>
          </View>
        )}

        {data && (
          <>
            <View style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.shadowColor }]}>
              {data.email && (
                <Row
                  icon={<Mail size={18} color={colors.primary} />}
                  label="Email"
                  value={data.email}
                  onPress={openMail}
                  colors={colors}
                  isFirst
                />
              )}
              {data.phone && (
                <Row
                  icon={<Phone size={18} color={colors.primary} />}
                  label="Phone"
                  value={data.phone}
                  onPress={openTel}
                  colors={colors}
                />
              )}
              {data.hours && (
                <Row
                  icon={<Clock size={18} color={colors.primary} />}
                  label="Hours"
                  value={data.hours}
                  colors={colors}
                />
              )}
              {data.url && (
                <Row
                  icon={<Globe size={18} color={colors.primary} />}
                  label="Help centre"
                  value={data.url}
                  onPress={openWeb}
                  colors={colors}
                />
              )}
            </View>

            <TouchableOpacity
              style={[styles.ticketCta, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/help/ticket')}
              accessibilityRole="button"
              accessibilityLabel="Submit a support ticket"
            >
              <MessageSquare size={18} color="#fff" />
              <Text style={styles.ticketCtaText}>Submit a ticket</Text>
            </TouchableOpacity>

            {data.stores.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                  Nearby stores
                </Text>
                <View style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.shadowColor }]}>
                  {data.stores.map((store, idx) => (
                    <TouchableOpacity
                      key={store.id}
                      style={[
                        styles.storeRow,
                        idx > 0 && { borderTopWidth: 1, borderTopColor: colors.borderLight },
                      ]}
                      onPress={() => router.push('/stores')}
                      accessibilityRole="button"
                      accessibilityLabel={`${store.name} in ${store.city}`}
                    >
                      <MapPin size={16} color={colors.primary} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.storeName, { color: colors.text }]}>{store.name}</Text>
                        <Text style={[styles.storeCity, { color: colors.textTertiary }]}>{store.city}</Text>
                      </View>
                      <ChevronRight size={16} color={colors.textTertiary} />
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity
                  style={[styles.allStoresBtn, { borderColor: colors.border, backgroundColor: isDark ? colors.surface : '#fff' }]}
                  onPress={() => router.push('/stores')}
                >
                  <Text style={[styles.allStoresText, { color: colors.primary }]}>See all stores</Text>
                </TouchableOpacity>
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

interface RowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  onPress?: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
  isFirst?: boolean;
}

function Row({ icon, label, value, onPress, colors, isFirst }: RowProps) {
  return (
    <TouchableOpacity
      style={[
        styles.row,
        !isFirst && { borderTopWidth: 1, borderTopColor: colors.borderLight },
      ]}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
    >
      <View style={styles.rowIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, { color: colors.textTertiary }]}>{label}</Text>
        <Text style={[styles.rowValue, { color: colors.text }]} numberOfLines={1}>
          {value}
        </Text>
      </View>
      {onPress && <ChevronRight size={16} color={colors.textTertiary} />}
    </TouchableOpacity>
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
  banner: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 16, gap: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bannerText: { flex: 1, fontSize: 14, fontFamily: 'Inter-Medium' },
  bannerAction: { fontSize: 14, fontFamily: 'Inter-SemiBold' },
  card: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 14 },
  rowIcon: { width: 32, alignItems: 'center' },
  rowLabel: { fontSize: 12, fontFamily: 'Inter-SemiBold', textTransform: 'uppercase', letterSpacing: 0.4 },
  rowValue: { fontSize: 15, fontFamily: 'Inter-SemiBold', marginTop: 2 },
  ticketCta: {
    marginTop: 16, paddingVertical: 14, borderRadius: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
  },
  ticketCtaText: { color: '#fff', fontFamily: 'Inter-SemiBold', fontSize: 16 },
  sectionLabel: {
    fontSize: 13, fontFamily: 'Inter-SemiBold', marginTop: 24, marginBottom: 8, letterSpacing: 0.4, textTransform: 'uppercase',
  },
  storeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  storeName: { fontSize: 15, fontFamily: 'Inter-SemiBold' },
  storeCity: { fontSize: 13, fontFamily: 'Inter-Regular', marginTop: 2 },
  allStoresBtn: {
    marginTop: 8, paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1.5,
  },
  allStoresText: { fontSize: 14, fontFamily: 'Inter-SemiBold' },
});
