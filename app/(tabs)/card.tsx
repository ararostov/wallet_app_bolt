import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { FontAwesome } from '@expo/vector-icons';
import Svg, { Path, Rect } from 'react-native-svg';
import { useWallet } from '@/context/WalletContext';
import { useTheme } from '@/context/ThemeContext';

export default function CardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, addToAppleWallet, addToGoogleWallet } = useWallet();
  const { colors, isDark } = useTheme();
  const { card } = state;

  if (card.status === 'not_issued') {
    return (
      <SafeAreaView edges={['left', 'right']} style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
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
            Issue your Tesco Wallet card to start spending in store and online.
          </Text>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={() => Alert.alert('Card Issued', 'Your card is being prepared and will arrive in 3-5 working days.')}
          >
            <Text style={styles.primaryBtnText}>Issue card</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.walletOutlineBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
            onPress={() => Alert.alert('Add to Wallet', 'Please issue your card first before adding it to your digital wallet.')}
          >
            {Platform.OS === 'android' ? (
              <Svg width={18} height={18} viewBox="0 0 533.5 544.3">
                <Path fill="#4285f4" d="M533.5 278.4c0-18.5-1.5-37.1-4.7-55.3H272.1v104.8h147c-6.1 33.8-25.7 63.7-54.4 82.7v68h87.7c51.5-47.4 81.1-117.4 81.1-200.2z"/>
                <Path fill="#34a853" d="M272.1 544.3c73.4 0 135.3-24.1 180.4-65.7l-87.7-68c-24.4 16.6-55.9 26-92.6 26-71 0-131.2-47.9-152.8-112.3H28.9v70.1c46.2 91.9 140.3 149.9 243.2 149.9z"/>
                <Path fill="#fbbc04" d="M119.3 324.3c-11.4-33.8-11.4-70.4 0-104.2V150H28.9c-38.6 76.9-38.6 167.5 0 244.4l90.4-70.1z"/>
                <Path fill="#ea4335" d="M272.1 107.7c38.8-.6 76.3 14 104.4 40.8l77.7-77.7C405 24.6 339.7-.8 272.1 0 169.2 0 75.1 58 28.9 150l90.4 70.1c21.5-64.5 81.8-112.4 152.8-112.4z"/>
              </Svg>
            ) : (
              <FontAwesome name="apple" size={18} color={colors.text} />
            )}
            <Text style={[styles.walletOutlineBtnText, { color: colors.text }]}>
              Add to {Platform.OS === 'android' ? 'Google' : 'Apple'} Wallet
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isFrozen = card.status === 'frozen';

  return (
    <SafeAreaView edges={['left', 'right']} style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
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
            {/* Tesco Logo */}
            <View style={styles.cardLogoArea}>
              <Text style={styles.cardLogoText}>TESCO</Text>
              <View style={styles.cardLogoStripes}>
                {[0,1,2,3,4,5,6].map((i) => (
                  <View key={i} style={styles.cardLogoStripe} />
                ))}
              </View>
            </View>
            <View style={styles.cardBottom}>
              <Text style={styles.cardNumber}>•••• •••• •••• {card.last4 ?? '4242'}</Text>
              <Text style={styles.cardLabel}>Wallet</Text>
            </View>
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
          {Platform.OS === 'android' ? (
            card.addedToGoogleWallet ? (
              <View style={[styles.walletBtn, styles.walletBtnDone, { backgroundColor: isDark ? '#064E3B' : '#f0fdf4', borderColor: isDark ? '#059669' : '#bbf7d0' }]}>
                <Check size={18} color="#059669" />
                <Text style={styles.walletBtnTextDone}>Added to Google Wallet</Text>
              </View>
            ) : (
              <TouchableOpacity style={[styles.walletBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={addToGoogleWallet}>
                <Svg width={18} height={18} viewBox="0 0 533.5 544.3">
                  <Path fill="#4285f4" d="M533.5 278.4c0-18.5-1.5-37.1-4.7-55.3H272.1v104.8h147c-6.1 33.8-25.7 63.7-54.4 82.7v68h87.7c51.5-47.4 81.1-117.4 81.1-200.2z"/>
                  <Path fill="#34a853" d="M272.1 544.3c73.4 0 135.3-24.1 180.4-65.7l-87.7-68c-24.4 16.6-55.9 26-92.6 26-71 0-131.2-47.9-152.8-112.3H28.9v70.1c46.2 91.9 140.3 149.9 243.2 149.9z"/>
                  <Path fill="#fbbc04" d="M119.3 324.3c-11.4-33.8-11.4-70.4 0-104.2V150H28.9c-38.6 76.9-38.6 167.5 0 244.4l90.4-70.1z"/>
                  <Path fill="#ea4335" d="M272.1 107.7c38.8-.6 76.3 14 104.4 40.8l77.7-77.7C405 24.6 339.7-.8 272.1 0 169.2 0 75.1 58 28.9 150l90.4 70.1c21.5-64.5 81.8-112.4 152.8-112.4z"/>
                </Svg>
                <Text style={[styles.walletBtnText, { color: colors.text }]}>Add to Google Wallet</Text>
              </TouchableOpacity>
            )
          ) : (
            card.addedToAppleWallet ? (
              <View style={[styles.walletBtn, styles.walletBtnDone, { backgroundColor: isDark ? '#064E3B' : '#f0fdf4', borderColor: isDark ? '#059669' : '#bbf7d0' }]}>
                <Check size={18} color="#059669" />
                <Text style={styles.walletBtnTextDone}>Added to Apple Wallet</Text>
              </View>
            ) : (
              <TouchableOpacity style={[styles.walletBtn, { backgroundColor: '#000' }]} onPress={addToAppleWallet}>
                <FontAwesome name="apple" size={20} color="#fff" />
                <Text style={styles.walletBtnTextWhite}>Add to Apple Wallet</Text>
              </TouchableOpacity>
            )
          )}
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
  scroll: { paddingBottom: 80 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 24, fontFamily: 'Inter-Bold', textAlign: 'center' },
  headerSpacer: { width: 36 },
  noCardContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 16 },
  noCardIcon: { width: 96, height: 96, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  noCardTitle: { fontSize: 24, fontFamily: 'Inter-Bold' },
  noCardSub: { fontSize: 17, fontFamily: 'Inter-Regular', textAlign: 'center', lineHeight: 22 },
  primaryBtn: { borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32, alignItems: 'center', marginTop: 8, width: '100%' },
  primaryBtnText: { fontSize: 17, fontFamily: 'Inter-SemiBold', color: '#fff' },
  walletOutlineBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32, borderWidth: 1.5, width: '100%', marginTop: 8 },
  walletOutlineBtnText: { fontSize: 17, fontFamily: 'Inter-SemiBold' },
  cardContainer: { paddingHorizontal: 16, marginBottom: 12 },
  cardVisual: {
    borderRadius: 20,
    padding: 24,
    aspectRatio: 1.586,
    justifyContent: 'space-between',
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
  frozenText: { fontSize: 18, fontFamily: 'Inter-SemiBold', color: '#fff' },
  cardLogoArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardLogoText: {
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    color: '#fff',
    letterSpacing: 4,
  },
  cardLogoStripes: {
    flexDirection: 'row',
    gap: 3,
    alignItems: 'center',
  },
  cardLogoStripe: {
    width: 4,
    height: 16,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  cardBottom: {
    gap: 4,
  },
  cardNumber: {
    fontSize: 18,
    fontFamily: 'Inter-Medium',
    color: '#fff',
    letterSpacing: 2,
  },
  cardLabel: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', marginBottom: 20 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e' },
  statusDotFrozen: { backgroundColor: '#94a3b8' },
  statusTextLabel: { fontSize: 15, fontFamily: 'Inter-Medium' },
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
  limitsBtnText: { flex: 1, fontSize: 17, fontFamily: 'Inter-SemiBold' },
  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontFamily: 'Inter-SemiBold', marginBottom: 12 },
  walletBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1.5,
  },
  walletBtnDone: { justifyContent: 'center' },
  walletBtnText: { fontSize: 16, fontFamily: 'Inter-SemiBold' },
  walletBtnTextWhite: { fontSize: 16, fontFamily: 'Inter-SemiBold', color: '#fff' },
  walletBtnTextDone: { fontSize: 16, fontFamily: 'Inter-Medium', color: '#059669' },
  deleteRow: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', paddingVertical: 16 },
  deleteText: { fontSize: 16, fontFamily: 'Inter-Medium' },
});
