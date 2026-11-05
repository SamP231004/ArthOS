"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export type DialItem = { href: string; label: string; icon: React.ComponentType<{ size?: number; className?: string }> };

/**
 * Mobile navigation as a dial ("Omnitrix"-style): a round control docked in a half-disc at the bottom shows the
 * current section; tapping it twists open a semicircle of destinations along an arc above it.
 */
export function DialNav({ items, activeHref }: { items: DialItem[]; activeHref: string }) {
  const [open, setOpen] = useState(false);
  const active = items.find((i) => i.href === activeHref) ?? items[0];
  const ActiveIcon = active.icon;
  const R = 150; // arc radius (px): keeps adjacent items + labels clear of each other

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="md:hidden">
      {/* backdrop */}
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-40 bg-bg/70 backdrop-blur-sm transition-opacity duration-300 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />

      <div className="fixed bottom-0 left-1/2 z-50 -translate-x-1/2" style={{ width: Math.min(R * 2 + 80, 390), height: R + 96 }}>
        {/* semicircle face that rises when open */}
        <div
          className={`absolute bottom-0 left-1/2 -translate-x-1/2 rounded-t-full border border-b-0 border-line-strong bg-surface/95 shadow-[0_-20px_60px_-20px_rgb(0_0_0/0.5)] backdrop-blur-xl transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
            open ? "opacity-100" : "opacity-0"
          }`}
          style={{ width: open ? Math.min(R * 2 + 76, 386) : 120, height: open ? R + 74 : 60 }}
        >
          {/* engraved inner arc, like a dial bezel */}
          <div className="absolute inset-x-6 bottom-0 top-6 rounded-t-full border border-b-0 border-dashed border-line" />
        </div>

        {/* destinations along the arc */}
        {items.map((it, i) => {
          const theta = Math.PI - ((i + 0.5) * Math.PI) / items.length; // 180° → 0°, left to right
          const x = Math.cos(theta) * R;
          const y = Math.sin(theta) * R;
          const isActive = it.href === active.href;
          return (
            <Link
              key={it.href}
              href={it.href}
              onClick={() => setOpen(false)}
              aria-label={it.label}
              tabIndex={open ? 0 : -1}
              className="absolute bottom-[34px] left-1/2 flex flex-col items-center gap-1 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
              style={{
                transform: open ? `translate(calc(-50% + ${x}px), ${-y}px) scale(1)` : "translate(-50%, 0) scale(0.3)",
                opacity: open ? 1 : 0,
                transitionDelay: open ? `${i * 35}ms` : "0ms",
                pointerEvents: open ? "auto" : "none",
              }}
            >
              <span className={`grid h-11 w-11 place-items-center rounded-full border transition ${isActive ? "border-brand bg-brand/15 text-brand" : "border-line-strong bg-surface-2 text-fg-2"}`}>
                <it.icon size={18} />
              </span>
              <span className={`whitespace-nowrap text-[10px] font-medium leading-none ${isActive ? "text-brand" : "text-muted"}`}>{it.label}</span>
            </Link>
          );
        })}

        {/* docked half-disc + the dial itself */}
        <div className="absolute bottom-0 left-1/2 h-[46px] w-[132px] -translate-x-1/2 rounded-t-full border border-b-0 border-line-strong bg-surface/90 backdrop-blur-xl" />
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Close navigation" : `Navigation: ${active.label}. Open menu`}
          aria-expanded={open}
          className="absolute bottom-3 left-1/2 grid h-[62px] w-[62px] place-items-center rounded-full btn-primary transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
          style={{ transform: `translateX(-50%) rotate(${open ? 135 : 0}deg)` }}
        >
          {/* segmented bezel */}
          <span className="pointer-events-none absolute inset-[3px] rounded-full border-2 border-dashed border-white/35" />
          <span className="pointer-events-none absolute inset-[9px] rounded-full bg-black/15" />
          <span className="relative" style={{ transform: `rotate(${open ? -135 : 0}deg)`, transition: "transform 500ms" }}>
            {open ? <X size={22} /> : <ActiveIcon size={22} />}
          </span>
        </button>
        {!open && <span className="pointer-events-none absolute bottom-[80px] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-line bg-surface/90 px-2 py-0.5 text-[10px] font-medium text-muted backdrop-blur">{active.label}</span>}
      </div>
    </div>
  );
}
