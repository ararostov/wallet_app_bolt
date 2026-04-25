import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Coins, Gift, CreditCard } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeContext';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    id: '0',
    icon: Coins,
    bigText: '10%',
    headline: 'Get up to 10% back on every purchase',
    body: 'Earn cashback every time you spend with your Tesco Wallet card, in-store and online.',
    gradient: ['#1e3a8a', '#1a56db'],
  },
  {
    id: '1',
    icon: Gift,
    bigText: '+£5',
    headline: 'Get £5 on your first top-up',
    body: 'Top up £20 or more within 30 days of joining and we\'ll reward you with a £5 bonus.',
    gradient: ['#065f46', '#059669'],
  },
  {
    id: '2',
    icon: CreditCard,
    bigText: null,
    headline: 'Your card. Your cashback.',
    body: 'Manage your balance, track rewards, and control your card — all in one place.',
    gradient: ['#1e3a8a', '#7c3aed'],
  },
];

export default function IntroScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const flatListRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const goToSignup = () => router.push('/(onboarding)/signup');
  const goToLogin = () => router.push('/(onboarding)/login');

  const goNext = () => {
    if (activeIndex < SLIDES.length - 1) {
      const nextIndex = activeIndex + 1;
      setActiveIndex(nextIndex);
      flatListRef.current?.scrollToOffset({ offset: nextIndex * width, animated: true });
    } else {
      goToSignup();
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index ?? 0);
    }
  }).current;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface }]}>
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        {activeIndex < SLIDES.length - 1 && (
          <TouchableOpacity style={styles.skipBtn} onPress={goToSignup}>
            <Text style={[styles.skipText, { color: colors.textSecondary }]}>Skip</Text>
          </TouchableOpacity>
        )}

        <FlatList
          ref={flatListRef}
          data={SLIDES}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
          renderItem={({ item }) => {
            const IconComp = item.icon;
            return (
              <View style={[styles.slide, { width }]}>
                <LinearGradient colors={item.gradient as [string, string]} style={styles.illustrationBox}>
                  <View style={styles.iconCircle}>
                    <IconComp size={48} color="#fff" />
                  </View>
                  {item.bigText && (
                    <Text style={styles.bigText}>{item.bigText}</Text>
                  )}
                </LinearGradient>
                <View style={styles.textBox}>
                  <Text style={[styles.headline, { color: colors.text }]}>{item.headline}</Text>
                  <Text style={[styles.body, { color: colors.textSecondary }]}>{item.body}</Text>
                </View>
              </View>
            );
          }}
        />

        <View style={styles.footer}>
          <View style={styles.dots}>
            {SLIDES.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, { backgroundColor: colors.border }, i === activeIndex && { backgroundColor: colors.primary, width: 24 }]}
              />
            ))}
          </View>
          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primary }]} onPress={activeIndex === SLIDES.length - 1 ? goToSignup : goNext}>
            <Text style={styles.primaryBtnText}>{activeIndex === SLIDES.length - 1 ? 'Get started' : 'Next'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={goToLogin}>
            <Text style={[styles.secondaryBtnText, { color: colors.primary }]}>I already have an account</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>

  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1 },
  skipBtn: { position: 'absolute', top: 16, right: 16, zIndex: 10, padding: 8 },
  skipText: { fontSize: 17, fontFamily: 'Inter-Medium' },
  slide: { flex: 1, alignItems: 'center', paddingHorizontal: 32 },
  illustrationBox: {
    width: '100%',
    height: 280,
    borderRadius: 24,
    marginTop: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigText: {
    fontSize: 64,
    fontFamily: 'Inter-Bold',
    color: '#fff',
    letterSpacing: -2,
  },
  textBox: { marginTop: 32, alignItems: 'center', gap: 12 },
  headline: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    textAlign: 'center',
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  body: {
    fontSize: 18,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 24,
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 16 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  footer: { paddingHorizontal: 24, paddingBottom: 32, gap: 12, marginTop: 'auto' },
  primaryBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnText: { fontSize: 18, fontFamily: 'Inter-SemiBold', color: '#fff' },
  secondaryBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryBtnText: { fontSize: 17, fontFamily: 'Inter-Medium' },
});
