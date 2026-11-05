"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "./types";

type AuthState = {
  token: string | null;
  user: User | null;
  setSession: (token: string, user: User) => void;
  setUser: (user: User) => void;
  signOut: () => void;
};

// Token is kept in localStorage and sent as a Bearer header (the API lives on a different origin).
export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setSession: (token, user) => set({ token, user }),
      setUser: (user) => set({ user }),
      signOut: () => set({ token: null, user: null }),
    }),
    { name: "arthos-auth", partialize: (s) => ({ token: s.token, user: s.user }) },
  ),
);

/**
 * True once the saved session has been read from localStorage. Always false during server rendering, so guarded
 * pages render a neutral loading state on the server and resolve on the client.
 * (localStorage hydration is synchronous and can finish while the store is still being created, so we read
 * zustand's own hydration flag rather than setting state from a rehydrate callback.)
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    (cb) => useAuth.persist.onFinishHydration(cb),
    () => useAuth.persist.hasHydrated(),
    () => false,
  );
}
