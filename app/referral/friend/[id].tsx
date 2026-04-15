import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Send } from 'lucide-react-native';
import { useWallet } from '@/context/WalletContext';
import { useTheme } from '@/context/ThemeContext';
import { formatDateShort } from '@/utils/format';

const STAGES = ['invited', 'joined', 'topped_up', 'reward_posted'] as const;
const STAGE_LABELS: Record<string, string> = {
  invited: 'Invite sent',
  joined: 'Account created',
  topped_up: 'First top-up made',
  reward_posted: 'Reward posted to both',
};

export default function FriendDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state } = useWallet();
  const { colors, isDark } = useTheme();

  const friend = state.referral.friends.find((f) => f.id === id);

  if (!friend) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Friend</Text>
          <View style={{ width: 36 }} />
        </View>
        <Text style={[styles.notFound, { color: colors.textTertiary }]}>Friend not found</Text>
      </SafeAreaView>
    );
  }

  const currentStageIdx = STAGES.indexOf(friend.stage as any);
  const isComplete = friend.stage === 'reward_posted';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Friend detail</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Friend Hero */}
        <View style={styles.hero}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>{friend.avatarInitial ?? '?'}</Text>
          </View>
          <Text style={[styles.heroName, { color: colors.text }]}>{friend.nameOrAlias}</Text>
          {isComplete && friend.rewardAmount && (
            <View style={[styles.rewardBadge, { backgroundColor: colors.greenLight }]}>
              <Text style={[styles.rewardBadgeText, { color: colors.green }]}>+£{friend.rewardAmount} earned</Text>
            </View>
          )}
        </View>

        {/* Timeline */}
        <View style={[styles.timelineCard, { backgroundColor: colors.surface, shadowColor: colors.shadowColor }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Progress</Text>
          {STAGES.map((stage, idx) => {
            const done = idx <= currentStageIdx;
            const dates: Record<string, string | undefined> = {
              invited: friend.sentAt,
              joined: friend.joinedAt,
              topped_up: friend.joinedAt,
              reward_posted: friend.joinedAt,
            };
            return (
              <View key={stage} style={styles.timelineRow}>
                <View style={styles.timelineLeft}>
                  <View style={[styles.timelineDot, { borderColor: colors.border, backgroundColor: colors.surface }, done && { backgroundColor: colors.primary, borderColor: colors.primary }]} />
                  {idx < STAGES.length - 1 && <View style={[styles.timelineLine, { backgroundColor: colors.border }, done && idx < currentStageIdx && { backgroundColor: colors.primary }]} />}
                </View>
                <View style={styles.timelineContent}>
                  <Text style={[styles.timelineLabel, { color: colors.textTertiary }, done && { color: colors.text, fontFamily: 'Inter-SemiBold' }]}>
                    {STAGE_LABELS[stage]}
                  </Text>
                  {done && dates[stage] && (
                    <Text style={[styles.timelineDate, { color: colors.textSecondary }]}>{formatDateShort(dates[stage]!)}</Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Send reminder */}
        {!isComplete && (
          <TouchableOpacity
            style={[styles.reminderBtn, { backgroundColor: isDark ? colors.surfaceAlt : '#eff6ff', borderColor: isDark ? colors.border : '#bfdbfe' }]}
            onPress={() => Alert.alert('Reminder sent', `We\'ve nudged ${friend.nameOrAlias} to complete their sign-up.`)}
          >
            <Send size={16} color={colors.primary} />
            <Text style={[styles.reminderBtnText, { color: colors.primary }]}>Send reminder</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontFamily: 'Inter-SemiBold' },
  notFound: { textAlign: 'center', padding: 40, fontFamily: 'Inter-Regular' },
  scroll: { padding: 16, paddingBottom: 40 },
  hero: { alignItems: 'center', gap: 10, paddingVertical: 24 },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 28, fontFamily: 'Inter-Bold', color: '#fff' },
  heroName: { fontSize: 22, fontFamily: 'Inter-Bold' },
  rewardBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  rewardBadgeText: { fontSize: 14, fontFamily: 'Inter-SemiBold' },
  timelineCard: { borderRadius: 16, padding: 16, marginBottom: 16, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  sectionTitle: { fontSize: 15, fontFamily: 'Inter-Bold', marginBottom: 16 },
  timelineRow: { flexDirection: 'row', gap: 14, marginBottom: 4 },
  timelineLeft: { alignItems: 'center', width: 20 },
  timelineDot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2 },
  timelineLine: { width: 2, flex: 1, marginVertical: 2, minHeight: 20 },
  timelineContent: { flex: 1, paddingBottom: 16 },
  timelineLabel: { fontSize: 14, fontFamily: 'Inter-Medium' },
  timelineDate: { fontSize: 12, fontFamily: 'Inter-Regular', marginTop: 2 },
  reminderBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 14, borderWidth: 1.5 },
  reminderBtnText: { fontSize: 15, fontFamily: 'Inter-SemiBold' },
});
