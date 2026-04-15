import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { User, Lock, FileText, Trash2, CreditCard, Shield, Wallet, Zap, Gift, Star, Sparkles, Users, Bell, Globe, Circle as HelpCircle, Phone, Scale, ChevronRight, ChevronLeft, LogOut, Moon } from 'lucide-react-native';
import { useWallet } from '@/context/WalletContext';
import { useTheme } from '@/context/ThemeContext';

interface SettingsGroup {
  title: string;
  items: {
    icon: React.ComponentType<any>;
    iconColor: string;
    iconBg: string;
    iconBgDark: string;
    label: string;
    route: string;
  }[];
}

const SETTINGS_GROUPS: SettingsGroup[] = [
  {
    title: 'Account',
    items: [
      { icon: User, iconColor: '#1a56db', iconBg: '#eff6ff', iconBgDark: '#1E3A5F', label: 'Personal info', route: '/profile/personal' },
      { icon: Lock, iconColor: '#7c3aed', iconBg: '#f5f3ff', iconBgDark: '#4C1D95', label: 'Change password', route: '/profile/password' },
      { icon: FileText, iconColor: '#059669', iconBg: '#f0fdf4', iconBgDark: '#064E3B', label: 'Consents', route: '/profile/consents' },
      { icon: Trash2, iconColor: '#ef4444', iconBg: '#fef2f2', iconBgDark: '#7F1D1D', label: 'Delete account', route: '/profile/delete-account' },
    ],
  },
  {
    title: 'Card',
    items: [
      { icon: CreditCard, iconColor: '#1a56db', iconBg: '#eff6ff', iconBgDark: '#1E3A5F', label: 'Card', route: '/(tabs)/card' },
      { icon: Shield, iconColor: '#0369a1', iconBg: '#e0f2fe', iconBgDark: '#0C4A6E', label: 'Card limits', route: '/card/limits' },
      { icon: Trash2, iconColor: '#ef4444', iconBg: '#fef2f2', iconBgDark: '#7F1D1D', label: 'Delete card', route: '/profile/delete-card' },
    ],
  },
  {
    title: 'Money',
    items: [
      { icon: Wallet, iconColor: '#059669', iconBg: '#f0fdf4', iconBgDark: '#064E3B', label: 'Payment methods', route: '/payment-methods' },
      { icon: Zap, iconColor: '#d97706', iconBg: '#fffbeb', iconBgDark: '#78350F', label: 'Auto-reload', route: '/auto-reload' },
    ],
  },
  {
    title: 'Rewards & referral',
    items: [
      { icon: Gift, iconColor: '#059669', iconBg: '#f0fdf4', iconBgDark: '#064E3B', label: 'Rewards', route: '/(tabs)/rewards' },
      { icon: Star, iconColor: '#ca8a04', iconBg: '#fefce8', iconBgDark: '#78350F', label: 'Tier', route: '/tier' },
      { icon: Sparkles, iconColor: '#d97706', iconBg: '#fffbeb', iconBgDark: '#78350F', label: 'Perks & offers', route: '/program' },
      { icon: Users, iconColor: '#1a56db', iconBg: '#eff6ff', iconBgDark: '#1E3A5F', label: 'Invite friends', route: '/referral' },
    ],
  },
  {
    title: 'Preferences',
    items: [
      { icon: Bell, iconColor: '#7c3aed', iconBg: '#f5f3ff', iconBgDark: '#4C1D95', label: 'Notifications', route: '/notifications' },
      { icon: Globe, iconColor: '#64748b', iconBg: '#f1f5f9', iconBgDark: '#334155', label: 'Language', route: '/notifications' },
    ],
  },
  {
    title: 'Support',
    items: [
      { icon: HelpCircle, iconColor: '#1a56db', iconBg: '#eff6ff', iconBgDark: '#1E3A5F', label: 'Help & FAQ', route: '/help' },
      { icon: Phone, iconColor: '#059669', iconBg: '#f0fdf4', iconBgDark: '#064E3B', label: 'Contact us', route: '/help' },
    ],
  },
  {
    title: 'Legal',
    items: [
      { icon: Scale, iconColor: '#64748b', iconBg: '#f1f5f9', iconBgDark: '#334155', label: 'Legal documents', route: '/legal' },
    ],
  },
];

