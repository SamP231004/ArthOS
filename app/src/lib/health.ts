import type { Palette } from '@/theme';

/** Colour for a 0–100 financial-health score (same bands as the website). */
export function healthColor(c: Palette, score: number) {
  return score >= 80 ? c.income : score >= 65 ? c.info : score >= 45 ? c.warn : c.expense;
}
