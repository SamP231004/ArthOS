"use client";

import { ArrowRight, PiggyBank } from "lucide-react";
import Link from "next/link";
import { money, monthLabel } from "@/lib/format";
import type { SavingsAccount } from "@/lib/types";

/**
 * The savings account as a monthly statement: carried in + saved first − invested + sales = carried out,
 * with the closing balance of the last few months as a small trend.
 */
export function SavingsAccountCard({ a, currency }: { a: SavingsAccount; currency: string }) {
  const fmt = (n: number) => money(n, currency);
  const overdrawn = a.closing < 0;
  const max = Math.max(...a.history.map((h) => Math.abs(h.closing)), 1);
  const rows: { k: string; v: number; sign: "" | "+" | "−"; tone?: string }[] = [
    { k: a.opening === a.startingBalance && a.history.length <= 1 ? "Savings you already had" : "Carried from last month", v: a.opening, sign: "" },
    { k: "Saved first this month", v: a.savedFirst, sign: "+", tone: "text-income" },
    { k: "Invested from savings", v: a.investedFromSavings, sign: "−", tone: "text-fg-2" },
    ...(a.saleProceeds > 0 ? [{ k: "Sales returned", v: a.saleProceeds, sign: "+" as const, tone: "text-income" }] : []),
  ];

  return (
    <section className="panel p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-medium">
            <PiggyBank size={16} className="text-brand" /> Savings account
          </h2>
          <p className="mt-0.5 text-xs text-subtle">Saved first every month, carried forward · invest from here</p>
        </div>
        <Link href="/dashboard/investments" className="flex items-center gap-1 text-xs text-muted transition hover:text-brand">
          Invest <ArrowRight size={12} />
        </Link>
      </div>

      <div className="mt-5 grid gap-6 md:grid-cols-[1fr_1.1fr] md:items-end">
        <div>
          <p className="text-xs text-muted">{overdrawn ? "Overdrawn" : "Available to invest"}</p>
          <p className={`tabular mt-1 text-4xl font-semibold tracking-tight ${overdrawn ? "text-expense" : "text-silver"}`}>{fmt(Math.abs(a.closing))}</p>
          <p className="mt-1 text-xs text-subtle">
            Carries into {monthLabel(nextMonth(a.month))}
            {a.investedFromSpending > 0 && <> · {fmt(a.investedFromSpending)} invested from spending money this month</>}
          </p>
          {a.history.length > 1 && (
            <div className="mt-5">
              <div className="flex h-16 items-end gap-1.5" aria-label="Closing balance by month">
                {a.history.map((h) => (
                  <div key={h.month} className="group relative flex h-full flex-1 flex-col items-center justify-end">
                    <div
                      className={`w-full rounded-t-md transition ${h.month === a.month ? (h.closing < 0 ? "bg-expense" : "bg-income") : h.closing < 0 ? "bg-expense/40" : "bg-income/35"}`}
                      style={{ height: `${Math.max(6, (Math.abs(h.closing) / max) * 100)}%` }}
                      title={`${monthLabel(h.month)}: ${fmt(h.closing)}`}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-1.5 flex gap-1.5 text-center text-[10px] text-subtle">
                {a.history.map((h) => (
                  <span key={h.month} className="flex-1">{monthLabel(h.month).slice(0, 3)}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        <dl className="rounded-xl border border-line bg-fg/[0.02] text-sm">
          {rows.map((r) => (
            <div key={r.k} className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
              <dt className="text-muted">{r.k}</dt>
              <dd className={`tabular ${r.tone ?? ""}`}>{r.sign}{fmt(r.v)}</dd>
            </div>
          ))}
          <div className="flex items-center justify-between gap-3 bg-fg/[0.02] px-4 py-3 font-semibold">
            <dt>Balance</dt>
            <dd className={`tabular ${overdrawn ? "text-expense" : ""}`}>{overdrawn ? "−" : ""}{fmt(Math.abs(a.closing))}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

function nextMonth(m: string): string {
  const [y, mo] = m.split("-").map(Number);
  return mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, "0")}`;
}
