"use client";

import { Plus, Repeat, Search } from "lucide-react";
import { useDeferredValue, useState } from "react";
import { Avatar } from "@/components/avatar";
import { MonthPicker } from "@/components/month-picker";
import { PageHeader } from "@/components/page-header";
import { ExpenseModal } from "@/components/transaction-forms";
import { Badge, Button, ErrorNote, Select, Skeleton } from "@/components/ui";
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
  const groups = new Map<string, Expense[]>();
  for (const e of data ?? []) groups.set(e.date, [...(groups.get(e.date) ?? []), e]);

  return (
    <div className="space-y-6">
      <PageHeader title="Expenses" subtitle="Everything going out this month.">
        <MonthPicker />
        <Button onClick={() => setEditing(null)}>
          <Plus size={16} /> Add expense
        </Button>
      </PageHeader>

      <div className="panel flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle" />
          <input placeholder="Search merchant or note…" value={search} onChange={(e) => setSearch(e.target.value)} className="field pl-10" />
        </div>
        <Select value={category} onChange={(e) => setCategory(e.target.value)} className="sm:w-52">
          <option value="">All categories</option>
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c} value={c}>{label(c)}</option>
          ))}
        </Select>
        <div className="flex items-baseline gap-2 px-2 sm:ml-auto">
          <span className="text-xs text-subtle">{data?.length ?? 0} transactions</span>
          <span className="tabular text-lg font-semibold">{money(total, cur)}</span>
        </div>
      </div>

      <div className="panel overflow-hidden">
        {isLoading ? (
          <div className="space-y-3 p-6">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : error ? (
          <div className="p-6"><ErrorNote message={error.message} /></div>
        ) : !data?.length ? (
          <p className="p-14 text-center text-sm text-muted">{q || category ? "No expenses match these filters." : "No expenses logged for this month."}</p>
        ) : (
          [...groups.entries()].map(([date, items]) => (
            <div key={date}>
              <div className="sticky top-0 z-10 flex justify-between border-b border-line bg-surface-2/95 px-6 py-2 text-[11px] font-medium uppercase tracking-wider text-subtle backdrop-blur">
                <span>{dayLabel(date)}</span>
                <span className="tabular">{money(items.reduce((a, e) => a + e.amount, 0), cur)}</span>
              </div>
              <ul className="divide-y divide-line">
                {items.map((e) => (
                  <li key={e.id}>
                    <button onClick={() => setEditing(e)} className="flex w-full items-center gap-4 px-6 py-3.5 text-left transition hover:bg-white/[0.025]">
                      <Avatar text={e.merchant ?? label(e.category)} />
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 truncate font-medium">
                          {e.merchant ?? label(e.category)}
                          {e.recurring && <Badge tone="info"><Repeat size={9} /> Recurring</Badge>}
                        </p>
                        <p className="truncate text-xs text-subtle">
                          {label(e.paymentSource)}
                          {e.note ? ` · ${e.note}` : ""}
                        </p>
                      </div>
                      <span className="hidden sm:inline"><Badge>{label(e.category)}</Badge></span>
                      <span className="tabular w-28 text-right font-medium">−{money(e.amount, cur)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>

      <ExpenseModal open={editing !== undefined} initial={editing} onClose={() => setEditing(undefined)} />
    </div>
  );
}
