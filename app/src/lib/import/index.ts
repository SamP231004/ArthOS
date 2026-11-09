import { parseCas } from "./cas";
import { detect } from "./detect";
import { fromHoldings, fromTrades, Matcher, type ImportItem, type IsinIndex, type Unmatched } from "./match";
import { readTable } from "./table";

/**
 * Import investments from a broker export or a CAS — read and matched entirely on the user's device. The only thing
 * that ever leaves the device is the list of holdings the user confirms, sent to their own ArthOS account (the same
 * as adding them by hand). Shared verbatim by web and app: keep web/src/lib/import and app/src/lib/import in sync.
 */
export type { ImportItem, ImportLot, IsinIndex, Unmatched } from "./match";
export { heldSummary } from "./match";

export type SourceId = "ZERODHA_HOLDINGS" | "ZERODHA_TRADEBOOK" | "GROWW_STOCKS" | "GROWW_MF" | "CAS" | "OTHER";

export const SOURCES: { id: SourceId; name: string; what: string; how: string; accepts: string; exact: boolean }[] = [
  { id: "ZERODHA_HOLDINGS", name: "Zerodha · Holdings", what: "Your current stocks and ETFs", how: "Console → Portfolio → Holdings → Download (Excel or CSV)", accepts: ".xlsx,.csv", exact: false },
  { id: "ZERODHA_TRADEBOOK", name: "Zerodha · Tradebook", what: "Every buy and sell, with dates (most accurate)", how: "Console → Reports → Tradebook → Equity → pick the full date range → Download CSV", accepts: ".csv,.xlsx", exact: true },
  { id: "GROWW_STOCKS", name: "Groww · Stocks", what: "Your current stocks and ETFs", how: "Groww → Reports → Stocks → Holdings statement → Download (Excel)", accepts: ".xlsx,.csv", exact: false },
  { id: "GROWW_MF", name: "Groww · Mutual funds", what: "Your funds — the transactions report keeps dates", how: "Groww → Reports → Mutual funds → Transactions (or Holdings) statement → Download (Excel)", accepts: ".xlsx,.csv", exact: true },
  { id: "CAS", name: "CAS · All mutual funds", what: "Every fund across all apps, with full history", how: "camsonline.com → Investor services → CAS (CAMS + KFintech) → Detailed, since inception → set a password → it arrives by email as a PDF", accepts: ".pdf", exact: true },
  { id: "OTHER", name: "Other broker", what: "Upstox, Angel One, ICICI, HDFC, Kotak and more", how: "Download the holdings (or tradebook) as Excel/CSV — it needs ISIN or symbol, quantity and average price", accepts: ".xlsx,.csv", exact: false },
];

export type Parsed = {
  items: ImportItem[];
  unmatched: Unmatched[];
  /** holdings files have no purchase dates (one purchase per holding on `since`); trades and CAS keep real dates */
  dated: boolean;
  notes: string[];
};

/**
 * @param pdfText extracts text from a (possibly password-protected) PDF on the device; platform-specific
 * @param since   date to use for holdings-only files (no purchase dates in them)
 */
export async function parseImport(
  bytes: Uint8Array,
  filename: string,
  index: IsinIndex,
  opts: { since: string; password?: string; pdfText: (bytes: Uint8Array, password?: string) => Promise<string> },
): Promise<Parsed> {
  const matcher = new Matcher(index);
  const isPdf = filename.toLowerCase().endsWith(".pdf") || (bytes[0] === 0x25 && bytes[1] === 0x50); // "%P"
  if (isPdf) {
    const text = await opts.pdfText(bytes, opts.password);
    const cas = parseCas(text);
    const r = fromTrades(cas.trades, matcher);
    const notes = [...cas.openingNotes];
    if (r.dropped) notes.push(`${r.dropped} redemption(s) were skipped because the statement doesn't include the matching purchases.`);
    return { items: r.items, unmatched: r.unmatched, dated: true, notes };
  }
  const d = detect(readTable(bytes, filename));
  if (d.kind === "trades") {
    const r = fromTrades(d.rows, matcher);
    const notes = r.dropped ? [`${r.dropped} sell(s) were skipped because the file doesn't include the matching buys — export the full date range.`] : [];
    return { items: r.items, unmatched: r.unmatched, dated: true, notes };
  }
  const r = fromHoldings(d.rows, matcher, opts.since);
  return { items: r.items, unmatched: r.unmatched, dated: false, notes: [] };
}

/** Re-date every purchase in a holdings-only import (the "held since" picker in the preview). */
export function withSince(items: ImportItem[], since: string): ImportItem[] {
  return items.map((i) => ({ ...i, lots: i.lots.map((l) => ({ ...l, date: since })) }));
}
