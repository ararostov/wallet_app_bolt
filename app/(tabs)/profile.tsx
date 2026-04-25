import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Linking,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { User, Lock, FileText, Trash2, CreditCard, Shield, Wallet, Zap, Gift, Star, Sparkles, Users, Circle as HelpCircle, Phone, Scale, ChevronRight, ChevronLeft, LogOut, Moon, TriangleAlert as AlertTriangle } from 'lucide-react-native';
import { useWallet } from '@/context/WalletContext';
import { useTheme } from '@/context/ThemeContext';
import { useLogout } from '@/hooks/useLogout';
import { formatDate } from '@/utils/format';

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

const GREY = '#64748b';
const GREY_BG = '#f1f5f9';
const GREY_BG_DARK = '#334155';
const RED = '#ef4444';
const RED_BG = '#fef2f2';
const RED_BG_DARK = '#7F1D1D';

function buildSettingsGroups(hasPassword: boolean): SettingsGroup[] {
  return [
  {
    title: 'Account',
    items: [
      { icon: User, iconColor: GREY, iconBg: GREY_BG, iconBgDark: GREY_BG_DARK, label: 'Personal info', route: '/profile/personal' },
      { icon: Lock, iconColor: GREY, iconBg: GREY_BG, iconBgDark: GREY_BG_DARK, label: hasPassword ? 'Change password' : 'Set password', route: '/profile/password' },
      { icon: FileText, iconColor: GREY, iconBg: GREY_BG, iconBgDark: GREY_BG_DARK, label: 'Consents', route: '/profile/consents' },
      { icon: Trash2, iconColor: RED, iconBg: RED_BG, iconBgDark: RED_BG_DARK, label: 'Delete account', route: '/profile/delete-account' },
    ],
  },
  {
    title: 'Card',
    items: [
      { icon: CreditCard, iconColor: GREY, iconBg: GREY_BG, iconBgDark: GREY_BG_DARK, label: 'Card', route: '/(tabs)/card' },
      { icon: Shield, iconColor: GREY, iconBg: GREY_BG, iconBgDark: GREY_BG_DARK, label: 'Card limits', route: '/card/limits' },
      { icon: Trash2, iconColor: RED, iconBg: RED_BG, iconBgDark: RED_BG_DARK, label: 'Delete card', route: '/profile/delete-card' },
    ],
  },
  {
    title: 'Money',
    items: [
      { icon: Wallet, iconColor: GREY, iconBg: GREY_BG, iconBgDark: GREY_BG_DARK, label: 'Payment methods', route: '/payment-methods' },
      { icon: Zap, iconColor: GREY, iconBg: GREY_BG, iconBgDark: GREY_BG_DARK, label: 'Auto-reload', route: '/auto-reload' },
    ],
  },
  {
    title: 'Rewards & referral',
    items: [
      { icon: Gift, iconColor: GREY, iconBg: GREY_BG, iconBgDark: GREY_BG_DARK, label: 'Rewards', route: '/(tabs)/rewards' },
      { icon: Star, iconColor: GREY, iconBg: GREY_BG, iconBgDark: GREY_BG_DARK, label: 'Tier', route: '/tier' },
      { icon: Sparkles, iconColor: GREY, iconBg: GREY_BG, iconBgDark: GREY_BG_DARK, label: 'Perks & offers', route: '/program' },
      { icon: Users, iconColor: GREY, iconBg: GREY_BG, iconBgDark: GREY_BG_DARK, label: 'Invite friends', route: '/referral' },
    ],
  },
  {
    title: 'Support',
    items: [
      { icon: HelpCircle, iconColor: GREY, iconBg: GREY_BG, iconBgDark: GREY_BG_DARK, label: 'Help & FAQ', route: '/help' },
      { icon: Phone, iconColor: GREY, iconBg: GREY_BG, iconBgDark: GREY_BG_DARK, label: 'Contact us', route: '/help' },
    ],
  },
  {
    title: 'Legal',
    items: [
      { icon: Scale, iconColor: GREY, iconBg: GREY_BG, iconBgDark: GREY_BG_DARK, label: 'Legal documents', route: '/legal' },
    ],
  },
];
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state } = useWallet();
  const { logout, loading: logoutLoading } = useLogout();
  const { colors, isDark, toggleTheme } = useTheme();
  const { user, tier, accountDeletion } = state;

  const initials = user
    ? `${(user.firstName[0] ?? '').toUpperCase()}${(user.lastName[0] ?? '').toUpperCase()}` || 'U'
    : 'U';
  const fullName = user ? `${user.firstName} ${user.lastName}`.trim() : '';
  const email = user?.email ?? user?.phone ?? '';
  const groups = React.useMemo(
    () => buildSettingsGroups(user?.hasPassword ?? false),
    [user?.hasPassword],
  );

  const openSupportMail = React.useCallback(() => {
    const supportEmail = accountDeletion?.supportEmail;
    if (!supportEmail) return;
    const subject = encodeURIComponent('Restore account');
    const body = encodeURIComponent(
      user?.id ? `Customer ID: ${user.id}` : 'Please restore my account.',
    );
    Linking.openURL(`mailto:${supportEmail}?subject=${subject}&body=${body}`).catch(
      () => undefined,
    );
  }, [accountDeletion?.supportEmail, user?.id]);

  return (
    <SafeAreaView edges={['left', 'right']} style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.surface }]} onPress={() => router.back()}>
            <ChevronLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.screenTitle, { color: colors.text }]}>Profile</Text>
          <View style={styles.headerSpacer} />
        </View>

        {accountDeletion && accountDeletion.status === 'pending' && (
          <View style={[styles.deletionBanner, { backgroundColor: colors.redLight }]}>
            <AlertTriangle size={18} color={colors.red} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.deletionTitle, { color: colors.red }]}>
                Account scheduled for deletion
              </Text>
              <Text style={[styles.deletionDesc, { color: colors.red }]}>
                {`Your account will be permanently deleted on ${formatDate(
                  accountDeletion.scheduledFor,
                  'long',
                )}.`}
              </Text>
              {accountDeletion.supportEmail && (
                <TouchableOpacity onPress={openSupportMail} style={styles.deletionAction}>
                  <Text style={[styles.deletionActionText, { color: colors.red }]}>
                    Contact support to restore
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        <TouchableOpacity style={[styles.avatarCard, { backgroundColor: colors.surface }]} onPress={() => router.push('/profile/personal')}>
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
          <ChevronRight size={16} color={colors.textTertiary} />
        </TouchableOpacity>

        {groups.map((group) => (
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
                  </React.Fragment>
                );
              })}
            </View>
          </View>
        ))}

        <View style={styles.group}>
          <Text style={[styles.groupTitle, { color: colors.textTertiary }]}>Preferences</Text>
          <View style={[styles.groupCard, { backgroundColor: colors.surface }]}>
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
          </View>
        </View>

        <Text style={[styles.version, { color: colors.textTertiary }]}>Tesco Wallet v1.0.0</Text>
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => { logout(); }}
          disabled={logoutLoading}
        >
          <LogOut size={16} color={colors.red} />
          <Text style={[styles.logoutText, { color: colors.red }]}>
            {logoutLoading ? 'Logging out…' : 'Log out'}
          </Text>
        </TouchableOpacity>
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingBottom: 80 },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  screenTitle: { flex: 1, fontSize: 24, fontFamily: 'Inter-Bold', textAlign: 'center' },
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
  avatarText: { fontSize: 22, fontFamily: 'Inter-Bold', color: '#fff' },
  avatarInfo: { flex: 1 },
  avatarName: { fontSize: 18, fontFamily: 'Inter-Bold' },
  avatarEmail: { fontSize: 15, fontFamily: 'Inter-Regular', marginTop: 2 },
  tierBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  tierBadgeText: { fontSize: 15, fontFamily: 'Inter-SemiBold' },
  group: { paddingHorizontal: 16, marginBottom: 16 },
  groupTitle: { fontSize: 15, fontFamily: 'Inter-SemiBold', letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' },
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
  rowLabel: { flex: 1, fontSize: 17, fontFamily: 'Inter-Medium' },
  divider: { height: 1, marginLeft: 64 },
  version: { textAlign: 'center', fontSize: 15, fontFamily: 'Inter-Regular', marginTop: 8, marginBottom: 16 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12 },
  logoutText: { fontSize: 17, fontFamily: 'Inter-SemiBold' },
  deletionBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  deletionTitle: { fontSize: 16, fontFamily: 'Inter-SemiBold' },
  deletionDesc: { fontSize: 14, fontFamily: 'Inter-Regular', marginTop: 2 },
  deletionAction: { marginTop: 6 },
  deletionActionText: { fontSize: 14, fontFamily: 'Inter-SemiBold', textDecorationLine: 'underline' },
});
