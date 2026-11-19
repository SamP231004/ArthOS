import type { RawHolding, RawTrade } from "./detect";

/**
 * Matches rows from a broker file to instruments ArthOS can price, using the public ISIN index (NSE symbols, AMFI
 * scheme codes) that the device downloads from /api/market/isin-index. Matching runs locally: the file's contents are
 * not sent anywhere to be matched.
 */
export type IsinIndex = { generatedAt: string; eq: [string, string, string][]; mf: [string, string, string][] };

export type ImportLot = { type: "BUY" | "SELL"; date: string; quantity: number; price: number };
export type ImportItem = { assetClass: "STOCK" | "MUTUAL_FUND" | "US_STOCK"; name: string; symbol: string; isin?: string; lots: ImportLot[] };
/** Anything that can resolve a row to an instrument: the ISIN-index matcher, or the US ticker reader. */
type Finder = { find: Matcher["find"] };
export type Unmatched = { label: string; reason: string };

const key = (s: string) =>
  s
    .toLowerCase()
    .replace(/\b(limited|ltd|the|inc|corporation|corp|company|co)\b/g, "")
    .replace(/[^a-z0-9]/g, "");

/**
 * Fund names are written differently everywhere: Groww says "HDFC Multi Cap Fund Direct Growth", AMFI says
 * "HDFC Multi Cap Fund - Direct Plan - Growth Option". Reduce both to base name + plan + option.
 * `explicit` is false when the name doesn't say Direct or Regular (old, merged schemes in AMFI's list).
 */
const OPTION_WORDS = /\b(idcw|dividend|div|payout|reinvestment|reinvest|income|distribution|cum|capital|withdrawal|bonus|daily|weekly|fortnightly|monthly|quarterly|annual|half|yearly)\b/g;
export function fundKey(name: string): { key: string; explicit: boolean } {
  const s = name.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ");
  const direct = /\b(direct|dir)\b/.test(s);
  const explicit = direct || /\b(regular|reg)\b/.test(s);
  const option = /\b(idcw|dividend|div|payout|reinvest\w*|income distribution)\b/.test(s) ? "idcw" : "growth";
  const base = s
    .replace(OPTION_WORDS, " ")
    .replace(/\b(direct|dir|regular|reg|plan|option|opt|growth|gr|fund|scheme|the|mf)\b/g, " ")
    .replace(/\s+/g, "");
  return { key: `${base}|${direct ? "direct" : "regular"}|${option}`, explicit };
}

export class Matcher {
  private eqIsin = new Map<string, [string, string]>();
  private eqSym = new Map<string, [string, string, string]>();
  private eqName = new Map<string, [string, string, string]>();
  private mfIsin = new Map<string, [string, string]>();
  private mfName = new Map<string, [string, string, string]>();
  /** names that don't say Direct/Regular: only used when no current scheme matches */
  private mfLoose = new Map<string, [string, string, string]>();

  constructor(index: IsinIndex) {
    for (const [isin, symbol, name] of index.eq) {
      this.eqIsin.set(isin, [symbol, name]);
      this.eqSym.set(symbol.toUpperCase(), [isin, symbol, name]);
      this.eqName.set(key(name), [isin, symbol, name]);
    }
    for (const [isin, code, name] of index.mf) {
      this.mfIsin.set(isin, [code, name]);
      const f = fundKey(name);
      const map = f.explicit ? this.mfName : this.mfLoose;
      if (!map.has(f.key)) map.set(f.key, [isin, code, name]);
    }
  }

  /** ISIN first (exact), then NSE symbol, then a normalised name. */
  find(r: { isin?: string; symbol?: string; name?: string }): { assetClass: ImportItem["assetClass"]; symbol: string; name: string; isin?: string } | null {
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
      const fk = fundKey(r.name).key;
      const m = this.mfName.get(fk) ?? this.mfLoose.get(fk);
      if (m) return { assetClass: "MUTUAL_FUND", symbol: m[1], name: m[2], isin: m[0] };
    }
    return null;
  }
}

const label = (r: { isin?: string; symbol?: string; name?: string }) => r.name ?? r.symbol ?? r.isin ?? "Unknown";
const round = (n: number, d: number) => Math.round(n * 10 ** d) / 10 ** d;

/** Holdings files have no purchase dates: each holding becomes one purchase at its average price on `since`. */
export function fromHoldings(rows: RawHolding[], m: Finder, since: string): { items: ImportItem[]; unmatched: Unmatched[] } {
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
export function fromTrades(rows: RawTrade[], m: Finder): { items: ImportItem[]; unmatched: Unmatched[]; dropped: number } {
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
      // brokers round units (Groww: 2 decimals), so a full exit can add up to a hair more than was bought
      if (l.quantity > held + 1e-6 && l.quantity <= held + Math.max(0.05, held * 0.001)) l.quantity = round(held, 6);
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

/**
 * US statements (INDmoney, Vested…) name shares by ticker, which the Indian ISIN index doesn't know — take the ticker
 * as it is ("AAPL", or "Apple Inc (AAPL)" when only a name column exists). Prices stay in USD; the server converts
 * each at its date's USD/INR rate.
 */
export const usTickers: Finder = {
  find(r) {
    const fromName = r.name?.match(/\(([A-Z][A-Z.\-]{0,9})\)\s*$/)?.[1];
    const raw = (r.symbol ?? fromName ?? "").toUpperCase().replace(/^(NASDAQ|NYSE|ARCA|AMEX)[:\s]+/, "").replace(/\.(US|O|N)$/, "").trim();
    if (!/^[A-Z][A-Z.\-]{0,9}$/.test(raw)) return null;
    const name = (r.name ?? raw).replace(/\s*\([A-Z.\-]+\)\s*$/, "").trim() || raw;
    return { assetClass: "US_STOCK", symbol: raw, name, isin: r.isin };
  },
};
