import { Tabs } from 'expo-router/tabs';

import { DialTabBar } from '@/components/dial-tab-bar';
import { useTheme } from '@/theme';

/** Tabs driven by the Omnitrix-style dial instead of a bottom bar (matches the website's mobile navigation). */
export default function TabsLayout() {
  const { c } = useTheme();
  return (
    <Tabs tabBar={(props) => <DialTabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: c.bg } }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="income" options={{ title: 'Income' }} />
      <Tabs.Screen name="expenses" options={{ title: 'Expenses' }} />
      <Tabs.Screen name="budget" options={{ title: 'Budget' }} />
      <Tabs.Screen name="invest" options={{ title: 'Invest' }} />
    </Tabs>
  );
}
