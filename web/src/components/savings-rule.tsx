"use client";

import { PiggyBank } from "lucide-react";
import { Input } from "./ui";
import { money } from "@/lib/format";
import { setAside, type SavingsMode } from "@/lib/savings";

const PRESETS = [10, 20, 30, 50];

/**
 * Pay-yourself-first control: a share of every income, or a fixed amount each month, set aside the moment income
 * arrives. Shows a live example so the rule is concrete.
 */
export function SavingsRuleField({
  mode,
  value,
  onChange,
  currency,
  exampleIncome = 50_000,
}: {
  mode: SavingsMode;
  value: string;
  onChange: (mode: SavingsMode, value: string) => void;
  currency: string;
  exampleIncome?: number;
}) {
  const n = Number(value) || 0;
  const saved = setAside({ mode, value: n }, exampleIncome);
  const invalid = mode === "PERCENT" && n > 100;

  return (
    <div className="space-y-3">
      <div role="radiogroup" aria-label="Savings rule" className="inline-flex rounded-xl border border-line bg-fg/[0.02] p-0.5 text-sm">
        {(["PERCENT", "FIXED"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={mode === m}
            onClick={() => onChange(m, m === mode ? value : m === "PERCENT" ? "20" : "10000")}
            className={`rounded-lg px-3.5 py-1.5 font-medium transition ${mode === m ? "bg-surface text-fg shadow-sm ring-1 ring-line-strong" : "text-muted hover:text-fg"}`}
          >
            {m === "PERCENT" ? "% of every income" : "Fixed amount a month"}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-36">
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            max={mode === "PERCENT" ? 100 : undefined}
            step="any"
            value={value}
            onChange={(e) => onChange(mode, e.target.value)}
            className="tabular pr-9 font-semibold"
            aria-label={mode === "PERCENT" ? "Percent of income to save" : "Amount to save each month"}
            aria-invalid={invalid}
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-subtle">{mode === "PERCENT" ? "%" : currency}</span>
        </div>
        {mode === "PERCENT" &&
          PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onChange("PERCENT", String(p))}
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${n === p ? "border-brand bg-brand/10 text-brand" : "border-line text-muted hover:text-fg"}`}
            >
              {p}%
            </button>
          ))}
      </div>

      <p className={`flex items-start gap-2 text-xs leading-relaxed ${invalid ? "text-expense" : "text-subtle"}`}>
        <PiggyBank size={14} className="mt-px shrink-0 text-brand" />
        {invalid
          ? "A percentage can't be more than 100."
          : `When ${money(exampleIncome, currency)} lands, ${money(saved, currency)} is saved straight away — you budget and spend from the remaining ${money(exampleIncome - saved, currency)}.`}
      </p>
    </div>
  );
}
