// Shared with web/src/components/budget/budget-meta.ts: keep both copies identical.
import type { BudgetMode, BudgetState, BudgetStatus } from "./types";

export const MODE_META: Record<BudgetMode, { name: string; short: string; long: string; bestFor: string }> = {
  ADAPTIVE_DAILY: {
    name: "Adaptive daily",
    short: "Rebalances every day",
    long: "Spend less and the savings lift every remaining day. Spend more and the rest of the month quietly adjusts.",
    bestFor: "Spending that varies day to day",
  },
  FIXED_DAILY: {
    name: "Fixed daily",
    short: "Same number every day",
    long: "Your monthly limit divided evenly across the month. Yesterday never changes today's number.",
    bestFor: "Strict discipline",
  },
  WEEKLY: {
    name: "Weekly",
    short: "A budget per week",
    long: "Each week gets its share of the month. Within a week, the daily guide adapts to what you've spent.",
    bestFor: "Thinking in short cycles",
  },
};

export type Tone = "income" | "gold" | "expense" | "neutral" | "info";

export const STATUS_META: Record<BudgetState, { label: string; tone: Tone }> = {
  ON_TRACK: { label: "On track", tone: "income" },
  CAUTION: { label: "Close to limit", tone: "gold" },
  OVER: { label: "Over today's allowance", tone: "expense" },
  OVER_MONTH: { label: "Monthly limit exceeded", tone: "expense" },
  UPCOMING: { label: "Upcoming", tone: "neutral" },
  COMPLETED: { label: "Completed within budget", tone: "income" },
};

/** A one-line warning for the states that need attention; null when all is well. */
export function warningFor(b: BudgetStatus, fmt: (n: number) => string): string | null {
  switch (b.status) {
    case "OVER_MONTH":
      return `You're ${fmt(-b.remainingMonth)} over this month's ${fmt(b.limit)} limit.`;
    case "OVER":
      return b.mode === "WEEKLY"
        ? `This week is ${fmt(b.week.spent - b.week.allowance)} over its ${fmt(b.week.allowance)} share.`
        : `Today is ${fmt(b.spentToday - b.todayAllowance)} over its allowance${b.mode === "ADAPTIVE_DAILY" ? " — the remaining days will absorb it." : "."}`;
    case "CAUTION":
      return b.mode === "WEEKLY" ? "You've used over 80% of this week's share." : "You've used over 80% of today's allowance.";
    default:
      return null;
  }
}

/** Plain-language steps showing exactly how today's number was reached. */
export function explain(b: BudgetStatus, fmt: (n: number) => string): string[] {
  const steps: string[] = [`Your monthly limit is ${fmt(b.limit)} across ${b.daysInMonth} days — ${fmt(b.baseDailyAllowance)} a day on average.`];
  if (b.excludedCategories.length) {
    steps.push(`Fixed costs in ${b.excludedCategories.map(titleCase).join(", ")} aren't counted${b.excludedSpent > 0 ? ` (${fmt(b.excludedSpent)} so far)` : ""}.`);
  }
  if (b.status === "UPCOMING") {
    steps.push("This month hasn't started yet; numbers update from day 1.");
    return steps;
  }
  if (b.dayOfMonth === b.daysInMonth && b.daysRemaining === 0) {
    steps.push(`You spent ${fmt(b.spentMonth)} of ${fmt(b.limit)} — ${b.remainingMonth >= 0 ? `${fmt(b.remainingMonth)} under` : `${fmt(-b.remainingMonth)} over`} budget.`);
    return steps;
  }
  switch (b.mode) {
    case "FIXED_DAILY":
      steps.push(`Fixed mode: every day gets the same ${fmt(b.todayAllowance)}, whatever happened before.`);
      break;
    case "ADAPTIVE_DAILY":
      steps.push(`Before today you spent ${fmt(b.spentBeforeToday)}, leaving ${fmt(Math.max(0, b.limit - b.spentBeforeToday))}.`);
      steps.push(`Spread over the ${b.daysRemaining} day${b.daysRemaining === 1 ? "" : "s"} left (including today), that's ${fmt(b.todayAllowance)} for today.`);
      break;
    case "WEEKLY":
      steps.push(`Week ${b.week.index} (${b.week.days} days) gets ${fmt(b.week.allowance)}. You've spent ${fmt(b.week.spent)} of it.`);
      steps.push(`What's left of the week, spread over ${b.week.daysLeft} day${b.week.daysLeft === 1 ? "" : "s"}, gives today's guide of ${fmt(b.todayAllowance)}.`);
      break;
  }
  if (b.spentToday > 0) steps.push(`You've spent ${fmt(b.spentToday)} today, so ${fmt(b.todayRemaining)} is still safe to spend.`);
  return steps;
}

function titleCase(s: string) {
  const t = s.replace(/_/g, " ").toLowerCase();
  return t === "emi" ? "EMI" : t.charAt(0).toUpperCase() + t.slice(1);
}
