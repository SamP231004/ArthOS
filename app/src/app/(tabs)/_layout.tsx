import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { Tabs } from 'expo-router/tabs';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { DialTabBar } from '@/components/dial-tab-bar';
import { currentMonth } from '@/lib/format';
import { syncAlertNotifications } from '@/lib/notify';
import { useInsights } from '@/lib/queries';
import { useTheme } from '@/theme';

/** Tabs driven by the Omnitrix-style dial instead of a bottom bar (matches the website's mobile navigation). */
export default function TabsLayout() {
  const { c } = useTheme();
  // budget overages and recurring bills → phone notifications (one pinned alert; bills at 9 am on their due date)
  const { data: insights, refetch } = useInsights(currentMonth());
  useEffect(() => {
    if (insights) syncAlertNotifications(insights).catch(() => {});
  }, [insights]);
  // opening the app re-checks alerts, which also brings back a pinned alert that was swiped away
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refetch());
    return () => sub.remove();
  }, [refetch]);
  // tapping an ArthOS notification opens the screen it's about (Insights)
  const response = Notifications.useLastNotificationResponse();
  useEffect(() => {
    const route = response?.notification.request.content.data?.route;
    if (typeof route === 'string') router.push(route as never);
  }, [response]);
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
