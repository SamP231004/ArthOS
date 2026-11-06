"use client";

import { ArrowDownLeft, ArrowRight, ArrowUpRight, Plus, Sparkles, Wallet } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { BudgetCard } from "@/components/budget/budget-card";
import { PortfolioCard } from "@/components/invest/portfolio-card";
import { SavingsAccountCard } from "@/components/savings-account-card";
import { CATEGORY_COLORS, DailyBars, Donut, SpendCurve } from "@/components/charts";
import { MonthPicker } from "@/components/month-picker";
import { ScanImport } from "@/components/scan-import";
import { ExpenseModal, IncomeModal } from "@/components/transaction-forms";
import { Button, ErrorNote, Skeleton } from "@/components/ui";
import { initials, tagColor } from "@/components/ledger";
import { useAuth } from "@/lib/auth-store";
import { dayLabel, label, money } from "@/lib/format";
import { useSummary } from "@/lib/queries";
import { ruleLabel } from "@/lib/savings";
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
          <ScanImport label="Scan" />
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
  const spentPct = s.spendable > 0 ? Math.min(100, (s.totalExpense / s.spendable) * 100) : s.totalExpense > 0 ? 100 : 0;
  const monthPct = (s.daysElapsed / s.daysInMonth) * 100;
  const [whole, paise] = fmt(s.leftToSpend).split(".");
  const dipped = s.leftToSpend < 0;

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
            <p className="text-sm text-muted">{dipped ? "Spent beyond your spendable" : "Left to spend this month"}</p>
            <p className={`tabular mt-2 text-5xl font-semibold tracking-tight sm:text-6xl ${dipped ? "text-expense" : "text-silver"}`}>
              {whole}
              {paise && <span className="text-2xl text-subtle">.{paise}</span>}
            </p>
            <FlowBar s={s} fmt={fmt} />

            <p className="mt-5 flex items-start gap-2 text-sm leading-relaxed text-fg-2">
              <Sparkles size={15} className="mt-0.5 shrink-0 text-brand" />
              {insight(s, fmt)}
            </p>

            <div className="mt-6 space-y-3">
              <Meter label="Spendable used" value={spentPct} tone={spentPct >= 90 ? "expense" : spentPct >= 70 ? "gold" : "income"} />
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
                <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 rounded border-t border-dashed border-income" /> spendable</span>
              </span>
            </div>
            <SpendCurve daily={s.dailyExpense} daysInMonth={s.daysInMonth} income={s.spendable} incomeLabel="spendable" format={fmt} />
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <BudgetCard month={s.month} currency={cur} />
        <PortfolioCard />
      </section>

      {s.savings && <SavingsAccountCard a={s.savings} currency={cur} />}

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

      <RecentActivity s={s} fmt={fmt} />
    </>
  );
}

