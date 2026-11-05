/** Pay-yourself-first rule — mirrors backend/src/main/java/com/arthos/user/SavingsRule.java. */
export type SavingsMode = 'PERCENT' | 'FIXED';
export type SavingsRule = { mode: SavingsMode; value: number };

export const DEFAULT_SAVINGS: SavingsRule = { mode: 'PERCENT', value: 20 };

/** Amount set aside out of `income` received so far (a fixed amount can't exceed what has arrived). */
export function setAside(rule: SavingsRule, income: number): number {
  if (income <= 0 || rule.value <= 0) return 0;
  const v = rule.mode === 'PERCENT' ? (income * Math.min(rule.value, 100)) / 100 : Math.min(rule.value, income);
  return Math.round(v * 100) / 100;
}

export function ruleLabel(rule: SavingsRule, fmt: (n: number) => string): string {
  return rule.mode === 'PERCENT' ? `${rule.value}% of income` : `${fmt(rule.value)} a month`;
}
