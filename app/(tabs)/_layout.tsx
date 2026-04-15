import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="card" />
      <Tabs.Screen name="rewards" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
