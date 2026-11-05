"use client";

import Link from "next/link";
import { useState } from "react";
import { MonthPicker } from "@/components/month-picker";
import { ExpenseModal, IncomeModal } from "@/components/transaction-forms";
import { Button, Card, ErrorNote, Spinner } from "@/components/ui";
import { useAuth } from "@/lib/auth-store";
import { dayLabel, label, money } from "@/lib/format";
import { useSummary } from "@/lib/queries";
import { useMonth } from "@/lib/ui-store";
import type { MonthSummary } from "@/lib/types";

export default function Overview() {
  const month = useMonth();
  const user = useAuth((s) => s.user);
  const { data, isLoading, error } = useSummary(month);
  const [modal, setModal] = useState<"income" | "expense" | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">Namaste, {user?.name.split(" ")[0]}</p>
          <h1 className="text-2xl font-semibold tracking-tight">Your month at a glance</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MonthPicker />
          <Button variant="outline" onClick={() => setModal("income")}>+ Income</Button>
          <Button onClick={() => setModal("expense")}>+ Expense</Button>
        </div>
      </div>

      {isLoading ? <Spinner /> : error ? <ErrorNote message={error.message} /> : data && <SummaryView s={data} onAdd={setModal} />}

      <IncomeModal open={modal === "income"} onClose={() => setModal(null)} />
      <ExpenseModal open={modal === "expense"} onClose={() => setModal(null)} />
    </div>
  );
}

function SummaryView({ s, onAdd }: { s: MonthSummary; onAdd: (m: "income" | "expense") => void }) {
  const cur = s.currency;
  const empty = s.incomeCount === 0 && s.expenseCount === 0;
  const spentPct = s.totalIncome > 0 ? Math.min(100, (s.totalExpense / s.totalIncome) * 100) : s.totalExpense > 0 ? 100 : 0;

  return (
    <>
      {/* Primary insight */}
      <Card className="bg-gradient-to-br from-surface to-surface-2 p-6 sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <p className="text-sm text-muted">Remaining this month</p>
            <p className={`tabular mt-1 text-4xl font-semibold sm:text-5xl ${s.net < 0 ? "text-expense" : ""}`}>{money(s.net, cur)}</p>
            <p className="mt-2 text-sm text-muted">{insight(s)}</p>
            <div className="mt-5 h-2 rounded-full bg-bg">
              <div className={`h-2 rounded-full ${spentPct >= 90 ? "bg-expense" : spentPct >= 70 ? "bg-brand" : "bg-income"}`} style={{ width: `${spentPct}%` }} />
            </div>
            <p className="mt-2 text-xs text-muted">{spentPct.toFixed(0)}% of income spent · Budgets arrive in Phase 2</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Income" value={money(s.totalIncome, cur)} tone="text-income" sub={s.incomeTargetProgress != null ? `${s.incomeTargetProgress}% of target` : `${s.incomeCount} entries`} />
            <Stat label="Spent" value={money(s.totalExpense, cur)} tone="text-expense" sub={`${s.expenseCount} entries`} />
            <Stat label="Spent today" value={money(s.todayExpense, cur)} sub={`Avg ${money(s.averageDailyExpense, cur)}/day`} />
            <Stat label="Savings rate" value={s.savingsRate != null ? `${s.savingsRate}%` : "—"} sub="of income kept" />
          </div>
        </div>
      </Card>

      {empty ? (
        <Card className="py-12 text-center">
          <p className="text-lg font-medium">Nothing logged for this month yet</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted">Add your salary or first expense and ArthOS will build your monthly picture.</p>
          <div className="mt-6 flex justify-center gap-2">
            <Button variant="outline" onClick={() => onAdd("income")}>Add income</Button>
            <Button onClick={() => onAdd("expense")}>Add expense</Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold">Where money went</h2>
              <Link href="/dashboard/expenses" className="text-xs text-brand hover:underline">All expenses</Link>
            </div>
            {s.expenseByCategory.length === 0 ? (
              <p className="text-sm text-muted">No spending yet.</p>
            ) : (
              <ul className="space-y-3">
                {s.expenseByCategory.slice(0, 6).map((c) => (
                  <li key={c.category}>
                    <div className="flex justify-between text-sm">
                      <span>{label(c.category)}</span>
                      <span className="tabular text-muted">{money(c.amount, cur)} · {c.share}%</span>
                    </div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-surface-2">
                      <div className="h-1.5 rounded-full bg-expense/80" style={{ width: `${c.share}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="mb-4 font-semibold">Daily spending</h2>
            <DailyBars data={s.dailyExpense} currency={cur} />
          </Card>

          <Card className="lg:col-span-2">
            <h2 className="mb-2 font-semibold">Recent activity</h2>
            <ul className="divide-y divide-border">
              {s.recent.map((r) => (
                <li key={`${r.kind}-${r.id}`} className="flex items-center justify-between gap-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm ${r.kind === "INCOME" ? "bg-income/10 text-income" : "bg-expense/10 text-expense"}`}>
                      {r.kind === "INCOME" ? "↓" : "↑"}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{r.label}</p>
                      <p className="text-xs text-muted">{label(r.tag)} · {dayLabel(r.date)}</p>
                    </div>
                  </div>
                  <span className={`tabular text-sm font-medium ${r.kind === "INCOME" ? "text-income" : ""}`}>
                    {r.kind === "INCOME" ? "+" : "−"}{money(r.amount, cur)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </>
  );
}

function insight(s: MonthSummary): string {
  if (s.incomeCount === 0 && s.expenseCount === 0) return "Start logging to see where your month stands.";
  if (s.totalIncome === 0) return "No income recorded yet this month — add your salary to see what remains.";
  if (s.net < 0) return "You've spent more than you've earned this month.";
  const top = s.expenseByCategory[0];
  if (top && top.share >= 40) return `${label(top.category)} is ${top.share}% of your spending this month.`;
  if (s.savingsRate != null && s.savingsRate >= 30) return `Great pace — you're keeping ${s.savingsRate}% of what you earn.`;
  return `You've kept ${s.savingsRate ?? 0}% of this month's income so far.`;
}

function Stat({ label, value, sub, tone = "" }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-border bg-bg/40 p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className={`tabular mt-1 text-lg font-semibold ${tone}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </div>
  );
}

function DailyBars({ data, currency }: { data: MonthSummary["dailyExpense"]; currency: string }) {
  if (data.length === 0) return <p className="text-sm text-muted">No days elapsed yet.</p>;
  const max = Math.max(...data.map((d) => d.amount), 1);
  return (
    <div className="flex h-40 items-end gap-[3px]">
      {data.map((d) => (
        <div key={d.date} className="group relative flex h-full flex-1 items-end">
          <div
            className="w-full rounded-t bg-brand/70 transition group-hover:bg-brand"
            style={{ height: `${Math.max(2, (d.amount / max) * 100)}%`, opacity: d.amount === 0 ? 0.25 : 1 }}
          />
          <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-surface-2 px-2 py-1 text-xs group-hover:block">
            {dayLabel(d.date)}: {money(d.amount, currency)}
          </span>
        </div>
      ))}
    </div>
  );
}
