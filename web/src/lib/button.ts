// Plain module (not "use client") so both server and client components can style links as buttons.
export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md") {
  const v = {
    primary: "btn-gold",
    secondary: "btn-glass",
    ghost: "text-muted hover:text-fg hover:bg-white/5",
    danger: "text-expense hover:bg-expense/10",
  }[variant];
  const s = { sm: "h-8 px-3 text-xs rounded-lg", md: "h-10 px-4 text-sm rounded-xl", lg: "h-12 px-6 text-[15px] rounded-xl" }[size];
  return `inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none ${v} ${s}`;
}
