// Notifications inbox screen — wired to the API via useNotifications,
// useNotificationCount, useMarkNotificationRead, useMarkAllNotificationsRead,
// useDeleteNotification. Replaces the mock-driven version.
//
// UX matches spec 09 §4.1: filter chips (All / Unread), severity-coloured
// row icons, unread dot, relative time, swipe-free delete via inline trash
// button (the project doesn't yet have a Swipeable wrapper component, so
// the trash button matches the legacy interaction pattern), pull-to-refresh,
// cursor pagination, header "Mark all read" action.

import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Bell,
  CreditCard,
  Gift,
  Settings,
  Shield,
  Sparkles,
  Trash2,
  Trophy,
  Wallet,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import { useTheme } from '@/context/ThemeContext';
import { useDeleteNotification } from '@/hooks/useDeleteNotification';
import { useMarkAllNotificationsRead } from '@/hooks/useMarkAllNotificationsRead';
import { useMarkNotificationRead } from '@/hooks/useMarkNotificationRead';
import { useNotificationCount } from '@/hooks/useNotificationCount';
import { useNotifications } from '@/hooks/useNotifications';
import type {
  Notification,
  NotificationIcon,
  NotificationSeverity,
} from '@/types/notifications';
import { handleActionRoute } from '@/utils/deepLinks';
import { ApiError, mapErrorCode } from '@/utils/errors';
import { relativeTime } from '@/utils/format';

const ICON_MAP: Record<string, LucideIcon> = {
  wallet: Wallet,
  gift: Gift,
  shield: Shield,
  sparkles: Sparkles,
  trophy: Trophy,
  card: CreditCard,
  bell: Bell,
};

const SEVERITY_COLORS: Record<NotificationSeverity, { bg: string; fg: string }> = {
  info: { bg: '#eff6ff', fg: '#1d4ed8' },
  success: { bg: '#ecfdf5', fg: '#059669' },
  warning: { bg: '#fffbeb', fg: '#d97706' },
  error: { bg: '#fef2f2', fg: '#dc2626' },
};

