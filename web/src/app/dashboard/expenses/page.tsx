"use client";

import { useDeferredValue, useState } from "react";
import { MonthPicker } from "@/components/month-picker";
import { ExpenseModal } from "@/components/transaction-forms";
import { Button, Card, ErrorNote, Input, Select, Spinner } from "@/components/ui";
import { useAuth } from "@/lib/auth-store";
import { dayLabel, label, money } from "@/lib/format";
import { useExpenses } from "@/lib/queries";
import { useMonth } from "@/lib/ui-store";
import { EXPENSE_CATEGORIES, type Expense } from "@/lib/types";

export default function ExpensesPage() {
  const month = useMonth();
  const cur = useAuth((s) => s.user?.currency ?? "INR");
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const q = useDeferredValue(search.trim());
  const { data, isLoading, error } = useExpenses(month, { category: category || undefined, q: q || undefined });
  const [editing, setEditing] = useState<Expense | null | undefined>(undefined);

  const total = (data ?? []).reduce((a, e) => a + e.amount, 0);

  // Group by date for a readable history.
  const groups = new Map<string, Expense[]>();
  for (const e of data ?? []) groups.set(e.date, [...(groups.get(e.date) ?? []), e]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Expenses</h1>
          <p className="text-sm text-muted">Everything going out this month.</p>
        </div>
        <div className="flex items-center gap-2">
          <MonthPicker />
          <Button onClick={() => setEditing(null)}>+ Add expense</Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input placeholder="Search merchant or note…" value={search} onChange={(e) => setSearch(e.target.value)} className="sm:max-w-xs" />
        <Select value={category} onChange={(e) => setCategory(e.target.value)} className="sm:max-w-48">
          <option value="">All categories</option>
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c} value={c}>{label(c)}</option>
          ))}
        </Select>
        <p className="tabular ml-auto self-center text-sm text-muted">
          {data?.length ?? 0} items · <span className="text-fg">{money(total, cur)}</span>
        </p>
      </div>

      <Card className="p-0">
        {isLoading ? (
          <Spinner />
        ) : error ? (
          <div className="p-5"><ErrorNote message={error.message} /></div>
        ) : !data?.length ? (
          <p className="p-10 text-center text-sm text-muted">{q || category ? "No expenses match these filters." : "No expenses logged for this month."}</p>
        ) : (
          [...groups.entries()].map(([date, items]) => (
            <div key={date}>
              <div className="flex justify-between border-b border-border bg-surface-2/40 px-5 py-2 text-xs text-muted">
                <span>{dayLabel(date)}</span>
                <span className="tabular">{money(items.reduce((a, e) => a + e.amount, 0), cur)}</span>
              </div>
              <ul className="divide-y divide-border">
                {items.map((e) => (
                  <li key={e.id}>
                    <button onClick={() => setEditing(e)} className="flex w-full items-center justify-between gap-4 px-5 py-3.5 text-left hover:bg-surface-2/50">
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {e.merchant ?? label(e.category)}
                          {e.recurring && <span className="ml-2 rounded-full bg-info/10 px-2 py-0.5 text-[10px] text-info">Recurring</span>}
                        </p>
                        <p className="text-xs text-muted">
                          {label(e.category)} · {label(e.paymentSource)}
                          {e.note ? ` · ${e.note}` : ""}
                        </p>
                      </div>
                      <span className="tabular font-medium">−{money(e.amount, cur)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </Card>

      <ExpenseModal open={editing !== undefined} initial={editing} onClose={() => setEditing(undefined)} />
    </div>
  );
}
