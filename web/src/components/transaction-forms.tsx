"use client";

import { useState } from "react";
import { Button, ErrorNote, Field, Input, Modal, Select } from "./ui";
import { ApiError } from "@/lib/api";
import { label, todayISO } from "@/lib/format";
import { useDeleteExpense, useDeleteIncome, useSaveExpense, useSaveIncome } from "@/lib/queries";
import {
  EXPENSE_CATEGORIES,
  INCOME_TYPES,
  PAYMENT_SOURCES,
  type Expense,
  type ExpenseCategory,
  type Income,
  type IncomeType,
  type PaymentSource,
} from "@/lib/types";

function errorsOf(err: unknown) {
  return err instanceof ApiError ? { message: err.fieldErrors ? null : err.message, fields: err.fieldErrors ?? {} } : { message: null, fields: {} };
}

function Recurring({ checked, onChange, text }: { checked: boolean; onChange: (v: boolean) => void; text: string }) {
  return (
    <label className="flex items-center gap-3 text-sm text-muted">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-[var(--accent-2)]" />
      {text}
    </label>
  );
}

export function IncomeModal({ open, onClose, initial }: { open: boolean; onClose: () => void; initial?: Income | null }) {
  return (
    <Modal open={open} onClose={onClose} title={initial ? "Edit income" : "Add income"} subtitle="Money coming in">
      {/* key remounts the form so state resets between different records */}
      <IncomeForm key={initial?.id ?? "new"} initial={initial} onDone={onClose} />
    </Modal>
  );
}

function IncomeForm({ initial, onDone }: { initial?: Income | null; onDone: () => void }) {
  const save = useSaveIncome();
  const del = useDeleteIncome();
  const [f, setF] = useState({
    amount: initial?.amount?.toString() ?? "",
    source: initial?.source ?? "",
    type: (initial?.type ?? "SALARY") as IncomeType,
    date: initial?.date ?? todayISO(),
    note: initial?.note ?? "",
    recurring: initial?.recurring ?? false,
  });
  const err = errorsOf(save.error ?? del.error);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await save.mutateAsync({ id: initial?.id, input: { ...f, amount: Number(f.amount), note: f.note || undefined } });
      onDone();
    } catch {
      /* shown via save.error */
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Amount" error={err.fields.amount}>
        <Input autoFocus type="number" inputMode="decimal" min="0.01" step="0.01" required value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} className="tabular !py-3 text-2xl font-semibold" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Type">
          <Select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as IncomeType })}>
            {INCOME_TYPES.map((t) => (
              <option key={t} value={t}>{label(t)}</option>
            ))}
          </Select>
        </Field>
        <Field label="Date" error={err.fields.date}>
          <Input type="date" required value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
        </Field>
      </div>
      <Field label="Source" error={err.fields.source}>
        <Input required maxLength={120} placeholder="Employer, client, bank…" value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })} />
      </Field>
      <Field label="Note" error={err.fields.note}>
        <Input maxLength={500} placeholder="Optional" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
      </Field>
      <Recurring checked={f.recurring} onChange={(recurring) => setF({ ...f, recurring })} text="This repeats every month" />
      <ErrorNote message={err.message} />
      <div className="flex items-center justify-between gap-3 pt-2">
        {initial ? (
          <Button
            type="button"
            variant="danger"
            loading={del.isPending}
            onClick={async () => {
              if (!confirm("Delete this income entry?")) return;
              try {
                await del.mutateAsync(initial.id);
                onDone();
              } catch {
                /* shown via del.error */
              }
            }}
          >
            Delete
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" loading={save.isPending}>
          {initial ? "Save changes" : "Add income"}
        </Button>
      </div>
    </form>
  );
}

export function ExpenseModal({ open, onClose, initial }: { open: boolean; onClose: () => void; initial?: Expense | null }) {
  return (
    <Modal open={open} onClose={onClose} title={initial ? "Edit expense" : "Add expense"} subtitle="Money going out">
      <ExpenseForm key={initial?.id ?? "new"} initial={initial} onDone={onClose} />
    </Modal>
  );
}

