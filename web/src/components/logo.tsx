import Link from "next/link";
import { ARTH_OFFSET, ARTH_PATH } from "@/lib/brand";

/**
 * ArthOS mark: "अर्थ" in ivory on a crimson tile. The tile is a CSS gradient (not an SVG <linearGradient>): a gradient
 * id shared by several marks resolves to the first one in the document, and when that copy sits in a hidden sidebar
 * the browser paints no tile at all, leaving the ivory glyph invisible on the light theme.
 */
export function LogoMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      role="img"
      aria-label="अर्थ"
      className={`inline-grid shrink-0 place-items-center ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: (size * 9) / 32,
        background: "linear-gradient(135deg, var(--logo-1) 0%, var(--logo-2) 55%, var(--logo-3) 100%)",
        boxShadow: "inset 0 0 0 0.6px rgb(255 255 255 / 0.16)",
      }}
    >
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
        <path transform={`translate(${ARTH_OFFSET.x} ${ARTH_OFFSET.y})`} fill="var(--logo-fg)" d={ARTH_PATH} />
      </svg>
    </span>
  );
}

export function Logo({ href = "/", size = "md" }: { href?: string; size?: "md" | "lg" }) {
  const lg = size === "lg";
  return (
    <Link href={href} className="group flex items-center gap-2.5" aria-label="ArthOS home">
      <LogoMark size={lg ? 42 : 32} className="transition group-hover:scale-[1.04]" />
      {/* Newsreader's line box sits its ink ~0.12em above centre; measured offset is corrected so the
          letters' ink is centred on the tile (±0.3px at both sizes). */}
      <span className={`font-display leading-none tracking-tight translate-y-[0.115em] ${lg ? "text-[28px]" : "text-[22px]"}`}>
        <span className="text-fg">Arth</span>
        <span className="font-medium text-brand">OS</span>
      </span>
    </Link>
  );
}
