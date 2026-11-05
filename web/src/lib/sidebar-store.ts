"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Desktop sidebar collapsed state, remembered per browser. */
export const useSidebar = create<{ collapsed: boolean; toggle: () => void }>()(
  persist((set) => ({ collapsed: false, toggle: () => set((s) => ({ collapsed: !s.collapsed })) }), { name: "arthos-sidebar" }),
);
