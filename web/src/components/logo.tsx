import Link from "next/link";
import { ARTH_OFFSET, ARTH_PATH } from "@/lib/brand";

/** ArthOS mark: "अर्थ" in ivory on a crimson tile. Outlined SVG, so it is identical at every size and theme. */
export function LogoMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={`shrink-0 ${className}`} role="img" aria-label="अर्थ">
      <defs>
        <linearGradient id="arthos-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#c43a35" />
          <stop offset="0.55" stopColor="#a31c1b" />
          <stop offset="1" stopColor="#6e1110" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#arthos-mark)" />
      <rect x="0.3" y="0.3" width="31.4" height="31.4" rx="8.7" fill="none" stroke="#fff" strokeOpacity="0.16" strokeWidth="0.6" />
      <path transform={`translate(${ARTH_OFFSET.x} ${ARTH_OFFSET.y})`} fill="#fff7f3" d={ARTH_PATH} />
    </svg>
  );
}

export function Logo({ href = "/", size = "md" }: { href?: string; size?: "md" | "lg" }) {
  const lg = size === "lg";
  return (
    <Link href={href} className="group flex items-center gap-2.5" aria-label="ArthOS home">
      <LogoMark size={lg ? 42 : 32} className="transition group-hover:scale-[1.04]" />
      <span className={`font-display leading-none tracking-tight translate-y-[-0.06em] ${lg ? "text-[28px]" : "text-[22px]"}`}>
        <span className="text-fg">Arth</span>
        <span className="font-medium text-brand">OS</span>
      </span>
    </Link>
  );
}
