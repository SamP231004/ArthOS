"use client";

import { useState } from "react";
import { Choice, NumberField, SplitBar, Stat, ToolFrame, inr, inrWords } from "./controls";

// The free calculators behind /tools/*. Pure arithmetic in the browser: nothing typed here leaves the page.

/* ---------------------------------------------------------------- Daily budget */

export function DailyBudgetCalculator() {
  const [budget, setBudget] = useState(30000);
  const [spent, setSpent] = useState(14000);
  const [days, setDays] = useState<"28" | "29" | "30" | "31">("30");
  const [day, setDay] = useState(12);

  const n = Number(days);
  const today = Math.min(Math.max(1, day), n);
  const left = n - today + 1; // today counts as a spending day
  const fixed = budget / n;
  const adaptive = Math.max(0, (budget - spent) / left);
  const expected = fixed * (today - 1);
  const ahead = spent - expected;
  const remaining = budget - spent;

  return (
    <ToolFrame
      inputs={
        <>
          <NumberField label="Monthly spending budget" prefix="₹" value={budget} onChange={setBudget} max={300000} step={500} hint="Leave out rent, EMIs and other fixed bills — they're paid once, not daily." />
          <NumberField label="Spent so far this month" prefix="₹" value={spent} onChange={setSpent} max={Math.max(budget * 1.5, 1000)} step={100} />
          <Choice label="Days in this month" value={days} onChange={setDays} options={[["28", "28"], ["29", "29"], ["30", "30"], ["31", "31"]]} />
          <NumberField label="Today's date" value={today} onChange={setDay} min={1} max={n} suffix={`of ${n}`} />
        </>
      }
      results={
        <>
          <Stat big tone="mark" label="Safe to spend today (adaptive)" value={inr(adaptive)} sub={`${inr(Math.max(0, remaining))} left, spread over the ${left} day${left === 1 ? "" : "s"} remaining including today.`} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Stat label="Fixed daily limit" value={inr(fixed)} sub="The same every day: budget ÷ days in the month." />
            <Stat
              label={ahead > 0 ? "Ahead of pace" : "Under pace"}
              tone={ahead > 0 ? "expense" : "income"}
              value={inr(Math.abs(ahead))}
              sub={ahead > 0 ? "Spent more than an even split by now — today's number shrinks to absorb it." : "Spent less than an even split — the extra rolls into the days ahead."}
            />
          </div>
          {remaining < 0 && (
            <p className="panel p-4 text-sm text-expense">You&apos;re {inr(-remaining)} over this month&apos;s budget. Any spending from here adds to the overshoot.</p>
          )}
        </>
      }
    />
  );
}

/* ---------------------------------------------------------------- 50/30/20 */

const PRESETS: [string, string, [number, number, number]][] = [
  ["50-30-20", "50 / 30 / 20", [50, 30, 20]],
  ["60-20-20", "60 / 20 / 20 · high rent", [60, 20, 20]],
  ["40-30-30", "40 / 30 / 30 · saver", [40, 30, 30]],
  ["70-20-10", "70 / 20 / 10 · starting out", [70, 20, 10]],
];

export function FiftyThirtyTwentyCalculator() {
  const [income, setIncome] = useState(60000);
  const [needs, setNeeds] = useState(50);
  const [wants, setWants] = useState(30);
  const savings = Math.max(0, 100 - needs - wants);
  const preset = PRESETS.find(([, , r]) => r[0] === needs && r[1] === wants)?.[0] ?? "custom";

  const setNeedsClamped = (v: number) => {
    setNeeds(Math.min(v, 100));
    if (v + wants > 100) setWants(100 - v);
  };
  const setWantsClamped = (v: number) => setWants(Math.min(v, 100 - needs));

  return (
    <ToolFrame
      inputs={
        <>
          <NumberField label="Monthly take-home salary" prefix="₹" value={income} onChange={setIncome} max={500000} step={1000} hint="After tax, PF and other deductions — what lands in your bank." />
          <Choice
            label="Split"
            value={preset}
            onChange={(id) => {
              const p = PRESETS.find(([k]) => k === id);
              if (p) {
                setNeeds(p[2][0]);
                setWants(p[2][1]);
              }
            }}
            options={[...PRESETS.map(([k, l]) => [k, l] as [string, string]), ...(preset === "custom" ? ([["custom", "Custom"]] as [string, string][]) : [])]}
          />
          <NumberField label="Needs" suffix="%" value={needs} onChange={setNeedsClamped} max={100} hint="Rent, groceries, bills, EMIs, insurance, commute." />
          <NumberField label="Wants" suffix="%" value={wants} onChange={setWantsClamped} max={100 - needs} hint="Eating out, shopping, trips, subscriptions." />
          <p className="text-sm text-fg-2">
            Savings & investments: <span className="tabular font-semibold text-fg">{savings}%</span> <span className="text-subtle">(what&apos;s left)</span>
          </p>
        </>
      }
      results={
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label={`Needs · ${needs}%`} value={inr((income * needs) / 100)} />
            <Stat label={`Wants · ${wants}%`} value={inr((income * wants) / 100)} />
            <Stat label={`Save first · ${savings}%`} tone="income" value={inr((income * savings) / 100)} />
          </div>
          <SplitBar
            parts={[
              { label: "Needs", value: needs, color: "var(--c4)" },
              { label: "Wants", value: wants, color: "var(--c3)" },
              { label: "Savings", value: savings, color: "var(--income)" },
            ]}
          />
          <Stat big tone="income" label="Saved in a year" value={inrWords((income * savings * 12) / 100)} sub={`Daily allowance for wants: about ${inr((income * wants) / 100 / 30)} a day.`} />
        </>
      }
    />
  );
}

