import { num, parseDate, type RawTrade } from "./detect";

/**
 * Reads a CAMS / KFintech Consolidated Account Statement (CAS) from its text — every mutual fund across every platform,
 * with full transaction history. The PDF is opened and its text extracted on the device (pdf.js in the browser, PDFBox
 * on Android); only this text parser runs on it.
 *
 * A scheme block looks like:
 *   Folio No: 12345678 / 90 …
 *   ABC123-Parag Parikh Flexi Cap Fund - Direct Plan Growth - ISIN: INF879O01027 (Advisor: DIRECT) Registrar : CAMS
 *   Opening Unit Balance: 0.000
 *   01-Jan-2024  Purchase - via Internet        5,000.00    85.234    58.6612    85.234
 *   15-Mar-2025  Redemption                    (2,100.00)  (30.000)   70.0000    55.234
 *   Closing Unit Balance: 55.234   NAV on 31-Oct-2026: INR 75.12 …
 */
export type CasResult = { trades: RawTrade[]; schemes: number; openingNotes: string[] };

const TXN = /^(\d{2}-[A-Za-z]{3}-\d{4})\s+(.+?)\s+(\(?-?[\d,]+\.\d+\)?)\s+(\(?-?[\d,]+\.\d+\)?)\s+([\d,]+\.\d+)\s+(\(?-?[\d,]+\.\d+\)?)\s*$/;

export function parseCas(text: string): CasResult {
  const trades: RawTrade[] = [];
  const openingNotes: string[] = [];
  let isin: string | undefined;
  let name: string | undefined;
  let schemes = 0;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+/g, " ").trim();
    if (!line) continue;
    const isinMatch = line.match(/ISIN\s*:?\s*(IN[A-Z0-9]{10})/i);
    if (isinMatch) {
      isin = isinMatch[1].toUpperCase();
      name = line.split(/\s*-?\s*ISIN/i)[0].replace(/^[A-Z0-9]{2,8}-/, "").trim() || undefined;
      schemes++;
      continue;
    }
    const opening = line.match(/Opening Unit Balance\s*:?\s*([\d,]+\.\d+)/i);
    if (opening && isin && (num(opening[1]) ?? 0) > 0) {
      openingNotes.push(`${name ?? isin}: the statement starts with ${opening[1]} units already held — download it "since inception" to include their cost.`);
      continue;
    }
    const t = line.match(TXN);
    if (t && isin) {
      if (/stamp duty|\bstt\b|\btds\b/i.test(t[2])) continue;
      const units = num(t[4]);
      const nav = num(t[5]);
      const date = parseDate(t[1]);
      if (units == null || nav == null || !date || units === 0) continue;
      trades.push({ kind: "trade", isin, name, date, side: units < 0 ? "SELL" : "BUY", quantity: Math.abs(units), price: nav });
    }
  }
  if (!schemes) throw new Error("This doesn't look like a CAMS/KFintech CAS. Request the detailed statement (with transactions) from camsonline.com.");
  return { trades, schemes, openingNotes };
}
