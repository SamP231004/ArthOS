import Link from "next/link";

export function Logo({ href = "/", size = "md" }: { href?: string; size?: "md" | "lg" }) {
  const box = size === "lg" ? "h-10 w-10 text-lg" : "h-8 w-8 text-sm";
  return (
    <Link href={href} className="flex items-center gap-2.5 font-semibold tracking-tight">
      <span className={`${box} grid place-items-center rounded-xl bg-brand text-brand-fg font-bold`} aria-hidden>
        अ
      </span>
      <span className={size === "lg" ? "text-2xl" : "text-lg"}>
        Arth<span className="text-brand">OS</span>
      </span>
    </Link>
  );
}
