"use client";

import { useState } from "react";
import { shortMoney } from "@/lib/format";

/** Net money put in per period (buys − sells), like a cash-flow column chart, with amount and period axes. */
export function ContributionChart({ data, format }: { data: { label: string; amount: number }[]; format: (n: number) => string }) {
  const [hover, setHover] = useState<number | null>(null);
  if (data.length === 0) return <div className="grid h-56 place-items-center text-sm text-subtle">No transactions in this view</div>;
  const max = Math.max(...data.map((d) => Math.abs(d.amount)), 1);
  const total = data.reduce((s, d) => s + d.amount, 0);
  const step = Math.max(1, Math.ceil(data.length / 8));
  const h = hover != null ? data[hover] : null;
  const ticks = [1, 0.75, 0.5, 0.25, 0];

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between text-xs">
        <span className="text-subtle">{h ? h.label : `${data.length} periods`}</span>
        <span className="tabular font-medium">{h ? format(h.amount) : `Net ${format(total)}`}</span>
      </div>
      <div className="grid grid-cols-[48px_1fr] gap-2">
        {/* y axis */}
        <div className="relative h-56">
          {ticks.map((f) => (
            <span key={f} className="tabular absolute right-0 translate-y-1/2 text-[10.5px] text-subtle" style={{ bottom: `${f * 100}%` }}>
              {shortMoney(max * f)}
            </span>
          ))}
        </div>
        <div>
          <div className="relative flex h-56 items-end gap-[3px] border-b border-l border-line-strong" onPointerLeave={() => setHover(null)}>
            {ticks.slice(0, -1).map((f) => (
              <div key={f} className="pointer-events-none absolute inset-x-0 border-t border-dashed border-line" style={{ bottom: `${f * 100}%` }} />
            ))}
            {data.map((d, i) => (
              <div key={i} className="relative flex h-full flex-1 items-end" onPointerEnter={() => setHover(i)}>
                <div
                  className="w-full rounded-t-[4px] transition-colors"
                  style={{
                    height: `${Math.max(d.amount === 0 ? 0 : 3, (Math.abs(d.amount) / max) * 100)}%`,
                    background: d.amount < 0 ? "var(--expense)" : hover === i ? "var(--income)" : "color-mix(in oklab, var(--income) 62%, transparent)",
                  }}
                />
              </div>
            ))}
          </div>
          {/* x axis */}
          <div className="mt-2 flex gap-[3px] text-[10.5px] text-subtle">
            {data.map((d, i) => (
              <span key={i} className="flex-1 overflow-visible whitespace-nowrap text-center">{i % step === 0 ? d.label : ""}</span>
            ))}
          </div>
        </div>
      </div>
      <p className="mt-3 flex items-center gap-3 text-[11px] text-subtle">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-income" /> invested</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-expense" /> net withdrawal</span>
      </p>
    </div>
  );
}
