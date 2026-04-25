// Friend detail screen — wires to GET /referral/friends/{id}.
// Spec: docs/mobile/specs/08-referral.ru.md §3.2.

import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, ChevronRight } from 'lucide-react-native';
import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/context/ThemeContext';
import { useFriend } from '@/hooks/useFriend';
import type {
  ReferralFriendDetail,
  ReferralRewardItem,
  ReferralStage,
} from '@/types/referral';
import { ApiError, mapErrorCode } from '@/utils/errors';
import { formatDateLong, formatMoney } from '@/utils/format';

const AVATAR_BG = '#E2E8F0';
const AVATAR_FG = '#64748B';

const STAGES: ReferralStage[] = [
  'invited',
  'joined',
  'topped_up',
  'reward_posted',
];

const STAGE_LABELS: Record<ReferralStage, string> = {
  invited: 'Invite sent',
  joined: 'Account created',
  topped_up: 'First top-up made',
  reward_posted: 'Reward posted',
};

const REWARD_ROLE_LABEL: Record<string, string> = {
  inviter_join: 'Friend joined bonus',
  inviter_topup: 'Friend top-up bonus',
  invitee_welcome: 'Welcome bonus',
};

const REWARD_STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  available: 'Available',
  claimed: 'Claimed',
  expired: 'Expired',
  cancelled: 'Cancelled',
};

function timelineDate(
  friend: ReferralFriendDetail,
  stage: ReferralStage,
): string | null {
  switch (stage) {
    case 'invited':
      return friend.timeline.sentAt;
    case 'joined':
      return friend.timeline.acceptedAt;
    case 'topped_up':
      return friend.timeline.firstTopupAt;
    case 'reward_posted':
      return friend.timeline.rewardPostedAt;
    default:
      return null;
  }
}

function avatarInitial(friend: ReferralFriendDetail): string {
  const source = friend.inviteeName ?? friend.displayName ?? friend.contactMasked;
  if (!source || source.length === 0) return '?';
  return source.replace(/\s+/g, '').charAt(0).toUpperCase();
}

function friendName(friend: ReferralFriendDetail): string {
  if (friend.inviteeName) return friend.inviteeName;
  if (friend.displayName) return friend.displayName;
  if (friend.contactMasked) return friend.contactMasked;
  return 'Pending invite';
}

export default function FriendDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();

  const { data: friend, loading, error } = useFriend(id);

  const errorMessage = (() => {
    if (!error) return null;
    if (error instanceof ApiError) {
      return mapErrorCode(error.code) ?? error.message;
    }
    return 'Could not load this friend right now.';
  })();

  return (
    <SafeAreaView
      edges={['left', 'right']}
      style={[styles.safe, { backgroundColor: colors.background }]}
    >
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
            paddingTop: insets.top + 14,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Friend</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading && !friend ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : !friend ? (
        <View style={styles.center}>
          <Text style={[styles.placeholderTitle, { color: colors.text }]}>
            Friend not found
          </Text>
          {errorMessage && (
            <Text
              style={[styles.placeholderSub, { color: colors.textSecondary }]}
            >
              {errorMessage}
            </Text>
          )}
          <TouchableOpacity
            style={[styles.backLink, { borderColor: colors.primary }]}
            onPress={() => router.back()}
          >
            <Text style={[styles.backLinkText, { color: colors.primary }]}>
              Back to referrals
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FriendDetail
          friend={friend}
          onPressReward={(rewardId) =>
            router.push({
              pathname: '/rewards/[id]',
              params: { id: rewardId },
            })
          }
        />
      )}
    </SafeAreaView>
  );
}

interface FriendDetailProps {
  friend: ReferralFriendDetail;
  onPressReward: (id: string) => void;
}

