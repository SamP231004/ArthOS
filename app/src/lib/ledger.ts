import { EXPENSE_CATEGORIES, INCOME_TYPES } from './types';
import type { Palette } from '@/theme';

/** Shared helpers for the Income and Expenses tabs — mirrors web/src/components/ledger.tsx. */

const SLOTS = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8'] as const;

/** Chart colour for an expense category or income type, the same slot the website uses. */
export function tagColor(c: Palette, kind: 'INCOME' | 'EXPENSE', tag: string): string {
  const list: readonly string[] = kind === 'INCOME' ? INCOME_TYPES : EXPENSE_CATEGORIES;
  return c[SLOTS[Math.max(0, list.indexOf(tag)) % 8]];
}

export function initials(name: string): string {
  const w = name.replace(/[^A-Za-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
  return ((w[0]?.[0] ?? '') + (w[1]?.[0] ?? w[0]?.[1] ?? '')).toUpperCase() || '•';
}

/** Same day in `month` as `prevDate`, clamped to the month length and to today (for re-logging recurring entries). */
export function sameDayIn(month: string, prevDate: string, today: string): string {
  const [y, m] = month.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  const day = Math.min(Number(prevDate.slice(8, 10)), last);
  const iso = `${month}-${String(day).padStart(2, '0')}`;
  return iso > today ? today : iso;
}

export function pctChange(now: number, before: number): { text: string; up: boolean } | null {
  if (!before) return null;
  const p = ((now - before) / before) * 100;
  return { text: `${p >= 0 ? '▲' : '▼'} ${Math.abs(p).toFixed(0)}% vs last month`, up: p >= 0 };
}