const QUICK_CATEGORIES: ExpenseCategory[] = ["FOOD", "GROCERIES", "TRANSPORT", "SHOPPING", "UTILITIES", "ENTERTAINMENT"];

function ExpenseForm({ initial, onDone }: { initial?: Expense | null; onDone: () => void }) {
  const save = useSaveExpense();
  const del = useDeleteExpense();
  const [f, setF] = useState({
    amount: initial?.amount?.toString() ?? "",
    category: (initial?.category ?? "FOOD") as ExpenseCategory,
    merchant: initial?.merchant ?? "",
    paymentSource: (initial?.paymentSource ?? "UPI") as PaymentSource,
    date: initial?.date ?? todayISO(),
    note: initial?.note ?? "",
    recurring: initial?.recurring ?? false,
  });
  const err = errorsOf(save.error ?? del.error);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await save.mutateAsync({
        id: initial?.id,
        input: { ...f, amount: Number(f.amount), merchant: f.merchant || undefined, note: f.note || undefined },
      });
      onDone();
    } catch {
      /* shown via save.error */
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Amount" error={err.fields.amount}>
        <Input autoFocus type="number" inputMode="decimal" min="0.01" step="0.01" required value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} className="tabular !py-3 text-2xl font-semibold" />
      </Field>
      <div>
        <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-subtle">Category</span>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {QUICK_CATEGORIES.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => setF({ ...f, category: c })}
              className={`rounded-full border px-3 py-1 text-xs transition ${f.category === c ? "border-brand bg-brand/15 text-brand" : "border-line-strong text-muted hover:text-fg"}`}
            >
              {label(c)}
            </button>
          ))}
          <select
            aria-label="More categories"
            value={QUICK_CATEGORIES.includes(f.category) ? "" : f.category}
            onChange={(e) => e.target.value && setF({ ...f, category: e.target.value as ExpenseCategory })}
            className={`rounded-full border bg-transparent px-3 py-1 text-xs outline-none transition ${QUICK_CATEGORIES.includes(f.category) ? "border-line-strong text-muted" : "border-brand bg-brand/15 text-brand"}`}
          >
            <option value="">More…</option>
            {EXPENSE_CATEGORIES.filter((c) => !QUICK_CATEGORIES.includes(c)).map((c) => (
              <option key={c} value={c}>{label(c)}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Paid via">
          <Select value={f.paymentSource} onChange={(e) => setF({ ...f, paymentSource: e.target.value as PaymentSource })}>
            {PAYMENT_SOURCES.map((p) => (
              <option key={p} value={p}>{label(p)}</option>
            ))}
          </Select>
        </Field>
        <Field label="Date" error={err.fields.date}>
          <Input type="date" required value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
        </Field>
      </div>
      <Field label="Merchant" error={err.fields.merchant}>
        <Input maxLength={120} placeholder="Swiggy, Uber, landlord…" value={f.merchant} onChange={(e) => setF({ ...f, merchant: e.target.value })} />
      </Field>
      <Field label="Note" error={err.fields.note}>
        <Input maxLength={500} placeholder="Optional" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
      </Field>
      <Recurring checked={f.recurring} onChange={(recurring) => setF({ ...f, recurring })} text="Recurring (rent, subscription, EMI…)" />
      <ErrorNote message={err.message} />
      <div className="flex items-center justify-between gap-3 pt-2">
        {initial ? (
          <Button
            type="button"
            variant="danger"
            loading={del.isPending}
            onClick={async () => {
              if (!confirm("Delete this expense?")) return;
              try {
                await del.mutateAsync(initial.id);
                onDone();
              } catch {
                /* shown via del.error */
              }
            }}
          >
            Delete
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" loading={save.isPending}>
          {initial ? "Save changes" : "Add expense"}
        </Button>
      </div>
    </form>
  );
}
