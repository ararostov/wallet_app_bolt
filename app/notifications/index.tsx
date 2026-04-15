import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Settings, Trash2, ShoppingBag, Gift, Shield, Megaphone, Star } from 'lucide-react-native';
import { useWallet } from '@/context/WalletContext';
import { useTheme } from '@/context/ThemeContext';
import { relativeTime } from '@/utils/format';

const CATEGORY_ICONS: Record<string, { icon: any; color: string; bg: string }> = {
  transaction: { icon: ShoppingBag, color: '#1a56db', bg: '#eff6ff' },
  reward: { icon: Gift, color: '#d97706', bg: '#fffbeb' },
  security: { icon: Shield, color: '#ef4444', bg: '#fef2f2' },
  promo: { icon: Megaphone, color: '#7c3aed', bg: '#f5f3ff' },
  tier: { icon: Star, color: '#ca8a04', bg: '#fefce8' },
};

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, markNotificationRead, markAllNotificationsRead, deleteNotification } = useWallet();
  const { colors, isDark } = useTheme();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const notifications = filter === 'unread'
    ? state.notifications.filter((n) => !n.read)
    : state.notifications;

  return (
    <SafeAreaView edges={['left', 'right']} style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border, paddingTop: insets.top + 14 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Notifications</Text>
        <TouchableOpacity onPress={() => router.push('/notifications/settings')} style={styles.iconBtn}>
          <Settings size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={[styles.filterRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {(['all', 'unread'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, { backgroundColor: colors.surfaceAlt }, filter === f && { backgroundColor: colors.primary }]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, { color: colors.textSecondary }, filter === f && styles.filterTextActive]}>
              {f === 'all' ? 'All' : `Unread (${state.notifications.filter((n) => !n.read).length})`}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.markAllBtn} onPress={markAllNotificationsRead}>
          <Text style={[styles.markAllText, { color: colors.primary }]}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
        {notifications.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textTertiary }]}>No notifications</Text>
        ) : (
          notifications.map((notif) => {
            const cfg = CATEGORY_ICONS[notif.type] ?? CATEGORY_ICONS.transaction;
            const Icon = cfg.icon;
            return (
              <TouchableOpacity
                key={notif.id}
                style={[styles.notifRow, { backgroundColor: colors.surface, borderBottomColor: colors.borderLight }, !notif.read && { backgroundColor: isDark ? colors.surfaceAlt : '#f8faff' }]}
                onPress={() => {
                  markNotificationRead(notif.id);
                  if (notif.actionRoute) {
                    router.push(notif.actionRoute as any);
                  }
                }}
              >
                <View style={[styles.notifIcon, { backgroundColor: cfg.bg }]}>
                  <Icon size={18} color={cfg.color} />
                </View>
                <View style={styles.notifContent}>
                  <View style={styles.notifTitleRow}>
                    <Text style={[styles.notifTitle, { color: colors.textSecondary }, !notif.read && { fontFamily: 'Inter-SemiBold', color: colors.text }]}>
                      {notif.title}
                    </Text>
                    {!notif.read && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
                  </View>
                  <Text style={[styles.notifPreview, { color: colors.textSecondary }]} numberOfLines={2}>{notif.body}</Text>
                  <Text style={[styles.notifTime, { color: colors.textTertiary }]}>{relativeTime(notif.date)}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => deleteNotification(notif.id)}
                  style={styles.deleteBtn}
                >
                  <Trash2 size={16} color={colors.textTertiary} />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 19, fontFamily: 'Inter-SemiBold' },
  filterRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, gap: 8 },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  filterText: { fontSize: 15, fontFamily: 'Inter-Medium' },
  filterTextActive: { color: '#fff' },
  markAllBtn: { marginLeft: 'auto' },
  markAllText: { fontSize: 15, fontFamily: 'Inter-SemiBold' },
  scroll: { paddingBottom: 80 },
  notifRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 14, borderBottomWidth: 1, gap: 12 },
  notifIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  notifContent: { flex: 1, gap: 3 },
  notifTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  notifTitle: { fontSize: 16, fontFamily: 'Inter-Medium', flex: 1 },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
  notifPreview: { fontSize: 15, fontFamily: 'Inter-Regular', lineHeight: 18 },
  notifTime: { fontSize: 15, fontFamily: 'Inter-Regular' },
  deleteBtn: { padding: 4, marginTop: 2 },
  emptyText: { textAlign: 'center', fontFamily: 'Inter-Regular', paddingVertical: 40 },
});
