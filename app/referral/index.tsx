import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Copy, Share2, ChevronDown, ChevronUp, Users, ChevronRight } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { useWallet } from '@/context/WalletContext';
import { useTheme } from '@/context/ThemeContext';
import { formatCurrency } from '@/utils/format';

const STAGE_LABELS: Record<string, string> = {
  invited: 'Invited',
  joined: 'Joined',
  topped_up: 'Topped up',
  reward_posted: 'Reward posted',
};

const STAGE_COLORS: Record<string, { bg: string; text: string }> = {
  invited: { bg: '#f1f5f9', text: '#475569' },
  joined: { bg: '#dbeafe', text: '#1d4ed8' },
  topped_up: { bg: '#fef3c7', text: '#92400e' },
  reward_posted: { bg: '#dcfce7', text: '#15803d' },
};

const STAGE_COLORS_DARK: Record<string, { bg: string; text: string }> = {
  invited: { bg: '#334155', text: '#94A3B8' },
  joined: { bg: '#1E3A5F', text: '#3B82F6' },
  topped_up: { bg: '#422006', text: '#FBBF24' },
  reward_posted: { bg: '#064E3B', text: '#34D399' },
};

export default function ReferralScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state } = useWallet();
  const { colors, isDark } = useTheme();
  const [howOpen, setHowOpen] = useState(false);
  const { referral } = state;

  const stageColors = isDark ? STAGE_COLORS_DARK : STAGE_COLORS;

  const copyCode = async () => {
    await Clipboard.setStringAsync(referral.code);
    Alert.alert('Copied!', `Code ${referral.code} copied to clipboard`);
  };

  const shareInvite = async () => {
    try {
      await Share.share({
        message: `Join Tesco Wallet with my code ${referral.code} and we both get £5! ${referral.link}`,
        url: referral.link,
      });
    } catch {}
  };

  return (
    <SafeAreaView edges={['left', 'right']} style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border, paddingTop: insets.top + 14 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Invite Friends</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={[styles.heroIconBg, { backgroundColor: isDark ? colors.surfaceAlt : '#eff6ff' }]}>
            <Users size={40} color={colors.primary} />
          </View>
          <Text style={[styles.heroTitle, { color: colors.text }]}>Give £5, Get £5</Text>
          <Text style={[styles.heroSub, { color: colors.textSecondary }]}>
            Invite friends to Tesco Wallet. When they sign up and top up, you both earn £5.
          </Text>
        </View>

        {/* Referral Code */}
        <View style={[styles.codeCard, { backgroundColor: colors.surface, shadowColor: colors.shadowColor }]}>
          <Text style={[styles.codeLabel, { color: colors.textTertiary }]}>Your referral code</Text>
          <TouchableOpacity style={[styles.codeRow, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={copyCode}>
            <Text style={[styles.codeText, { color: colors.text }]}>{referral.code}</Text>
            <Copy size={18} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.shareBtn, { backgroundColor: colors.primary }]} onPress={shareInvite}>
            <Share2 size={16} color="#fff" />
            <Text style={styles.shareBtnText}>Share invite</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={[styles.statsRow, { backgroundColor: colors.surface, shadowColor: colors.shadowColor }]}>
          {[
            { label: 'Invited', value: referral.invited },
            { label: 'Joined', value: referral.joined },
            { label: 'Earned', value: formatCurrency(referral.earned) },
          ].map(({ label, value }) => (
            <View key={label} style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
              <Text style={[styles.statLabel, { color: colors.textTertiary }]}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Monthly cap */}
        <View style={[styles.capRow, { backgroundColor: colors.surface, shadowColor: colors.shadowColor }]}>
          <Text style={[styles.capText, { color: colors.textSecondary }]}>
            Monthly limit: {referral.monthlyRewardedUsed} / {referral.monthlyRewardedCap} referrals rewarded
          </Text>
          <View style={[styles.capTrack, { backgroundColor: colors.border }]}>
            <View style={[styles.capFill, { backgroundColor: colors.primary, width: `${(referral.monthlyRewardedUsed / referral.monthlyRewardedCap) * 100}%` as any }]} />
          </View>
        </View>

        {/* Friends list */}
        {referral.friends.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Your friends</Text>
            {referral.friends.map((friend) => {
              const chipColors = stageColors[friend.stage];
              return (
                <TouchableOpacity
                  key={friend.id}
                  style={[styles.friendRow, { borderBottomColor: colors.borderLight }]}
                  onPress={() => router.push(`/referral/friend/${friend.id}` as any)}
                >
                  <View style={[styles.friendAvatar, { backgroundColor: colors.primary }]}>
                    <Text style={styles.friendAvatarText}>{friend.avatarInitial ?? '?'}</Text>
                  </View>
                  <View style={styles.friendInfo}>
                    <Text style={[styles.friendName, { color: colors.text }]}>{friend.nameOrAlias}</Text>
                    {friend.rewardAmount && (
                      <Text style={[styles.friendReward, { color: colors.green }]}>+{formatCurrency(friend.rewardAmount)} earned</Text>
                    )}
                  </View>
                  <View style={[styles.stageChip, { backgroundColor: chipColors.bg }]}>
                    <Text style={[styles.stageChipText, { color: chipColors.text }]}>
                      {STAGE_LABELS[friend.stage]}
                    </Text>
                  </View>
                  <ChevronRight size={16} color={colors.textTertiary} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* How it works */}
        <TouchableOpacity
          style={[styles.expandSection, { borderTopColor: colors.border }]}
          onPress={() => setHowOpen((v) => !v)}
        >
          <Text style={[styles.expandTitle, { color: colors.text }]}>How it works</Text>
          {howOpen ? <ChevronUp size={18} color={colors.textSecondary} /> : <ChevronDown size={18} color={colors.textSecondary} />}
        </TouchableOpacity>
        {howOpen && (
          <View style={styles.expandContent}>
            {[
              ['1', 'Share your code', 'Send your unique referral code to friends.'],
              ['2', 'Friend signs up', 'They create a Tesco Wallet account using your code.'],
              ['3', 'Friend tops up', 'They top up £10 or more within 30 days of joining.'],
              ['4', 'Both get £5', 'You both receive a £5 bonus reward in your wallet.'],
            ].map(([num, title, desc]) => (
              <View key={num} style={styles.step}>
                <View style={[styles.stepNum, { backgroundColor: colors.primary }]}>
                  <Text style={styles.stepNumText}>{num}</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={[styles.stepTitle, { color: colors.text }]}>{title}</Text>
                  <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>{desc}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 19, fontFamily: 'Inter-SemiBold' },
  scroll: { padding: 16, paddingBottom: 80 },
  hero: { alignItems: 'center', gap: 10, paddingVertical: 20 },
  heroIconBg: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 30, fontFamily: 'Inter-Bold', letterSpacing: -0.5 },
  heroSub: { fontSize: 17, fontFamily: 'Inter-Regular', textAlign: 'center', lineHeight: 22 },
  codeCard: { borderRadius: 20, padding: 20, gap: 12, marginBottom: 16, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  codeLabel: { fontSize: 15, fontFamily: 'Inter-SemiBold', letterSpacing: 0.5 },
  codeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 12, padding: 14, borderWidth: 1.5, borderStyle: 'dashed' },
  codeText: { fontSize: 26, fontFamily: 'Inter-Bold', letterSpacing: 3 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 14 },
  shareBtnText: { fontSize: 17, fontFamily: 'Inter-SemiBold', color: '#fff' },
  statsRow: { flexDirection: 'row', borderRadius: 16, padding: 16, marginBottom: 12, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 24, fontFamily: 'Inter-Bold' },
  statLabel: { fontSize: 15, fontFamily: 'Inter-Regular' },
  capRow: { borderRadius: 12, padding: 14, marginBottom: 20, gap: 8, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  capText: { fontSize: 15, fontFamily: 'Inter-Regular' },
  capTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  capFill: { height: 4, borderRadius: 2 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontFamily: 'Inter-Bold', marginBottom: 10 },
  friendRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1 },
  friendAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  friendAvatarText: { fontSize: 18, fontFamily: 'Inter-Bold', color: '#fff' },
  friendInfo: { flex: 1 },
  friendName: { fontSize: 17, fontFamily: 'Inter-SemiBold' },
  friendReward: { fontSize: 15, fontFamily: 'Inter-SemiBold', marginTop: 2 },
  stageChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  stageChipText: { fontSize: 15, fontFamily: 'Inter-SemiBold' },
  expandSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderTopWidth: 1 },
  expandTitle: { fontSize: 17, fontFamily: 'Inter-SemiBold' },
  expandContent: { gap: 16, paddingBottom: 8 },
  step: { flexDirection: 'row', gap: 14 },
  stepNum: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  stepNumText: { fontSize: 15, fontFamily: 'Inter-Bold', color: '#fff' },
  stepContent: { flex: 1, gap: 2 },
  stepTitle: { fontSize: 16, fontFamily: 'Inter-SemiBold' },
  stepDesc: { fontSize: 15, fontFamily: 'Inter-Regular', lineHeight: 18 },
});