export default function ProfileScreen() {
  const router = useRouter();
  const { state, logout } = useWallet();
  const { colors, isDark, toggleTheme } = useTheme();
  const { user, tier } = state;

  const initials = user
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : 'AJ';
  const fullName = user ? `${user.firstName} ${user.lastName}` : 'Alex Johnson';
  const email = user?.email ?? 'alex@example.com';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.surface }]} onPress={() => router.back()}>
            <ChevronLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.screenTitle, { color: colors.text }]}>Profile</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={[styles.avatarCard, { backgroundColor: colors.surface }]}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.avatarInfo}>
            <Text style={[styles.avatarName, { color: colors.text }]}>{fullName}</Text>
            <Text style={[styles.avatarEmail, { color: colors.textSecondary }]}>{email}</Text>
          </View>
          <View style={[styles.tierBadge, { backgroundColor: isDark ? '#78350F' : '#fefce8' }]}>
            <Text style={[styles.tierBadgeText, { color: isDark ? '#FBBF24' : '#92400e' }]}>★ {tier.current}</Text>
          </View>
        </View>

        {SETTINGS_GROUPS.map((group) => (
          <View key={group.title} style={styles.group}>
            <Text style={[styles.groupTitle, { color: colors.textTertiary }]}>{group.title}</Text>
            <View style={[styles.groupCard, { backgroundColor: colors.surface }]}>
              {group.items.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <React.Fragment key={item.label}>
                    <TouchableOpacity
                      style={styles.row}
                      onPress={() => router.push(item.route as any)}
                    >
                      <View style={[styles.rowIcon, { backgroundColor: isDark ? item.iconBgDark : item.iconBg }]}>
                        <Icon size={18} color={item.iconColor} />
                      </View>
                      <Text style={[styles.rowLabel, { color: colors.text }, item.iconColor === '#ef4444' && { color: colors.red }]}>
                        {item.label}
                      </Text>
                      <ChevronRight size={16} color={colors.textTertiary} />
                    </TouchableOpacity>
                    {idx < group.items.length - 1 && <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />}
                    {group.title === 'Preferences' && idx === group.items.length - 1 && (
                      <>
                        <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
                        <View style={styles.row}>
                          <View style={[styles.rowIcon, { backgroundColor: isDark ? '#334155' : '#0f172a' }]}>
                            <Moon size={18} color="#fff" />
                          </View>
                          <Text style={[styles.rowLabel, { color: colors.text }]}>Dark mode</Text>
                          <Switch
                            value={isDark}
                            onValueChange={toggleTheme}
                            trackColor={{ false: '#e2e8f0', true: colors.primary }}
                            thumbColor="#fff"
                          />
                        </View>
                      </>
                    )}
                  </React.Fragment>
                );
              })}
            </View>
          </View>
        ))}

        <Text style={[styles.version, { color: colors.textTertiary }]}>Tesco Wallet v1.0.0</Text>
        <TouchableOpacity style={styles.logoutBtn} onPress={() => { logout(); router.replace('/(onboarding)/intro'); }}>
          <LogOut size={16} color={colors.red} />
          <Text style={[styles.logoutText, { color: colors.red }]}>Log out</Text>
        </TouchableOpacity>
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingBottom: 40 },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  screenTitle: { flex: 1, fontSize: 22, fontFamily: 'Inter-Bold', textAlign: 'center' },
  headerSpacer: { width: 40 },
  avatarCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#1a56db', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 20, fontFamily: 'Inter-Bold', color: '#fff' },
  avatarInfo: { flex: 1 },
  avatarName: { fontSize: 16, fontFamily: 'Inter-Bold' },
  avatarEmail: { fontSize: 13, fontFamily: 'Inter-Regular', marginTop: 2 },
  tierBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  tierBadgeText: { fontSize: 12, fontFamily: 'Inter-SemiBold' },
  group: { paddingHorizontal: 16, marginBottom: 16 },
  groupTitle: { fontSize: 12, fontFamily: 'Inter-SemiBold', letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' },
  groupCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, gap: 12 },
  rowIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, fontSize: 15, fontFamily: 'Inter-Medium' },
  divider: { height: 1, marginLeft: 64 },
  version: { textAlign: 'center', fontSize: 12, fontFamily: 'Inter-Regular', marginTop: 8, marginBottom: 16 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12 },
  logoutText: { fontSize: 15, fontFamily: 'Inter-SemiBold' },
});
