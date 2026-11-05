"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "./types";

type AuthState = {
  token: string | null;
  user: User | null;
  hydrated: boolean;
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
      hydrated: false,
      setSession: (token, user) => set({ token, user }),
      setUser: (user) => set({ user }),
      signOut: () => set({ token: null, user: null }),
    }),
    {
      name: "arthos-auth",
      partialize: (s) => ({ token: s.token, user: s.user }),
      onRehydrateStorage: () => () => useAuth.setState({ hydrated: true }),
    },
  ),
);