function FriendDetail({ friend, onPressReward }: FriendDetailProps) {
  const { colors } = useTheme();
  const currentStageIdx = STAGES.indexOf(friend.stage);

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero */}
      <View style={styles.hero}>
        <View style={[styles.avatar, { backgroundColor: AVATAR_BG }]}>
          <Text style={[styles.avatarText, { color: AVATAR_FG }]}>
            {avatarInitial(friend)}
          </Text>
        </View>
        <Text style={[styles.heroName, { color: colors.text }]}>
          {friendName(friend)}
        </Text>
        {friend.contactMasked && friend.inviteeName && (
          <Text style={[styles.heroSub, { color: colors.textSecondary }]}>
            {friend.contactMasked}
          </Text>
        )}
        {friend.inviterEarned.amountMinor > 0 && (
          <View
            style={[
              styles.rewardBadge,
              { backgroundColor: colors.greenLight ?? '#dcfce7' },
            ]}
          >
            <Text style={[styles.rewardBadgeText, { color: colors.green }]}>
              +
              {formatMoney(
                friend.inviterEarned.amountMinor,
                friend.inviterEarned.currency,
              )}{' '}
              earned
            </Text>
          </View>
        )}
      </View>

      {/* Timeline */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            shadowColor: colors.shadowColor,
          },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Progress
        </Text>
        {STAGES.map((stage, idx) => {
          const done = idx <= currentStageIdx;
          const date = timelineDate(friend, stage);
          return (
            <View key={stage} style={styles.timelineRow}>
              <View style={styles.timelineLeft}>
                <View
                  style={[
                    styles.timelineDot,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.surface,
                    },
                    done && {
                      backgroundColor: colors.primary,
                      borderColor: colors.primary,
                    },
                  ]}
                />
                {idx < STAGES.length - 1 && (
                  <View
                    style={[
                      styles.timelineLine,
                      { backgroundColor: colors.border },
                      done &&
                        idx < currentStageIdx && {
                          backgroundColor: colors.primary,
                        },
                    ]}
                  />
                )}
              </View>
              <View style={styles.timelineContent}>
                <Text
                  style={[
                    styles.timelineLabel,
                    { color: colors.textTertiary },
                    done && {
                      color: colors.text,
                      fontFamily: 'Inter-SemiBold',
                    },
                  ]}
                >
                  {STAGE_LABELS[stage]}
                </Text>
                {date && (
                  <Text
                    style={[
                      styles.timelineDate,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {formatDateLong(date)}
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* Rewards */}
      {friend.rewards.length > 0 && (
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              shadowColor: colors.shadowColor,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Rewards
          </Text>
          {friend.rewards.map((reward) => (
            <RewardRow
              key={reward.id}
              reward={reward}
              onPress={() => onPressReward(reward.id)}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function RewardRow({
  reward,
  onPress,
}: {
  reward: ReferralRewardItem;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={[styles.rewardRow, { borderBottomColor: colors.borderLight }]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.rewardTitle, { color: colors.text }]}>
          {REWARD_ROLE_LABEL[reward.role] ?? reward.role}
        </Text>
        <Text style={[styles.rewardSub, { color: colors.textTertiary }]}>
          {REWARD_STATUS_LABEL[reward.status] ?? reward.status}
        </Text>
      </View>
      <Text style={[styles.rewardAmount, { color: colors.text }]}>
        {formatMoney(reward.amount.amountMinor, reward.amount.currency)}
      </Text>
      <ChevronRight size={16} color={colors.textTertiary} />
    </TouchableOpacity>
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
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 19, fontFamily: 'Inter-SemiBold' },
  scroll: { padding: 16, paddingBottom: 40 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  placeholderTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
  },
  placeholderSub: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  backLink: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  backLinkText: { fontSize: 15, fontFamily: 'Inter-SemiBold' },
  hero: { alignItems: 'center', gap: 8, paddingVertical: 24 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 28, fontFamily: 'Inter-Bold' },
  heroName: { fontSize: 22, fontFamily: 'Inter-Bold' },
  heroSub: { fontSize: 14, fontFamily: 'Inter-Regular' },
  rewardBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 4,
  },
  rewardBadgeText: { fontSize: 14, fontFamily: 'Inter-SemiBold' },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: { fontSize: 16, fontFamily: 'Inter-Bold', marginBottom: 14 },
  timelineRow: { flexDirection: 'row', gap: 14, marginBottom: 4 },
  timelineLeft: { alignItems: 'center', width: 20 },
  timelineDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2 },
  timelineLine: { width: 2, flex: 1, marginVertical: 2, minHeight: 18 },
  timelineContent: { flex: 1, paddingBottom: 14 },
  timelineLabel: { fontSize: 14, fontFamily: 'Inter-Medium' },
  timelineDate: { fontSize: 13, fontFamily: 'Inter-Regular', marginTop: 2 },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  rewardTitle: { fontSize: 14, fontFamily: 'Inter-SemiBold' },
  rewardSub: { fontSize: 12, fontFamily: 'Inter-Regular', marginTop: 2 },
  rewardAmount: { fontSize: 15, fontFamily: 'Inter-SemiBold' },
});
