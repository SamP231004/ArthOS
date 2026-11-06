"use client";

import { Pencil, Plus, Repeat, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { BreakdownBar, ExportButton, initials, pctChange, RecurringBadge, sameDayIn, SortHeader, SummaryCell, type Sort } from "@/components/ledger";
import { MonthPicker } from "@/components/month-picker";
import { PageHeader } from "@/components/page-header";
import { RecurringSuggestions } from "@/components/recurring-suggestions";
import { ScanImport } from "@/components/scan-import";
import { ExpenseModal } from "@/components/transaction-forms";
import { Badge, Button, ErrorNote, Select, Skeleton } from "@/components/ui";
import { useAuth } from "@/lib/auth-store";
import { currentMonth, dayLabel, label, money, shiftMonth, todayISO } from "@/lib/format";
import { useDeleteExpense, useExpenses, useSaveExpense } from "@/lib/queries";
import { useMonth } from "@/lib/ui-store";
import { EXPENSE_CATEGORIES, PAYMENT_SOURCES, type Expense, type ExpenseCategory, type PaymentSource } from "@/lib/types";

const catColor = (c: ExpenseCategory) => `var(--c${(EXPENSE_CATEGORIES.indexOf(c) % 8) + 1})`;
type Key = "date" | "merchant" | "category" | "paymentSource" | "amount";

export default function ExpensesPage() {
  const month = useMonth();
  const cur = useAuth((s) => s.user?.currency ?? "INR");
  const fmt = (n: number) => money(n, cur);
  const { data, isLoading, error } = useExpenses(month);
  const prev = useExpenses(shiftMonth(month, -1));
  const del = useDeleteExpense();
  const save = useSaveExpense();
  const [editing, setEditing] = useState<Expense | null | undefined>(undefined);
  const [category, setCategory] = useState<ExpenseCategory | null>(null);
  const [via, setVia] = useState<PaymentSource | "">("");
  const [q, setQ] = useState("");
  const [recurringOnly, setRecurringOnly] = useState(false);
  const [sort, setSort] = useState<Sort<Key>>({ key: "date", dir: -1 });

  const all = useMemo(() => data ?? [], [data]);
  const name = (e: Expense) => e.merchant ?? label(e.category);
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const r = all.filter(
      (e) =>
        (!category || e.category === category) &&
        (!via || e.paymentSource === via) &&
        (!recurringOnly || e.recurring) &&
        (!needle || name(e).toLowerCase().includes(needle) || (e.note ?? "").toLowerCase().includes(needle)),
    );
    return r.sort((a, b) => {
      const v =
        sort.key === "amount" ? a.amount - b.amount
        : sort.key === "date" ? a.date.localeCompare(b.date)
        : sort.key === "merchant" ? name(a).localeCompare(name(b))
        : String(a[sort.key]).localeCompare(String(b[sort.key]));
      return v * sort.dir;
    });
  }, [all, category, via, q, recurringOnly, sort]);

  const total = all.reduce((s, e) => s + e.amount, 0);
  const prevTotal = (prev.data ?? []).reduce((s, e) => s + e.amount, 0);
  const days = new Set(all.map((e) => e.date)).size;
  const byCat = EXPENSE_CATEGORIES.map((c) => ({ key: c, label: label(c), amount: all.filter((e) => e.category === c).reduce((s, e) => s + e.amount, 0), color: catColor(c) }))
    .filter((p) => p.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  const change = pctChange(total, prevTotal);
  const shownTotal = rows.reduce((s, e) => s + e.amount, 0);
  const pending = month === currentMonth()
    ? (prev.data ?? []).filter((p) => p.recurring && !all.some((e) => name(e).toLowerCase() === name(p).toLowerCase() && e.category === p.category))
    : [];

  return (
    <div className="space-y-6">
      <PageHeader title="Expenses" subtitle="Everything going out this month — searchable, filterable, exportable.">
        <MonthPicker />
        <ExportButton
          filename={`arthos-expenses-${month}.csv`}
          rows={[["Date", "Merchant", "Category", "Paid via", "Recurring", "Amount", "Note"], ...rows.map((e) => [e.date, e.merchant ?? "", label(e.category), label(e.paymentSource), e.recurring ? "Yes" : "No", e.amount, e.note ?? ""])]}
        />
        <ScanImport />
        <Button onClick={() => setEditing(null)}>
          <Plus size={16} /> Add expense
        </Button>
      </PageHeader>

      <RecurringSuggestions kind="EXPENSE" currency={cur} />

      <section className="panel overflow-hidden">
        <div className="grid grid-cols-2 lg:grid-cols-4">
          <SummaryCell k="Spent" v={fmt(total)} tone="text-expense" sub={`${all.length} transactions`} />
          <SummaryCell k="Per active day" v={days ? fmt(total / days) : "—"} sub={`${days} ${days === 1 ? "day" : "days"} with spending`} />
          <SummaryCell k="Top category" v={byCat[0] ? fmt(byCat[0].amount) : "—"} sub={byCat[0]?.label ?? "Nothing yet"} />
          <SummaryCell k="Last month" v={prevTotal ? fmt(prevTotal) : "—"} pill={change ? { text: change.text, tone: change.up ? "bg-expense/10 text-expense" : "bg-income/10 text-income" } : undefined} sub={!change ? "No data" : undefined} />
        </div>
        {byCat.length > 0 && (
          <div className="border-t border-line p-4 sm:p-5">
            <BreakdownBar label="Filter by category" parts={byCat} active={category} onToggle={setCategory} />
          </div>
        )}
      </section>

      {pending.length > 0 && (
        <section className="panel flex flex-wrap items-center gap-3 p-4">
          <span className="flex items-center gap-2 text-sm text-fg-2"><Repeat size={15} className="text-info" /> Recurring from last month, not added yet:</span>
          {pending.map((p) => (
            <button
              key={p.id}
              disabled={save.isPending}
              onClick={() => save.mutate({ input: { amount: p.amount, category: p.category, merchant: p.merchant, paymentSource: p.paymentSource, date: sameDayIn(month, p.date, todayISO()), note: p.note, recurring: true } })}
              className="btn-glass inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs transition"
              title="Add this month's entry"
            >
              <Plus size={12} /> {name(p)} · <span className="tabular">{fmt(p.amount)}</span>
            </button>
          ))}
        </section>
      )}

      <section className="panel overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
            <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search merchant or note…" className="field pl-10" />
          </div>
          <Select value={via} onChange={(e) => setVia(e.target.value as PaymentSource | "")} className="w-44">
            <option value="">Any payment</option>
            {PAYMENT_SOURCES.map((p) => <option key={p} value={p}>{label(p)}</option>)}
          </Select>
          <button
            onClick={() => setRecurringOnly((r) => !r)}
            className={`inline-flex h-10 items-center gap-2 rounded-xl border px-3.5 text-sm transition ${recurringOnly ? "border-info/50 bg-info/10 text-info" : "border-line-strong text-muted hover:text-fg"}`}
          >
            <Repeat size={14} /> Recurring only
          </button>
          {(category || via || q || recurringOnly) && (
            <button onClick={() => { setCategory(null); setVia(""); setQ(""); setRecurringOnly(false); }} className="text-xs text-brand hover:underline">Clear filters</button>
          )}
          <span className="tabular ml-auto text-sm text-muted">{rows.length} shown · <span className="font-semibold text-fg">{fmt(shownTotal)}</span></span>
        </div>

        {isLoading ? (
          <div className="space-y-3 p-6">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : error ? (
          <div className="p-6"><ErrorNote message={error.message} /></div>
        ) : rows.length === 0 ? (
          <div className="p-14 text-center">
            <p className="font-medium">{all.length ? "Nothing matches these filters" : "No expenses logged for this month"}</p>
            <p className="mt-1 text-sm text-muted">{all.length ? "Try clearing a filter." : "Add your first spend — it takes a few seconds."}</p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full whitespace-nowrap text-sm">
                <thead className="text-[11px] text-subtle">
                  <tr className="border-b border-line">
                    <SortHeader k="date" label="Date" sort={sort} setSort={setSort} />
                    <SortHeader k="merchant" label="Merchant" sort={sort} setSort={setSort} />
                    <SortHeader k="category" label="Category" sort={sort} setSort={setSort} />
                    <SortHeader k="paymentSource" label="Paid via" sort={sort} setSort={setSort} />
                    <SortHeader k="amount" label="Amount" sort={sort} setSort={setSort} align="right" />
                    <th className="w-20 px-3"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((e) => (
                    <tr key={e.id} className="group cursor-pointer transition hover:bg-fg/[0.025]" onClick={() => setEditing(e)}>
                      <td className="px-3 py-3.5 text-muted">{dayLabel(e.date)}</td>
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[11px] font-semibold" style={{ background: `color-mix(in oklab, ${catColor(e.category)} 14%, transparent)`, color: catColor(e.category) }}>
                            {initials(name(e))}
                          </span>
                          <div className="min-w-0">
                            <p className="flex max-w-[280px] items-center gap-2 truncate font-medium">
                              {name(e)}
                              {e.recurring && <RecurringBadge />}
                            </p>
                            {e.note && <p className="max-w-[280px] truncate text-xs text-subtle">{e.note}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3.5">
                        <span className="inline-flex items-center gap-1.5 text-fg-2"><span className="h-2 w-2 rounded-full" style={{ background: catColor(e.category) }} />{label(e.category)}</span>
                      </td>
                      <td className="px-3 py-3.5 text-muted">{label(e.paymentSource)}</td>
                      <td className="tabular px-3 py-3.5 text-right font-semibold">−{fmt(e.amount)}</td>
                      <td className="px-3 py-3.5 text-right" onClick={(ev) => ev.stopPropagation()}>
                        <div className="inline-flex gap-1 opacity-60 transition group-hover:opacity-100">
                          <button onClick={() => setEditing(e)} className="rounded-lg p-1.5 text-subtle hover:bg-fg/5 hover:text-fg" aria-label={`Edit ${name(e)}`}><Pencil size={14} /></button>
                          <button onClick={() => confirm(`Delete ${name(e)} (${fmt(e.amount)})?`) && del.mutate(e.id)} className="rounded-lg p-1.5 text-subtle hover:bg-expense/10 hover:text-expense" aria-label={`Delete ${name(e)}`}><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-line-strong bg-fg/[0.02] text-sm">
                    <td className="px-3 py-3 text-subtle" colSpan={4}>Total · {rows.length} transactions</td>
                    <td className="tabular px-3 py-3 text-right font-semibold">−{fmt(shownTotal)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>

            <ul className="divide-y divide-line md:hidden">
              {rows.map((e) => (
                <li key={e.id}>
                  <button onClick={() => setEditing(e)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-[11px] font-semibold" style={{ background: `color-mix(in oklab, ${catColor(e.category)} 14%, transparent)`, color: catColor(e.category) }}>{initials(name(e))}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{name(e)}</span>
                      <span className="block truncate text-xs text-subtle">{label(e.category)} · {label(e.paymentSource)} · {dayLabel(e.date)}</span>
                    </span>
                    <span className="text-right">
                      <span className="tabular block font-semibold">−{fmt(e.amount)}</span>
                      {e.recurring && <Badge tone="info">Monthly</Badge>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <ExpenseModal open={editing !== undefined} initial={editing} onClose={() => setEditing(undefined)} />
    </div>
  );
}
