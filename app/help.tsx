import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Search, ChevronDown, ChevronUp, Mail } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';

const FAQ_SECTIONS = [
  {
    title: 'Getting started',
    items: [
      { q: 'How do I create an account?', a: 'Download the Tesco Wallet app, tap "Get started" and follow the sign-up flow. You\'ll need a valid phone number or email address.' },
      { q: 'Is Tesco Wallet free?', a: 'Yes, Tesco Wallet is completely free to use. There are no monthly fees or hidden charges.' },
    ],
  },
  {
    title: 'Top-ups',
    items: [
      { q: 'How long does a top-up take?', a: 'Card and Apple/Google Pay top-ups are instant. Bank transfers can take 1-2 business days.' },
      { q: 'What\'s the minimum top-up?', a: 'The minimum top-up is £5. There is no maximum, subject to your monthly limits.' },
    ],
  },
  {
    title: 'Cashback & rewards',
    items: [
      { q: 'When is cashback posted?', a: 'Cashback is typically posted within 3 working days of your purchase completing.' },
      { q: 'When do rewards expire?', a: 'All rewards expire 90 days after being earned. You\'ll receive a push notification before expiry.' },
    ],
  },
  {
    title: 'Card',
    items: [
      { q: 'How do I freeze my card?', a: 'Go to the Card tab and tap "Freeze". Your card will be frozen instantly. You can unfreeze at any time.' },
      { q: 'What if my card is lost?', a: 'Freeze your card immediately, then contact our support team to request a replacement card.' },
    ],
  },
  {
    title: 'Disputes',
    items: [
      { q: 'How do I dispute a transaction?', a: 'Open the transaction in your history, scroll down and tap "Report an issue". Fill in the form and submit.' },
      { q: 'How long does a dispute take?', a: 'Most disputes are resolved within 5-10 business days. Complex cases may take longer.' },
    ],
  },
  {
    title: 'Referral',
    items: [
      { q: 'How do I earn a referral bonus?', a: 'Share your referral code with a friend. When they sign up and top up £10+, you both receive £5.' },
      { q: 'Is there a limit on referrals?', a: 'You can earn up to 10 referral bonuses per month (up to £50). There is no annual cap.' },
    ],
  },
  {
    title: 'Account',
    items: [
      { q: 'How do I close my account?', a: 'Go to Profile → Delete account. Your balance must be £0 and there must be no open disputes before deletion.' },
      { q: 'Can I change my date of birth?', a: 'Your date of birth can only be changed by our support team for security reasons. Please contact us.' },
    ],
  },
];

export default function HelpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [search, setSearch] = useState('');
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const filtered = FAQ_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) =>
        search === '' ||
        item.q.toLowerCase().includes(search.toLowerCase()) ||
        item.a.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter((s) => s.items.length > 0);

  return (
    <SafeAreaView edges={['left', 'right']} style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border, paddingTop: insets.top + 14 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Help & FAQ</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
        <View style={[styles.searchRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Search size={16} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search for help..."
            placeholderTextColor={colors.textTertiary}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {filtered.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>{section.title}</Text>
            <View style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.shadowColor }]}>
              {section.items.map((item, idx) => {
                const key = `${section.title}-${idx}`;
                const isOpen = expandedItem === key;
                return (
                  <View key={key} style={[styles.faqItem, idx < section.items.length - 1 && [styles.faqItemBorder, { borderBottomColor: colors.borderLight }]]}>
                    <TouchableOpacity
                      style={styles.faqQuestion}
                      onPress={() => setExpandedItem(isOpen ? null : key)}
                    >
                      <Text style={[styles.faqQuestionText, { color: colors.text }]}>{item.q}</Text>
                      {isOpen ? <ChevronUp size={16} color={colors.textSecondary} /> : <ChevronDown size={16} color={colors.textSecondary} />}
                    </TouchableOpacity>
                    {isOpen && (
                      <Text style={[styles.faqAnswer, { color: colors.textSecondary }]}>{item.a}</Text>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        ))}

        {/* Contact card */}
        <View style={[styles.contactCard, { backgroundColor: colors.surface, shadowColor: colors.shadowColor }]}>
          <Mail size={24} color={colors.primary} />
          <Text style={[styles.contactTitle, { color: colors.text }]}>Still need help?</Text>
          <Text style={[styles.contactSub, { color: colors.textSecondary }]}>Our team usually responds within 24 hours.</Text>
          <TouchableOpacity style={[styles.contactBtn, { backgroundColor: isDark ? '#1E3A5F' : '#eff6ff' }]}>
            <Text style={[styles.contactBtnText, { color: colors.primary }]}>support@tescowallet.com</Text>
          </TouchableOpacity>
        </View>
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
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16, borderWidth: 1.5 },
  searchInput: { flex: 1, fontSize: 17, fontFamily: 'Inter-Regular' },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontFamily: 'Inter-SemiBold', letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' },
  card: { borderRadius: 14, overflow: 'hidden', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  faqItem: {},
  faqItemBorder: { borderBottomWidth: 1 },
  faqQuestion: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  faqQuestionText: { flex: 1, fontSize: 16, fontFamily: 'Inter-SemiBold', lineHeight: 20 },
  faqAnswer: { fontSize: 16, fontFamily: 'Inter-Regular', lineHeight: 22, paddingHorizontal: 14, paddingBottom: 14 },
  contactCard: { borderRadius: 16, padding: 16, alignItems: 'center', gap: 8, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  contactTitle: { fontSize: 19, fontFamily: 'Inter-Bold' },
  contactSub: { fontSize: 16, fontFamily: 'Inter-Regular' },
  contactBtn: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10, marginTop: 4 },
  contactBtnText: { fontSize: 16, fontFamily: 'Inter-SemiBold' },
});
