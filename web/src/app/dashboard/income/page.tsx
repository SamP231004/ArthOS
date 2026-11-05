"use client";

import { ArrowDownLeft, Plus, Repeat, Target } from "lucide-react";
import { useState } from "react";
import { Avatar } from "@/components/avatar";
import { MonthPicker } from "@/components/month-picker";
import { PageHeader } from "@/components/page-header";
import { IncomeModal } from "@/components/transaction-forms";
import { Badge, Button, ErrorNote, Skeleton } from "@/components/ui";
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
  const recurring = (data ?? []).filter((i) => i.recurring).reduce((a, i) => a + i.amount, 0);
  const target = user?.monthlyIncomeTarget;
  const pct = target ? Math.min(100, (total / target) * 100) : null;

  return (
    <div className="space-y-6">
      <PageHeader title="Income" subtitle="Everything coming in this month.">
        <MonthPicker />
        <Button onClick={() => setEditing(null)}>
          <Plus size={16} /> Add income
        </Button>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="panel-glow p-6 md:col-span-2">
          <p className="flex items-center gap-2 text-sm text-muted">
            <ArrowDownLeft size={15} className="text-income" /> Received this month
          </p>
          <p className="tabular mt-2 text-4xl font-semibold tracking-tight text-income sm:text-5xl">{money(total, cur)}</p>
          {pct != null ? (
            <>
              <div className="mt-6 h-2 overflow-hidden rounded-full bg-fg/[0.06]">
                <div className="h-full rounded-full bg-gradient-to-r from-[var(--income-2)] to-income transition-all duration-700" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-2 text-xs text-subtle">
                {pct.toFixed(0)}% of your {money(target, cur)} target
                {total < (target ?? 0) && ` · ${money((target ?? 0) - total, cur)} to go`}
              </p>
            </>
          ) : (
            <p className="mt-4 text-xs text-subtle">Set a monthly target in Settings to track progress.</p>
          )}
        </div>
        <div className="grid gap-4">
          <MiniStat icon={Target} label="Monthly target" value={target ? money(target, cur) : "Not set"} />
          <MiniStat icon={Repeat} label="Recurring income" value={money(recurring, cur)} />
        </div>
      </div>

      <div className="panel overflow-hidden">
        {isLoading ? (
          <div className="space-y-3 p-6">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : error ? (
          <div className="p-6"><ErrorNote message={error.message} /></div>
        ) : !data?.length ? (
          <p className="p-14 text-center text-sm text-muted">No income logged for this month.</p>
        ) : (
          <ul className="divide-y divide-line">
            {data.map((i) => (
              <li key={i.id}>
                <button onClick={() => setEditing(i)} className="flex w-full items-center gap-4 px-6 py-4 text-left transition hover:bg-fg/[0.025]">
                  <Avatar text={i.source} income />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 truncate font-medium">
                      {i.source}
                      {i.recurring && <Badge tone="info"><Repeat size={9} /> Monthly</Badge>}
                    </p>
                    <p className="truncate text-xs text-subtle">
                      {dayLabel(i.date)}
                      {i.note ? ` · ${i.note}` : ""}
                    </p>
                  </div>
                  <Badge tone="income">{label(i.type)}</Badge>
                  <span className="tabular w-28 text-right font-medium text-income">+{money(i.amount, cur)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <IncomeModal open={editing !== undefined} initial={editing} onClose={() => setEditing(undefined)} />
    </div>
  );
}

function MiniStat({ icon: Icon, label, value }: { icon: typeof Target; label: string; value: string }) {
  return (
    <div className="panel flex items-center gap-4 p-5">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-fg/[0.04] text-brand ring-1 ring-inset ring-fg/[0.06]">
        <Icon size={17} />
      </span>
      <div>
        <p className="text-xs text-subtle">{label}</p>
        <p className="tabular text-lg font-semibold">{value}</p>
      </div>
    </div>
  );
}
