"use client";

import { ArrowDownLeft, ArrowRight, ArrowUpRight, PiggyBank, Plus, Receipt, Sparkles, Wallet } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Avatar } from "@/components/avatar";
import { BudgetCard } from "@/components/budget/budget-card";
import { PortfolioCard } from "@/components/invest/portfolio-card";
import { CATEGORY_COLORS, DailyBars, Donut, Sparkline, SpendCurve } from "@/components/charts";
import { MonthPicker } from "@/components/month-picker";
import { ExpenseModal, IncomeModal } from "@/components/transaction-forms";
import { Badge, Button, ErrorNote, Skeleton } from "@/components/ui";
import { useAuth } from "@/lib/auth-store";
import { dayLabel, label, money } from "@/lib/format";
import { useSummary } from "@/lib/queries";
import { useMonth } from "@/lib/ui-store";
import type { MonthSummary } from "@/lib/types";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default function Overview() {
  const month = useMonth();
  const user = useAuth((s) => s.user);
  const { data, isLoading, error } = useSummary(month);
  const [modal, setModal] = useState<"income" | "expense" | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="animate-fade-up">
          <p className="text-sm text-subtle">{greeting()},</p>
          <h1 className="font-display text-4xl tracking-tight sm:text-[2.75rem]">{user?.name.split(" ")[0]}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MonthPicker />
          <Button variant="secondary" onClick={() => setModal("income")}>
            <ArrowDownLeft size={16} className="text-income" /> Income
          </Button>
          <Button onClick={() => setModal("expense")}>
            <Plus size={16} /> Expense
          </Button>
        </div>
      </div>

      {isLoading ? <LoadingState /> : error ? <ErrorNote message={error.message} /> : data && <SummaryView s={data} onAdd={setModal} />}

      <IncomeModal open={modal === "income"} onClose={() => setModal(null)} />
      <ExpenseModal open={modal === "expense"} onClose={() => setModal(null)} />
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-72" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    </div>
  );
}

