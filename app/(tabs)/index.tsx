import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Bell,
  Plus,
  Users,
  Zap,
  Gift,
  Star,
  X,
  User,
  ShoppingBag,
  Coins,
  CircleArrowUp as ArrowUpCircle,
  CreditCard,
  Tag,
  AlertTriangle,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useWallet } from '@/context/WalletContext';
import { useTheme } from '@/context/ThemeContext';
import { useWalletState } from '@/hooks/useWalletState';
import { formatCurrency, formatDate, formatMoney } from '@/utils/format';
import { mapErrorCode, ApiError } from '@/utils/errors';

// Until backend includes a per-program ceiling in /wallet/state we treat £1,000
// as a sane MVP default. See docs/mobile/specs/02-wallet.ru.md §11.1.
const WALLET_BALANCE_CEILING_MINOR = 100_000_00;

export default function HomeScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { state, unreadNotificationsCount, availableRewardsTotal, cashbackTotal, dismissBanner } =
    useWallet();
  const insets = useSafeAreaInsets();

  const query = useWalletState();

  const { user, walletApi, cardApi, tierApi, autoReloadApi, transactions, transactionsApi, dismissedBanners } = state;

  // Prefer the spec-06 backend-shape feed (state.transactionsApi) when it has
  // been hydrated by the transactions list screen. Until then fall back to
  // the legacy mock-shape `transactions` slice so the home widget keeps
  // rendering without a round-trip.
  type RecentTx =
    | {
        kind: 'api';
        id: string;
        type: 'topup' | 'auto_reload' | 'purchase' | 'cashback' | 'bonus' | 'refund';
        merchant: string | null;
        date: string;
        amountMinor: number;
        currency: string;
      }
    | {
        kind: 'legacy';
        id: string;
        type: 'topup' | 'purchase' | 'cashback' | 'bonus' | 'refund';
        merchant: string | undefined;
        date: string;
        amount: number;
      };
  const recentTxs: RecentTx[] = transactionsApi
    ? transactionsApi.slice(0, 5).map((t) => ({
        kind: 'api',
        id: t.id,
        type: t.type,
        merchant: t.merchantName,
        date: t.occurredAt,
        amountMinor: t.amount.amountMinor,
        currency: t.amount.currency,
      }))
    : transactions.slice(0, 5).map((t) => ({
        kind: 'legacy',
        id: t.id,
        type: t.type,
        merchant: t.merchant,
        date: t.date,
        amount: t.amount,
      }));
  const firstName = user?.firstName ?? 'there';

  // First-mount paint guard: if we have no cached state at all and the query
  // is still loading, show a skeleton placeholder.
  const showFirstMountSkeleton = !walletApi && query.loading && !query.data;

  // Cashback expiry hint (read from legacy mock rewards slice — spec 07
  // will replace this with real loyalty data).
  const cashbackRewards = state.rewards.filter(
    (r) =>
      r.bucket === 'cashback' &&
      (r.status === 'available' || r.status === 'pending') &&
      r.expiresAt,
  );
  const soonestExpiry =
    cashbackRewards.length > 0
      ? cashbackRewards.reduce(
          (min, r) => (r.expiresAt! < min ? r.expiresAt! : min),
          cashbackRewards[0].expiresAt!,
        )
      : null;
  const daysUntilExpiry = soonestExpiry
    ? Math.max(0, Math.ceil((new Date(soonestExpiry).getTime() - Date.now()) / 86400000))
    : null;
  const expiryWarning = daysUntilExpiry !== null && daysUntilExpiry <= 7;

  // --- Derived state -------------------------------------------------------

  const cardStatusLabel = useMemo(() => {
    if (!cardApi) return 'No card';
    switch (cardApi.status) {
      case 'active':
        return 'Active';
      case 'frozen':
        return 'Frozen';
      case 'pending':
        return 'Pending';
      case 'closed':
        return 'Closed';
      case 'replaced':
        return 'Replaced';
      default:
        return 'Inactive';
    }
  }, [cardApi]);

  const cardStatusActive = cardApi?.status === 'active';

  const balanceLabel = useMemo(() => {
    if (!walletApi) return formatCurrency(0);
    return formatMoney(walletApi.balance.amountMinor, walletApi.balance.currency);
  }, [walletApi]);

  const tierName = tierApi?.currentLevel ?? null;
  const tierProgressLabel = useMemo(() => {
    if (!tierApi || !tierApi.target) return null;
    const remainingMinor = Math.max(0, tierApi.target.amountMinor - tierApi.progress.amountMinor);
    return `${formatMoney(remainingMinor, tierApi.target.currency)} to next`;
  }, [tierApi]);

  const ceilingPct =
    walletApi && walletApi.balance.amountMinor > 0
      ? walletApi.balance.amountMinor / WALLET_BALANCE_CEILING_MINOR
      : 0;
  const showCeilingBanner =
    ceilingPct >= 0.9 && !dismissedBanners.includes('wallet-ceiling');

  const showAutoReloadFailureBanner = useMemo(() => {
    if (!autoReloadApi) return false;
    return (
      autoReloadApi.disableReason === 'consecutive_failures' ||
      autoReloadApi.disableReason === 'payment_method_removed' ||
      autoReloadApi.consecutiveFailureCount > 0
    );
  }, [autoReloadApi]);

  const autoReloadEnabled = autoReloadApi?.enabled === true;
  const showAutoReloadUpsell =
    !autoReloadEnabled &&
    !showAutoReloadFailureBanner &&
    !dismissedBanners.includes('autoreload-upsell');

  // --- Refresh handling ----------------------------------------------------

  const onRefresh = React.useCallback(() => {
    query.refetch().catch(() => undefined);
  }, [query]);

  // Surface query errors as a subtle banner without nuking cached state.
  const queryErrorMessage = useMemo(() => {
    if (!query.error) return null;
    if (query.error instanceof ApiError) {
      return mapErrorCode(query.error.code) ?? query.error.message;
    }
    return 'Updating failed. Pull to refresh to retry.';
  }, [query.error]);

  // --- Tx icon helpers (from legacy code) ---------------------------------

  const getTxIcon = (type: string) => {
    switch (type) {
      case 'purchase':
        return ShoppingBag;
      case 'cashback':
        return Coins;
      case 'topup':
        return ArrowUpCircle;
      default:
        return Tag;
    }
  };
  const getTxIconBg = (type: string) => {
    switch (type) {
      case 'purchase':
        return isDark ? '#334155' : '#f1f5f9';
      case 'cashback':
        return isDark ? '#064E3B' : '#f0fdf4';
      case 'topup':
        return isDark ? '#1E3A5F' : '#eff6ff';
      default:
        return isDark ? '#334155' : '#f1f5f9';
    }
  };
  const getTxIconColor = (type: string) => {
    switch (type) {
      case 'purchase':
        return isDark ? '#94A3B8' : '#64748b';
      case 'cashback':
        return '#059669';
      case 'topup':
        return colors.primary;
      default:
        return colors.textSecondary;
    }
  };

  return (
    <SafeAreaView edges={['left', 'right']} style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
        refreshControl={
          <RefreshControl
            refreshing={query.loading && !!query.data}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <Text style={[styles.walletTitle, { color: colors.text }]}>Tesco Wallet</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`Notifications, ${unreadNotificationsCount} unread`}
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
              accessibilityRole="button"
              accessibilityLabel="Profile"
              style={styles.avatarBtn}
              onPress={() => router.push('/(tabs)/profile')}
            >
              <User size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={[styles.greeting, { color: colors.text }]}>Hi, {firstName}</Text>

        {showFirstMountSkeleton ? (
          <View style={[styles.cardWidget, styles.skeletonCard, { backgroundColor: isDark ? '#1e3a8a' : '#1e3a8a' }]}>
            <ActivityIndicator color="#ffffff" />
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/card')}
            activeOpacity={0.92}
            accessibilityRole="button"
            accessibilityLabel={`Wallet balance ${balanceLabel}, card ${cardStatusLabel}`}
          >
            <LinearGradient
              colors={['#1e3a8a', '#1a56db']}
              style={styles.cardWidget}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.cardWidgetTop}>
                <Text style={styles.cardWidgetLabel}>Tesco Wallet</Text>
                <View
                  style={[
                    styles.cardStatusChip,
                    cardStatusActive ? styles.chipActive : styles.chipFrozen,
                  ]}
                >
                  <View
                    style={[
                      styles.chipDot,
                      cardStatusActive ? styles.dotGreen : styles.dotAmber,
                    ]}
                  />
                  <Text style={styles.chipText}>{cardStatusLabel}</Text>
                </View>
              </View>
              <View style={styles.cardBalanceArea}>
                <Text
                  style={styles.cardBalance}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                  numberOfLines={1}
                >
                  {balanceLabel}
                </Text>
                <Text style={[styles.cardCashback, expiryWarning && styles.cardCashbackWarning]}>
                  Cashback {formatCurrency(cashbackTotal)}
                  {expiryWarning
                    ? ` (exp. ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'})`
                    : cashbackTotal > 0
                      ? ' available'
                      : ''}
                </Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Add funds"
          style={[styles.addFundsBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/topup')}
        >
          <Plus size={18} color="#fff" />
          <Text style={styles.addFundsBtnText}>Add Funds</Text>
        </TouchableOpacity>

        {showCeilingBanner && (
          <View style={[styles.banner, styles.bannerWarning, { backgroundColor: isDark ? '#78350F' : '#fffbeb' }]}>
            <View style={styles.bannerContent}>
              <AlertTriangle size={20} color={colors.amber} />
              <View style={styles.bannerText}>
                <Text style={[styles.bannerTitle, { color: colors.text }]}>
                  You&apos;re near your balance limit
                </Text>
                <Text style={[styles.bannerSub, { color: colors.textSecondary }]}>
                  Spend some before topping up to avoid declines.
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => dismissBanner('wallet-ceiling')}>
              <X size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
        )}

        {showAutoReloadFailureBanner && (
          <View style={[styles.banner, { backgroundColor: isDark ? '#7F1D1D' : '#fef2f2' }]}>
            <View style={styles.bannerContent}>
              <AlertTriangle size={20} color={colors.red} />
              <View style={styles.bannerText}>
                <Text style={[styles.bannerTitle, { color: colors.text }]}>Auto-reload paused</Text>
                <Text style={[styles.bannerSub, { color: colors.textSecondary }]}>
                  {autoReloadApi?.disableReason === 'payment_method_removed'
                    ? 'The payment method was removed. Set up auto-reload again.'
                    : 'Recent charges failed. Review your payment source.'}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => router.push('/auto-reload')}>
              <Text style={[styles.bannerCTA, { color: colors.red }]}>Fix</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.blocksGrid}>
          <View style={styles.blocksRow}>
            <TouchableOpacity
              style={[styles.blockCard, { backgroundColor: colors.surface }]}
              onPress={() => router.push('/topup')}
              accessibilityRole="button"
              accessibilityLabel="Top up"
            >
              <View style={[styles.blockIcon, { backgroundColor: isDark ? '#1E3A5F' : '#eff6ff' }]}>
                <ArrowUpCircle size={20} color={colors.primary} />
              </View>
              <Text style={[styles.blockTitle, { color: colors.text }]}>Top up</Text>
              <Text style={[styles.blockSub, { color: colors.primary }]}>Add funds</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.blockCard, { backgroundColor: colors.surface }]}
              onPress={() => router.push('/transactions')}
              accessibilityRole="button"
              accessibilityLabel="Transactions"
            >
              <View style={[styles.blockIcon, { backgroundColor: isDark ? '#1E3A5F' : '#eff6ff' }]}>
                <ShoppingBag size={20} color={colors.primary} />
              </View>
              <Text style={[styles.blockTitle, { color: colors.text }]}>Transactions</Text>
              <Text style={[styles.blockSub, { color: colors.primary }]}>History</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.blocksRow}>
            <TouchableOpacity
              style={[styles.blockCard, { backgroundColor: colors.surface }]}
              onPress={() => router.push('/(tabs)/rewards')}
              accessibilityRole="button"
              accessibilityLabel="Rewards"
            >
              <View style={[styles.blockIcon, { backgroundColor: isDark ? '#1E3A5F' : '#eff6ff' }]}>
                <Gift size={20} color={colors.primary} />
              </View>
              <Text style={[styles.blockTitle, { color: colors.text }]}>Rewards</Text>
              <Text style={[styles.blockSub, { color: colors.primary }]}>
                {formatCurrency(availableRewardsTotal)} earned
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.blockCard, { backgroundColor: colors.surface }]}
              onPress={() => router.push('/(tabs)/card')}
              accessibilityRole="button"
              accessibilityLabel="Add to wallet"
            >
              <View style={[styles.blockIcon, { backgroundColor: isDark ? '#1E3A5F' : '#eff6ff' }]}>
                <CreditCard size={20} color={colors.primary} />
              </View>
              <Text style={[styles.blockTitle, { color: colors.text }]}>Apple/Google Pay</Text>
              <Text style={[styles.blockSub, { color: colors.primary }]}>Add to wallet</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.blocksRow}>
            <TouchableOpacity
              style={[styles.blockCard, { backgroundColor: colors.surface }]}
              onPress={() => router.push('/(tabs)/card')}
              accessibilityRole="button"
              accessibilityLabel="Card"
            >
              <View style={[styles.blockIcon, { backgroundColor: isDark ? '#1E3A5F' : '#eff6ff' }]}>
                <Star size={20} color={colors.primary} />
              </View>
              <Text style={[styles.blockTitle, { color: colors.text }]}>
                {tierName ?? 'Card'}
              </Text>
              <Text style={[styles.blockSub, { color: colors.primary }]}>
                {tierProgressLabel ?? 'View card'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.blockCard, { backgroundColor: colors.surface }]}
              onPress={() => router.push('/referral')}
              accessibilityRole="button"
              accessibilityLabel="Invite friends"
            >
              <View style={[styles.blockIcon, { backgroundColor: isDark ? '#1E3A5F' : '#eff6ff' }]}>
                <Users size={20} color={colors.primary} />
              </View>
              <Text style={[styles.blockTitle, { color: colors.text }]}>Invite Friends</Text>
              <Text style={[styles.blockSub, { color: colors.primary }]}>Get £5</Text>
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
              const amountMinor =
                tx.kind === 'api' ? tx.amountMinor : Math.round(tx.amount * 100);
              const isPositive = amountMinor > 0;
              const isCashback = tx.type === 'cashback' || tx.type === 'bonus';
              const isTopup = tx.type === 'topup' || tx.type === 'auto_reload';
              const amountColor = isCashback || isTopup ? colors.green : colors.text;
              const iconType = tx.type === 'auto_reload' ? 'topup' : tx.type;
              const TxIcon = getTxIcon(iconType);
              const amountLabel =
                tx.kind === 'api'
                  ? `${isPositive ? '+' : ''}${formatMoney(tx.amountMinor, tx.currency)}`
                  : `${isPositive ? '+' : ''}${formatCurrency(tx.amount)}`;
              return (
                <TouchableOpacity
                  key={tx.id}
                  style={[styles.txRow, { borderBottomColor: colors.borderLight }]}
                  onPress={() => router.push(`/transactions/${tx.id}` as never)}
                >
                  <View style={[styles.txIcon, { backgroundColor: getTxIconBg(iconType) }]}>
                    <TxIcon size={18} color={getTxIconColor(iconType)} />
                  </View>
                  <View style={styles.txInfo}>
                    <Text style={[styles.txMerchant, { color: colors.text }]}>
                      {tx.merchant ?? tx.type}
                    </Text>
                    <Text style={[styles.txDate, { color: colors.textTertiary }]}>{formatDate(tx.date)}</Text>
                  </View>
                  <Text style={[styles.txAmount, { color: amountColor }]}>{amountLabel}</Text>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {showAutoReloadUpsell && (
          <View style={[styles.banner, { backgroundColor: isDark ? '#78350F' : '#fffbeb' }]}>
            <View style={styles.bannerContent}>
              <Zap size={20} color={colors.amber} />
              <View style={styles.bannerText}>
                <Text style={[styles.bannerTitle, { color: colors.text }]}>
                  Never run out of balance
                </Text>
                <Text style={[styles.bannerSub, { color: colors.textSecondary }]}>
                  Set up Auto-reload + earn extra cashback on every auto top-up
                </Text>
              </View>
            </View>
            <View style={styles.bannerActions}>
              <TouchableOpacity onPress={() => router.push('/auto-reload')}>
                <Text style={[styles.bannerCTA, { color: colors.amber }]}>Set up</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => dismissBanner('autoreload-upsell')}>
                <X size={16} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {queryErrorMessage && (
          <View
            style={[
              styles.banner,
              { backgroundColor: isDark ? '#334155' : '#f1f5f9', marginBottom: 12 },
            ]}
          >
            <View style={styles.bannerContent}>
              <AlertTriangle size={18} color={colors.textSecondary} />
              <Text style={[styles.bannerSub, { color: colors.textSecondary, flex: 1 }]}>
                {queryErrorMessage}
              </Text>
            </View>
            <TouchableOpacity onPress={onRefresh}>
              <Text style={[styles.bannerCTA, { color: colors.primary }]}>Retry</Text>
            </TouchableOpacity>
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
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#f8fafc',
  },
  notifDotText: { fontSize: 15, fontFamily: 'Inter-Bold', color: '#fff' },
  avatarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1a56db',
    alignItems: 'center',
    justifyContent: 'center',
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
  skeletonCard: {
    alignItems: 'center',
    justifyContent: 'center',
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
  cardStatusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
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
  banner: {
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bannerWarning: {},
  bannerContent: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  bannerText: { flex: 1 },
  bannerTitle: { fontSize: 16, fontFamily: 'Inter-SemiBold' },
  bannerSub: { fontSize: 15, fontFamily: 'Inter-Regular', marginTop: 2 },
  bannerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bannerCTA: { fontSize: 15, fontFamily: 'Inter-SemiBold' },
});
