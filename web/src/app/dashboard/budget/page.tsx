"use client";

import { AlertTriangle, CalendarDays, Gauge, Info, Pencil, Repeat, Sparkles, TrendingUp } from "lucide-react";
import { useState } from "react";
import { BudgetCalendar } from "@/components/budget/budget-calendar";
import { BudgetModal } from "@/components/budget/budget-form";
import { explain, MODE_META, STATUS_META, warningFor } from "@/components/budget/budget-meta";
import { MonthPicker } from "@/components/month-picker";
import { PageHeader } from "@/components/page-header";
import { Badge, Button, ErrorNote, Skeleton } from "@/components/ui";
import { useAuth } from "@/lib/auth-store";
import { dayLabel, label, money, monthLabel } from "@/lib/format";
import { useBudget } from "@/lib/queries";
import { useMonth } from "@/lib/ui-store";
import { BUDGET_MODES, type BudgetStatus } from "@/lib/types";

export default function BudgetPage() {
  const month = useMonth();
  const cur = useAuth((s) => s.user?.currency ?? "INR");
  const fmt = (n: number) => money(n, cur);
  const { data: b, isLoading, error } = useBudget(month);
  const [editing, setEditing] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader title="Budget" subtitle="Your month, turned into one simple daily decision.">
        <MonthPicker />
        {b?.configured && (
          <Button variant="secondary" onClick={() => setEditing(true)}>
            <Pencil size={15} /> Edit budget
          </Button>
        )}
      </PageHeader>

      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-96" />
        </div>
      ) : error ? (
        <ErrorNote message={error.message} />
      ) : b && !b.configured ? (
        <Setup onStart={() => setEditing(true)} />
      ) : (
        b && <Configured b={b} fmt={fmt} />
      )}

      <BudgetModal open={editing} onClose={() => setEditing(false)} month={month} current={b} />
    </div>
  );
}

