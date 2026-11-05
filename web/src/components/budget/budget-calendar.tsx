"use client";

import { useState } from "react";
import type { BudgetStatus } from "@/lib/types";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const STYLE = {
  UNDER: { cell: "bg-income/[0.08] ring-income/25", bar: "bg-income" },
  NEAR: { cell: "bg-warn/[0.09] ring-warn/30", bar: "bg-warn" },
  OVER: { cell: "bg-expense/[0.1] ring-expense/30", bar: "bg-expense" },
  TODAY: { cell: "bg-fg/[0.05] ring-fg/40 ring-2", bar: "bg-fg" },
  FUTURE: { cell: "bg-fg/[0.015] ring-line", bar: "bg-fg/20" },
} as const;

/** Day-by-day history (blueprint §8.3 "optional calendar view"): spending against each day's allowance. */
export function BudgetCalendar({ b, format }: { b: BudgetStatus; format: (n: number) => string }) {
  const [sel, setSel] = useState<number | null>(null);
  const first = new Date(b.days[0].date + "T00:00:00");
  const lead = (first.getDay() + 6) % 7; // Monday-first offset
  const picked = sel != null ? b.days[sel] : null;

  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5 text-center text-[10.5px] uppercase tracking-wider text-subtle sm:gap-2">
        {WEEKDAYS.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1.5 sm:gap-2">
        {Array.from({ length: lead }).map((_, i) => (
          <span key={`l${i}`} />
        ))}
        {b.days.map((d, i) => {
          const s = STYLE[d.status];
          const pct = d.allowance > 0 ? Math.min(100, (d.spent / d.allowance) * 100) : d.spent > 0 ? 100 : 0;
          return (
            <button
              key={d.date}
              onClick={() => setSel(sel === i ? null : i)}
              className={`group relative flex aspect-square flex-col justify-between rounded-xl p-1.5 text-left ring-1 ring-inset transition hover:scale-[1.04] sm:p-2.5 ${s.cell} ${sel === i ? "!ring-2 !ring-brand" : ""}`}
              aria-label={`Day ${i + 1}: spent ${format(d.spent)} of ${format(d.allowance)}`}
            >
              <span className="flex items-center justify-between text-[11px] font-medium text-fg-2 sm:text-xs">
                {i + 1}
                {d.status === "TODAY" && <span className="hidden text-[9px] uppercase tracking-wider text-brand sm:inline">Today</span>}
              </span>
              {d.status !== "FUTURE" && (
                <span className="hidden truncate text-[11px] font-medium tabular sm:block">{d.spent > 0 ? format(d.spent) : "—"}</span>
              )}
              <span className="h-1 overflow-hidden rounded-full bg-fg/10">
                <span className={`block h-full rounded-full ${s.bar}`} style={{ width: `${d.status === "FUTURE" ? 0 : pct}%` }} />
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap gap-3 text-subtle">
          <Legend className="bg-income" text="Under" />
          <Legend className="bg-warn" text="Within 80–100%" />
          <Legend className="bg-expense" text="Over" />
        </div>
        <p className="tabular text-muted">
          {picked
            ? `Day ${sel! + 1}: ${picked.status === "FUTURE" ? `allowance ${format(picked.allowance)}` : `${format(picked.spent)} of ${format(picked.allowance)}`}`
            : "Tap a day for details"}
        </p>
      </div>
    </div>
  );
}

function Legend({ className, text }: { className: string; text: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-sm ${className}`} />
      {text}
    </span>
  );
}
