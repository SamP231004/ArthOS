"use client";

import { Pencil, Plus, Repeat, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { BreakdownBar, ExportButton, initials, pctChange, RecurringBadge, sameDayIn, SortHeader, SummaryCell, type Sort } from "@/components/ledger";
import { MonthPicker } from "@/components/month-picker";
import { ruleLabel, setAside } from "@/lib/savings";
import { PageHeader } from "@/components/page-header";
import { RecurringSuggestions } from "@/components/recurring-suggestions";
import { ScanImport } from "@/components/scan-import";
import { IncomeModal } from "@/components/transaction-forms";
import { Badge, Button, ErrorNote, Skeleton } from "@/components/ui";
import { useAuth } from "@/lib/auth-store";
import { currentMonth, dayLabel, label, money, shiftMonth, todayISO } from "@/lib/format";
import { useDeleteIncome, useIncomes, useSaveIncome } from "@/lib/queries";
import { useMonth } from "@/lib/ui-store";
import { INCOME_TYPES, type Income, type IncomeType } from "@/lib/types";

const typeColor = (t: IncomeType) => `var(--c${(INCOME_TYPES.indexOf(t) % 8) + 1})`;
type Key = "date" | "source" | "type" | "amount";

export default function IncomePage() {
  const month = useMonth();
  const cur = useAuth((s) => s.user?.currency ?? "INR");
  const user = useAuth((s) => s.user);
  const fmt = (n: number) => money(n, cur);
  const { data, isLoading, error } = useIncomes(month);
  const prev = useIncomes(shiftMonth(month, -1));
  const del = useDeleteIncome();
  const save = useSaveIncome();
  const [editing, setEditing] = useState<Income | null | undefined>(undefined);
  const [type, setType] = useState<IncomeType | null>(null);
  const [q, setQ] = useState("");
  const [recurringOnly, setRecurringOnly] = useState(false);
  const [sort, setSort] = useState<Sort<Key>>({ key: "date", dir: -1 });

  const all = useMemo(() => data ?? [], [data]);
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const r = all.filter(
      (i) => (!type || i.type === type) && (!recurringOnly || i.recurring) && (!needle || i.source.toLowerCase().includes(needle) || (i.note ?? "").toLowerCase().includes(needle)),
    );
    return r.sort((a, b) => {
      const v = sort.key === "amount" ? a.amount - b.amount : sort.key === "date" ? a.date.localeCompare(b.date) : sort.key === "type" ? a.type.localeCompare(b.type) : a.source.localeCompare(b.source);
      return v * sort.dir;
    });
  }, [all, type, q, recurringOnly, sort]);

  const total = all.reduce((s, i) => s + i.amount, 0);

  const rule = { mode: user?.savingsMode ?? "PERCENT", value: user?.savingsValue ?? 20 } as const;

  const saved = setAside(rule, total);
  const prevTotal = (prev.data ?? []).reduce((s, i) => s + i.amount, 0);
  const recurring = all.filter((i) => i.recurring);
  const bySource = new Map<string, number>();
  all.forEach((i) => bySource.set(i.source, (bySource.get(i.source) ?? 0) + i.amount));
  const top = [...bySource.entries()].sort((a, b) => b[1] - a[1])[0];
  const change = pctChange(total, prevTotal);
  const shownTotal = rows.reduce((s, i) => s + i.amount, 0);

  const parts = INCOME_TYPES.map((t) => ({ key: t, label: label(t), amount: all.filter((i) => i.type === t).reduce((s, i) => s + i.amount, 0), color: typeColor(t) })).filter((p) => p.amount > 0);

  // Recurring entries from last month that haven't been logged this month yet.
  const pending = month === currentMonth()
    ? (prev.data ?? []).filter((p) => p.recurring && !all.some((i) => i.source.toLowerCase() === p.source.toLowerCase() && i.type === p.type))
    : [];

  return (
    <div className="space-y-6">
      <PageHeader title="Income" subtitle="Everything coming in this month — one-time or recurring.">
        <MonthPicker />
        <ExportButton filename={`arthos-income-${month}.csv`} rows={[["Date", "Source", "Type", "Recurring", "Amount", "Note"], ...rows.map((i) => [i.date, i.source, label(i.type), i.recurring ? "Yes" : "No", i.amount, i.note ?? ""])]} />
        <ScanImport />
        <Button onClick={() => setEditing(null)}>
          <Plus size={16} /> Add income
        </Button>
      </PageHeader>

      <RecurringSuggestions kind="INCOME" currency={cur} />

      <section className="panel overflow-hidden">
        <div className="grid grid-cols-2 lg:grid-cols-5">
          <SummaryCell k="Received" v={fmt(total)} tone="text-income" sub={`${all.length} ${all.length === 1 ? "entry" : "entries"}`} />
          <SummaryCell k="Saved first" v={fmt(saved)} tone="text-brand" sub={`${ruleLabel(rule, fmt)} · ${fmt(total - saved)} to spend`} />
          <SummaryCell k="Recurring" v={fmt(recurring.reduce((s, i) => s + i.amount, 0))} sub={`${recurring.length} monthly ${recurring.length === 1 ? "source" : "sources"}`} />
          <SummaryCell k="Top source" v={top ? fmt(top[1]) : "—"} sub={top ? <span className="truncate">{top[0]}</span> : "No income yet"} />
          <SummaryCell k="Last month" v={prevTotal ? fmt(prevTotal) : "—"} pill={change ? { text: change.text, tone: change.up ? "bg-income/10 text-income" : "bg-expense/10 text-expense" } : undefined} sub={!change ? "No data" : undefined} />
        </div>
        {parts.length > 0 && (
          <div className="border-t border-line p-4 sm:p-5">
            <BreakdownBar label="Filter by type" parts={parts} active={type} onToggle={setType} />
          </div>
        )}
      </section>

      {pending.length > 0 && (
        <section className="panel flex flex-wrap items-center gap-3 border-info/25 p-4">
          <span className="flex items-center gap-2 text-sm text-fg-2"><Repeat size={15} className="text-info" /> Recurring from last month, not added yet:</span>
          {pending.map((p) => (
            <button
              key={p.id}
              disabled={save.isPending}
              onClick={() => save.mutate({ input: { amount: p.amount, source: p.source, type: p.type, date: sameDayIn(month, p.date, todayISO()), note: p.note, recurring: true } })}
              className="btn-glass inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs transition"
              title="Add this month's entry"
            >
              <Plus size={12} /> {p.source} · <span className="tabular">{fmt(p.amount)}</span>
            </button>
          ))}
        </section>
      )}

      <section className="panel overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
            <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search source or note…" className="field pl-10" />
          </div>
          <button
            onClick={() => setRecurringOnly((r) => !r)}
            className={`inline-flex h-10 items-center gap-2 rounded-xl border px-3.5 text-sm transition ${recurringOnly ? "border-info/50 bg-info/10 text-info" : "border-line-strong text-muted hover:text-fg"}`}
          >
            <Repeat size={14} /> Recurring only
          </button>
          {(type || q || recurringOnly) && (
            <button onClick={() => { setType(null); setQ(""); setRecurringOnly(false); }} className="text-xs text-brand hover:underline">Clear filters</button>
          )}
          <span className="tabular ml-auto text-sm text-muted">{rows.length} shown · <span className="font-semibold text-fg">{fmt(shownTotal)}</span></span>
        </div>

        {isLoading ? (
          <div className="space-y-3 p-6">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : error ? (
          <div className="p-6"><ErrorNote message={error.message} /></div>
        ) : rows.length === 0 ? (
          <div className="p-14 text-center">
            <p className="font-medium">{all.length ? "Nothing matches these filters" : "No income logged for this month"}</p>
            <p className="mt-1 text-sm text-muted">{all.length ? "Try clearing a filter." : "Add your salary, freelance work or any other money coming in."}</p>
          </div>
        ) : (
          <>
            {/* desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full whitespace-nowrap text-sm">
                <thead className="text-[11px] text-subtle">
                  <tr className="border-b border-line">
                    <SortHeader k="date" label="Date" sort={sort} setSort={setSort} />
                    <SortHeader k="source" label="Source" sort={sort} setSort={setSort} />
                    <SortHeader k="type" label="Type" sort={sort} setSort={setSort} />
                    <th className="px-3 py-3 text-left font-medium uppercase tracking-[0.12em]">Schedule</th>
                    <SortHeader k="amount" label="Amount" sort={sort} setSort={setSort} align="right" />
                    <th className="w-20 px-3"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((i) => (
                    <tr key={i.id} className="group cursor-pointer transition hover:bg-fg/[0.025]" onClick={() => setEditing(i)}>
                      <td className="px-3 py-3.5 text-muted">{dayLabel(i.date)}</td>
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[11px] font-semibold" style={{ background: `color-mix(in oklab, ${typeColor(i.type)} 14%, transparent)`, color: typeColor(i.type) }}>
                            {initials(i.source)}
                          </span>
                          <div className="min-w-0">
                            <p className="max-w-[260px] truncate font-medium">{i.source}</p>
                            {i.note && <p className="max-w-[260px] truncate text-xs text-subtle">{i.note}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3.5">
                        <span className="inline-flex items-center gap-1.5 text-fg-2"><span className="h-2 w-2 rounded-full" style={{ background: typeColor(i.type) }} />{label(i.type)}</span>
                      </td>
                      <td className="px-3 py-3.5">{i.recurring ? <RecurringBadge /> : <span className="text-xs text-subtle">One-time</span>}</td>
                      <td className="tabular px-3 py-3.5 text-right font-semibold text-income">+{fmt(i.amount)}</td>
                      <td className="px-3 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex gap-1 opacity-60 transition group-hover:opacity-100">
                          <button onClick={() => setEditing(i)} className="rounded-lg p-1.5 text-subtle hover:bg-fg/5 hover:text-fg" aria-label={`Edit ${i.source}`}><Pencil size={14} /></button>
                          <button onClick={() => confirm(`Delete ${i.source} (${fmt(i.amount)})?`) && del.mutate(i.id)} className="rounded-lg p-1.5 text-subtle hover:bg-expense/10 hover:text-expense" aria-label={`Delete ${i.source}`}><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-line-strong bg-fg/[0.02] text-sm">
                    <td className="px-3 py-3 text-subtle" colSpan={4}>Total · {rows.length} {rows.length === 1 ? "entry" : "entries"}</td>
                    <td className="tabular px-3 py-3 text-right font-semibold text-income">+{fmt(shownTotal)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* mobile list */}
            <ul className="divide-y divide-line md:hidden">
              {rows.map((i) => (
                <li key={i.id}>
                  <button onClick={() => setEditing(i)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-[11px] font-semibold" style={{ background: `color-mix(in oklab, ${typeColor(i.type)} 14%, transparent)`, color: typeColor(i.type) }}>{initials(i.source)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{i.source}</span>
                      <span className="block truncate text-xs text-subtle">{label(i.type)} · {dayLabel(i.date)}</span>
                    </span>
                    <span className="text-right">
                      <span className="tabular block font-semibold text-income">+{fmt(i.amount)}</span>
                      {i.recurring && <Badge tone="info">Monthly</Badge>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <IncomeModal open={editing !== undefined} initial={editing} onClose={() => setEditing(undefined)} />
    </div>
  );
}