function Setup({ onStart }: { onStart: () => void }) {
  return (
    <div className="panel-glow overflow-hidden p-8 sm:p-12">
      <div className="max-w-xl">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand/10 text-brand">
          <Gauge size={22} />
        </span>
        <h2 className="mt-6 font-display text-4xl tracking-tight">How much can you spend today?</h2>
        <p className="mt-3 text-muted">Set one monthly limit. ArthOS turns it into a daily number that keeps you on track — and adjusts when real life happens.</p>
        <Button size="lg" className="mt-8" onClick={onStart}>Set up my budget</Button>
      </div>
      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {BUDGET_MODES.map((m) => (
          <div key={m} className="panel p-5">
            <p className="font-medium">{MODE_META[m].name}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{MODE_META[m].long}</p>
            <p className="mt-3 text-xs text-subtle">Best for: {MODE_META[m].bestFor.toLowerCase()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Configured({ b, fmt }: { b: BudgetStatus; fmt: (n: number) => string }) {
  const st = STATUS_META[b.status];
  const warn = warningFor(b, fmt);
  const steps = explain(b, fmt);
  const closed = b.daysRemaining === 0;
  const used = Math.min(100, b.usedPct ?? 0);
  const weekly = b.mode === "WEEKLY";

  return (
    <>
      {b.inherited && b.inheritedFrom && (
        <p className="flex items-center gap-2 text-sm text-muted">
          <Repeat size={14} className="text-brand" /> Carried over from {monthLabel(b.inheritedFrom)}. Editing saves it from this month onward.
        </p>
      )}

      {warn && (
        <div className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${b.status === "CAUTION" ? "border-warn/30 bg-warn/[0.08] text-fg-2" : "border-expense/25 bg-expense/[0.07] text-expense"}`}>
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          {warn}
        </div>
      )}

      {/* Hero */}
      <section className="panel-glow overflow-hidden p-6 sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={st.tone}>{st.label}</Badge>
              <Badge>{MODE_META[b.mode].name}</Badge>
            </div>
            <p className="mt-5 text-sm text-muted">
              {closed ? (b.remainingMonth >= 0 ? "Finished under budget by" : "Finished over budget by") : b.status === "UPCOMING" ? "Daily allowance from day 1" : "Safe to spend today"}
            </p>
            <p className={`tabular mt-1 text-5xl font-semibold tracking-tight sm:text-6xl ${!closed && b.todayRemaining === 0 && b.status !== "UPCOMING" ? "text-expense" : "text-silver"}`}>
              {closed ? fmt(Math.abs(b.remainingMonth)) : fmt(b.status === "UPCOMING" ? b.todayAllowance : b.todayRemaining)}
            </p>
            {!closed && b.status !== "UPCOMING" && (
              <p className="mt-2 text-sm text-fg-2">
                {fmt(b.spentToday)} spent of today&apos;s {fmt(b.todayAllowance)}
                {b.mode !== "FIXED_DAILY" && b.todayAllowance !== b.baseDailyAllowance && (
                  <span className={b.todayAllowance > b.baseDailyAllowance ? "text-income" : "text-expense"}>
                    {" "}· {b.todayAllowance > b.baseDailyAllowance ? "+" : "−"}
                    {fmt(Math.abs(b.todayAllowance - b.baseDailyAllowance))} vs the plain {fmt(b.baseDailyAllowance)}/day
                  </span>
                )}
              </p>
            )}

            <div className="mt-7">
              <div className="relative h-2.5 overflow-hidden rounded-full bg-fg/[0.06]">
                <div className={`h-full rounded-full transition-all duration-700 ${used >= 100 ? "bg-expense" : used >= 80 ? "bg-warn" : "bg-income"}`} style={{ width: `${used}%` }} />
                {!closed && <div className="absolute inset-y-0 w-0.5 bg-fg/70" style={{ left: `${b.elapsedPct}%` }} />}
              </div>
              <div className="mt-2 flex justify-between text-xs text-subtle">
                <span>
                  {fmt(b.spentMonth)} of {fmt(b.limit)} · {b.usedPct ?? 0}% used
                </span>
                {!closed && <span>Day {b.dayOfMonth || 1} of {b.daysInMonth} · marker = today</span>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Stat label="Left this month" value={fmt(b.remainingMonth)} tone={b.remainingMonth < 0 ? "text-expense" : ""} sub={closed ? "final" : `${b.daysRemaining} days to go`} />
            <Stat label="Counted spend" value={fmt(b.spentMonth)} sub={b.excludedSpent > 0 ? `+ ${fmt(b.excludedSpent)} fixed, not counted` : "everyday spending"} />
            <Stat
              label={closed ? "Month-end total" : "Projected month-end"}
              value={b.projectedSpend != null ? fmt(b.projectedSpend) : "—"}
              tone={b.projectedSpend != null && b.projectedSpend > b.limit ? "text-expense" : "text-income"}
              sub={
                b.projectedSpend == null
                  ? "starts on day 1"
                  : b.projectedSpend > b.limit
                    ? `${fmt(b.projectedSpend - b.limit)} over ${closed ? "the limit" : "at this pace"}`
                    : closed ? "within the limit" : "within limit at this pace"
              }
            />
            <Stat
              label={weekly ? `Week ${b.week.index} left` : "This week"}
              value={fmt(b.week.remaining)}
              tone={b.week.remaining < 0 ? "text-expense" : ""}
              sub={`${fmt(b.week.spent)} of ${fmt(b.week.allowance)} · ${dayLabel(b.week.start).split(",")[1]?.trim()}–${dayLabel(b.week.end).split(",")[1]?.trim()}`}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        {/* Transparency */}
        <div className="panel p-6">
          <h2 className="flex items-center gap-2 font-medium">
            <Info size={16} className="text-brand" /> {closed ? "How this month added up" : b.status === "UPCOMING" ? "How this month will work" : "How today’s number works"}
          </h2>
          <ol className="mt-5 space-y-4">
            {steps.map((s, i) => (
              <li key={i} className="flex gap-3 text-sm leading-relaxed text-fg-2">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-line-strong font-mono text-[11px] text-muted">{i + 1}</span>
                {s}
              </li>
            ))}
          </ol>
          <div className="mt-6 rounded-xl border border-line bg-fg/[0.02] p-4 text-xs leading-relaxed text-muted">
            <p className="flex items-center gap-1.5 font-medium text-fg-2">
              <Sparkles size={13} className="text-brand" /> {MODE_META[b.mode].name}
            </p>
            <p className="mt-1">{MODE_META[b.mode].long}</p>
            {b.excludedCategories.length > 0 && <p className="mt-2">Not counted: {b.excludedCategories.map(label).join(", ")}.</p>}
          </div>
        </div>

        {/* Calendar */}
        <div className="panel p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-medium">
              <CalendarDays size={16} className="text-brand" /> Day by day
            </h2>
            <span className="flex items-center gap-1.5 text-xs text-subtle">
              <TrendingUp size={13} /> spend vs that day&apos;s allowance
            </span>
          </div>
          <BudgetCalendar b={b} format={fmt} />
        </div>
      </section>
    </>
  );
}

function Stat({ label, value, sub, tone = "" }: { label: string; value: string; sub: string; tone?: string }) {
  return (
    <div className="panel p-4">
      <p className="text-xs text-subtle">{label}</p>
      <p className={`tabular mt-1 text-lg font-semibold tracking-tight sm:text-xl ${tone}`}>{value}</p>
      <p className="mt-0.5 text-[11px] leading-snug text-subtle">{sub}</p>
    </div>
  );
}
