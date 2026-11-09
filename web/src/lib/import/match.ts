import type { RawHolding, RawTrade } from "./detect";

/**
 * Matches rows from a broker file to instruments ArthOS can price, using the public ISIN index (NSE symbols, AMFI
 * scheme codes) that the device downloads from /api/market/isin-index. Matching runs locally: the file's contents are
 * not sent anywhere to be matched.
 */
export type IsinIndex = { generatedAt: string; eq: [string, string, string][]; mf: [string, string, string][] };

export type ImportLot = { type: "BUY" | "SELL"; date: string; quantity: number; price: number };
export type ImportItem = { assetClass: "STOCK" | "MUTUAL_FUND"; name: string; symbol: string; isin?: string; lots: ImportLot[] };
export type Unmatched = { label: string; reason: string };

const key = (s: string) =>
  s
    .toLowerCase()
    .replace(/\b(limited|ltd|the|inc|corporation|corp|company|co)\b/g, "")
    .replace(/[^a-z0-9]/g, "");

export class Matcher {
  private eqIsin = new Map<string, [string, string]>();
  private eqSym = new Map<string, [string, string, string]>();
  private eqName = new Map<string, [string, string, string]>();
  private mfIsin = new Map<string, [string, string]>();
  private mfName = new Map<string, [string, string, string]>();

  constructor(index: IsinIndex) {
    for (const [isin, symbol, name] of index.eq) {
      this.eqIsin.set(isin, [symbol, name]);
      this.eqSym.set(symbol.toUpperCase(), [isin, symbol, name]);
      this.eqName.set(key(name), [isin, symbol, name]);
    }
    for (const [isin, code, name] of index.mf) {
      this.mfIsin.set(isin, [code, name]);
      if (!this.mfName.has(key(name))) this.mfName.set(key(name), [isin, code, name]);
    }
  }

  /** ISIN first (exact), then NSE symbol, then a normalised name. */
  find(r: { isin?: string; symbol?: string; name?: string }): { assetClass: ImportItem["assetClass"]; symbol: string; name: string; isin: string } | null {
    if (r.isin) {
      const e = this.eqIsin.get(r.isin);
      if (e) return { assetClass: "STOCK", symbol: `${e[0]}.NS`, name: e[1], isin: r.isin };
      const m = this.mfIsin.get(r.isin);
      if (m) return { assetClass: "MUTUAL_FUND", symbol: m[0], name: m[1], isin: r.isin };
    }
    if (r.symbol) {
      const e = this.eqSym.get(r.symbol.toUpperCase().replace(/\.(NS|BO)$/, ""));
      if (e) return { assetClass: "STOCK", symbol: `${e[1]}.NS`, name: e[2], isin: e[0] };
    }
    if (r.name) {
      const k = key(r.name);
      const e = this.eqName.get(k);
      if (e) return { assetClass: "STOCK", symbol: `${e[1]}.NS`, name: e[2], isin: e[0] };
      const m = this.mfName.get(k);
      if (m) return { assetClass: "MUTUAL_FUND", symbol: m[1], name: m[2], isin: m[0] };
    }
    return null;
  }
}

const label = (r: { isin?: string; symbol?: string; name?: string }) => r.name ?? r.symbol ?? r.isin ?? "Unknown";
const round = (n: number, d: number) => Math.round(n * 10 ** d) / 10 ** d;

/** Holdings files have no purchase dates: each holding becomes one purchase at its average price on `since`. */
export function fromHoldings(rows: RawHolding[], m: Matcher, since: string): { items: ImportItem[]; unmatched: Unmatched[] } {
  const byKey = new Map<string, ImportItem>();
  const unmatched: Unmatched[] = [];
  for (const r of rows) {
    const hit = m.find(r);
    if (!hit) {
      unmatched.push({ label: label(r), reason: "Not found on NSE or in AMFI's fund list" });
      continue;
    }
    const k = `${hit.assetClass}:${hit.symbol}`;
    const item = byKey.get(k) ?? { assetClass: hit.assetClass, name: hit.name, symbol: hit.symbol, isin: hit.isin, lots: [] };
    item.lots.push({ type: "BUY", date: since, quantity: round(r.quantity, 6), price: round(r.avgPrice, 4) });
    byKey.set(k, item);
  }
  return { items: [...byKey.values()], unmatched };
}

/** Trades keep their real dates, so P&L and XIRR are exact. Sells beyond what the file bought are dropped. */
export function fromTrades(rows: RawTrade[], m: Matcher): { items: ImportItem[]; unmatched: Unmatched[]; dropped: number } {
  const byKey = new Map<string, ImportItem>();
  const unmatched = new Map<string, Unmatched>();
  for (const r of rows) {
    const hit = m.find(r);
    if (!hit) {
      unmatched.set(label(r), { label: label(r), reason: "Not found on NSE or in AMFI's fund list" });
      continue;
    }
    const k = `${hit.assetClass}:${hit.symbol}`;
    const item = byKey.get(k) ?? { assetClass: hit.assetClass, name: hit.name, symbol: hit.symbol, isin: hit.isin, lots: [] };
    item.lots.push({ type: r.side, date: r.date, quantity: round(r.quantity, 6), price: round(r.price, 4) });
    byKey.set(k, item);
  }
  let dropped = 0;
  const items: ImportItem[] = [];
  for (const item of byKey.values()) {
    item.lots.sort((a, b) => (a.date === b.date ? (a.type === "BUY" ? -1 : 1) : a.date < b.date ? -1 : 1));
    let held = 0;
    item.lots = item.lots.filter((l) => {
      if (l.type === "BUY") {
        held += l.quantity;
        return true;
      }
      if (l.quantity > held + 1e-6) {
        dropped++;
        return false;
      }
      held -= l.quantity;
      return true;
    });
    if (item.lots.some((l) => l.type === "BUY")) items.push(item);
  }
  return { items, unmatched: [...unmatched.values()], dropped };
}

/** Invested amount still held (average cost), for the preview. */
export function heldSummary(item: ImportItem) {
  let qty = 0;
  let cost = 0;
  for (const l of item.lots) {
    if (l.type === "BUY") {
      qty += l.quantity;
      cost += l.quantity * l.price;
    } else if (qty > 0) {
      cost -= (cost / qty) * l.quantity;
      qty -= l.quantity;
    }
  }
  return { quantity: round(qty, 4), invested: Math.max(0, round(cost, 2)), avg: qty > 0 ? round(cost / qty, 2) : 0 };
}
