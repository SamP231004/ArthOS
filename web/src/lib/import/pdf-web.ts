"use client";

/**
 * Extracts text from a (password-protected) PDF in the browser with pdf.js — the file never leaves the device.
 * Text items are regrouped into lines by their position, so statement rows read left to right.
 * Web only (the Android app uses PDFBox through the arthos-ocr native module).
 */
export class PdfPasswordError extends Error {
  constructor(public readonly wrong: boolean) {
    super(wrong ? "That password didn't open the PDF." : "This PDF is password-protected.");
  }
}

type TextItem = { str: string; transform: number[] };

export async function pdfTextWeb(bytes: Uint8Array, password?: string): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  // copy: pdf.js transfers (detaches) the buffer it's given
  const task = pdfjs.getDocument({ data: bytes.slice(), password: password || undefined });
  let doc;
  try {
    doc = await task.promise;
  } catch (e) {
    const err = e as { name?: string; code?: number };
    if (err?.name === "PasswordException") throw new PdfPasswordError(err.code === 2);
    throw e;
  }
  const out: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const rows = new Map<number, { x: number; s: string }[]>();
    for (const it of content.items as TextItem[]) {
      if (!("str" in it) || !it.str.trim()) continue;
      const y = Math.round(it.transform[5] / 2) * 2; // same baseline within ~2pt → same line
      const x = it.transform[4];
      const line = rows.get(y) ?? [];
      line.push({ x, s: it.str });
      rows.set(y, line);
    }
    [...rows.entries()]
      .sort((a, b) => b[0] - a[0])
      .forEach(([, items]) => out.push(items.sort((a, b) => a.x - b.x).map((i) => i.s.trim()).join(" ")));
  }
  await task.destroy();
  return out.join("\n");
}
