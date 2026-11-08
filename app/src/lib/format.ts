export function money(amount: number | undefined | null, currency = "INR", compact = false): string {
  const value = amount ?? 0;
  const locale = currency === "INR" ? "en-IN" : "en-US";
  if (compact && Math.abs(value) >= 100000) return compactMoney(value, currency, locale);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: compact || Number.isInteger(value) ? 0 : 2,
  }).format(value);
}

/**
 * ₹8.2L / ₹1.4Cr (INR) or $1.2M (others), built by hand: Hermes only honours Intl's `notation: "compact"` on
 * Android 11+, so older phones would otherwise show the full number.
 */
function compactMoney(value: number, currency: string, locale: string): string {
  const abs = Math.abs(value);
  const units: [number, string][] = currency === "INR" ? [[1e7, "Cr"], [1e5, "L"]] : [[1e9, "B"], [1e6, "M"], [1e3, "K"]];
  const [size, suffix] = units.find(([n]) => abs >= n) ?? [1, ""];
  const scaled = abs / size;
  const digits = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
  const symbol = new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(0).replace(/[\d.,\s]/g, "");
  const n = Number(scaled.toFixed(digits)).toString();
  return `${value < 0 ? "−" : ""}${symbol}${n}${suffix}`;
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
