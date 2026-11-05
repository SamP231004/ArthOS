"use client";

import { useState } from "react";

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

/** Interactive explainer: how fixed vs adaptive daily budgets react to real spending. Assumes a 30-day month. */
export function BudgetSimulator() {
  const DAYS = 30;
  const [budget, setBudget] = useState(30000);
  const [day, setDay] = useState(12);
  const [spentPct, setSpentPct] = useState(55); // of budget, by today

  const spent = (budget * spentPct) / 100;
  const fixed = budget / DAYS;
  const expectedByNow = fixed * (day - 1);
  const remainingDays = DAYS - day + 1;
  const adaptive = Math.max(0, (budget - spent) / remainingDays);
  const delta = adaptive - fixed;
  const over = spent > expectedByNow;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
      <div className="space-y-7">
        <Slider label="Monthly budget" value={inr(budget)} min={10000} max={150000} step={1000} v={budget} on={setBudget} />
        <Slider label="Today is day" value={`${day} of ${DAYS}`} min={1} max={DAYS} step={1} v={day} on={setDay} />
        <Slider label="Spent so far" value={`${inr(spent)} · ${spentPct}%`} min={0} max={100} step={1} v={spentPct} on={setSpentPct} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="panel p-5">
          <p className="text-xs text-subtle">Fixed daily</p>
          <p className="tabular mt-2 text-3xl font-semibold tracking-tight">{inr(fixed)}</p>
          <p className="mt-2 text-xs leading-relaxed text-muted">Same number every day, no matter what happened yesterday.</p>
        </div>
        <div className="panel-glow p-5">
          <p className="text-xs text-brand">Adaptive daily · ArthOS</p>
          <p className="tabular mt-2 text-3xl font-semibold tracking-tight text-gold">{inr(adaptive)}</p>
          <p className={`mt-2 text-xs ${delta >= 0 ? "text-income" : "text-expense"}`}>
            {delta >= 0 ? "+" : "−"}
            {inr(Math.abs(delta))} vs fixed
          </p>
        </div>
        <div className="panel p-5 sm:col-span-2">
          <p className="text-sm leading-relaxed text-fg-2">
            {over ? (
              <>
                You&apos;re <span className="text-expense">{inr(spent - expectedByNow)}</span> ahead of pace. Instead of a red warning, ArthOS quietly
                spreads it over the <span className="text-fg">{remainingDays} days</span> left — so you still finish the month on budget.
              </>
            ) : (
              <>
                You&apos;re <span className="text-income">{inr(expectedByNow - spent)}</span> under pace. Those savings roll forward, lifting every remaining day to{" "}
                <span className="text-fg">{inr(adaptive)}</span>.
              </>
            )}
          </p>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/5">
            <div className="h-full rounded-full bg-gradient-to-r from-gold-3 to-gold-1 transition-all" style={{ width: `${Math.min(100, spentPct)}%` }} />
          </div>
          <div className="mt-1.5 flex justify-between text-[11px] text-subtle">
            <span>Spent {spentPct}%</span>
            <span>Month {Math.round(((day - 1) / DAYS) * 100)}% done</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Slider({ label, value, min, max, step, v, on }: { label: string; value: string; min: number; max: number; step: number; v: number; on: (n: number) => void }) {
  return (
    <label className="block">
      <div className="mb-2.5 flex items-baseline justify-between">
        <span className="text-sm text-muted">{label}</span>
        <span className="tabular text-sm font-medium">{value}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={v} onChange={(e) => on(Number(e.target.value))} className="w-full" />
    </label>
  );
}
