import { Stack } from 'expo-router';

export default function TabsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="index" options={{ animation: 'none' }} />
      <Stack.Screen name="card" />
      <Stack.Screen name="rewards" />
      <Stack.Screen name="profile" />
    </Stack>
  );
}
