"use client";

import { useState } from "react";
import { MonthPicker } from "@/components/month-picker";
import { IncomeModal } from "@/components/transaction-forms";
import { Button, Card, ErrorNote, Spinner } from "@/components/ui";
import { useAuth } from "@/lib/auth-store";
import { dayLabel, label, money } from "@/lib/format";
import { useIncomes } from "@/lib/queries";
import { useMonth } from "@/lib/ui-store";
import type { Income } from "@/lib/types";

export default function IncomePage() {
  const month = useMonth();
  const user = useAuth((s) => s.user);
  const cur = user?.currency ?? "INR";
  const { data, isLoading, error } = useIncomes(month);
  const [editing, setEditing] = useState<Income | null | undefined>(undefined);

  const total = (data ?? []).reduce((a, i) => a + i.amount, 0);
  const target = user?.monthlyIncomeTarget;
  const pct = target ? Math.min(100, (total / target) * 100) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Income</h1>
          <p className="text-sm text-muted">Everything coming in this month.</p>
        </div>
        <div className="flex items-center gap-2">
          <MonthPicker />
          <Button onClick={() => setEditing(null)}>+ Add income</Button>
        </div>
      </div>

      <Card>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted">Received</p>
            <p className="tabular text-3xl font-semibold text-income">{money(total, cur)}</p>
          </div>
          {target ? (
            <p className="text-sm text-muted">
              Target <span className="tabular text-fg">{money(target, cur)}</span>
            </p>
          ) : (
            <p className="text-sm text-muted">Set a monthly target in Settings</p>
          )}
        </div>
        {pct != null && (
          <div className="mt-4 h-2 rounded-full bg-surface-2">
            <div className="h-2 rounded-full bg-income" style={{ width: `${pct}%` }} />
          </div>
        )}
      </Card>

      <Card className="p-0">
        {isLoading ? (
          <Spinner />
        ) : error ? (
          <div className="p-5"><ErrorNote message={error.message} /></div>
        ) : !data?.length ? (
          <p className="p-10 text-center text-sm text-muted">No income logged for this month.</p>
        ) : (
          <ul className="divide-y divide-border">
            {data.map((i) => (
              <li key={i.id}>
                <button onClick={() => setEditing(i)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-surface-2/50">
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {i.source}
                      {i.recurring && <span className="ml-2 rounded-full bg-info/10 px-2 py-0.5 text-[10px] text-info">Monthly</span>}
                    </p>
                    <p className="text-xs text-muted">
                      {label(i.type)} · {dayLabel(i.date)}
                      {i.note ? ` · ${i.note}` : ""}
                    </p>
                  </div>
                  <span className="tabular font-medium text-income">+{money(i.amount, cur)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <IncomeModal open={editing !== undefined} initial={editing} onClose={() => setEditing(undefined)} />
    </div>
  );
}
