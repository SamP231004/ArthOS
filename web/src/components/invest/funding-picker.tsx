"use client";

import { AlertTriangle, PiggyBank, Wallet } from "lucide-react";
import { money, monthLabel } from "@/lib/format";
import { useSummary } from "@/lib/queries";
import type { FundingSource } from "@/lib/types";

/**
 * "Pay from" for a purchase: the savings account (money already set aside) or this month's spending money (then it
 * counts as that month's spending). Shows each pot's balance for the purchase month so the choice is concrete.
 */
export function FundingPicker({ value, onChange, amount, date }: { value: FundingSource; onChange: (v: FundingSource) => void; amount: number; date: string }) {
  const month = (date || "").slice(0, 7);
  const { data: s } = useSummary(month);
  const balance = s?.savings?.closing;
  const left = s?.leftToSpend;
  const short = value === "SAVINGS" && balance != null && amount > 0 && amount > balance ? amount - Math.max(balance, 0) : 0;
  const overSpend = value === "SPENDING" && left != null && amount > 0 && amount > left;

  const options: { v: FundingSource; icon: typeof Wallet; title: string; detail: string }[] = [
    { v: "SAVINGS", icon: PiggyBank, title: "Savings account", detail: balance != null ? `${money(balance)} available` : "Money you set aside" },
    {
      v: "SPENDING",
      icon: Wallet,
      title: "Spending money",
      detail: left != null ? `Counts as ${month ? monthLabel(month) : "this month's"} spending · ${money(Math.max(left, 0))} left` : "Counts as this month's spending",
    },
  ];

  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-fg-2">Pay from</p>
      <div role="radiogroup" className="grid grid-cols-2 gap-2">
        {options.map((o) => (
          <button
            key={o.v}
            type="button"
            role="radio"
            aria-checked={value === o.v}
            onClick={() => onChange(o.v)}
            className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left transition ${value === o.v ? "border-brand bg-brand/[0.07] ring-1 ring-brand/30" : "border-line-strong hover:border-fg/25"}`}
          >
            <o.icon size={16} className={`mt-0.5 shrink-0 ${value === o.v ? "text-brand" : "text-subtle"}`} />
            <span className="min-w-0">
              <span className="block text-sm font-medium">{o.title}</span>
              <span className="block text-[11px] leading-snug text-subtle">{o.detail}</span>
            </span>
          </button>
        ))}
      </div>
      {short > 0 && (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-warn">
          <AlertTriangle size={13} className="mt-px shrink-0" /> That&apos;s {money(short)} more than your savings hold — the account would go negative. Pay the rest from spending money instead?
        </p>
      )}
      {overSpend && (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-warn">
          <AlertTriangle size={13} className="mt-px shrink-0" /> This is more than you have left to spend this month, so it would eat into your savings.
        </p>
      )}
    </div>
  );
}