function SummaryView({ s, onAdd }: { s: MonthSummary; onAdd: (m: "income" | "expense") => void }) {
  const cur = s.currency;
  const fmt = (n: number) => money(n, cur);
  const empty = s.incomeCount === 0 && s.expenseCount === 0;
  const spentPct = s.totalIncome > 0 ? Math.min(100, (s.totalExpense / s.totalIncome) * 100) : s.totalExpense > 0 ? 100 : 0;
  const monthPct = (s.daysElapsed / s.daysInMonth) * 100;
  const [whole, paise] = fmt(s.net).split(".");

  if (empty) {
    return (
      <div className="panel-glow px-6 py-20 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand/10 text-brand">
          <Wallet size={24} />
        </span>
        <h2 className="mt-6 font-display text-3xl">A blank page for your month</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted">Add your salary or first expense and ArthOS will build your monthly picture instantly.</p>
        <div className="mt-8 flex justify-center gap-2">
          <Button variant="secondary" onClick={() => onAdd("income")}>Add income</Button>
          <Button onClick={() => onAdd("expense")}>Add expense</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Hero */}
      <section className="panel-glow overflow-hidden p-6 sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.35fr] lg:items-center">
          <div>
            <p className="text-sm text-muted">Remaining this month</p>
            <p className={`tabular mt-2 text-5xl font-semibold tracking-tight sm:text-6xl ${s.net < 0 ? "text-expense" : "text-silver"}`}>
              {whole}
              {paise && <span className="text-2xl text-subtle">.{paise}</span>}
            </p>
            <p className="mt-4 flex items-start gap-2 text-sm leading-relaxed text-fg-2">
              <Sparkles size={15} className="mt-0.5 shrink-0 text-brand" />
              {insight(s)}
            </p>

            <div className="mt-7 space-y-3">
              <Meter label="Income spent" value={spentPct} tone={spentPct >= 90 ? "expense" : spentPct >= 70 ? "gold" : "income"} />
              <Meter label="Month elapsed" value={monthPct} tone="neutral" />
            </div>
            <p className="mt-3 text-xs text-subtle">
              {spentPct > monthPct + 5
                ? "Spending is running ahead of the calendar."
                : spentPct < monthPct - 5
                  ? "Spending is comfortably behind the calendar."
                  : "Spending is tracking the calendar."}
            </p>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="text-muted">Cumulative spending</span>
              <span className="flex items-center gap-3 text-subtle">
                <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 rounded bg-brand" /> spent</span>
                <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 rounded border-t border-dashed border-income" /> income</span>
              </span>
            </div>
            <SpendCurve daily={s.dailyExpense} daysInMonth={s.daysInMonth} income={s.totalIncome} format={fmt} />
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <BudgetCard month={s.month} currency={cur} />
        <PortfolioCard />
      </section>

      {/* KPIs */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi icon={ArrowDownLeft} tone="text-income" label="Income" value={fmt(s.totalIncome)}>
          {s.incomeTargetProgress != null ? (
            <span className="text-income">{s.incomeTargetProgress}% <span className="text-subtle">of target</span></span>
          ) : (
            <span className="text-subtle">{s.incomeCount} entries</span>
          )}
        </Kpi>
        <Kpi icon={Receipt} tone="text-expense" label="Spent" value={fmt(s.totalExpense)} aside={<Sparkline values={s.dailyExpense.map((d) => d.amount)} color="var(--expense)" className="h-8 w-20" />}>
          <span className="text-subtle">{s.expenseCount} transactions</span>
        </Kpi>
        <Kpi icon={ArrowUpRight} tone="text-info" label="Spent today" value={fmt(s.todayExpense)}>
          <span className="text-subtle">Avg {fmt(s.averageDailyExpense)}/day</span>
        </Kpi>
        <Kpi icon={PiggyBank} tone="text-brand" label="Savings rate" value={s.savingsRate != null ? `${s.savingsRate}%` : "—"}>
          <span className="text-subtle">of income kept</span>
        </Kpi>
      </section>

      {/* Breakdown */}
      <section className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="panel p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Where money went</h2>
            <Link href="/dashboard/expenses" className="flex items-center gap-1 text-xs text-muted transition hover:text-brand">
              All expenses <ArrowRight size={12} />
            </Link>
          </div>
          {s.expenseByCategory.length === 0 ? (
            <p className="mt-6 text-sm text-muted">No spending yet.</p>
          ) : (
            <div className="mt-6 flex flex-col items-center gap-8 sm:flex-row sm:items-start">
              <Donut
                data={s.expenseByCategory.slice(0, 7).map((c) => ({ label: c.category, value: c.amount }))}
                center={
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-subtle">Total</p>
                    <p className="tabular text-base font-semibold">{money(s.totalExpense, cur, true)}</p>
                  </div>
                }
              />
              <ul className="w-full flex-1 space-y-2.5">
                {s.expenseByCategory.slice(0, 7).map((c, i) => (
                  <li key={c.category} className="flex items-center gap-3 text-sm">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                    <span className="flex-1 text-fg-2">{label(c.category)}</span>
                    <span className="tabular text-subtle">{c.share}%</span>
                    <span className="tabular w-24 text-right">{fmt(c.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="panel p-6">
          <h2 className="font-medium">Daily spending</h2>
          <p className="mt-0.5 text-xs text-subtle">Red bars are days well above your average</p>
          <div className="mt-6">
            <DailyBars data={s.dailyExpense} format={fmt} />
          </div>
        </div>
      </section>

      {/* Recent */}
      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-6">
          <h2 className="font-medium">Recent activity</h2>
          <Link href="/dashboard/expenses" className="flex items-center gap-1 text-xs text-muted transition hover:text-brand">
            View all <ArrowRight size={12} />
          </Link>
        </div>
        <ul className="mt-3 divide-y divide-line">
          {s.recent.map((r) => (
            <li key={`${r.kind}-${r.id}`} className="flex items-center gap-4 px-6 py-3.5 transition hover:bg-fg/[0.02]">
              <Avatar text={r.label} income={r.kind === "INCOME"} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{r.label}</p>
                <p className="text-xs text-subtle">{dayLabel(r.date)}</p>
              </div>
              <Badge tone={r.kind === "INCOME" ? "income" : "neutral"}>{label(r.tag)}</Badge>
              <span className={`tabular w-28 text-right text-sm font-medium ${r.kind === "INCOME" ? "text-income" : ""}`}>
                {r.kind === "INCOME" ? "+" : "−"}
                {fmt(r.amount)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function Meter({ label, value, tone }: { label: string; value: number; tone: "income" | "expense" | "gold" | "neutral" }) {
  const bg = {
    income: "linear-gradient(90deg, var(--income-2), var(--income))",
    expense: "linear-gradient(90deg, var(--expense-2), var(--expense))",
    gold: "linear-gradient(90deg, var(--accent-3), var(--accent-1))",
    neutral: "rgb(255 255 255 / 0.25)",
  }[tone];
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className="tabular text-fg-2">{value.toFixed(0)}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-fg/[0.06]">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value}%`, background: bg }} />
      </div>
    </div>
  );
}

function Kpi({
  icon: Icon,
  tone,
  label,
  value,
  aside,
  children,
}: {
  icon: typeof Wallet;
  tone: string;
  label: string;
  value: string;
  aside?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="panel p-5">
      <div className="flex items-start justify-between">
        <span className={`grid h-9 w-9 place-items-center rounded-xl bg-fg/[0.04] ring-1 ring-inset ring-fg/[0.06] ${tone}`}>
          <Icon size={16} />
        </span>
        {aside}
      </div>
      <p className="mt-4 text-xs text-subtle">{label}</p>
      <p className="tabular mt-0.5 text-xl font-semibold tracking-tight sm:text-2xl">{value}</p>
      <p className="mt-1 text-xs">{children}</p>
    </div>
  );
}

function insight(s: MonthSummary): string {
  if (s.totalIncome === 0) return "No income recorded yet this month — add your salary to see what remains.";
  if (s.net < 0) return "You've spent more than you've earned this month. Your biggest lever is " + label(s.expenseByCategory[0]?.category ?? "OTHER").toLowerCase() + ".";
  const top = s.expenseByCategory[0];
  if (top && top.share >= 40) return `${label(top.category)} is ${top.share}% of your spending — your largest fixed lever.`;
  if (s.savingsRate != null && s.savingsRate >= 30) return `Strong pace — you're keeping ${s.savingsRate}% of what you've earned this month.`;
  return `You've kept ${s.savingsRate ?? 0}% of this month's income so far.`;
}
