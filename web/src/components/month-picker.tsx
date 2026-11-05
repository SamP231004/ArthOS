"use client";

import { currentMonth, monthLabel } from "@/lib/format";
import { useMonth, useUi } from "@/lib/ui-store";

export function MonthPicker() {
  const month = useMonth();
  const shift = useUi((s) => s.shift);
  const isCurrent = month === currentMonth();
  return (
    <div className="inline-flex items-center rounded-xl border border-border bg-surface">
      <button onClick={() => shift(-1)} className="px-3 py-2 text-muted hover:text-fg" aria-label="Previous month">
        ‹
      </button>
      <span className="min-w-36 text-center text-sm font-medium">{monthLabel(month)}</span>
      <button
        onClick={() => shift(1)}
        disabled={isCurrent}
        className="px-3 py-2 text-muted hover:text-fg disabled:opacity-30"
        aria-label="Next month"
      >
        ›
      </button>
    </div>
  );
}
