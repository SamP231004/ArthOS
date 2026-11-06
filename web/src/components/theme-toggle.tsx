"use client";

import { Check, Palette } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { switchTheme, THEMES, useTheme, type Theme } from "@/lib/theme";

/** Three-stripe swatch of a theme: background, accent, highlight. */
export function ThemeSwatch({
  swatch,
  size = 22,
}: {
  swatch: [string, string, string];
  size?: number;
}) {
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
 * Theme picker: a palette button that opens a small menu of every theme. Choosing one switches with the circular
 * reveal, grown from the button. The menu opens toward whichever side of the screen has room.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{
    top: number;
    left?: number;
    right?: number;
  }>({ top: 0 });
  const btn = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const current = THEMES.find((t) => t.id === theme) ?? THEMES[0];

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) =>
      !menu.current?.contains(e.target as Node) &&
      !btn.current?.contains(e.target as Node) &&
      setOpen(false);
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    // the menu is positioned from the button, so close it if the layout width changes — but not on the height-only
    // resizes mobile browsers fire as their address bar shows and hides
    const width = window.innerWidth;
    const resize = () => window.innerWidth !== width && setOpen(false);
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", key);
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", key);
      window.removeEventListener("resize", resize);
    };
  }, [open]);

  function toggle() {
    const r = btn.current!.getBoundingClientRect();
    const toRight = r.left + r.width / 2 < innerWidth / 2;
    setPos({
      top: r.bottom + 8,
      ...(toRight
        ? { left: Math.max(8, r.left) }
        : { right: Math.max(8, innerWidth - r.right) }),
    });
    setOpen((o) => !o);
  }

  function pick(id: Theme) {
    setOpen(false);
    if (id === theme) return;
    const r = btn.current!.getBoundingClientRect();
    switchTheme(id, { x: r.left + r.width / 2, y: r.top + r.height / 2 });
  }

  return (
    <>
      <button
        ref={btn}
        type="button"
        onClick={toggle}
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-muted transition hover:bg-fg/5 hover:text-fg ${open ? "bg-fg/5 text-fg" : ""} ${className}`}
        aria-label={`Theme: ${current.name}. Change theme`}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Change theme"
      >
        <Palette size={17} />
      </button>
      {/* portalled: the sidebar animates its width and clips, which would trap a fixed menu inside it */}
      {open &&
        createPortal(
          <div
            ref={menu}
            role="menu"
            aria-label="Theme"
            className="fixed z-[60] w-52 animate-sheet rounded-2xl border border-line-strong bg-surface p-1.5 shadow-[0_20px_50px_-12px_rgb(0_0_0/0.55)]"
            style={pos}
          >
            <p className="px-2.5 pb-1 pt-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-subtle">
              Theme
            </p>
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                role="menuitemradio"
                aria-checked={t.id === theme}
                onClick={() => pick(t.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-sm transition hover:bg-fg/5 ${t.id === theme ? "bg-fg/[0.04] text-fg" : "text-fg-2"}`}
              >
                <ThemeSwatch swatch={t.swatch} />
                <span className="flex-1">
                  <span className="block font-medium">{t.name}</span>
                  <span className="block text-[11px] text-subtle">
                    {t.scheme === "light" ? "Light" : "Dark"}
                  </span>
                </span>
                {t.id === theme && <Check size={15} className="text-brand" />}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
