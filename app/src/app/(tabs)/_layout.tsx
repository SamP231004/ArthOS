import { Tabs } from 'expo-router/tabs';
import { useEffect } from 'react';

import { DialTabBar } from '@/components/dial-tab-bar';
import { currentMonth } from '@/lib/format';
import { syncAlertNotifications } from '@/lib/notify';
import { useInsights } from '@/lib/queries';
import { useTheme } from '@/theme';

/** Tabs driven by the Omnitrix-style dial instead of a bottom bar (matches the website's mobile navigation). */
export default function TabsLayout() {
  const { c } = useTheme();
  // budget overages and recurring bills → phone notifications (each once; bills at 9 am on their due date)
  const insights = useInsights(currentMonth()).data;
  useEffect(() => {
    if (insights) syncAlertNotifications(insights).catch(() => {});
  }, [insights]);
  return (
    <Tabs tabBar={(props) => <DialTabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: c.bg } }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="income" options={{ title: 'Income' }} />
      <Tabs.Screen name="expenses" options={{ title: 'Expenses' }} />
      <Tabs.Screen name="budget" options={{ title: 'Budget' }} />
      <Tabs.Screen name="invest" options={{ title: 'Invest' }} />
      <Tabs.Screen name="insights" options={{ title: 'Insights' }} />
    </Tabs>
  );
}
