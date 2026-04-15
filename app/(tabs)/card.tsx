import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Snowflake,
  ChevronLeft,
  Shield,
  Trash2,
  CreditCard,
  Check,
} from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import { useWallet } from '@/context/WalletContext';
import { useTheme } from '@/context/ThemeContext';
import { formatCurrency } from '@/utils/format';

export default function CardScreen() {
  const router = useRouter();
  const { state, addToAppleWallet, addToGoogleWallet } = useWallet();
  const { colors, isDark } = useTheme();
  const { card } = state;

  if (card.status === 'not_issued') {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ChevronLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>My Card</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.noCardContainer}>
          <View style={[styles.noCardIcon, { backgroundColor: colors.surfaceAlt }]}>
            <CreditCard size={48} color={colors.textTertiary} />
          </View>
          <Text style={[styles.noCardTitle, { color: colors.text }]}>No card yet</Text>
          <Text style={[styles.noCardSub, { color: colors.textSecondary }]}>
            Issue your Tesco Wallet card to start spending your balance anywhere.
          </Text>
          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primary }]} onPress={() => Alert.alert('Card Issued', 'Your card is being prepared and will arrive in 3-5 working days.')}>
            <Text style={styles.primaryBtnText}>Issue card</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isFrozen = card.status === 'frozen';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ChevronLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>My Card</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.cardContainer}>
          <LinearGradient
            colors={isFrozen ? ['#475569', '#94a3b8'] : ['#1e3a8a', '#1a56db']}
            style={styles.cardVisual}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {isFrozen && (
              <View style={styles.frozenOverlay}>
                <Snowflake size={32} color="rgba(255,255,255,0.6)" />
                <Text style={styles.frozenText}>Card Frozen</Text>
              </View>
            )}
            <Text style={styles.cardBrandLarge}>TESCO WALLET</Text>
          </LinearGradient>
        </View>

        <View style={styles.statusRow}>
          <View style={[styles.statusDot, isFrozen && styles.statusDotFrozen]} />
          <Text style={[styles.statusTextLabel, { color: colors.textSecondary }]}>
            {card.status === 'active' ? 'Active' : card.status === 'frozen' ? 'Frozen' : 'Closed'}
          </Text>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={[styles.limitsBtn, { backgroundColor: colors.surface }]} onPress={() => router.push('/card/limits')}>
            <Shield size={20} color={colors.primary} />
            <Text style={[styles.limitsBtnText, { color: colors.text }]}>Card Limits</Text>
            <ChevronLeft size={16} color={colors.textTertiary} style={{ transform: [{ rotate: '180deg' }] }} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Add to digital wallet</Text>

          {card.addedToAppleWallet ? (
            <View style={[styles.appleWalletBtn, styles.walletBtnDone, { backgroundColor: isDark ? '#064E3B' : '#f0fdf4', borderColor: isDark ? '#059669' : '#bbf7d0' }]}>
              <Check size={18} color="#059669" />
              <Text style={styles.walletBtnTextDone}>Added to Apple Wallet</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.appleWalletBtn} onPress={addToAppleWallet}>
              <Svg width={20} height={20} viewBox="0 0 814 1000">
                <Path
                  fill="#fff"
                  d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 443.9 0 341.1 0 244.8c0-150.7 97.6-230.5 193.7-230.5 50.6 0 92.8 34.9 124.1 34.9 29.7 0 76.5-36.9 134-36.9 54.3 0 150.4 18.6 204.7 109.9zm-135-91.6c-22-28.2-58.2-50.7-103.9-50.7-54.2 0-106.1 37-137.3 97.8C380.8 357.1 367 396 367 434.5c0 44.4 16.7 86.4 41.8 115.3 22.9 26.6 58.2 48.8 101.6 48.8 44.6 0 82.8-25.1 109.2-63.7 25-37 38-80.5 38-124.1 0-43.7-12.9-84.5-34.5-116.5z"
                />
              </Svg>
              <Text style={styles.appleWalletText}>Add to Apple Wallet</Text>
            </TouchableOpacity>
          )}

          {card.addedToGoogleWallet ? (
            <View style={[styles.googleWalletBtn, styles.walletBtnDone, { backgroundColor: isDark ? '#064E3B' : '#f0fdf4', borderColor: isDark ? '#059669' : '#bbf7d0' }]}>
              <Check size={18} color="#059669" />
              <Text style={styles.walletBtnTextDone}>Added to Google Wallet</Text>
            </View>
          ) : (
            <TouchableOpacity style={[styles.googleWalletBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={addToGoogleWallet}>
              <Svg width={18} height={18} viewBox="0 0 533.5 544.3">
                <Path fill="#4285f4" d="M533.5 278.4c0-18.5-1.5-37.1-4.7-55.3H272.1v104.8h147c-6.1 33.8-25.7 63.7-54.4 82.7v68h87.7c51.5-47.4 81.1-117.4 81.1-200.2z"/>
                <Path fill="#34a853" d="M272.1 544.3c73.4 0 135.3-24.1 180.4-65.7l-87.7-68c-24.4 16.6-55.9 26-92.6 26-71 0-131.2-47.9-152.8-112.3H28.9v70.1c46.2 91.9 140.3 149.9 243.2 149.9z"/>
                <Path fill="#fbbc04" d="M119.3 324.3c-11.4-33.8-11.4-70.4 0-104.2V150H28.9c-38.6 76.9-38.6 167.5 0 244.4l90.4-70.1z"/>
                <Path fill="#ea4335" d="M272.1 107.7c38.8-.6 76.3 14 104.4 40.8l77.7-77.7C405 24.6 339.7-.8 272.1 0 169.2 0 75.1 58 28.9 150l90.4 70.1c21.5-64.5 81.8-112.4 152.8-112.4z"/>
              </Svg>
              <Text style={[styles.googleWalletText, { color: colors.text }]}>Add to Google Wallet</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.limitsHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Spending limits</Text>
            <TouchableOpacity onPress={() => router.push('/card/limits')}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>Manage</Text>
            </TouchableOpacity>
          </View>
          {[
            { label: 'Daily', used: card.dailySpent, cap: card.dailyLimit },
            { label: 'Monthly', used: card.monthlySpent, cap: card.monthlyLimit },
          ].map(({ label, used, cap }) => (
            <View key={label} style={styles.limitRow}>
              <View style={styles.limitInfo}>
                <Text style={[styles.limitLabel, { color: colors.textSecondary }]}>{label}</Text>
                <Text style={[styles.limitValue, { color: colors.textTertiary }]}>
                  {formatCurrency(used)} / {formatCurrency(cap)}
                </Text>
              </View>
              <View style={[styles.limitTrack, { backgroundColor: colors.border }]}>
                <View style={[styles.limitFill, { width: `${Math.min((used / cap) * 100, 100)}%` as any, backgroundColor: colors.primary }]} />
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.deleteRow}
          onPress={() => router.push('/profile/delete-card')}
        >
          <Trash2 size={16} color={colors.red} />
          <Text style={[styles.deleteText, { color: colors.red }]}>Delete card</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingBottom: 32 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 22, fontFamily: 'Inter-Bold', textAlign: 'center' },
  headerSpacer: { width: 36 },
  noCardContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 16 },
  noCardIcon: { width: 96, height: 96, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  noCardTitle: { fontSize: 22, fontFamily: 'Inter-Bold' },
  noCardSub: { fontSize: 15, fontFamily: 'Inter-Regular', textAlign: 'center', lineHeight: 22 },
  primaryBtn: { borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32, alignItems: 'center', marginTop: 8 },
  primaryBtnText: { fontSize: 15, fontFamily: 'Inter-SemiBold', color: '#fff' },
  cardContainer: { paddingHorizontal: 16, marginBottom: 12 },
  cardVisual: {
    borderRadius: 20,
    padding: 24,
    height: 190,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  frozenOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(71,85,105,0.6)',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    zIndex: 1,
  },
  frozenText: { fontSize: 16, fontFamily: 'Inter-SemiBold', color: '#fff' },
  cardBrandLarge: { fontSize: 26, fontFamily: 'Inter-Bold', color: '#fff', letterSpacing: 6 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', marginBottom: 20 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e' },
  statusDotFrozen: { backgroundColor: '#94a3b8' },
  statusTextLabel: { fontSize: 13, fontFamily: 'Inter-Medium' },
  actionsRow: { paddingHorizontal: 16, marginBottom: 20 },
  limitsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  limitsBtnText: { flex: 1, fontSize: 15, fontFamily: 'Inter-SemiBold' },
  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontFamily: 'Inter-SemiBold', marginBottom: 12 },
  appleWalletBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 8,
  },
  appleWalletText: { fontSize: 14, fontFamily: 'Inter-SemiBold', color: '#fff' },
  googleWalletBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 8,
    borderWidth: 1.5,
  },
  googleWalletText: { fontSize: 14, fontFamily: 'Inter-SemiBold' },
  walletBtnDone: { borderWidth: 1.5, justifyContent: 'center' },
  walletBtnTextDone: { fontSize: 14, fontFamily: 'Inter-Medium', color: '#059669' },
  limitsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  seeAll: { fontSize: 13, fontFamily: 'Inter-SemiBold' },
  limitRow: { marginBottom: 14, gap: 6 },
  limitInfo: { flexDirection: 'row', justifyContent: 'space-between' },
  limitLabel: { fontSize: 14, fontFamily: 'Inter-Medium' },
  limitValue: { fontSize: 13, fontFamily: 'Inter-Regular' },
  limitTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  limitFill: { height: 6, borderRadius: 3 },
  deleteRow: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', paddingVertical: 16 },
  deleteText: { fontSize: 14, fontFamily: 'Inter-Medium' },
});
