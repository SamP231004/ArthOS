import { Platform } from 'react-native';

/**
 * Ask Android to redraw ArthOS's home-screen widgets with fresh numbers. Safe to call anywhere and often: it's a no-op
 * off Android or when no widget is placed, and concurrent calls share one refresh. The widget module is required
 * lazily because its native half only exists in Android builds.
 */
let timer: ReturnType<typeof setTimeout> | null = null;

export function scheduleWidgetRefresh(delayMs = 1500) {
  if (Platform.OS !== 'android') return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      (require('./task-handler') as typeof import('./task-handler')).refreshWidgets().catch(() => {});
    } catch {
      // widget module unavailable (e.g. Expo Go)
    }
  }, delayMs);
}
