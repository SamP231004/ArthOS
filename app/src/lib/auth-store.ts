import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

import type { User } from './types';

// JWT lives in the Android Keystore-backed SecureStore; web preview falls back to localStorage.
const secureStorage: StateStorage =
  Platform.OS === 'web'
    ? {
        getItem: (k) => globalThis.localStorage?.getItem(k) ?? null,
        setItem: (k, v) => globalThis.localStorage?.setItem(k, v),
        removeItem: (k) => globalThis.localStorage?.removeItem(k),
      }
    : {
        getItem: (k) => SecureStore.getItemAsync(k),
        setItem: (k, v) => SecureStore.setItemAsync(k, v),
        removeItem: (k) => SecureStore.deleteItemAsync(k),
      };

type AuthState = {
  token: string | null;
  user: User | null;
  hydrated: boolean;
  setSession: (token: string, user: User) => void;
  setUser: (user: User) => void;
  signOut: () => void;
};

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      hydrated: false,
      setSession: (token, user) => set({ token, user }),
      setUser: (user) => set({ user }),
      signOut: () => set({ token: null, user: null }),
    }),
    {
      name: 'arthos-auth',
      storage: createJSONStorage(() => secureStorage),
      partialize: (s) => ({ token: s.token, user: s.user }),
      onRehydrateStorage: () => () => useAuth.setState({ hydrated: true }),
    },
  ),
);
