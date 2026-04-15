import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useWallet } from '@/context/WalletContext';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

export default function Index() {
  const router = useRouter();
  const { state } = useWallet();

  useEffect(() => {
    if (!state.initialized) return;
    if (state.onboardingComplete) {
      router.replace('/(tabs)');
    } else {
      router.replace('/(onboarding)/intro');
    }
  }, [state.initialized, state.onboardingComplete]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#1a56db" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' },
});
