"use client";

import { ArrowRight, Gauge } from "lucide-react";
import Link from "next/link";
import { STATUS_META, warningFor } from "./budget-meta";
import { Badge, Skeleton } from "../ui";
import { buttonClass } from "@/lib/button";
import { money } from "@/lib/format";
import { useBudget } from "@/lib/queries";

/** Compact "safe to spend today" card for the overview (blueprint §8.3). */
export function BudgetCard({ month, currency }: { month: string; currency: string }) {
  const { data: b, isLoading } = useBudget(month);
  const fmt = (n: number) => money(n, currency);
  if (isLoading) return <Skeleton className="h-36" />;
  if (!b) return null;

  if (!b.configured) {
    return (
      <div className="panel flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
        <div className="flex items-start gap-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand/10 text-brand">
            <Gauge size={20} />
          </span>
          <div>
            <p className="font-medium">Turn your month into one daily number</p>
            <p className="mt-1 text-sm text-muted">Set a monthly limit and ArthOS tells you exactly how much is safe to spend today.</p>
          </div>
        </div>
        <Link href="/dashboard/budget" className={buttonClass("primary")}>
          Set a budget <ArrowRight size={15} />
        </Link>
      </div>
    );
  }

  const st = STATUS_META[b.status];
  const warn = warningFor(b, fmt);
  const used = Math.min(100, b.usedPct ?? 0);
  const closed = b.status === "COMPLETED" || (b.status === "OVER_MONTH" && b.daysRemaining === 0);

  return (
    <Link href="/dashboard/budget" className="panel group block p-6 transition hover:border-line-strong">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-sm text-muted">
            <Gauge size={15} className="text-brand" />
            {closed ? "Month closed" : b.status === "UPCOMING" ? "Daily allowance" : "Safe to spend today"}
          </p>
          <p className="tabular mt-1 text-4xl font-semibold tracking-tight">
            {closed ? fmt(Math.abs(b.remainingMonth)) : fmt(b.status === "UPCOMING" ? b.todayAllowance : b.todayRemaining)}
          </p>
          <p className="mt-1 text-xs text-subtle">
            {closed
              ? b.remainingMonth >= 0 ? "under budget" : "over budget"
              : `of ${fmt(b.todayAllowance)} today · ${fmt(b.remainingMonth)} left this month`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={st.tone}>{st.label}</Badge>
          <ArrowRight size={16} className="text-subtle transition group-hover:translate-x-0.5 group-hover:text-fg" />
        </div>
      </div>
      <div className="mt-5">
        <div className="relative h-2 overflow-hidden rounded-full bg-fg/[0.06]">
          <div className={`h-full rounded-full ${used >= 100 ? "bg-expense" : used >= 80 ? "bg-warn" : "bg-income"}`} style={{ width: `${used}%` }} />
          <div className="absolute inset-y-0 w-0.5 bg-fg/60" style={{ left: `${b.elapsedPct}%` }} title="Today" />
        </div>
        <div className="mt-1.5 flex justify-between text-[11px] text-subtle">
          <span>{b.usedPct ?? 0}% of {fmt(b.limit)} used</span>
          <span>{b.elapsedPct}% of month</span>
        </div>
      </div>
      {warn && <p className="mt-4 rounded-xl border border-expense/20 bg-expense/[0.07] px-3 py-2 text-xs text-expense">{warn}</p>}
    </Link>
  );
}
