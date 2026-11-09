import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

/** Whether this device has seen the first-run walkthrough (shown before sign-in on first launch). */
const KEY = 'arthos-tour-seen';

type TourState = { seen: boolean | null; load: () => Promise<void>; markSeen: () => void };

export const useTour = create<TourState>((set) => ({
  seen: null,
  load: async () => {
    try {
      set({ seen: (await SecureStore.getItemAsync(KEY)) === '1' });
    } catch {
      set({ seen: true });
    }
  },
  markSeen: () => {
    set({ seen: true });
    SecureStore.setItemAsync(KEY, '1').catch(() => {});
  },
}));
