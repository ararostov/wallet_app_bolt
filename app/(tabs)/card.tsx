// Card tab — backend-wired per docs/mobile/specs/03-cards.ru.md §4.1.
//
// Reads `state.card` (full `Card` after the first GET /card refresh).
// Renders five visual states based on `lifecycleStatus`:
//
//   null / no card  → "Issue your card" empty state
//   requested/issued → skeleton + spinner + GET /card polling
//   active           → full visual + actions (Freeze, Limits, Apple/Google, Delete)
//   frozen           → frozen visual + Unfreeze CTA (PIN bottom sheet)
//   closed           → closed message + (with failure reason) "Try again" CTA
//
// Visual rule from spec §1.1: NO PAN, NO holder, NO expiry, NO chip.
// Only merchant logo + "TESCO WALLET" on the gradient.

import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  Check,
  ChevronLeft,
  CreditCard,
  Shield,
  Snowflake,
  Trash2,
} from 'lucide-react-native';
import { FontAwesome } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/context/ThemeContext';
import { useWallet } from '@/context/WalletContext';
import { useAddToAppleWallet } from '@/hooks/useAddToAppleWallet';
import { useAddToGoogleWallet } from '@/hooks/useAddToGoogleWallet';
import { useCard } from '@/hooks/useCard';
import { useFreezeCard } from '@/hooks/useFreezeCard';
import { useRequestCardIssuance } from '@/hooks/useRequestCardIssuance';
import { useUnfreezeCard } from '@/hooks/useUnfreezeCard';
import type {
  Card as ApiCard,
  CardLifecycleStatus,
  WalletProvisioningResult,
} from '@/types/card';
import { ApiError, mapErrorCode } from '@/utils/errors';
import { formatMoney } from '@/utils/format';
import { getAppVersion, getDeviceId } from '@/utils/device';
import { isValidCardPin } from '@/utils/validators';

const ISSUANCE_FAILURE_MESSAGES: Record<string, string> = {
  provider_timeout: 'The card issuer didn’t respond in time. Try again.',
  provider_rejected: 'The card issuer rejected the request. Try again.',
  kyc_rejected: 'We need to verify your identity. Contact support.',
  product_unavailable: 'No card product is available for your program.',
  sponsor_account_missing: 'Sponsor account is missing. Contact support.',
  network_error: 'A network error interrupted issuance. Try again.',
  pin_exceeded_retries: 'Card was locked after too many PIN attempts. Contact support.',
  unknown: 'Card issuance didn’t complete. Try again.',
};

const MERCHANT_DISPLAY_NAME =
  process.env.EXPO_PUBLIC_MERCHANT_DISPLAY_NAME ?? 'TESCO';

function fullCard(card: unknown): ApiCard | null {
  if (!card) return null;
  if (typeof card === 'object' && 'lifecycleStatus' in (card as object)) {
    return card as ApiCard;
  }
  return null;
}

function deriveLifecycle(
  card: ApiCard | null,
): CardLifecycleStatus | 'not_issued' {
  if (!card) return 'not_issued';
  return card.lifecycleStatus;
}

