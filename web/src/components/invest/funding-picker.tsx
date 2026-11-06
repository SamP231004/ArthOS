"use client";

import { AlertTriangle, PiggyBank, Split, Wallet, Wand2 } from "lucide-react";
import { useState } from "react";
import { Input } from "../ui";
import { money, monthLabel } from "@/lib/format";
import { useSummary } from "@/lib/queries";
import type { FundingSource } from "@/lib/types";

/**
 * How a purchase is paid for:
 * - AUTO ("Savings first"): everything the savings account holds, the rest from spending money (default);
 * - SAVINGS / SPENDING: all from one account;
 * - SPLIT: the user types how much comes from savings; the rest is spending money.
 */
export type FundingMode = "AUTO" | "SAVINGS" | "SPENDING" | "SPLIT";

export type Funding = ReturnType<typeof useFunding>;

/** Funding state for a purchase of `amount` on `date`, resolved against that month's balances. */
export function useFunding(amount: number, date: string, initial?: { mode: FundingMode; split?: number }) {
  const [mode, setMode] = useState<FundingMode>(initial?.mode ?? "AUTO");
  const [split, setSplit] = useState(initial?.split != null ? String(initial.split) : "");
  const month = (date || "").slice(0, 7);
  const s = useSummary(month).data;
  const balance = s?.savings?.closing;
  const left = s?.leftToSpend;
  const amt = Math.max(0, amount || 0);
  const clamp = (v: number) => Math.round(Math.min(Math.max(v, 0), amt) * 100) / 100;
  const fromSavings =
    mode === "SAVINGS" ? amt : mode === "SPENDING" ? 0 : mode === "SPLIT" ? clamp(Number(split) || 0) : clamp(balance == null ? amt : Math.max(balance, 0));
  const fromSpending = Math.max(0, Math.round((amt - fromSavings) * 100) / 100) || 0; // never -0 (shows as "-₹0")
  /** What the API takes: the savings part (the rest is spending), plus a matching single-source label. */
  const payload = { fromSavings, fundedFrom: (fromSavings > 0 ? "SAVINGS" : "SPENDING") as FundingSource };
  return { mode, setMode, split, setSplit, month, balance, left, amount: amt, fromSavings, fromSpending, payload };
}

/** Initial picker state for an existing buy, from how it was paid. */
export function fundingOf(fromSavings: number | undefined, amount: number): { mode: FundingMode; split?: number } {
  if (fromSavings == null || fromSavings >= amount - 0.005) return { mode: "SAVINGS" };
  if (fromSavings <= 0.005) return { mode: "SPENDING" };
  return { mode: "SPLIT", split: fromSavings };
}

const MODES: { v: FundingMode; icon: typeof Wallet; label: string }[] = [
  { v: "AUTO", icon: Wand2, label: "Savings first" },
  { v: "SAVINGS", icon: PiggyBank, label: "Savings" },
  { v: "SPENDING", icon: Wallet, label: "Spending" },
  { v: "SPLIT", icon: Split, label: "Split" },
];

export function FundingPicker({ f }: { f: Funding }) {
  const shortSavings = f.balance != null && f.fromSavings > Math.max(f.balance, 0) + 0.005 ? f.fromSavings - Math.max(f.balance, 0) : 0;
  const overSpend = f.left != null && f.fromSpending > Math.max(f.left, 0) + 0.005;

  return (
    <div className="rounded-2xl border border-line bg-fg/[0.02] p-3">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xs font-medium text-fg-2">Pay from</p>
        <p className="text-[11px] text-subtle">
          Savings {f.balance != null ? money(f.balance) : "—"} · Spending left {f.left != null ? money(Math.max(f.left, 0)) : "—"}
          {f.month ? ` (${monthLabel(f.month)})` : ""}
        </p>
      </div>
      <div role="radiogroup" className="grid grid-cols-4 gap-1 rounded-xl bg-fg/[0.04] p-1">
        {MODES.map((m) => (
          <button
            key={m.v}
            type="button"
            role="radio"
            aria-checked={f.mode === m.v}
            onClick={() => {
              f.setMode(m.v);
              if (m.v === "SPLIT" && !f.split) f.setSplit(String(Math.min(f.amount, Math.max(f.balance ?? 0, 0))));
            }}
            className={`flex items-center justify-center gap-1 whitespace-nowrap rounded-lg px-1.5 py-1.5 text-xs font-medium transition ${f.mode === m.v ? "bg-surface text-fg shadow-sm ring-1 ring-line-strong" : "text-muted hover:text-fg"}`}
          >
            <m.icon size={13} /> {m.label}
          </button>
        ))}
      </div>

      {f.mode === "SPLIT" && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="block text-[11px] text-subtle">
            From savings
            <Input type="number" min="0" max={f.amount} step="any" value={f.split} onChange={(e) => f.setSplit(e.target.value)} className="tabular mt-1" />
          </label>
          <div className="text-[11px] text-subtle">
            From spending money
            <p className="tabular mt-1 rounded-xl border border-line bg-fg/[0.03] px-3.5 py-2.5 text-sm text-fg-2">{money(f.fromSpending)}</p>
          </div>
        </div>
      )}

      {f.amount > 0 && (
        <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className="inline-flex items-center gap-1.5 text-fg-2">
            <PiggyBank size={13} className="text-income" /> <span className="tabular font-medium">{money(f.fromSavings)}</span> from savings
          </span>
          <span className="inline-flex items-center gap-1.5 text-fg-2">
            <Wallet size={13} className="text-info" /> <span className="tabular font-medium">{money(f.fromSpending)}</span> from spending
            {f.fromSpending > 0 && f.month ? <span className="text-subtle">(counts as {monthLabel(f.month)} spending)</span> : null}
          </span>
        </p>
      )}
      {shortSavings > 0 && (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-warn">
          <AlertTriangle size={13} className="mt-px shrink-0" /> {money(shortSavings)} more than your savings hold — the account would go negative. Try “Savings first”.
        </p>
      )}
      {overSpend && (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-warn">
          <AlertTriangle size={13} className="mt-px shrink-0" /> More than you have left to spend this month — it would eat into your savings.
        </p>
      )}
    </div>
  );
}