/** The latest entries across income and expenses, in the same ledger style as the Income/Expenses pages. */
function RecentActivity({ s, fmt }: { s: MonthSummary; fmt: (n: number) => string }) {
  const [kind, setKind] = useState<"ALL" | "INCOME" | "EXPENSE">("ALL");
  const rows = s.recent.filter((r) => kind === "ALL" || r.kind === kind);
  const net = rows.reduce((a, r) => a + (r.kind === "INCOME" ? r.amount : -r.amount), 0);
  const href = (k: string) => (k === "INCOME" ? "/dashboard/income" : "/dashboard/expenses");
  const tabs = [
    { k: "ALL", label: "All", n: s.recent.length },
    { k: "INCOME", label: "In", n: s.recent.filter((r) => r.kind === "INCOME").length },
    { k: "EXPENSE", label: "Out", n: s.recent.filter((r) => r.kind === "EXPENSE").length },
  ] as const;

  return (
    <section className="panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-6">
        <div>
          <h2 className="font-medium">Recent activity</h2>
          <p className="mt-0.5 text-xs text-subtle">Latest entries this month · open one to see its ledger</p>
        </div>
        <div className="flex items-center gap-3">
          <div role="tablist" className="flex rounded-xl border border-line bg-fg/[0.02] p-0.5 text-xs">
            {tabs.map((t) => (
              <button
                key={t.k}
                role="tab"
                aria-selected={kind === t.k}
                onClick={() => setKind(t.k)}
                className={`rounded-lg px-3 py-1.5 font-medium transition ${kind === t.k ? "bg-surface text-fg shadow-sm ring-1 ring-line-strong" : "text-muted hover:text-fg"}`}
              >
                {t.label} <span className="tabular text-subtle">{t.n}</span>
              </button>
            ))}
          </div>
          <Link href={href(kind)} className="flex items-center gap-1 text-xs text-muted transition hover:text-brand">
            View all <ArrowRight size={12} />
          </Link>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-muted">Nothing here yet this month.</p>
      ) : (
        <>
          <div className="mt-4 hidden overflow-x-auto md:block">
            <table className="w-full whitespace-nowrap text-sm">
              <thead className="text-[11px] text-subtle">
                <tr className="border-y border-line bg-fg/[0.015]">
                  <th className="px-6 py-2.5 text-left font-medium">Date</th>
                  <th className="px-3 py-2.5 text-left font-medium">Description</th>
                  <th className="px-3 py-2.5 text-left font-medium">Category</th>
                  <th className="px-3 py-2.5 text-left font-medium">Flow</th>
                  <th className="px-6 py-2.5 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => {
                  const color = tagColor(r.kind, r.tag);
                  const income = r.kind === "INCOME";
                  return (
                    <tr key={`${r.kind}-${r.id}`} className="relative transition hover:bg-fg/[0.025]">
                      <td className="px-6 py-3.5 text-muted">
                        <Link href={href(r.kind)} className="after:absolute after:inset-0" aria-label={`${r.label}, ${fmt(r.amount)}`}>{dayLabel(r.date)}</Link>
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[11px] font-semibold" style={{ background: `color-mix(in oklab, ${color} 14%, transparent)`, color }}>
                            {initials(r.label)}
                          </span>
                          <span className="max-w-[320px] truncate font-medium">{r.label}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3.5">
                        <span className="inline-flex items-center gap-1.5 text-fg-2"><span className="h-2 w-2 rounded-full" style={{ background: color }} />{label(r.tag)}</span>
                      </td>
                      <td className="px-3 py-3.5">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${income ? "bg-income/10 text-income" : "bg-expense/10 text-expense"}`}>
                          {income ? <ArrowDownLeft size={11} /> : <ArrowUpRight size={11} />} {income ? "In" : "Out"}
                        </span>
                      </td>
                      <td className={`tabular px-6 py-3.5 text-right font-semibold ${income ? "text-income" : ""}`}>
                        {income ? "+" : "−"}{fmt(r.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-line-strong bg-fg/[0.02] text-sm">
                  <td className="px-6 py-3 text-subtle" colSpan={4}>
                    {kind === "ALL" ? "Net of" : "Total of"} {rows.length} shown · {s.incomeCount + s.expenseCount} entries this month
                  </td>
                  <td className={`tabular px-6 py-3 text-right font-semibold ${net >= 0 ? "text-income" : ""}`}>
                    {net >= 0 ? "+" : "−"}{fmt(Math.abs(net))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <ul className="mt-3 divide-y divide-line md:hidden">
            {rows.map((r) => {
              const color = tagColor(r.kind, r.tag);
              const income = r.kind === "INCOME";
              return (
                <li key={`${r.kind}-${r.id}`}>
                  <Link href={href(r.kind)} className="flex items-center gap-3 px-5 py-3.5">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-[11px] font-semibold" style={{ background: `color-mix(in oklab, ${color} 14%, transparent)`, color }}>{initials(r.label)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{r.label}</span>
                      <span className="block truncate text-xs text-subtle">{label(r.tag)} · {dayLabel(r.date)}</span>
                    </span>
                    <span className={`tabular text-sm font-semibold ${income ? "text-income" : ""}`}>{income ? "+" : "−"}{fmt(r.amount)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
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

function insight(s: MonthSummary, fmt: (n: number) => string): string {
  const lever = label(s.expenseByCategory[0]?.category ?? "OTHER").toLowerCase();
  if (s.totalIncome === 0) return "No income yet this month. When it lands, your savings are set aside first and the rest becomes your spending money.";
  if (s.net < 0) return `You've spent more than you've earned this month — your savings are gone and then some. Biggest lever: ${lever}.`;
  if (s.leftToSpend < 0) return `You've dipped ${fmt(-s.leftToSpend)} into the ${fmt(s.savedFirst)} you set aside. Biggest lever: ${lever}.`;
  if (s.savings && s.savings.closing < 0) return `Your savings account is overdrawn by ${fmt(-s.savings.closing)} — investments have run ahead of what you've saved.`;
  const fromSavings = s.savings?.investedFromSavings ?? 0;
  const balance = s.savings?.closing ?? 0;
  if (s.savedFirst > 0 && fromSavings >= s.savedFirst) return `This month's ${fmt(s.savedFirst)} of savings is fully invested — money put to work before it could be spent.`;
  if (fromSavings > 0) return `${fmt(fromSavings)} invested from savings this month — ${fmt(Math.max(balance, 0))} still in your savings account to put to work.`;
  if (balance > 0 && s.savedFirst > 0) return `${fmt(s.savedFirst)} saved first this month — your savings account now holds ${fmt(balance)}, ready to invest.`;
  const top = s.expenseByCategory[0];
  if (top && top.share >= 40) return `Savings are safe. ${label(top.category)} is ${top.share}% of your spending — your largest fixed lever.`;
  return `Savings are safe — ${fmt(s.leftToSpend)} is yours to spend, guilt-free.`;
}

/** Where this month's income went: saved first, then spent, then what's left. Overspending eats into the savings slice. */
function FlowBar({ s, fmt }: { s: MonthSummary; fmt: (n: number) => string }) {
  if (s.totalIncome <= 0) return null;
  const T = Math.max(s.totalIncome, s.totalExpense);
  const dip = Math.max(0, Math.min(s.savedFirst, -s.leftToSpend));
  const fromSpending = s.savings?.investedFromSpending ?? 0;
  const parts = [
    { key: "saved", label: "Saved first", v: s.savedFirst - dip, color: "var(--income)" },
    { key: "dip", label: "Spent from savings", v: dip, color: "var(--expense)", striped: true },
    { key: "spent", label: "Spent", v: Math.min(s.totalExpense, s.spendable), color: "color-mix(in oklab, var(--expense) 70%, transparent)" },
    { key: "invested", label: "Invested from spending", v: Math.min(fromSpending, Math.max(0, s.spendable - s.totalExpense)), color: "var(--info)" },
    { key: "left", label: "Left", v: Math.max(0, s.leftToSpend), color: "color-mix(in oklab, var(--fg) 12%, transparent)" },
  ].filter((p) => p.v > 0);
  return (
    <div className="mt-5">
      <div className="flex h-3 overflow-hidden rounded-full bg-fg/[0.05]">
        {parts.map((p) => (
          <div
            key={p.key}
            title={`${p.label}: ${fmt(p.v)}`}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{
              width: `${(p.v / T) * 100}%`,
              background: p.striped ? `repeating-linear-gradient(135deg, ${p.color} 0 4px, transparent 4px 7px)` : p.color,
            }}
          />
        ))}
      </div>
      <MoneyStatement s={s} fmt={fmt} colors={{ saved: "var(--income)", spent: "color-mix(in oklab, var(--expense) 70%, transparent)", invested: "var(--info)", left: "color-mix(in oklab, var(--fg) 12%, transparent)" }} />
    </div>
  );
}

/**
 * How "left to spend" is worked out, one step per line — the dots match the bar above, so it doubles as its legend:
 * income → minus what's saved first → what's yours to spend → minus spending (and any investing paid from it) → left.
 */
function StatementRow({ sign, label, hint, v, dot, strong, tone, fmt }: { sign?: string; label: string; hint?: string; v: number; dot?: string; strong?: boolean; tone?: string; fmt: (n: number) => string }) {
  return (
    <div className={`flex items-baseline gap-2.5 py-1.5 ${strong ? "font-semibold" : ""}`}>
      <span className="w-3 shrink-0 text-center text-subtle">{sign}</span>
      <span className="h-2 w-2 shrink-0 translate-y-[-1px] rounded-[3px]" style={{ background: dot ?? "transparent" }} />
      <span className={`min-w-0 flex-1 ${strong ? "text-fg" : "text-fg-2"}`}>
        {label}
        {hint && <span className="ml-1.5 text-xs font-normal text-subtle">{hint}</span>}
      </span>
      <span className={`tabular ${tone ?? (strong ? "text-fg" : "text-fg-2")}`}>{fmt(v)}</span>
    </div>
  );
}

function MoneyStatement({ s, fmt, colors }: { s: MonthSummary; fmt: (n: number) => string; colors: Record<"saved" | "spent" | "invested" | "left", string> }) {
  const fromSpending = s.savings?.investedFromSpending ?? 0;
  const over = s.leftToSpend < 0;
  const rule = ruleLabel(s.savingsRule, fmt);
  return (
    <div className="mt-4 rounded-2xl border border-line bg-fg/[0.02] px-4 py-2.5 text-sm">
      <StatementRow fmt={fmt} label="Income this month" v={s.totalIncome} />
      <StatementRow fmt={fmt} sign="−" label="Saved first" hint={rule} v={s.savedFirst} dot={colors.saved} />
      <div className="my-1 border-t border-dashed border-line" />
      <StatementRow fmt={fmt} sign="=" label="Yours to spend" v={s.spendable} />
      <StatementRow fmt={fmt} sign="−" label="Spent" hint={`${s.expenseCount} expenses${s.todayExpense > 0 ? ` · ${fmt(s.todayExpense)} today` : ""}`} v={s.totalExpense} dot={colors.spent} />
      {fromSpending > 0 && <StatementRow fmt={fmt} sign="−" label="Invested" hint="paid from spending money" v={fromSpending} dot={colors.invested} />}
      <div className="my-1 border-t border-line-strong" />
      <StatementRow fmt={fmt} sign="=" label={over ? "Overspent — taken from savings" : "Left to spend"} v={Math.abs(s.leftToSpend)} dot={over ? "var(--expense)" : colors.left} strong tone={over ? "text-expense" : undefined} />
    </div>
  );
}
