"use client";

import { Repeat, X } from "lucide-react";
import { useState } from "react";
import { label, money } from "@/lib/format";
import { useMarkRecurring, useRecurringCandidates } from "@/lib/queries";
import type { RecurringCandidate } from "@/lib/types";

const KEY = "arthos-recurring-dismissed";

function readDismissed(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

/** Automatic recurring detection: "these come back every month — mark them recurring?" (or dismiss for good). */
export function RecurringSuggestions({ kind, currency }: { kind: "INCOME" | "EXPENSE"; currency: string }) {
  const { data } = useRecurringCandidates();
  const mark = useMarkRecurring();
  const [dismissed, setDismissed] = useState<string[]>(() => (typeof window === "undefined" ? [] : readDismissed()));
  const id = (c: RecurringCandidate) => `${c.kind}:${c.key}`;
  const items = (data ?? []).filter((c) => c.kind === kind && !dismissed.includes(id(c)));
  if (!items.length) return null;

  const dismiss = (c: RecurringCandidate) => {
    const next = [...dismissed, id(c)];
    setDismissed(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* private mode: dismissal lasts this visit */
    }
  };

  return (
    <section className="panel p-4 sm:p-5">
      <p className="flex items-center gap-2 text-sm font-medium">
        <Repeat size={15} className="text-brand" /> Looks recurring
        <span className="text-xs font-normal text-subtle">— these came back every month. Mark them so ArthOS reminds you each month.</span>
      </p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {items.map((c) => (
          <li key={id(c)} className="flex items-center gap-3 rounded-xl border border-line bg-fg/[0.02] px-3.5 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{c.name}</p>
              <p className="text-xs text-subtle">
                ~{money(c.typicalAmount, currency)} · around the {ordinal(c.dayOfMonth)} · {c.months} months{c.tag ? ` · ${label(c.tag)}` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={() => mark.mutate({ kind: c.kind, key: c.key })}
              disabled={mark.isPending}
              className="rounded-lg border border-brand/40 bg-brand/10 px-2.5 py-1.5 text-xs font-semibold text-brand transition hover:bg-brand/15 disabled:opacity-50"
            >
              Mark recurring
            </button>
            <button type="button" onClick={() => dismiss(c)} className="rounded-lg p-1.5 text-subtle hover:bg-fg/5 hover:text-fg" aria-label={`Not recurring: ${c.name}`} title="Not recurring">
              <X size={14} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ordinal(n: number): string {
  const s = n % 100 >= 11 && n % 100 <= 13 ? "th" : (["th", "st", "nd", "rd"][n % 10] ?? "th");
  return `${n}${s}`;
}
