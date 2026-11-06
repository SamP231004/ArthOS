"use client";

import { switchTheme, THEMES, useTheme } from "@/lib/theme";

/** Three-part swatch of a theme: background, accent, highlight. */
export function ThemeSwatch({ swatch, size = 22 }: { swatch: [string, string, string]; size?: number }) {
  return (
    <span
      className="relative inline-block shrink-0 overflow-hidden rounded-full ring-1 ring-fg/15"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(${swatch[0]} 0 50%, ${swatch[1]} 50% 80%, ${swatch[2]} 80% 100%)`,
      }}
      aria-hidden="true"
    />
  );
}

/**
 * Theme button: shows the current theme's swatch, and every click moves on to the next theme
 * (Forest → Ivory → Cobalt → Noir Gold → …) with the circular reveal grown from the button.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const theme = useTheme();
  const i = Math.max(0, THEMES.findIndex((t) => t.id === theme));
  const current = THEMES[i];
  const next = THEMES[(i + 1) % THEMES.length];
  return (
    <button
      type="button"
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        switchTheme(next.id, { x: r.left + r.width / 2, y: r.top + r.height / 2 });
      }}
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl transition hover:bg-fg/5 ${className}`}
      aria-label={`Theme: ${current.name}. Switch to ${next.name}`}
      title={`${current.name} · click for ${next.name}`}
    >
      <span className="transition-transform duration-500 hover:rotate-90">
        <ThemeSwatch swatch={current.swatch} size={20} />
      </span>
    </button>
  );
}
