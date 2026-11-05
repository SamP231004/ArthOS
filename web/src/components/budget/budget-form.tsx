"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { MODE_META } from "./budget-meta";
import { Button, ErrorNote, Field, Input, Modal } from "../ui";
import { label, monthLabel } from "@/lib/format";
import { useDeleteBudget, useSaveBudget } from "@/lib/queries";
import { BUDGET_MODES, EXPENSE_CATEGORIES, type BudgetMode, type BudgetStatus, type ExpenseCategory } from "@/lib/types";

const DEFAULT_EXCLUDED: ExpenseCategory[] = ["RENT", "EMI"];

export function BudgetModal({ open, onClose, month, current }: { open: boolean; onClose: () => void; month: string; current?: BudgetStatus }) {
  return (
    <Modal open={open} onClose={onClose} title={current?.configured ? "Edit budget" : "Set your budget"} subtitle={`From ${monthLabel(month)} onward`}>
      <BudgetForm key={`${month}-${current?.limit}-${current?.mode}`} month={month} current={current} onDone={onClose} />
    </Modal>
  );
}

function BudgetForm({ month, current, onDone }: { month: string; current?: BudgetStatus; onDone: () => void }) {
  const save = useSaveBudget(month);
  const del = useDeleteBudget(month);
  const configured = !!current?.configured;
  const [limit, setLimit] = useState(configured ? String(current!.limit) : "");
  const [mode, setMode] = useState<BudgetMode>(configured ? current!.mode : "ADAPTIVE_DAILY");
  const [excluded, setExcluded] = useState<ExpenseCategory[]>(configured ? current!.excludedCategories : DEFAULT_EXCLUDED);

  const toggle = (c: ExpenseCategory) => setExcluded((xs) => (xs.includes(c) ? xs.filter((x) => x !== c) : [...xs, c]));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await save.mutateAsync({ limit: Number(limit), mode, excludedCategories: excluded });
      onDone();
    } catch {
      /* shown below */
    }
  }

  const err = save.error ?? del.error;
  return (
    <form onSubmit={submit} className="space-y-6">
      <Field label="Monthly spending limit" hint="Everyday spending — fixed costs you exclude below don't count against it.">
        <Input type="number" inputMode="decimal" min={1} step="1" required autoFocus value={limit} onChange={(e) => setLimit(e.target.value)} className="tabular !py-3 text-2xl font-semibold" placeholder="30000" />
      </Field>

      <div>
        <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-subtle">Mode</span>
        <div className="mt-2 grid gap-2">
          {BUDGET_MODES.map((m) => {
            const meta = MODE_META[m];
            const active = mode === m;
            return (
              <button
                type="button"
                key={m}
                onClick={() => setMode(m)}
                className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition ${active ? "border-brand/60 bg-brand/[0.07]" : "border-line-strong hover:bg-fg/[0.03]"}`}
              >
                <span className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border ${active ? "border-brand bg-brand text-accent-fg" : "border-line-strong"}`}>
                  {active && <Check size={10} strokeWidth={3} />}
                </span>
                <span>
                  <span className="flex items-center gap-2 text-sm font-medium">
                    {meta.name}
                    {m === "ADAPTIVE_DAILY" && <span className="rounded-full bg-brand/10 px-1.5 py-px text-[10px] text-brand">Recommended</span>}
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-muted">{meta.long}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-subtle">Don&apos;t count these fixed costs</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {EXPENSE_CATEGORIES.map((c) => {
            const on = excluded.includes(c);
            return (
              <button
                type="button"
                key={c}
                onClick={() => toggle(c)}
                className={`rounded-full border px-3 py-1 text-xs transition ${on ? "border-brand bg-brand/10 text-brand" : "border-line-strong text-muted hover:text-fg"}`}
              >
                {label(c)}
              </button>
            );
          })}
        </div>
      </div>

      <ErrorNote message={err?.message} />
      <div className="flex items-center justify-between gap-3">
        {configured && !current!.inherited ? (
          <Button
            type="button"
            variant="danger"
            loading={del.isPending}
            onClick={async () => {
              if (!confirm(`Remove the budget for ${monthLabel(month)}? Earlier budgets, if any, will apply instead.`)) return;
              try {
                await del.mutateAsync();
                onDone();
              } catch {
                /* shown above */
              }
            }}
          >
            Remove
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" loading={save.isPending}>
          {configured ? "Save budget" : "Start budgeting"}
        </Button>
      </div>
    </form>
  );
}
