import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Bell, Plus, Users, Zap, Gift, Star, X, User, ShoppingBag, Coins, CircleArrowUp as ArrowUpCircle, Tag } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useWallet } from '@/context/WalletContext';
import { useTheme } from '@/context/ThemeContext';
import { formatCurrency, formatDate } from '@/utils/format';

export default function HomeScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const {
    state,
    unreadNotificationsCount,
    availableRewardsTotal,
    cashbackTotal,
    dismissBanner,
  } = useWallet();

  const insets = useSafeAreaInsets();
  const { user, wallet, card, transactions, tier, dismissedBanners } = state;
  const recentTxs = transactions.slice(0, 5);
  const firstName = user?.firstName ?? 'there';

  const showInviteBanner = !dismissedBanners.includes('invite');
  const showAutoReloadBanner = !dismissedBanners.includes('autoreload');

  const cashbackRewards = state.rewards.filter(
    (r) => r.bucket === 'cashback' && (r.status === 'available' || r.status === 'pending') && r.expiresAt
  );
  const soonestExpiry = cashbackRewards.length > 0
    ? cashbackRewards.reduce((min, r) => (r.expiresAt! < min ? r.expiresAt! : min), cashbackRewards[0].expiresAt!)
    : null;
  const daysUntilExpiry = soonestExpiry
    ? Math.max(0, Math.ceil((new Date(soonestExpiry).getTime() - Date.now()) / 86400000))
    : null;
  const expiryWarning = daysUntilExpiry !== null && daysUntilExpiry <= 7;

  const getTxIcon = (type: string) => {
    switch (type) {
      case 'purchase': return ShoppingBag;
      case 'cashback': return Coins;
      case 'topup': return ArrowUpCircle;
      default: return Tag;
    }
  };

  const getTxIconBg = (type: string) => {
    switch (type) {
      case 'purchase': return isDark ? '#334155' : '#f1f5f9';
      case 'cashback': return isDark ? '#064E3B' : '#f0fdf4';
      case 'topup': return isDark ? '#1E3A5F' : '#eff6ff';
      default: return isDark ? '#334155' : '#f1f5f9';
    }
  };

  const getTxIconColor = (type: string) => {
    switch (type) {
      case 'purchase': return isDark ? '#94A3B8' : '#64748b';
      case 'cashback': return '#059669';
      case 'topup': return colors.primary;
      default: return colors.textSecondary;
    }
  };

  return (
    <SafeAreaView edges={['left', 'right']} style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <Text style={[styles.walletTitle, { color: colors.text }]}>Tesco Wallet</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: colors.iconBtnBg }]}
              onPress={() => router.push('/notifications')}
            >
              <Bell size={22} color={colors.text} />
              {unreadNotificationsCount > 0 && (
                <View style={styles.notifDot}>
                  <Text style={styles.notifDotText}>
                    {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.avatarBtn}
              onPress={() => router.push('/(tabs)/profile')}
            >
              <User size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={[styles.greeting, { color: colors.text }]}>Hi, {firstName}</Text>

        <TouchableOpacity onPress={() => router.push('/(tabs)/card')} activeOpacity={0.92}>
          <LinearGradient colors={['#1e3a8a', '#1a56db']} style={styles.cardWidget} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={styles.cardWidgetTop}>
              <Text style={styles.cardWidgetLabel}>Tesco Wallet</Text>
              <View style={[styles.cardStatusChip, card.status === 'active' ? styles.chipActive : styles.chipFrozen]}>
                <View style={[styles.chipDot, card.status === 'active' ? styles.dotGreen : styles.dotAmber]} />
                <Text style={styles.chipText}>{card.status === 'active' ? 'Active' : card.status === 'frozen' ? 'Frozen' : 'No card'}</Text>
              </View>
            </View>
            <View style={styles.cardBalanceArea}>
              <Text style={styles.cardBalance}>{formatCurrency(wallet.balance)}</Text>
              <Text style={[styles.cardCashback, expiryWarning && styles.cardCashbackWarning]}>
                Cashback {formatCurrency(cashbackTotal)}
                {expiryWarning
                  ? ` (exp. ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'})`
                  : cashbackTotal > 0 ? ' available' : ''}
              </Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.addFundsBtn, { backgroundColor: colors.primary }]} onPress={() => router.push('/topup')}>
          <Plus size={18} color="#fff" />
          <Text style={styles.addFundsBtnText}>Add Funds</Text>
        </TouchableOpacity>

        <View style={styles.blocksGrid}>
          <View style={styles.blocksRow}>
            <TouchableOpacity style={[styles.blockCard, { backgroundColor: colors.surface }]} onPress={() => router.push('/referral')}>
              <View style={[styles.blockIcon, { backgroundColor: isDark ? '#1E3A5F' : '#eff6ff' }]}>
                <Users size={20} color={colors.primary} />
              </View>
              <Text style={[styles.blockTitle, { color: colors.text }]}>Invite Friends</Text>
              <Text style={[styles.blockSub, { color: colors.primary }]}>Get £5</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.blockCard, { backgroundColor: colors.surface }]} onPress={() => router.push('/auto-reload')}>
              <View style={[styles.blockIcon, { backgroundColor: state.autoReload.enabled ? (isDark ? '#064E3B' : '#f0fdf4') : (isDark ? '#7F1D1D' : '#fef2f2') }]}>
                <Zap size={20} color={state.autoReload.enabled ? colors.green : colors.red} />
              </View>
              <Text style={[styles.blockTitle, { color: colors.text }]}>Auto Reload</Text>
              <Text style={[styles.blockSub, { color: state.autoReload.enabled ? colors.green : colors.red, fontFamily: 'Inter-SemiBold' }]}>
                {state.autoReload.enabled ? 'ON' : 'OFF'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.blocksRow}>
            <TouchableOpacity style={[styles.blockCard, { backgroundColor: colors.surface }]} onPress={() => router.push('/(tabs)/rewards')}>
              <View style={[styles.blockIcon, { backgroundColor: isDark ? '#1E3A5F' : '#eff6ff' }]}>
                <Gift size={20} color={colors.primary} />
              </View>
              <Text style={[styles.blockTitle, { color: colors.text }]}>Rewards</Text>
              <Text style={[styles.blockSub, { color: colors.primary }]}>{formatCurrency(availableRewardsTotal)} earned</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.blockCard, { backgroundColor: colors.surface }]} onPress={() => router.push('/tier')}>
              <View style={[styles.blockIcon, { backgroundColor: isDark ? '#1E3A5F' : '#eff6ff' }]}>
                <Star size={20} color={colors.primary} />
              </View>
              <Text style={[styles.blockTitle, { color: colors.text }]}>{tier.current}</Text>
              <Text style={[styles.blockSub, { color: colors.primary }]}>{formatCurrency(tier.targetGBP - tier.progressGBP)} to next</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.blocksRow}>
            <TouchableOpacity style={[styles.blockCard, { backgroundColor: colors.surface }]} onPress={() => router.push('/program')}>
              <View style={[styles.blockIcon, { backgroundColor: isDark ? '#1E3A5F' : '#eff6ff' }]}>
                <Star size={20} color={colors.primary} />
              </View>
              <Text style={[styles.blockTitle, { color: colors.text }]}>Perks & Offers</Text>
              <Text style={[styles.blockSub, { color: colors.primary }]}>See all</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.blockCard, { backgroundColor: colors.surface }]} onPress={() => router.push('/transactions')}>
              <View style={[styles.blockIcon, { backgroundColor: isDark ? '#1E3A5F' : '#eff6ff' }]}>
                <ShoppingBag size={20} color={colors.primary} />
              </View>
              <Text style={[styles.blockTitle, { color: colors.text }]}>Transactions</Text>
              <Text style={[styles.blockSub, { color: colors.primary }]}>History</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent transactions</Text>
            <TouchableOpacity onPress={() => router.push('/transactions')}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
            </TouchableOpacity>
          </View>
          {recentTxs.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>No transactions yet</Text>
          ) : (
            recentTxs.map((tx) => {
              const isPositive = tx.amount > 0;
              const isCashback = tx.type === 'cashback' || tx.type === 'bonus';
              const isTopup = tx.type === 'topup';
              const amountColor = (isCashback || isTopup) ? colors.green : colors.text;
              const TxIcon = getTxIcon(tx.type);
              return (
                <TouchableOpacity
                  key={tx.id}
                  style={[styles.txRow, { borderBottomColor: colors.borderLight }]}
                  onPress={() => router.push(`/transactions/${tx.id}` as any)}
                >
                  <View style={[styles.txIcon, { backgroundColor: getTxIconBg(tx.type) }]}>
                    <TxIcon size={18} color={getTxIconColor(tx.type)} />
                  </View>
                  <View style={styles.txInfo}>
                    <Text style={[styles.txMerchant, { color: colors.text }]}>{tx.merchant ?? tx.type}</Text>
                    <Text style={[styles.txDate, { color: colors.textTertiary }]}>{formatDate(tx.date)}</Text>
                  </View>
                  <Text style={[styles.txAmount, { color: amountColor }]}>
                    {isPositive ? '+' : ''}{formatCurrency(tx.amount)}
                  </Text>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {showInviteBanner && (
          <View style={[styles.promoBanner, { backgroundColor: isDark ? '#1E3A5F' : '#eff6ff' }]}>
            <View style={styles.promoBannerContent}>
              <Users size={20} color={colors.primary} />
              <View style={styles.promoBannerText}>
                <Text style={[styles.promoBannerTitle, { color: colors.text }]}>Invite friends, earn £5 each</Text>
                <Text style={[styles.promoBannerSub, { color: colors.textSecondary }]}>Share your code and both get rewarded</Text>
              </View>
            </View>
            <View style={styles.promoBannerActions}>
              <TouchableOpacity onPress={() => router.push('/referral')}>
                <Text style={[styles.promoBannerCTA, { color: colors.primary }]}>Invite</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => dismissBanner('invite')}>
                <X size={16} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {showAutoReloadBanner && !state.autoReload.enabled && (
          <View style={[styles.promoBanner, { backgroundColor: isDark ? '#78350F' : '#fffbeb' }]}>
            <View style={styles.promoBannerContent}>
              <Zap size={20} color={colors.amber} />
              <View style={styles.promoBannerText}>
                <Text style={[styles.promoBannerTitle, { color: colors.text }]}>Never run out of balance</Text>
                <Text style={[styles.promoBannerSub, { color: colors.textSecondary }]}>Set up Auto-reload + earn 1% extra cashback</Text>
              </View>
            </View>
            <View style={styles.promoBannerActions}>
              <TouchableOpacity onPress={() => router.push('/auto-reload')}>
                <Text style={[styles.promoBannerCTA, { color: colors.amber }]}>Set up</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => dismissBanner('autoreload')}>
                <X size={16} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: {},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 4,
  },
  walletTitle: { fontSize: 20, fontFamily: 'Inter-Bold' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  notifDot: {
    position: 'absolute', top: 4, right: 4,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: '#ef4444',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#f8fafc',
  },
  notifDotText: { fontSize: 15, fontFamily: 'Inter-Bold', color: '#fff' },
  avatarBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#1a56db',
    alignItems: 'center', justifyContent: 'center',
  },
  greeting: { fontSize: 22, fontFamily: 'Inter-SemiBold', paddingHorizontal: 16, marginTop: 8, marginBottom: 14 },
  cardWidget: {
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 22,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardWidgetTop: {
    position: 'absolute',
    top: 22,
    left: 22,
    right: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardWidgetLabel: { fontSize: 16, fontFamily: 'Inter-Bold', color: '#fff', letterSpacing: 0.5 },
  cardStatusChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  chipActive: { backgroundColor: 'rgba(255,255,255,0.18)' },
  chipFrozen: { backgroundColor: 'rgba(255,255,255,0.18)' },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  dotGreen: { backgroundColor: '#4ade80' },
  dotAmber: { backgroundColor: '#fbbf24' },
  chipText: { fontSize: 15, fontFamily: 'Inter-Medium', color: '#fff' },
  cardBalanceArea: { alignItems: 'center', marginTop: 18 },
  cardBalance: { fontSize: 57, fontFamily: 'Inter-Bold', color: '#fff', letterSpacing: -2 },
  cardCashback: { fontSize: 15, fontFamily: 'Inter-Regular', color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  cardCashbackWarning: { color: '#fbbf24', fontFamily: 'Inter-Medium' },
  addFundsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 16,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 20,
  },
  addFundsBtnText: { fontSize: 18, fontFamily: 'Inter-SemiBold', color: '#fff' },
  blocksGrid: { marginHorizontal: 16, gap: 12, marginBottom: 20 },
  blocksRow: { flexDirection: 'row', gap: 12 },
  blockCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  blockIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  blockTitle: { fontSize: 18, fontFamily: 'Inter-SemiBold', marginTop: 4 },
  blockSub: { fontSize: 15, fontFamily: 'Inter-Regular' },
  section: { marginHorizontal: 16, marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 19, fontFamily: 'Inter-Bold' },
  seeAll: { fontSize: 16, fontFamily: 'Inter-SemiBold' },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  txIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  txInfo: { flex: 1 },
  txMerchant: { fontSize: 17, fontFamily: 'Inter-SemiBold' },
  txDate: { fontSize: 15, fontFamily: 'Inter-Regular', marginTop: 2 },
  txAmount: { fontSize: 17, fontFamily: 'Inter-SemiBold' },
  emptyText: { fontSize: 16, fontFamily: 'Inter-Regular', textAlign: 'center', paddingVertical: 20 },
  promoBanner: {
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  promoBannerContent: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  promoBannerText: { flex: 1 },
  promoBannerTitle: { fontSize: 16, fontFamily: 'Inter-SemiBold' },
  promoBannerSub: { fontSize: 15, fontFamily: 'Inter-Regular', marginTop: 2 },
  promoBannerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  promoBannerCTA: { fontSize: 15, fontFamily: 'Inter-SemiBold' },
});
