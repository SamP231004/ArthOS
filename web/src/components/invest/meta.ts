import { ChartLine, ChartPie, Coins, Landmark } from "lucide-react";
import type { AssetClass, Horizon, HoldingView, PriceSource } from "@/lib/types";

export const CLASS_META: Record<AssetClass, { label: string; plural: string; addTitle: string; unit: string; color: string; icon: typeof Coins; blurb: string }> = {
  STOCK: { label: "Stock / ETF", plural: "Stocks & ETFs", addTitle: "Add a stock or ETF", unit: "shares", color: "var(--c1)", icon: ChartLine, blurb: "NSE & BSE equities and ETFs, priced live" },
  MUTUAL_FUND: { label: "Mutual fund", plural: "Mutual funds", addTitle: "Add a mutual fund", unit: "units", color: "var(--c3)", icon: ChartPie, blurb: "Any AMFI scheme — SIPs or lump sums, with XIRR" },
  GOLD: { label: "Gold", plural: "Gold", addTitle: "Add gold", unit: "g", color: "var(--c2)", icon: Coins, blurb: "Digital, physical or Sovereign Gold Bonds by weight" },
  BOND: { label: "Bond", plural: "Bonds", addTitle: "Add a bond", unit: "bonds", color: "var(--c4)", icon: Landmark, blurb: "G-Secs and corporate bonds with coupon & maturity" },
};

export const HORIZON_META: Record<Horizon | "NONE", { label: string; hint: string }> = {
  SHORT: { label: "Short term", hint: "under 1 year" },
  MEDIUM: { label: "Medium term", hint: "1–5 years" },
  LONG: { label: "Long term", hint: "5+ years" },
  NONE: { label: "No horizon set", hint: "" },
};

export const SOURCE_LABEL: Record<PriceSource, string> = {
  LIVE: "Live",
  MANUAL: "Manual price",
  FACE_VALUE: "Face value",
  COST: "Last trade price",
};

/** One-line description under a holding's name. */
export function holdingSubtitle(h: HoldingView): string {
  switch (h.assetClass) {
    case "STOCK":
      return `${fmtQty(h.quantity)} shares · ${h.symbol?.replace(/\.(NS|BO)$/, "")}${h.exchange ? ` · ${h.exchange}` : ""}`;
    case "MUTUAL_FUND":
      return `${fmtQty(h.quantity)} units · NAV ${h.price.toFixed(2)}`;
    case "GOLD":
      return `${fmtQty(h.gold?.grams ?? h.quantity)} g · ${h.gold?.form === "SGB" ? "Sovereign Gold Bond" : h.gold?.form === "PHYSICAL" ? "Physical" : "Digital"} · ${h.gold?.purity === "K22" ? "22K" : "24K"}`;
    case "BOND":
      return h.bond
        ? `${fmtQty(h.quantity)} × ${h.bond.faceValue} face · ${h.bond.couponRate}% · matures ${new Date(h.bond.maturityDate + "T00:00:00").toLocaleDateString("en-IN", { month: "short", year: "numeric" })}`
        : `${fmtQty(h.quantity)} bonds`;
  }
}

export function fmtQty(n: number): string {
  return Number.isInteger(n) ? n.toLocaleString("en-IN") : n.toLocaleString("en-IN", { maximumFractionDigits: 3 });
}

export function signedPct(n?: number | null): string {
  if (n == null) return "—";
  return `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toFixed(2)}%`;
}

export function tone(n?: number | null): string {
  if (n == null || n === 0) return "text-muted";
  return n > 0 ? "text-income" : "text-expense";
}
