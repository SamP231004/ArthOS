"use client";

import { create } from "zustand";
import { currentMonth, shiftMonth } from "./format";

type UiState = {
  /** YYYY-MM shared across dashboard pages; null = current month (resolved lazily to avoid clock reads at import time). */
  month: string | null;
  setMonth: (m: string) => void;
  shift: (delta: number) => void;
};

export const useUi = create<UiState>()((set) => ({
  month: null,
  setMonth: (month) => set({ month }),
  shift: (delta) => set((s) => ({ month: shiftMonth(s.month ?? currentMonth(), delta) })),
}));

export function useMonth(): string {
  return useUi((s) => s.month) ?? currentMonth();
}
