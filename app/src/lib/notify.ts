import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { Insights } from './types';

/**
 * Turns insights alerts into phone notifications (blueprint §16: "notifications for budget overages and recurring
 * payments"), all local — no push server. Every notification is a single line (the alert's `brief`).
 *
 * - Pinned alert (default on): one ongoing notification shows the most urgent alert ("+1 more" when there are
 *   several). "Clear all" doesn't remove it; if it's swiped away (Android 14+ allows that) it comes back the next time
 *   the app syncs, and it disappears on its own once nothing is urgent. It alerts (sound/heads-up) only when a new
 *   alert appears; later refreshes are silent.
 * - Pinning off: each urgent alert notifies once, as a normal dismissible notification.
 * - Recurring bills: scheduled for 9 am on their due date, so they fire even if the app is closed.
 */
const SEEN = 'arthos-notified-alerts';
const PIN_KEY = 'arthos-pin-alerts';
const CHANNEL = 'alerts'; // high importance: heads-up + sound, for anything new
const QUIET = 'status'; // low importance: silent re-posts of the pinned alert
const PINNED_ID = 'arthos-pinned-alert';

type Alert = Insights['alerts'][number];

let ready: Promise<boolean> | null = null;

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

function prepare(): Promise<boolean> {
  if (!ready) {
    ready = (async () => {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync(CHANNEL, { name: 'Money alerts', importance: AndroidImportance.HIGH });
        await Notifications.setNotificationChannelAsync(QUIET, { name: 'Pinned money alert', importance: AndroidImportance.LOW, showBadge: false });
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

const line = (a: Alert) => a.brief ?? a.title;

export async function pinAlertsEnabled(): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(PIN_KEY)) !== 'off';
  } catch {
    return true;
  }
}

export async function setPinAlerts(on: boolean): Promise<void> {
  await SecureStore.setItemAsync(PIN_KEY, on ? 'on' : 'off').catch(() => {});
  if (!on) await Notifications.dismissNotificationAsync(PINNED_ID).catch(() => {});
}

/** Remove the pinned alert (e.g. on sign-out, so the next person on this phone doesn't see it). */
export async function clearAlertNotifications(): Promise<void> {
  await Notifications.dismissNotificationAsync(PINNED_ID).catch(() => {});
}

export async function syncAlertNotifications(insights: Insights): Promise<void> {
  if (!insights.current) return;
  const urgent = insights.alerts.filter((a) => a.level !== 'INFO');
  const pin = await pinAlertsEnabled();
  if (urgent.length === 0) await clearAlertNotifications();

  const done = await seen();
  const fresh = insights.alerts.filter((a) => !done.includes(a.key));
  const needsPost = (pin && urgent.length > 0) || fresh.length > 0;
  if (!needsPost || !(await prepare())) return;

  if (pin && urgent.length > 0) {
    const isNew = urgent.some((a) => !done.includes(a.key));
    await Notifications.scheduleNotificationAsync({
      identifier: PINNED_ID,
      content: {
        title: line(urgent[0]) + (urgent.length > 1 ? ` · +${urgent.length - 1} more` : ''),
        sticky: true,
        autoDismiss: false,
        data: { route: '/insights' },
      },
      trigger: { channelId: isNew ? CHANNEL : QUIET },
    });
  } else if (!pin) {
    await clearAlertNotifications();
    for (const a of fresh.filter((x) => x.level !== 'INFO')) {
      await Notifications.scheduleNotificationAsync({ identifier: a.key, content: { title: line(a), data: { route: '/insights' } }, trigger: { channelId: CHANNEL } });
    }
  }

  for (const a of fresh.filter((x) => x.dueDate)) {
    // 9 am on the due day; if that's already past (due today), notify now
    const [y, m, d] = a.dueDate!.split('-').map(Number);
    const at = new Date(y, m - 1, d, 9, 0, 0);
    const content = { title: line(a), data: { route: '/insights' } };
    const trigger =
      at.getTime() > Date.now() + 60_000
        ? { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL }
        : { channelId: CHANNEL };
    await Notifications.scheduleNotificationAsync({ identifier: `bill-${a.key}`, content, trigger });
  }

  if (fresh.length > 0) {
    const next = [...done, ...fresh.map((a) => a.key)].slice(-200);
    await SecureStore.setItemAsync(SEEN, JSON.stringify(next)).catch(() => {});
  }
}
