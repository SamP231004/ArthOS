import { unzipSync, strFromU8 } from "fflate";

/**
 * Turns a CSV or Excel (.xlsx) file into rows of cells, entirely in memory on the user's device. Excel files are zip
 * archives of XML, so they're read with a tiny unzip + XML scan rather than a full spreadsheet library.
 * Shared verbatim by the website and the Android app (keep app/src/lib/import in sync).
 */
export type Table = string[][];

export function readTable(bytes: Uint8Array, filename: string): Table {
  const lower = filename.toLowerCase();
  const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b; // "PK"
  if (lower.endsWith(".xlsx") || isZip) return readXlsx(bytes);
  if (lower.endsWith(".xls")) throw new Error("Old .xls files aren't supported — open it and save as .xlsx or .csv.");
  return readCsv(decodeText(bytes));
}

export function decodeText(bytes: Uint8Array): string {
  let text = strFromU8(bytes); // UTF-8, with a fallback where TextDecoder is missing (older Hermes)
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // BOM
  return text;
}

/** RFC-4180-ish CSV: quoted fields, escaped quotes, commas or semicolons or tabs as separators. */
export function readCsv(text: string): Table {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const sep = [",", ";", "\t"].reduce((best, s) => (firstLine.split(s).length > firstLine.split(best).length ? s : best), ",");
  const rows: Table = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.map((r) => r.map((c) => c.trim()));
}

const decodeXml = (s: string) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/&amp;/g, "&");

/** Column letters → 0-based index ("A" → 0, "AB" → 27). */
function colIndex(ref: string): number {
  const letters = ref.replace(/[0-9]/g, "");
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

export function readXlsx(bytes: Uint8Array): Table {
  const files = unzipSync(bytes, { filter: (f) => f.name.startsWith("xl/") });
  const read = (name: string) => (files[name] ? strFromU8(files[name]) : "");
  const shared: string[] = [];
  const sst = read("xl/sharedStrings.xml");
  for (const si of sst.match(/<si>[\s\S]*?<\/si>/g) ?? []) {
    shared.push(decodeXml((si.match(/<t[^>]*>([\s\S]*?)<\/t>/g) ?? []).map((t) => t.replace(/<[^>]+>/g, "")).join("")));
  }
  // first worksheet in workbook order
  const wb = read("xl/workbook.xml");
  const rels = read("xl/_rels/workbook.xml.rels");
  const firstId = wb.match(/<sheet [^>]*r:id="([^"]+)"/)?.[1];
  const target = firstId ? rels.match(new RegExp(`Id="${firstId}"[^>]*Target="([^"]+)"`))?.[1] ?? rels.match(new RegExp(`Target="([^"]+)"[^>]*Id="${firstId}"`))?.[1] : undefined;
  const sheetPath = target ? (target.startsWith("/") ? target.slice(1) : `xl/${target.replace(/^\.\//, "")}`) : "xl/worksheets/sheet1.xml";
  const sheet = read(sheetPath) || read("xl/worksheets/sheet1.xml");
  if (!sheet) throw new Error("Couldn't find a worksheet in this Excel file.");

  const rows: Table = [];
  for (const r of sheet.match(/<row[^>]*>[\s\S]*?<\/row>/g) ?? []) {
    const cells: string[] = [];
    for (const c of r.match(/<c [^>]*?(?:\/>|>[\s\S]*?<\/c>)/g) ?? []) {
      const ref = c.match(/ r="([A-Z]+\d+)"/)?.[1];
      const type = c.match(/ t="([^"]+)"/)?.[1];
      const v = c.match(/<v>([\s\S]*?)<\/v>/)?.[1];
      let value = "";
      if (type === "s" && v != null) value = shared[Number(v)] ?? "";
      else if (type === "inlineStr") value = decodeXml((c.match(/<t[^>]*>([\s\S]*?)<\/t>/)?.[1] ?? "").replace(/<[^>]+>/g, ""));
      else if (v != null) value = decodeXml(v);
      const idx = ref ? colIndex(ref) : cells.length;
      while (cells.length < idx) cells.push("");
      cells[idx] = value.trim();
    }
    rows.push(cells);
  }
  return rows;
}
