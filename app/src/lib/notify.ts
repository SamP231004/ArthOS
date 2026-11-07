import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { Insights } from './types';

/**
 * Turns insights alerts into phone notifications (blueprint §16: "notifications for budget overages and recurring
 * payments"), all local — no push server:
 * - urgent alerts (over budget, on pace to overspend, savings overdrawn) notify once, when they first appear;
 * - recurring bills due soon are scheduled for 9 am on their due date, so they fire even if the app is closed;
 * - each alert is notified at most once (its key is remembered on the device).
 */
const SEEN = 'arthos-notified-alerts';
const CHANNEL = 'alerts';
let ready: Promise<boolean> | null = null;

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

function prepare(): Promise<boolean> {
  if (!ready) {
    ready = (async () => {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync(CHANNEL, { name: 'Money alerts', importance: AndroidImportance.HIGH });
      }
      const current = await Notifications.getPermissionsAsync();
      if (current.granted) return true;
      if (!current.canAskAgain) return false;
      return (await Notifications.requestPermissionsAsync()).granted;
    })().catch(() => false);
  }
  return ready;
}

async function seen(): Promise<string[]> {
  try {
    return JSON.parse((await SecureStore.getItemAsync(SEEN)) ?? '[]');
  } catch {
    return [];
  }
}

export async function syncAlertNotifications(insights: Insights): Promise<void> {
  if (!insights.current || insights.alerts.length === 0) return;
  const done = await seen();
  const fresh = insights.alerts.filter((a) => !done.includes(a.key));
  if (fresh.length === 0 || !(await prepare())) return;

  for (const a of fresh) {
    const content = { title: a.title, body: a.body, data: { route: '/insights' } };
    if (a.dueDate) {
      // 9 am on the due day; if that's already past (due today), notify now
      const [y, m, d] = a.dueDate.split('-').map(Number);
      const at = new Date(y, m - 1, d, 9, 0, 0);
      if (at.getTime() > Date.now() + 60_000) {
        await Notifications.scheduleNotificationAsync({ content, trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL } });
      } else {
        await Notifications.scheduleNotificationAsync({ content, trigger: { channelId: CHANNEL } });
      }
    } else if (a.level !== 'INFO') {
      await Notifications.scheduleNotificationAsync({ content, trigger: { channelId: CHANNEL } });
    }
  }
  const next = [...done, ...fresh.map((a) => a.key)].slice(-200);
  await SecureStore.setItemAsync(SEEN, JSON.stringify(next)).catch(() => {});
}
