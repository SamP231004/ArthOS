export function money(amount: number | undefined | null, currency = "INR", compact = false): string {
  const value = amount ?? 0;
  return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: compact || Number.isInteger(value) ? 0 : 2,
    notation: compact && Math.abs(value) >= 100000 ? "compact" : "standard",
  }).format(value);
}

export function label(enumValue: string): string {
  const s = enumValue.replace(/_/g, " ").toLowerCase();
  if (s === "emi" || s === "upi") return s.toUpperCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Local date as YYYY-MM-DD (not UTC, which can be off by a day in IST). */
export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function currentMonth(): string {
  return todayISO().slice(0, 7);
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

/** "5 Sept 2025": for dates that may be in another year (trades, maturities). */
export function dateLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function dayLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", { day: "numeric", month: "short", weekday: "short" });
}

/** Short amounts that still move: ₹8.07L, ₹1.23Cr, ₹12.5k, ₹950 — for chart axes, where "₹8L" vs "₹8L" looks flat. */
export function shortMoney(n: number): string {
  const v = Math.abs(n);
  const sign = n < 0 ? "−" : "";
  if (v >= 1e7) return `${sign}₹${(v / 1e7).toFixed(2)}Cr`;
  if (v >= 1e5) return `${sign}₹${(v / 1e5).toFixed(2)}L`;
  if (v >= 1e3) return `${sign}₹${(v / 1e3).toFixed(v >= 1e4 ? 0 : 1)}k`;
  return `${sign}₹${Math.round(v)}`;
}