/* ---------------------------------------------------------------- SIP */

/** Month-by-month SIP with an annual step-up; instalments at the start of each month, returns compounded monthly. */
export function sipSchedule(monthly: number, annualReturn: number, years: number, stepUp: number) {
  const i = annualReturn / 100 / 12;
  let value = 0;
  let invested = 0;
  let sip = monthly;
  const rows: { year: number; invested: number; value: number; sip: number }[] = [];
  for (let y = 1; y <= years; y++) {
    for (let m = 0; m < 12; m++) {
      value = (value + sip) * (1 + i);
      invested += sip;
    }
    rows.push({ year: y, invested, value, sip });
    sip = sip * (1 + stepUp / 100);
  }
  return rows;
}

export function SipCalculator() {
  const [monthly, setMonthly] = useState(10000);
  const [ret, setRet] = useState(12);
  const [years, setYears] = useState(15);
  const [step, setStep] = useState(10);

  const rows = sipSchedule(monthly, ret, Math.max(1, Math.round(years)), step);
  const last = rows[rows.length - 1];
  const gain = last.value - last.invested;
  const real = last.value / Math.pow(1.06, years);

  return (
    <ToolFrame
      inputs={
        <>
          <NumberField label="Monthly SIP" prefix="₹" value={monthly} onChange={setMonthly} max={200000} step={500} />
          <NumberField label="Expected return (yearly)" suffix="%" value={ret} onChange={setRet} max={30} step={0.5} hint="Long-run equity funds in India have often returned 10–14% a year, but returns are never guaranteed." />
          <NumberField label="Duration" suffix="years" value={years} onChange={setYears} min={1} max={40} />
          <NumberField label="Yearly step-up" suffix="%" value={step} onChange={setStep} max={50} hint="Raise the SIP each year as your salary grows. 0 = flat SIP." />
        </>
      }
      results={
        <>
          <Stat big tone="mark" label={`Estimated value after ${years} years`} value={inrWords(last.value)} sub={`About ${inrWords(real)} in today's money, at 6% inflation.`} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Stat label="You invest" value={inrWords(last.invested)} sub={step > 0 ? `SIP reaches ${inr(last.sip)} a month in the final year.` : undefined} />
            <Stat label="Estimated returns" tone="income" value={inrWords(gain)} sub={`${Math.round((gain / Math.max(1, last.value)) * 100)}% of the final value is growth.`} />
          </div>
          <SplitBar
            parts={[
              { label: "Invested", value: last.invested, color: "var(--c4)" },
              { label: "Returns", value: gain, color: "var(--income)" },
            ]}
          />
          <div className="panel max-h-72 overflow-auto p-0">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-surface text-left text-xs text-subtle">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Year</th>
                  <th className="px-4 py-2.5 font-medium">Monthly SIP</th>
                  <th className="px-4 py-2.5 font-medium">Invested</th>
                  <th className="px-4 py-2.5 font-medium">Value</th>
                </tr>
              </thead>
              <tbody className="tabular">
                {rows.map((r) => (
                  <tr key={r.year} className="border-t border-line">
                    <td className="px-4 py-2 text-muted">{r.year}</td>
                    <td className="px-4 py-2">{inr(r.sip)}</td>
                    <td className="px-4 py-2">{inrWords(r.invested)}</td>
                    <td className="px-4 py-2 text-fg">{inrWords(r.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      }
    />
  );
}

/* ---------------------------------------------------------------- Emergency fund */

const PROFILES: [string, string, number][] = [
  ["stable", "Stable salaried job", 6],
  ["dependents", "Single income, family depends on you", 9],
  ["variable", "Freelance, business or variable pay", 12],
];

export function EmergencyFundCalculator() {
  const [essentials, setEssentials] = useState(35000);
  const [profile, setProfile] = useState("stable");
  const [months, setMonths] = useState(6);
  const [saved, setSaved] = useState(50000);
  const [monthlySave, setMonthlySave] = useState(10000);

  const target = essentials * months;
  const gap = Math.max(0, target - saved);
  const toBuild = monthlySave > 0 ? Math.ceil(gap / monthlySave) : Infinity;
  const pct = target > 0 ? Math.min(100, (saved / target) * 100) : 0;

  return (
    <ToolFrame
      inputs={
        <>
          <NumberField label="Monthly essentials" prefix="₹" value={essentials} onChange={setEssentials} max={300000} step={1000} hint="Only what you can't skip: rent, groceries, EMIs, insurance, bills, school fees." />
          <Choice
            label="Your situation"
            value={profile}
            onChange={(p) => {
              setProfile(p);
              setMonths(PROFILES.find(([k]) => k === p)?.[2] ?? 6);
            }}
            options={PROFILES.map(([k, l]) => [k, l] as [string, string])}
          />
          <NumberField label="Months of cover" suffix="months" value={months} onChange={setMonths} min={1} max={24} />
          <NumberField label="Already set aside" prefix="₹" value={saved} onChange={setSaved} max={Math.max(target * 1.2, 100000)} step={1000} />
          <NumberField label="You can add each month" prefix="₹" value={monthlySave} onChange={setMonthlySave} max={200000} step={500} />
        </>
      }
      results={
        <>
          <Stat big tone="mark" label="Your emergency fund target" value={inrWords(target)} sub={`${months} months × ${inr(essentials)} of essentials.`} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Stat label="Still to build" tone={gap > 0 ? "fg" : "income"} value={gap > 0 ? inrWords(gap) : "Done ✓"} sub={`${Math.round(pct)}% funded.`} />
            <Stat
              label="Time to fully fund"
              value={gap === 0 ? "Already there" : Number.isFinite(toBuild) ? `${toBuild} month${toBuild === 1 ? "" : "s"}` : "—"}
              sub={gap > 0 && Number.isFinite(toBuild) ? `About ${(toBuild / 12).toFixed(1)} years at ${inr(monthlySave)} a month.` : undefined}
            />
          </div>
          <div className="panel p-5">
            <div className="h-3 overflow-hidden rounded-full bg-fg/5">
              <div className="h-full rounded-full bg-income transition-all" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-2 text-xs text-muted">
              {inr(saved)} of {inr(target)}
            </p>
          </div>
        </>
      }
    />
  );
}

/* ---------------------------------------------------------------- Savings goal */

const RATES: [string, string, number][] = [
  ["0", "No returns", 0],
  ["3.5", "Savings account · 3.5%", 3.5],
  ["6.5", "FD / RD · 6.5%", 6.5],
  ["7.5", "Debt fund · 7.5%", 7.5],
];

export function savingsGoalMonthly(target: number, already: number, months: number, annualRate: number) {
  const i = annualRate / 100 / 12;
  if (months <= 0) return Math.max(0, target - already);
  if (i === 0) return Math.max(0, (target - already) / months);
  const grow = Math.pow(1 + i, months);
  const need = target - already * grow;
  return Math.max(0, (need * i) / ((grow - 1) * (1 + i))); // deposits at the start of each month
}

export function SavingsGoalCalculator() {
  const [target, setTarget] = useState(150000);
  const [months, setMonths] = useState(12);
  const [already, setAlready] = useState(20000);
  const [rate, setRate] = useState("0");

  const r = Number(rate);
  const monthly = savingsGoalMonthly(target, already, months, r);
  const contributed = already + monthly * months;
  const earned = Math.max(0, target - contributed);

  return (
    <ToolFrame
      inputs={
        <>
          <NumberField label="Goal amount" prefix="₹" value={target} onChange={setTarget} max={5000000} step={5000} hint="A trip, a bike, a laptop, a wedding, a down payment…" />
          <NumberField label="Time to reach it" suffix="months" value={months} onChange={setMonths} min={1} max={120} />
          <NumberField label="Already saved for it" prefix="₹" value={already} onChange={setAlready} max={Math.max(target, 10000)} step={1000} />
          <Choice label="Where the money sits" value={rate} onChange={setRate} options={RATES.map(([k, l]) => [k, l] as [string, string])} />
        </>
      }
      results={
        <>
          <Stat big tone="mark" label="Save every month" value={inr(monthly)} sub={`For ${months} month${months === 1 ? "" : "s"} — about ${inr(monthly / 30)} a day.`} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Stat label="You put in" value={inrWords(contributed)} />
            <Stat label="Interest does" tone="income" value={inrWords(earned)} sub={r === 0 ? "Pick a rate to see what interest adds." : undefined} />
          </div>
          {already >= target && <p className="panel p-4 text-sm text-income">You&apos;ve already saved enough for this goal.</p>}
        </>
      }
    />
  );
}
