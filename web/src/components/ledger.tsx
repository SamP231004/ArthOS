"use client";

import { ArrowDown, ArrowUp, ChevronsUpDown, Download, Repeat } from "lucide-react";
import { money } from "@/lib/format";
import { EXPENSE_CATEGORIES, INCOME_TYPES } from "@/lib/types";

/** Building blocks shared by the Income and Expenses ledgers. */

export function SummaryCell({ k, v, sub, tone = "", pill }: { k: string; v: string; sub?: React.ReactNode; tone?: string; pill?: { text: string; tone: string } }) {
  return (
    <div className="border-b border-r border-line p-4 sm:p-5 lg:border-b-0 [&:nth-child(2n)]:border-r-0 lg:[&:nth-child(2n)]:border-r lg:last:!border-r-0">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-subtle">{k}</p>
      <p className={`tabular mt-1.5 truncate text-xl font-semibold tracking-tight sm:text-2xl ${tone}`}>{v}</p>
      <div className="mt-1 flex items-center gap-2 text-xs text-subtle">
        {pill && <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${pill.tone}`}>{pill.text}</span>}
        {sub}
      </div>
    </div>
  );
}

/** Stacked share bar whose legend chips double as filters. */
export function BreakdownBar<K extends string>({
  parts,
  active,
  onToggle,
  label,
}: {
  parts: { key: K; label: string; amount: number; color: string }[];
  active: K | null;
  onToggle: (k: K | null) => void;
  label: string;
}) {
  const total = parts.reduce((s, p) => s + p.amount, 0) || 1;
  return (
    <div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-fg/[0.06]">
        {parts.map((p) => (
          <div
            key={p.key}
            title={`${p.label}: ${money(p.amount)}`}
            className="h-full transition-opacity"
            style={{ width: `${(p.amount / total) * 100}%`, background: p.color, opacity: active && active !== p.key ? 0.25 : 1 }}
          />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={label}>
        {parts.map((p) => {
          const on = active === p.key;
          return (
            <button
              key={p.key}
              onClick={() => onToggle(on ? null : p.key)}
              className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition ${on ? "border-fg/40 bg-fg/[0.06] text-fg" : "border-line text-muted hover:text-fg"}`}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
              {p.label}
              <span className="tabular text-subtle">{((p.amount / total) * 100).toFixed(0)}%</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export type Sort<K extends string> = { key: K; dir: 1 | -1 };

export function SortHeader<K extends string>({ k, label, sort, setSort, align = "left" }: { k: K; label: string; sort: Sort<K>; setSort: (s: Sort<K>) => void; align?: "left" | "right" }) {
  const activeCol = sort.key === k;
  return (
    <th className={`px-3 py-3 font-medium ${align === "right" ? "text-right" : "text-left"}`}>
      <button
        onClick={() => setSort({ key: k, dir: activeCol ? (sort.dir === 1 ? -1 : 1) : k === "date" || k === "amount" ? -1 : 1 })}
        className={`inline-flex items-center gap-1 uppercase tracking-[0.12em] transition hover:text-fg ${activeCol ? "text-fg-2" : ""}`}
      >
        {label}
        {activeCol ? sort.dir === 1 ? <ArrowUp size={11} /> : <ArrowDown size={11} /> : <ChevronsUpDown size={11} className="opacity-40" />}
      </button>
    </th>
  );
}

export function RecurringBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-info/10 px-2 py-0.5 text-[10.5px] font-medium text-info ring-1 ring-inset ring-info/20">
      <Repeat size={10} /> Monthly
    </span>
  );
}

export function ExportButton({ filename, rows }: { filename: string; rows: (string | number)[][] }) {
  function download() {
    const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <button onClick={download} disabled={rows.length <= 1} className="btn-glass inline-flex h-10 items-center gap-2 rounded-xl px-3.5 text-sm transition disabled:opacity-40" title="Download as CSV">
      <Download size={15} /> Export
    </button>
  );
}

/** Chart colour for an expense category or income type, matching the Income/Expenses ledgers. */
export function tagColor(kind: "INCOME" | "EXPENSE", tag: string): string {
  const list: readonly string[] = kind === "INCOME" ? INCOME_TYPES : EXPENSE_CATEGORIES;
  return `var(--c${(Math.max(0, list.indexOf(tag)) % 8) + 1})`;
}

export function initials(name: string) {
  const w = name.replace(/[^A-Za-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
  return ((w[0]?.[0] ?? "") + (w[1]?.[0] ?? w[0]?.[1] ?? "")).toUpperCase() || "•";
}

/** Same day next month, clamped to the month length and to today (for logging last month's recurring entries). */
export function sameDayIn(month: string, prevDate: string, today: string): string {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  const day = Math.min(Number(prevDate.slice(8, 10)), last);
  const iso = `${month}-${String(day).padStart(2, "0")}`;
  return iso > today ? today : iso;
}

export function pctChange(now: number, before: number): { text: string; up: boolean } | null {
  if (!before) return null;
  const p = ((now - before) / before) * 100;
  return { text: `${p >= 0 ? "▲" : "▼"} ${Math.abs(p).toFixed(0)}% vs last month`, up: p >= 0 };
}
