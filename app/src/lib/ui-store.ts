import { create } from 'zustand';

import { currentMonth, shiftMonth } from './format';

type UiState = {
  /** YYYY-MM shared across tabs; null = current month. */
  month: string | null;
  shift: (delta: number) => void;
};

export const useUi = create<UiState>()((set) => ({
  month: null,
  shift: (delta) => set((s) => ({ month: shiftMonth(s.month ?? currentMonth(), delta) })),
}));

export function useMonth(): string {
  return useUi((s) => s.month) ?? currentMonth();
}
