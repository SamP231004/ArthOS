import Constants, { ExecutionEnvironment } from 'expo-constants';

import { ArthosOcrModule } from '../../modules/arthos-ocr';
import type { ExpenseInput, IncomeInput, ParseResult } from './types';

/**
 * On-device OCR with Google ML Kit (blueprint §10): the image is read on the phone and never uploaded — only the
 * extracted text goes to the backend parser. The native module isn't in Expo Go, so scanning needs a real (EAS) build.
 */
export const scanAvailable = Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

/**
 * OCR with ArthOS's own native module (modules/arthos-ocr): Google ML Kit's bundled Latin recogniser — the model ships
 * in the APK, so it works offline with no first-use download. Accepts content://, file:// or plain paths.
 */
export async function readText(uri: string): Promise<string> {
  if (!ArthosOcrModule) throw new Error('Text recognition is not available in this build');
  return ArthosOcrModule.recognize(uri);
}

/** Short, user-facing reason for a failed read (shown under the friendly message so problems can be reported). */
export function readError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  return msg.length > 320 ? `${msg.slice(0, 320)}…` : msg;
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
