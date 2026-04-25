// RewardDetailSheet — modal sheet showing reward detail and claim CTA.
// Uses RN Modal in pageSheet mode (consistent with existing screens) — the
// project does not currently have a BottomSheet UI primitive in
// `components/ui`, and the Modal-based pattern is already in use for
// reward / transaction details. The sheet fetches the latest detail via
// `useReward(id)` so claimability flags are fresh, and runs the claim
// through `useClaimReward`. Idempotency-Key is owned by the hook and
// rotates after a successful claim.

import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { ExternalLink, X } from 'lucide-react-native';

import { Button } from '@/components/ui/Button';
import { useTheme } from '@/context/ThemeContext';
import { useClaimReward } from '@/hooks/useClaimReward';
import { useReward } from '@/hooks/useReward';
import type { Reward } from '@/types/loyalty';
import { ApiError, mapErrorCode } from '@/utils/errors';
import { formatDate, formatMoney } from '@/utils/format';

interface RewardDetailSheetProps {
  rewardId: string | null;
  onClose: () => void;
}

function describeNotClaimable(reason: string | null): string | null {
  if (!reason) return null;
  return mapErrorCode(reason) ?? null;
}

export function RewardDetailSheet({
  rewardId,
  onClose,
}: RewardDetailSheetProps): React.ReactElement {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const visible = rewardId !== null;

  const { data: reward, loading, error, refetch } = useReward(rewardId);
  const claim = useClaimReward();

  // Reset the claim state when the sheet target changes.
  useEffect(() => {
    if (rewardId === null) {
      claim.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rewardId]);

  // Auto-close on REWARD_NOT_FOUND from the detail fetch.
  useEffect(() => {
    if (error instanceof ApiError && error.code === 'REWARD_NOT_FOUND') {
      Alert.alert('This reward is no longer available.');
      onClose();
    }
  }, [error, onClose]);

  const handleClaim = async (id: string): Promise<void> => {
    try {
      await claim.mutate({ rewardId: id });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Reward claimed', 'Credited to your wallet.');
      onClose();
    } catch (e) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      const message =
        e instanceof Error ? e.message : 'Could not claim reward.';
      // For transient terminal errors (expired / already claimed), close the
      // sheet so the list refetches.
      if (
        e instanceof ApiError &&
        ['REWARD_EXPIRED', 'REWARD_ALREADY_CLAIMED', 'REWARD_CANCELLED'].includes(
          e.code,
        )
      ) {
        Alert.alert(message);
        onClose();
        return;
      }
      Alert.alert(message);
    }
  };

  const renderClaimSection = (r: Reward): React.ReactElement | null => {
    if (r.status === 'expired' || r.status === 'cancelled') return null;
    if (r.status === 'claimed') {
      return (
        <View style={styles.claimedBlock}>
          <Text style={[styles.claimedText, { color: colors.textSecondary }]}>
            Claimed on {r.claimedAt ? formatDate(r.claimedAt, 'short') : '—'}
          </Text>
          {r.linkedTransactionId ? (
            <TouchableOpacity
              onPress={() => {
                onClose();
                router.push({
                  pathname: '/transactions/[id]',
                  params: { id: r.linkedTransactionId as string },
                });
              }}
            >
              <Text style={[styles.linkText, { color: colors.primary }]}>
                View in transactions
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      );
    }

    const helper = describeNotClaimable(r.claim.notClaimableReason);
    const disabled = !r.claim.canClaim || claim.loading;
    const label =
      r.status === 'pending'
        ? r.availableFrom
          ? `Available from ${formatDate(r.availableFrom, 'short')}`
          : 'Not yet available'
        : `Claim ${formatMoney(r.amount.amountMinor, r.amount.currency)}`;
    return (
      <View style={styles.claimBlock}>
        <Button
          variant="primary"
          size="lg"
          loading={claim.loading}
          disabled={disabled}
          onPress={() => handleClaim(r.id)}
          accessibilityLabel={`Claim ${formatMoney(
            r.amount.amountMinor,
            r.amount.currency,
          )} reward`}
          accessibilityState={{ disabled, busy: claim.loading }}
        >
          {label}
        </Button>
        {helper ? (
          <Text style={[styles.helper, { color: colors.textTertiary }]}>
            {helper}
          </Text>
        ) : null}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>Reward details</Text>
          <TouchableOpacity onPress={onClose} accessibilityLabel="Close">
            <X size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {loading && !reward ? (
            <ActivityIndicator color={colors.primary} style={styles.loading} />
          ) : !reward ? (
            <Text style={[styles.empty, { color: colors.textSecondary }]}>
              {error
                ? error.message
                : 'Reward details unavailable.'}
            </Text>
          ) : (
            <>
              <View style={styles.amountRow}>
                <Text style={[styles.amount, { color: '#059669' }]}>
                  +{formatMoney(reward.amount.amountMinor, reward.amount.currency)}
                </Text>
                <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>
                  {reward.status === 'available' ? 'Available' : reward.status}
                </Text>
              </View>

              {reward.description ? (
                <Text
                  style={[styles.description, { color: colors.textSecondary }]}
                >
                  {reward.description}
                </Text>
              ) : null}

              <View style={styles.infoBlock}>
                <InfoRow
                  label="Source"
                  value={
                    reward.merchantName
                      ? `${reward.title} · ${reward.merchantName}`
                      : reward.title
                  }
                />
                <InfoRow label="Type" value={reward.bucket} />
                <InfoRow
                  label="Earned"
                  value={formatDate(reward.earnedAt, 'short')}
                />
                {reward.availableFrom ? (
                  <InfoRow
                    label="Available"
                    value={formatDate(reward.availableFrom, 'short')}
                  />
                ) : null}
                {reward.expiresAt ? (
                  <InfoRow
                    label="Expires"
                    value={formatDate(reward.expiresAt, 'short')}
                  />
                ) : null}
                {reward.tier ? (
                  <InfoRow
                    label="Tier"
                    value={
                      reward.tier.cashbackRateBps !== null
                        ? `${reward.tier.name} (${(
                            reward.tier.cashbackRateBps / 100
                          ).toFixed(reward.tier.cashbackRateBps % 100 === 0 ? 0 : 1)}%)`
                        : reward.tier.name
                    }
                  />
                ) : null}
              </View>

              {reward.linkedTransactionId ? (
                <TouchableOpacity
                  style={styles.linkRow}
                  onPress={() => {
                    onClose();
                    router.push({
                      pathname: '/transactions/[id]',
                      params: { id: reward.linkedTransactionId as string },
                    });
                  }}
                >
                  <ExternalLink size={16} color={colors.primary} />
                  <Text style={[styles.linkText, { color: colors.primary }]}>
                    View linked transaction
                  </Text>
                </TouchableOpacity>
              ) : null}

              {renderClaimSection(reward)}

              <Text
                style={[
                  styles.note,
                  {
                    color: colors.textTertiary,
                    backgroundColor: isDark
                      ? colors.surfaceAlt
                      : colors.background,
                  },
                ]}
              >
                Rewards are credited to your wallet balance. Terms apply.
              </Text>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}): React.ReactElement {
  const { colors } = useTheme();
  return (
    <View style={[styles.infoRow, { borderBottomColor: colors.borderLight }]}>
      <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  title: { fontSize: 19, fontFamily: 'Inter-Bold' },
  content: { padding: 20, gap: 16 },
  loading: { marginTop: 40 },
  empty: { textAlign: 'center', fontFamily: 'Inter-Regular', marginTop: 40 },
  amountRow: { gap: 4, marginBottom: 8 },
  amount: { fontSize: 32, fontFamily: 'Inter-Bold', letterSpacing: -1 },
  statusLabel: { fontSize: 15, fontFamily: 'Inter-Medium' },
  description: { fontSize: 15, fontFamily: 'Inter-Regular', lineHeight: 20 },
  infoBlock: { gap: 0 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  infoLabel: { fontSize: 15, fontFamily: 'Inter-Regular' },
  infoValue: { fontSize: 15, fontFamily: 'Inter-SemiBold' },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  linkText: { fontSize: 15, fontFamily: 'Inter-SemiBold' },
  claimBlock: { gap: 8, marginTop: 4 },
  claimedBlock: { gap: 8, marginTop: 4 },
  claimedText: { fontSize: 15, fontFamily: 'Inter-Regular' },
  helper: { fontSize: 13, fontFamily: 'Inter-Regular', textAlign: 'center' },
  note: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    lineHeight: 18,
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
});
