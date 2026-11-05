export function Avatar({ text, income }: { text: string; income?: boolean }) {
  const ch = text.trim().charAt(0).toUpperCase() || "•";
  return (
    <span
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-semibold ring-1 ring-inset ${
        income ? "bg-income/10 text-income ring-income/20" : "bg-fg/[0.04] text-fg-2 ring-fg/10"
      }`}
    >
      {ch}
    </span>
  );
}
