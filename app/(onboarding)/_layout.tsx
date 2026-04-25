import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="intro" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="signup/profile" />
      <Stack.Screen name="signup/consents" />
      <Stack.Screen name="signup/otp" />
      <Stack.Screen name="login" />
      <Stack.Screen name="login/otp" />
      <Stack.Screen name="invite-welcome" />
    </Stack>
  );
}
