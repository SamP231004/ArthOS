import Link from "next/link";

export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <span
      className={`${className} relative grid shrink-0 place-items-center overflow-hidden rounded-[10px] font-deva text-[15px] font-semibold text-brand-fg`}
      style={{
        background: "linear-gradient(160deg, var(--gold-1), var(--gold-2) 50%, var(--gold-3))",
        boxShadow: "inset 0 1px 0 rgb(255 255 255 / .6), 0 6px 20px -6px rgb(227 191 118 / .6)",
      }}
      aria-hidden
    >
      अ
    </span>
  );
}

export function Logo({ href = "/", size = "md" }: { href?: string; size?: "md" | "lg" }) {
  return (
    <Link href={href} className="group flex items-center gap-2.5" aria-label="ArthOS home">
      <LogoMark className={size === "lg" ? "h-10 w-10 text-lg" : "h-8 w-8"} />
      <span className={`font-semibold tracking-tight ${size === "lg" ? "text-2xl" : "text-[17px]"}`}>
        Arth<span className="text-gold">OS</span>
      </span>
    </Link>
  );
}