function pickIcon(icon: NotificationIcon | string | null): LucideIcon {
  if (icon && ICON_MAP[icon]) return ICON_MAP[icon];
  return Bell;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [bannerError, setBannerError] = useState<string | null>(null);

  const { unreadCount: unreadCountApi, refresh: refreshCount } = useNotificationCount({});
  const {
    data,
    loading,
    loadingMore,
    refreshing,
    hasMore,
    error: listError,
    loadMore,
    refresh,
  } = useNotifications({ unreadOnly: filter === 'unread' });
  const { markRead } = useMarkNotificationRead();
  const { markAllRead, loading: markingAll } = useMarkAllNotificationsRead();
  const { remove } = useDeleteNotification();

  const handleRefresh = async (): Promise<void> => {
    setBannerError(null);
    await Promise.all([refresh(), refreshCount()]);
  };

  const onRowPress = async (n: Notification): Promise<void> => {
    if (n.readAt === null) {
      try {
        await markRead(n.id);
      } catch {
        // Optimistic markRead already rolled back; we still navigate.
      }
    }
    if (n.actionRoute) {
      handleActionRoute(n.actionRoute);
    }
  };

  const onDeletePress = (n: Notification): void => {
    Alert.alert('Delete notification?', n.title, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await remove(n.id);
          } catch (e) {
            const message =
              e instanceof ApiError ? mapErrorCode(e.code) ?? e.message : 'Could not delete.';
            setBannerError(message);
          }
        },
      },
    ]);
  };

  const onMarkAllPress = (): void => {
    if (markingAll) return;
    Alert.alert('Mark all as read?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Mark all',
        onPress: async () => {
          try {
            await markAllRead();
          } catch (e) {
            const message =
              e instanceof ApiError ? mapErrorCode(e.code) ?? e.message : 'Could not mark all read.';
            setBannerError(message);
          }
        },
      },
    ]);
  };

  const unreadDisplay = useMemo<number>(() => {
    if (unreadCountApi !== null) return unreadCountApi;
    return data.filter((n) => n.readAt === null).length;
  }, [unreadCountApi, data]);

  const initialErrorMessage = useMemo<string | null>(() => {
    if (!listError) return null;
    if (listError instanceof ApiError) return mapErrorCode(listError.code) ?? listError.message;
    return 'Could not load notifications.';
  }, [listError]);

  const isInitialLoading = loading && data.length === 0;

  return (
    <SafeAreaView edges={['left', 'right']} style={[styles.safe, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { backgroundColor: colors.surface, borderBottomColor: colors.border, paddingTop: insets.top + 14 },
        ]}
      >
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          style={styles.iconBtn}
        >
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Notifications</Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Notification settings"
          onPress={() => router.push('/notifications/settings')}
          style={styles.iconBtn}
        >
          <Settings size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View
        style={[
          styles.filterRow,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        {(['all', 'unread'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            accessibilityRole="button"
            accessibilityLabel={
              f === 'all' ? 'Show all notifications' : `Show unread notifications, ${unreadDisplay}`
            }
            style={[
              styles.filterBtn,
              { backgroundColor: colors.surfaceAlt },
              filter === f && { backgroundColor: colors.primary },
            ]}
            onPress={() => setFilter(f)}
          >
            <Text
              style={[
                styles.filterText,
                { color: colors.textSecondary },
                filter === f && styles.filterTextActive,
              ]}
            >
              {f === 'all' ? 'All' : `Unread (${unreadDisplay})`}
            </Text>
          </TouchableOpacity>
        ))}
        {unreadDisplay > 0 && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Mark all notifications as read"
            style={styles.markAllBtn}
            onPress={onMarkAllPress}
            disabled={markingAll}
          >
            <Text style={[styles.markAllText, { color: colors.primary }]}>
              {markingAll ? 'Marking…' : 'Mark all read'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {bannerError ? (
        <View style={[styles.banner, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}>
          <Text style={[styles.bannerText, { color: '#b91c1c' }]}>{bannerError}</Text>
          <TouchableOpacity onPress={() => setBannerError(null)}>
            <Text style={[styles.bannerDismiss, { color: '#b91c1c' }]}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {isInitialLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(n) => n.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
          }
          onEndReached={() => {
            if (hasMore && !loadingMore) void loadMore();
          }}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            initialErrorMessage ? (
              <View style={styles.center}>
                <Text style={[styles.emptyText, { color: colors.textTertiary }]}>{initialErrorMessage}</Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  onPress={() => void refresh()}
                  style={[styles.retryBtn, { backgroundColor: colors.surfaceAlt }]}
                >
                  <Text style={[styles.retryText, { color: colors.primary }]}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.center}>
                <Text style={[styles.emptyText, { color: colors.textTertiary }]}>No notifications</Text>
              </View>
            )
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footer}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            const Icon = pickIcon(item.icon);
            const sev = SEVERITY_COLORS[item.severity] ?? SEVERITY_COLORS.info;
            const unread = item.readAt === null;
            return (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`${item.title}. ${item.body}. ${unread ? 'Unread' : 'Read'}`}
                style={[
                  styles.notifRow,
                  {
                    backgroundColor: colors.surface,
                    borderBottomColor: colors.borderLight,
                  },
                  unread && { backgroundColor: isDark ? colors.surfaceAlt : '#f8faff' },
                ]}
                onPress={() => void onRowPress(item)}
              >
                <View style={[styles.notifIcon, { backgroundColor: sev.bg }]}>
                  <Icon size={18} color={sev.fg} />
                </View>
                <View style={styles.notifContent}>
                  <View style={styles.notifTitleRow}>
                    <Text
                      style={[
                        styles.notifTitle,
                        { color: colors.textSecondary },
                        unread && { fontFamily: 'Inter-SemiBold', color: colors.text },
                      ]}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    {unread && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
                  </View>
                  <Text
                    style={[styles.notifPreview, { color: colors.textSecondary }]}
                    numberOfLines={2}
                  >
                    {item.body}
                  </Text>
                  <Text style={[styles.notifTime, { color: colors.textTertiary }]}>
                    {relativeTime(item.createdAt)}
                  </Text>
                </View>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Delete notification"
                  onPress={() => onDeletePress(item)}
                  style={styles.deleteBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Trash2 size={16} color={colors.textTertiary} />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          }}
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
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 8,
  },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  filterText: { fontSize: 15, fontFamily: 'Inter-Medium' },
  filterTextActive: { color: '#fff' },
  markAllBtn: { marginLeft: 'auto' },
  markAllText: { fontSize: 15, fontFamily: 'Inter-SemiBold' },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
  },
  bannerText: { flex: 1, fontFamily: 'Inter-Regular', fontSize: 14 },
  bannerDismiss: { fontFamily: 'Inter-SemiBold', fontSize: 14, marginLeft: 8 },
  list: { paddingBottom: 80 },
  center: { paddingVertical: 60, alignItems: 'center', justifyContent: 'center' },
  emptyText: { textAlign: 'center', fontFamily: 'Inter-Regular', paddingVertical: 12 },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  retryText: { fontFamily: 'Inter-SemiBold', fontSize: 14 },
  footer: { paddingVertical: 16 },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  notifIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  notifContent: { flex: 1, gap: 3 },
  notifTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  notifTitle: { fontSize: 16, fontFamily: 'Inter-Medium', flex: 1 },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
  notifPreview: { fontSize: 15, fontFamily: 'Inter-Regular', lineHeight: 18 },
  notifTime: { fontSize: 13, fontFamily: 'Inter-Regular' },
  deleteBtn: { padding: 4, marginTop: 2 },
});