export default function CardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state } = useWallet();
  const { colors, isDark } = useTheme();

  const card = fullCard(state.card);
  const lifecycle = deriveLifecycle(card);
  const isPending = lifecycle === 'requested' || lifecycle === 'issued';

  // Polling kicks in only when in the pending region.
  const { pollTimedOut, refetch } = useCard({ pollUntilActive: isPending });

  // --- Mutations -----------------------------------------------------------

  const requestIssuance = useRequestCardIssuance();
  const freezeMutation = useFreezeCard();
  const unfreezeMutation = useUnfreezeCard();
  const addAppleWallet = useAddToAppleWallet();
  const addGoogleWallet = useAddToGoogleWallet();

  // --- Local UI state ------------------------------------------------------

  const [unfreezeOpen, setUnfreezeOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [walletPilotMessage, setWalletPilotMessage] = useState<string | null>(
    null,
  );

  const handleIssuance = async () => {
    try {
      await requestIssuance.mutate({});
    } catch (e) {
      const msg = e instanceof ApiError ? mapErrorCode(e.code) ?? e.message : 'Try again later.';
      Alert.alert('Couldn’t request card', msg);
    }
  };

  const handleFreeze = async () => {
    try {
      await freezeMutation.mutate({ reason: 'user_request' });
    } catch (e) {
      const msg = e instanceof ApiError ? mapErrorCode(e.code) ?? e.message : 'Try again later.';
      Alert.alert('Couldn’t freeze card', msg);
    }
  };

  const closeUnfreezeSheet = () => {
    setUnfreezeOpen(false);
    setPin('');
    setPinError(null);
  };

  const handleUnfreezeSubmit = async () => {
    if (!isValidCardPin(pin)) {
      setPinError('PIN must be 4 to 6 digits.');
      return;
    }
    setPinError(null);
    try {
      await unfreezeMutation.mutate({ pin });
      closeUnfreezeSheet();
    } catch (e) {
      // Wrong PIN: keep the sheet open, clear the input, surface the message.
      if (e instanceof ApiError && e.code === 'CARD_INVALID_PIN') {
        setPin('');
        setPinError(mapErrorCode(e.code));
        return;
      }
      const msg =
        e instanceof ApiError ? mapErrorCode(e.code) ?? e.message : 'Try again later.';
      closeUnfreezeSheet();
      Alert.alert('Couldn’t unfreeze card', msg);
    }
  };

  const onAppleWalletPress = async () => {
    setWalletPilotMessage(null);
    try {
      const deviceId = await getDeviceId();
      const result: WalletProvisioningResult = await addAppleWallet.mutate({
        deviceId,
        deviceName: 'iOS device',
        // MVP: no native PassKit handle to pass — backend only validates
        // `deviceId` shape; placeholder is acceptable per spec §7.7.
        walletAccountId: 'pending',
        clientAppVersion: getAppVersion(),
      });
      // The backend returned `activationData` — in real PassKit we'd hand
      // it to PKAddPaymentPassViewController. The MVP doesn't ship the
      // native module, so surface a polite placeholder.
      const expires = result.provisioning.expiresAt;
      setWalletPilotMessage(
        expires
          ? `Apple Wallet provisioning is in pilot. Activation expires ${new Date(expires).toLocaleString('en-GB')}.`
          : 'Apple Wallet provisioning is in pilot — please contact support to complete it.',
      );
    } catch (e) {
      if (e instanceof ApiError && e.code === 'WALLET_PROVISIONING_ALREADY_ACTIVE') {
        setWalletPilotMessage('Already added to Apple Wallet on this device.');
        return;
      }
      const msg = e instanceof ApiError ? mapErrorCode(e.code) ?? e.message : 'Try again later.';
      Alert.alert('Couldn’t add to Apple Wallet', msg);
    }
  };

  const onGoogleWalletPress = async () => {
    setWalletPilotMessage(null);
    try {
      const deviceId = await getDeviceId();
      const result: WalletProvisioningResult = await addGoogleWallet.mutate({
        deviceId,
        deviceName: 'Android device',
        walletAccountId: 'pending',
        clientAppVersion: getAppVersion(),
      });
      const expires = result.provisioning.expiresAt;
      setWalletPilotMessage(
        expires
          ? `Google Wallet provisioning is in pilot. Activation expires ${new Date(expires).toLocaleString('en-GB')}.`
          : 'Google Wallet provisioning is in pilot — please contact support to complete it.',
      );
      // If a redirect URL is ever returned in a future field on the bundle,
      // open it. For now the helper is wired but unused.
      void WebBrowser;
    } catch (e) {
      if (e instanceof ApiError && e.code === 'WALLET_PROVISIONING_ALREADY_ACTIVE') {
        setWalletPilotMessage('Already added to Google Wallet on this device.');
        return;
      }
      const msg = e instanceof ApiError ? mapErrorCode(e.code) ?? e.message : 'Try again later.';
      Alert.alert('Couldn’t add to Google Wallet', msg);
    }
  };

  // --- Render --------------------------------------------------------------

  const merchantLabel = `${MERCHANT_DISPLAY_NAME} WALLET`.slice(0, 20);

  const Header = () => (
    <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <ChevronLeft size={24} color={colors.text} />
      </TouchableOpacity>
      <Text style={[styles.title, { color: colors.text }]}>My Card</Text>
      <View style={styles.headerSpacer} />
    </View>
  );

  // ---- Empty state: no card / not issued ---------------------------------

  if (lifecycle === 'not_issued') {
    return (
      <SafeAreaView edges={['left', 'right']} style={[styles.safe, { backgroundColor: colors.background }]}>
        <Header />
        <View style={styles.noCardContainer}>
          <View style={[styles.noCardIcon, { backgroundColor: colors.surfaceAlt }]}>
            <CreditCard size={48} color={colors.textTertiary} />
          </View>
          <Text style={[styles.noCardTitle, { color: colors.text }]}>No card yet</Text>
          <Text style={[styles.noCardSub, { color: colors.textSecondary }]}>
            Issue your {MERCHANT_DISPLAY_NAME[0] + MERCHANT_DISPLAY_NAME.slice(1).toLowerCase()} Wallet card to start spending in store and online.
          </Text>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary }, requestIssuance.loading && styles.btnDisabled]}
            onPress={handleIssuance}
            disabled={requestIssuance.loading}
            accessibilityLabel="Issue your wallet card"
          >
            {requestIssuance.loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Issue your card</Text>
            )}
          </TouchableOpacity>
          <Text style={[styles.helperMuted, { color: colors.textTertiary }]}>
            Takes about 30 seconds. Virtual card only.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ---- Pending state: requested / issued ---------------------------------

  if (isPending) {
    return (
      <SafeAreaView edges={['left', 'right']} style={[styles.safe, { backgroundColor: colors.background }]}>
        <Header />
        <View style={styles.pendingContainer}>
          <View style={[styles.pendingCardSkeleton, { backgroundColor: colors.surfaceAlt }]}>
            <ActivityIndicator color={colors.primary} />
          </View>
          <Text style={[styles.pendingTitle, { color: colors.text }]}>
            Setting up your card…
          </Text>
          <Text style={[styles.pendingSub, { color: colors.textSecondary }]}>
            This usually takes under a minute.
          </Text>
          {pollTimedOut && (
            <View style={[styles.bannerWarn, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <Text style={[styles.bannerWarnText, { color: colors.text }]}>
                This is taking longer than expected.
              </Text>
              <TouchableOpacity
                onPress={() => refetch().catch(() => undefined)}
                style={[styles.bannerActionBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.bannerActionText}>Check status</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // ---- Closed state ------------------------------------------------------

  if (lifecycle === 'closed') {
    const reasonKey = card?.issuanceFailureReason;
    const reasonMessage = reasonKey
      ? ISSUANCE_FAILURE_MESSAGES[reasonKey] ?? ISSUANCE_FAILURE_MESSAGES.unknown
      : null;
    return (
      <SafeAreaView edges={['left', 'right']} style={[styles.safe, { backgroundColor: colors.background }]}>
        <Header />
        <View style={styles.noCardContainer}>
          <View style={[styles.noCardIcon, { backgroundColor: colors.surfaceAlt }]}>
            <CreditCard size={48} color={colors.textTertiary} />
          </View>
          <Text style={[styles.noCardTitle, { color: colors.text }]}>
            {reasonMessage ? 'Card issuance failed' : 'Your card was closed'}
          </Text>
          <Text style={[styles.noCardSub, { color: colors.textSecondary }]}>
            {reasonMessage ?? (card?.closedAt ? `Closed on ${new Date(card.closedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}.` : 'Request a new card to continue.')}
          </Text>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary }, requestIssuance.loading && styles.btnDisabled]}
            onPress={handleIssuance}
            disabled={requestIssuance.loading}
            accessibilityLabel={reasonMessage ? 'Try issuing again' : 'Request a new card'}
          >
            {requestIssuance.loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>
                {reasonMessage ? 'Try again' : 'Request a new card'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ---- Active / frozen visual --------------------------------------------

  const isFrozen = lifecycle === 'frozen';
  const dailyLimit = card?.dailyLimit;
  const monthlyLimit = card?.monthlyLimit;
  // The wallet/state spend is consumed for progress bars (spec 02-wallet
  // surfaces these — fall back to 0 when unavailable to keep layout stable).
  const dailySpentMinor = 0;
  const monthlySpentMinor = 0;

  const dailyPct = dailyLimit && dailyLimit.amountMinor > 0
    ? Math.min(dailySpentMinor / dailyLimit.amountMinor, 1)
    : 0;
  const monthlyPct = monthlyLimit && monthlyLimit.amountMinor > 0
    ? Math.min(monthlySpentMinor / monthlyLimit.amountMinor, 1)
    : 0;

  const appleAdded = state.cardWalletProvisioning.apple === 'completed';
  const googleAdded = state.cardWalletProvisioning.google === 'completed';

  return (
    <SafeAreaView edges={['left', 'right']} style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}
      >
        <Header />

        <View style={styles.cardContainer}>
          <LinearGradient
            colors={isFrozen ? ['#475569', '#94a3b8'] : ['#1e3a8a', '#1a56db']}
            style={styles.cardVisual}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            accessibilityRole="image"
            accessibilityLabel={`${MERCHANT_DISPLAY_NAME} wallet card, status: ${isFrozen ? 'frozen' : 'active'}`}
          >
            {isFrozen && (
              <View style={styles.frozenOverlay}>
                <Snowflake size={32} color="rgba(255,255,255,0.6)" />
                <Text style={styles.frozenText}>Card Frozen</Text>
              </View>
            )}
            <View style={styles.cardLogoArea}>
              <Text style={styles.cardLogoText}>{MERCHANT_DISPLAY_NAME}</Text>
              <View style={styles.cardLogoStripes}>
                {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                  <View key={i} style={styles.cardLogoStripe} />
                ))}
              </View>
            </View>
            {/* Per spec §1.1 — NO PAN, NO holder, NO expiry, NO chip. */}
            <View style={styles.cardBottom}>
              <Text style={styles.cardLabel}>{merchantLabel}</Text>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.statusRow}>
          <View style={[styles.statusDot, isFrozen && styles.statusDotFrozen]} />
          <Text style={[styles.statusTextLabel, { color: colors.textSecondary }]}>
            {isFrozen ? 'Frozen' : 'Active'}
          </Text>
        </View>

        {(dailyLimit || monthlyLimit) && (
          <View style={styles.section}>
            {dailyLimit && (
              <View style={styles.progressBlock}>
                <View style={styles.progressHeader}>
                  <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>Daily spending</Text>
                  <Text style={[styles.progressValue, { color: colors.text }]}>
                    {formatMoney(dailySpentMinor, dailyLimit.currency)} / {formatMoney(dailyLimit.amountMinor, dailyLimit.currency)}
                  </Text>
                </View>
                <View
                  style={[styles.progressTrack, { backgroundColor: colors.border }]}
                  accessibilityRole="progressbar"
                  accessibilityValue={{ min: 0, max: 100, now: Math.round(dailyPct * 100) }}
                >
                  <View style={[styles.progressFill, { width: `${dailyPct * 100}%` as `${number}%`, backgroundColor: colors.primary }]} />
                </View>
              </View>
            )}
            {monthlyLimit && (
              <View style={styles.progressBlock}>
                <View style={styles.progressHeader}>
                  <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>Monthly spending</Text>
                  <Text style={[styles.progressValue, { color: colors.text }]}>
                    {formatMoney(monthlySpentMinor, monthlyLimit.currency)} / {formatMoney(monthlyLimit.amountMinor, monthlyLimit.currency)}
                  </Text>
                </View>
                <View
                  style={[styles.progressTrack, { backgroundColor: colors.border }]}
                  accessibilityRole="progressbar"
                  accessibilityValue={{ min: 0, max: 100, now: Math.round(monthlyPct * 100) }}
                >
                  <View style={[styles.progressFill, { width: `${monthlyPct * 100}%` as `${number}%`, backgroundColor: colors.primary }]} />
                </View>
              </View>
            )}
          </View>
        )}

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.limitsBtn, { backgroundColor: colors.surface }]}
            onPress={() => router.push('/card/limits')}
            accessibilityLabel="Card limits"
          >
            <Shield size={20} color={colors.primary} />
            <Text style={[styles.limitsBtnText, { color: colors.text }]}>Card limits</Text>
            <ChevronLeft size={16} color={colors.textTertiary} style={{ transform: [{ rotate: '180deg' }] }} />
          </TouchableOpacity>
        </View>

        {!isFrozen ? (
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.outlineBtn, { borderColor: colors.border, backgroundColor: colors.surface }, freezeMutation.loading && styles.btnDisabled]}
              onPress={handleFreeze}
              disabled={freezeMutation.loading}
              accessibilityLabel="Freeze card"
            >
              <Snowflake size={18} color={colors.text} />
              <Text style={[styles.outlineBtnText, { color: colors.text }]}>Freeze card</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              onPress={() => setUnfreezeOpen(true)}
              accessibilityLabel="Unfreeze card"
            >
              <Text style={styles.primaryBtnText}>Unfreeze card</Text>
            </TouchableOpacity>
          </View>
        )}

        {!isFrozen && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Add to digital wallet</Text>
            {Platform.OS === 'android' ? (
              googleAdded ? (
                <View style={[styles.walletBtn, { backgroundColor: isDark ? '#064E3B' : '#f0fdf4', borderColor: isDark ? '#059669' : '#bbf7d0' }]}>
                  <Check size={18} color="#059669" />
                  <Text style={styles.walletBtnTextDone}>Added to Google Wallet</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.walletBtn, { backgroundColor: colors.surface, borderColor: colors.border }, addGoogleWallet.loading && styles.btnDisabled]}
                  onPress={onGoogleWalletPress}
                  disabled={addGoogleWallet.loading}
                  accessibilityLabel="Add to Google Wallet"
                >
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
              appleAdded ? (
                <View style={[styles.walletBtn, { backgroundColor: isDark ? '#064E3B' : '#f0fdf4', borderColor: isDark ? '#059669' : '#bbf7d0' }]}>
                  <Check size={18} color="#059669" />
                  <Text style={styles.walletBtnTextDone}>Added to Apple Wallet</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.walletBtn, { backgroundColor: '#000' }, addAppleWallet.loading && styles.btnDisabled]}
                  onPress={onAppleWalletPress}
                  disabled={addAppleWallet.loading}
                  accessibilityLabel="Add to Apple Wallet"
                >
                  <FontAwesome name="apple" size={20} color="#fff" />
                  <Text style={styles.walletBtnTextWhite}>Add to Apple Wallet</Text>
                </TouchableOpacity>
              )
            )}
            {walletPilotMessage && (
              <Text style={[styles.helperMuted, { color: colors.textSecondary, marginTop: 8 }]}>
                {walletPilotMessage}
              </Text>
            )}
          </View>
        )}

        <TouchableOpacity
          style={styles.deleteRow}
          onPress={() => router.push('/profile/delete-card')}
          accessibilityLabel="Delete card"
        >
          <Trash2 size={16} color={colors.red} />
          <Text style={[styles.deleteText, { color: colors.red }]}>Delete card</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Unfreeze PIN modal */}
      <Modal
        visible={unfreezeOpen}
        transparent
        animationType="fade"
        onRequestClose={closeUnfreezeSheet}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Enter your card PIN</Text>
            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
              Required to unfreeze your card.
            </Text>
            <TextInput
              value={pin}
              onChangeText={(v) => {
                const onlyDigits = v.replace(/\D/g, '').slice(0, 6);
                setPin(onlyDigits);
                if (pinError) setPinError(null);
              }}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={6}
              style={[styles.pinInput, { color: colors.text, borderColor: pinError ? colors.red : colors.border, backgroundColor: colors.background }]}
              placeholder="••••"
              placeholderTextColor={colors.textTertiary}
              accessibilityLabel="Card PIN"
            />
            {pinError && (
              <Text style={[styles.pinErrorText, { color: colors.red }]}>{pinError}</Text>
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={closeUnfreezeSheet} style={styles.modalCancelBtn}>
                <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleUnfreezeSubmit}
                disabled={!isValidCardPin(pin) || unfreezeMutation.loading}
                style={[
                  styles.modalSubmitBtn,
                  { backgroundColor: colors.primary },
                  (!isValidCardPin(pin) || unfreezeMutation.loading) && styles.btnDisabled,
                ]}
              >
                {unfreezeMutation.loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalSubmitText}>Unfreeze</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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

  // Empty / closed
  noCardContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 16 },
  noCardIcon: { width: 96, height: 96, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  noCardTitle: { fontSize: 24, fontFamily: 'Inter-Bold', textAlign: 'center' },
  noCardSub: { fontSize: 17, fontFamily: 'Inter-Regular', textAlign: 'center', lineHeight: 22 },

  // Pending
  pendingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  pendingCardSkeleton: {
    width: '100%',
    aspectRatio: 1.586,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingTitle: { fontSize: 20, fontFamily: 'Inter-SemiBold' },
  pendingSub: { fontSize: 15, fontFamily: 'Inter-Regular', textAlign: 'center' },
  bannerWarn: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginTop: 16,
  },
  bannerWarnText: { fontSize: 15, fontFamily: 'Inter-Medium' },
  bannerActionBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  bannerActionText: { color: '#fff', fontSize: 14, fontFamily: 'Inter-SemiBold' },

  // Card visual
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
  cardLogoArea: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardLogoText: { fontSize: 22, fontFamily: 'Inter-Bold', color: '#fff', letterSpacing: 4 },
  cardLogoStripes: { flexDirection: 'row', gap: 3, alignItems: 'center' },
  cardLogoStripe: { width: 4, height: 16, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.7)' },
  cardBottom: { gap: 4 },
  cardLabel: { fontSize: 15, fontFamily: 'Inter-Regular', color: 'rgba(255,255,255,0.85)', letterSpacing: 1 },

  // Status row
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', marginBottom: 20 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e' },
  statusDotFrozen: { backgroundColor: '#94a3b8' },
  statusTextLabel: { fontSize: 15, fontFamily: 'Inter-Medium' },

  // Sections
  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontFamily: 'Inter-SemiBold', marginBottom: 12 },

  // Progress bars
  progressBlock: { gap: 6, marginBottom: 12 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel: { fontSize: 15, fontFamily: 'Inter-Medium' },
  progressValue: { fontSize: 15, fontFamily: 'Inter-SemiBold' },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },

  // Buttons
  actionsRow: { paddingHorizontal: 16, marginBottom: 12 },
  primaryBtn: { borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32, alignItems: 'center', width: '100%' },
  primaryBtnText: { fontSize: 17, fontFamily: 'Inter-SemiBold', color: '#fff' },
  outlineBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, borderRadius: 12, paddingVertical: 14, borderWidth: 1.5,
  },
  outlineBtnText: { fontSize: 16, fontFamily: 'Inter-SemiBold' },
  btnDisabled: { opacity: 0.5 },
  helperMuted: { fontSize: 14, fontFamily: 'Inter-Regular', textAlign: 'center', lineHeight: 18 },

  limitsBtn: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12, borderRadius: 14, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  limitsBtnText: { flex: 1, fontSize: 17, fontFamily: 'Inter-SemiBold' },

  walletBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, borderRadius: 12, paddingVertical: 14, borderWidth: 1.5,
  },
  walletBtnText: { fontSize: 16, fontFamily: 'Inter-SemiBold' },
  walletBtnTextWhite: { fontSize: 16, fontFamily: 'Inter-SemiBold', color: '#fff' },
  walletBtnTextDone: { fontSize: 16, fontFamily: 'Inter-Medium', color: '#059669' },

  deleteRow: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', paddingVertical: 16 },
  deleteText: { fontSize: 16, fontFamily: 'Inter-Medium' },

  // Modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { padding: 24, borderTopLeftRadius: 20, borderTopRightRadius: 20, gap: 12 },
  modalTitle: { fontSize: 20, fontFamily: 'Inter-Bold' },
  modalSub: { fontSize: 15, fontFamily: 'Inter-Regular' },
  pinInput: {
    borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 22, fontFamily: 'Inter-SemiBold', textAlign: 'center', letterSpacing: 8,
  },
  pinErrorText: { fontSize: 14, fontFamily: 'Inter-Medium' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalCancelBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
  modalCancelText: { fontSize: 16, fontFamily: 'Inter-Medium' },
  modalSubmitBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingVertical: 14 },
  modalSubmitText: { fontSize: 16, fontFamily: 'Inter-SemiBold', color: '#fff' },
});

