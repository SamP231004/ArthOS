import Constants, { ExecutionEnvironment } from 'expo-constants';

import type { ExpenseInput, IncomeInput, ParseResult } from './types';

/**
 * On-device OCR (Google ML Kit, via expo-text-extractor) (blueprint §10): the image is read on the phone and never uploaded — only the
 * extracted text goes to the backend parser. ML Kit isn't part of Expo Go, so it's loaded lazily and only in real
 * (EAS) builds.
 */
export const scanAvailable = Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

type Extractor = { isSupported: boolean; extractTextFromImage: (uri: string) => Promise<string[]> };

/** OCR via expo-text-extractor (an Expo module wrapping ML Kit on Android, so it runs on the New Architecture). */
export async function readText(uri: string): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('expo-text-extractor') as Extractor;
  if (!mod.isSupported) throw new Error('Text recognition is not supported on this device');
  const lines = await mod.extractTextFromImage(uri);
  return lines.join('\n');
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
