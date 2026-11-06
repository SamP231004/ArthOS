"use client";

import { useSyncExternalStore } from "react";
import { THEME_IDS, THEME_KEY as KEY } from "./theme-script";

export type Theme = (typeof THEME_IDS)[number];

/** Every theme, with the three colours its swatch shows: background, accent, highlight/type. */
export const THEMES: { id: Theme; name: string; scheme: "dark" | "light"; swatch: [string, string, string] }[] = [
  { id: "dark", name: "Forest", scheme: "dark", swatch: ["#06110c", "#a31c1b", "#f2efe8"] },
  { id: "light", name: "Ivory", scheme: "light", swatch: ["#f6f4ef", "#1d4d3b", "#171717"] },
];

const EVENT = "arthos-theme-change";

function read(): Theme {
  const t = document.documentElement.dataset.theme as Theme | undefined;
  return t && (THEME_IDS as readonly string[]).includes(t) ? t : "dark";
}

export function useTheme(): Theme {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener(EVENT, cb);
      return () => window.removeEventListener(EVENT, cb);
    },
    read,
    () => "dark",
  );
}

function apply(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* private mode: theme still applies for this visit */
  }
  window.dispatchEvent(new Event(EVENT));
}

/**
 * Switches theme with a circular reveal that grows from (x, y), the centre of the control,
 * using the View Transitions API. Falls back to an instant switch where unsupported or when the
 * user prefers reduced motion.
 */
export function switchTheme(next: Theme, origin?: { x: number; y: number }) {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!doc.startViewTransition || reduce || !origin) {
    apply(next);
    return;
  }
  const { x, y } = origin;
  const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  const t = doc.startViewTransition(() => apply(next));
  t.ready.then(() => {
    document.documentElement.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
      { duration: 650, easing: "cubic-bezier(0.65, 0, 0.35, 1)", pseudoElement: "::view-transition-new(root)" },
    );
  });
}
