"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { currentMonth, monthLabel } from "@/lib/format";
import { useMonth, useUi } from "@/lib/ui-store";

export function MonthPicker() {
  const month = useMonth();
  const shift = useUi((s) => s.shift);
  const isCurrent = month === currentMonth();
  return (
    <div className="btn-glass inline-flex h-10 items-center rounded-xl">
      <button onClick={() => shift(-1)} className="grid h-full w-9 place-items-center text-muted transition hover:text-fg" aria-label="Previous month">
        <ChevronLeft size={16} />
      </button>
      <span className="flex min-w-36 items-center justify-center gap-2 text-sm font-medium">
        <CalendarDays size={14} className="text-subtle" />
        {monthLabel(month)}
      </span>
      <button onClick={() => shift(1)} disabled={isCurrent} className="grid h-full w-9 place-items-center text-muted transition hover:text-fg disabled:opacity-25" aria-label="Next month">
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
