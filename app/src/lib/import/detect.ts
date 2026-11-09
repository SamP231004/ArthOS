import type { Table } from "./table";

/**
 * Finds the header row and the meaning of each column in a broker export by name, so Zerodha, Groww, Upstox,
 * Angel One and most other holdings/tradebook files work without a per-broker template. Statements often start with
 * account details (name, client ID, PAN): those rows are skipped, and none of it leaves the device anyway.
 */
export type Side = "BUY" | "SELL";
export type RawHolding = { kind: "holding"; isin?: string; symbol?: string; name?: string; quantity: number; avgPrice: number };
export type RawTrade = { kind: "trade"; isin?: string; symbol?: string; name?: string; date: string; side: Side; quantity: number; price: number };
export type Detected = { kind: "holdings"; rows: RawHolding[] } | { kind: "trades"; rows: RawTrade[] };

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

const SYN = {
  isin: ["isin", "isinnumber", "isincode", "isinno"],
  symbol: ["symbol", "tradingsymbol", "instrument", "scrip", "scripcode", "stocksymbol", "ticker", "nsesymbol", "scripname"],
  name: ["name", "stockname", "companyname", "securityname", "schemename", "fundname", "scheme", "instrumentname", "security", "stock", "company", "fund"],
  quantity: ["quantity", "quantityavailable", "qty", "totalquantity", "units", "balanceunits", "currentunits", "unitsheld", "holdingqty", "netqty", "availableqty", "shares", "noofshares", "closingbalanceunits"],
  avg: ["averageprice", "avgprice", "averagebuyprice", "avgbuyprice", "avgcost", "averagecost", "buyavg", "buyaverage", "averagenav", "avgnav", "purchaseprice", "costprice", "avgcostprice", "averagepurchaseprice", "buyprice"],
  invested: ["buyvalue", "investedvalue", "invested", "investedamount", "costvalue", "totalcost", "purchasevalue", "amountinvested", "investment", "investmentvalue"],
  date: ["tradedate", "date", "transactiondate", "orderexecutiontime", "executiondate", "dateoftransaction", "navdate"],
  side: ["tradetype", "transactiontype", "buysell", "side", "action", "type", "ordertype"],
  price: ["price", "tradeprice", "nav", "rate", "executionprice", "averagetradeprice", "purchasenav"],
  amount: ["amount", "value", "tradevalue", "netamount", "transactionamount"],
} as const;

type Col = keyof typeof SYN;

function findColumns(header: string[]): Partial<Record<Col, number>> {
  const h = header.map(norm);
  const out: Partial<Record<Col, number>> = {};
  (Object.keys(SYN) as Col[]).forEach((key) => {
    for (const syn of SYN[key]) {
      const i = h.findIndex((x, idx) => x === syn && !Object.values(out).includes(idx));
      if (i >= 0) {
        out[key] = i;
        return;
      }
    }
  });
  return out;
}

export function num(raw: string | undefined): number | null {
  if (raw == null) return null;
  let s = String(raw).trim();
  if (!s || s === "-" || s === "--") return null;
  const neg = /^\(.*\)$/.test(s) || s.startsWith("-");
  s = s.replace(/[₹,\s()]/g, "").replace(/^-/, "").replace(/^rs\.?/i, "").replace(/^inr/i, "");
  if (!/^\d*\.?\d+(e[+-]?\d+)?$/i.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? (neg ? -n : n) : null;
}

const MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };
const iso = (y: number, m: number, d: number) =>
  y > 1990 && m >= 1 && m <= 12 && d >= 1 && d <= 31 ? `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}` : null;

