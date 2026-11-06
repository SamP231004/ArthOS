import Constants, { ExecutionEnvironment } from 'expo-constants';

import type { ExpenseInput, IncomeInput, ParseResult } from './types';

/**
 * On-device OCR (Google ML Kit, via expo-text-extractor) (blueprint §10): the image is read on the phone and never uploaded — only the
 * extracted text goes to the backend parser. ML Kit isn't part of Expo Go, so it's loaded lazily and only in real
 * (EAS) builds.
 */
export const scanAvailable = Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

type Extractor = { isSupported: boolean; extractTextFromImage: (uri: string) => Promise<string[]> };

/**
 * The extractor takes a content:// URI or a plain filesystem path — not a file:// URI (it would look for a file
 * literally named "file:///…" and fail with "File not found"). Image-picker and share URIs are normalised here.
 */
export function toExtractorPath(uri: string): string {
  if (uri.startsWith('content://')) return uri;
  if (uri.startsWith('file://')) return decodeURIComponent(uri.replace(/^file:\/\//, ''));
  return uri;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * OCR via expo-text-extractor (an Expo module wrapping Google ML Kit on Android). ML Kit's model comes from Google
 * Play services; until it has downloaded, reads fail with a "waiting / download" error — so those are retried for a
 * little while (`onWaiting` lets the screen say so). The model is also requested at install (plugins/with-mlkit-ocr).
 */
export async function readText(uri: string, onWaiting?: () => void): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('expo-text-extractor') as Extractor;
  if (!mod.isSupported) throw new Error('Text recognition is not supported on this device');
  const path = toExtractorPath(uri);
  for (let attempt = 0; ; attempt++) {
    try {
      const lines = await mod.extractTextFromImage(path);
      return lines.join('\n');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (attempt < 6 && /download|waiting|optional module|unavailable/i.test(msg)) {
        onWaiting?.();
        await sleep(2500);
        continue;
      }
      throw e;
    }
  }
}

/** Short, user-facing reason for a failed read (shown under the friendly message so problems can be reported). */
export function readError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  return msg.length > 140 ? `${msg.slice(0, 140)}…` : msg;
}

/** What the form screens receive (as a JSON route param) to open pre-filled for confirmation. */
export type ExpenseDraft = Partial<ExpenseInput>;
export type IncomeDraft = Partial<IncomeInput>;

export function toDraft(r: ParseResult): { kind: 'EXPENSE'; draft: ExpenseDraft } | { kind: 'INCOME'; draft: IncomeDraft } {
  const note = r.reference ? `Ref ${r.reference}` : undefined;
  if (r.kind === 'INCOME') return { kind: 'INCOME', draft: { amount: r.amount, source: r.merchant, type: r.incomeType, date: r.date, note } };
  return { kind: 'EXPENSE', draft: { amount: r.amount, merchant: r.merchant, category: r.category ?? undefined, paymentSource: r.paymentSource, date: r.date, note } };
}

export function parseDraft<T>(raw?: string | string[]): T | undefined {
  const s = Array.isArray(raw) ? raw[0] : raw;
  if (!s) return undefined;
  try {
    return JSON.parse(s) as T;
  } catch {
    return undefined;
  }
}