/** 2024-03-15 · 15-03-2024 · 15/03/24 · 15-Mar-2024 · Mar 15, 2024 · Excel serial 45366 · with or without a time. */
export function parseDate(raw: string | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim();
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return iso(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (m) return iso(+m[3] < 100 ? 2000 + +m[3] : +m[3], +m[2], +m[1]);
  m = s.match(/^(\d{1,2})[-\s/]([A-Za-z]{3,4})[A-Za-z]*[-\s/,]+(\d{2,4})/);
  if (m && MONTHS[m[2].toLowerCase()]) return iso(+m[3] < 100 ? 2000 + +m[3] : +m[3], MONTHS[m[2].toLowerCase()], +m[1]);
  m = s.match(/^([A-Za-z]{3,4})[A-Za-z]*\s+(\d{1,2}),?\s+(\d{4})/);
  if (m && MONTHS[m[1].toLowerCase()]) return iso(+m[3], MONTHS[m[1].toLowerCase()], +m[2]);
  if (/^\d{5}(\.\d+)?$/.test(s)) {
    const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(Number(s)) * 86400000); // Excel serial day
    return iso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  }
  return null;
}

function side(raw: string | undefined): Side | null {
  const s = (raw ?? "").trim().toLowerCase();
  if (!s) return null;
  if (/^(b|buy|purchase|bought)\b|purchase|sip|switch[ -]?in|systematic investment|additional purchase/.test(s)) return "BUY";
  if (/^(s|sell|sold)\b|redeem|redemption|switch[ -]?out|withdraw/.test(s)) return "SELL";
  return null;
}

export function detect(table: Table): Detected {
  const limit = Math.min(table.length, 60);
  let headerAt = -1;
  let cols: Partial<Record<Col, number>> = {};
  for (let i = 0; i < limit; i++) {
    const c = findColumns(table[i]);
    const hasId = c.isin != null || c.symbol != null || c.name != null;
    if (hasId && c.quantity != null) {
      headerAt = i;
      cols = c;
      break;
    }
  }
  if (headerAt < 0) throw new Error("Couldn't find the holdings table in this file. Use the holdings or tradebook export from your broker.");

  const cell = (row: string[], k: Col) => (cols[k] != null ? row[cols[k]!] : undefined);
  const id = (row: string[]) => ({
    isin: (cell(row, "isin") ?? "").toUpperCase().match(/IN[A-Z0-9]{10}/)?.[0],
    symbol: cell(row, "symbol")?.replace(/-(EQ|BE|BZ|SM)$/i, "").trim() || undefined,
    name: cell(row, "name")?.trim() || undefined,
  });
  const body = table.slice(headerAt + 1).filter((r) => r.some((c) => c));

  if (cols.date != null && (cols.side != null || cols.amount != null) && (cols.price != null || cols.amount != null)) {
    const rows: RawTrade[] = [];
    for (const r of body) {
      const ids = id(r);
      const date = parseDate(cell(r, "date"));
      let qty = num(cell(r, "quantity"));
      let price = num(cell(r, "price"));
      const amount = num(cell(r, "amount"));
      let s = side(cell(r, "side"));
      if (!s && qty != null) s = qty < 0 ? "SELL" : "BUY";
      if (qty != null && price == null && amount != null && qty !== 0) price = Math.abs(amount / qty);
      if (!date || !s || qty == null || qty === 0 || price == null || (!ids.isin && !ids.symbol && !ids.name)) continue;
      qty = Math.abs(qty);
      rows.push({ kind: "trade", ...ids, date, side: s, quantity: qty, price: Math.abs(price) });
    }
    if (rows.length) return { kind: "trades", rows };
  }

  const rows: RawHolding[] = [];
  for (const r of body) {
    const ids = id(r);
    const qty = num(cell(r, "quantity"));
    let avg = num(cell(r, "avg"));
    const invested = num(cell(r, "invested"));
    if (avg == null && invested != null && qty) avg = invested / qty;
    if (!qty || qty <= 0 || avg == null || avg < 0 || (!ids.isin && !ids.symbol && !ids.name)) continue;
    if ((ids.name ?? ids.symbol ?? "").toLowerCase().startsWith("total")) continue;
    rows.push({ kind: "holding", ...ids, quantity: qty, avgPrice: avg });
  }
  if (!rows.length) throw new Error("Found the table, but no rows with a quantity and an average price.");
  return { kind: "holdings", rows };
}
