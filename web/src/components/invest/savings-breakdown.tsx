"use client";

import { useMemo } from "react";
import { Modal } from "@/components/ui";
import { dateLabel, money, monthLabel } from "@/lib/format";
import type { Portfolio, SavingsAccount } from "@/lib/types";

type Move = { id: string; date: string; name: string; amount: number; kind: "buy" | "sale" };

/**
 * How the savings balance came to be: the running sum month by month, and the exact purchases paid from savings and
 * sales paid back into it. Mirrors SavingsService.flows: imported holdings (owned before ArthOS) never touch it.
 */
export function SavingsBreakdown({ open, onClose, a, p }: { open: boolean; onClose: () => void; a: SavingsAccount; p?: Portfolio }) {
  const overdrawn = a.closing < 0;
  const first = a.history[0];
  const moves = useMemo(() => {
    const out: Move[] = [];
    const end = `${a.month}-31`;
    for (const h of p?.holdings ?? []) {
      for (const l of h.lots) {
        if (l.importedFrom || l.date > end) continue;
        if (l.type === "SELL") out.push({ id: l.id, date: l.date, name: h.name, amount: l.quantity * l.price, kind: "sale" });
        else if ((l.fromSavings ?? 0) > 0) out.push({ id: l.id, date: l.date, name: h.name, amount: l.fromSavings!, kind: "buy" });
      }
    }
    return out.sort((x, y) => (x.date < y.date ? 1 : -1));
  }, [p, a.month]);

  const saved = a.history.reduce((s, h) => s + h.saved, 0);
  const invested = a.history.reduce((s, h) => s + h.invested, 0);
  const proceeds = a.history.reduce((s, h) => s + h.proceeds, 0);
  const sign = (n: number) => (n < 0 ? "−" : "");

  return (
    <Modal open={open} onClose={onClose} title="Savings account" subtitle={`How the ${overdrawn ? "overdrawn" : "available"} balance was worked out, up to ${monthLabel(a.month)}`}>
      <div className="space-y-6">
        {/* the sum */}
        <dl className="rounded-xl border border-line text-sm">
          <Row k={!first || first.opening === a.startingBalance ? "Savings you already had" : `Carried in before ${monthLabel(first.month)}`} v={`${sign(first?.opening ?? a.startingBalance)}${money(Math.abs(first?.opening ?? a.startingBalance))}`} />
          <Row k="Saved first from income" v={`+${money(saved)}`} tone="text-income" />
          <Row k="Investments paid from savings" v={`−${money(invested)}`} />
          {proceeds > 0 && <Row k="Sales paid back in" v={`+${money(proceeds)}`} tone="text-income" />}
          <div className="flex items-center justify-between gap-3 bg-fg/[0.03] px-4 py-3 font-semibold">
            <dt>{overdrawn ? "Overdrawn" : "Available to invest"}</dt>
            <dd className={`tabular ${overdrawn ? "text-expense" : ""}`}>{sign(a.closing)}{money(Math.abs(a.closing))}</dd>
          </div>
        </dl>
        {overdrawn && (
          <p className="-mt-3 text-xs text-muted">
            More was invested from savings than had been set aside. Fix it by raising how much you save first, marking past buys as paid from spending money, or setting the savings you already had in Settings.
          </p>
        )}

        {/* month by month */}
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-subtle">Month by month</p>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full whitespace-nowrap text-sm">
              <thead>
                <tr className="border-b border-line text-right text-[11px] text-subtle">
                  <th className="py-2 text-left font-medium">Month</th>
                  <th className="px-2 py-2 font-medium">Saved</th>
                  <th className="px-2 py-2 font-medium">Invested</th>
                  <th className="px-2 py-2 font-medium">Sales</th>
                  <th className="py-2 pl-2 font-medium">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {a.history.map((h) => (
                  <tr key={h.month} className="tabular text-right">
                    <td className="py-2 text-left text-fg-2">{monthLabel(h.month)}</td>
                    <td className="px-2 py-2 text-income">{h.saved ? `+${money(h.saved)}` : "—"}</td>
                    <td className="px-2 py-2">{h.invested ? `−${money(h.invested)}` : "—"}</td>
                    <td className="px-2 py-2 text-income">{h.proceeds ? `+${money(h.proceeds)}` : "—"}</td>
                    <td className={`py-2 pl-2 font-medium ${h.closing < 0 ? "text-expense" : ""}`}>{sign(h.closing)}{money(Math.abs(h.closing))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-subtle">Saved = the share of each month&apos;s income you set aside first (Settings → savings rule).</p>
        </div>

        {/* the transactions behind it */}
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-subtle">Purchases and sales that used savings</p>
          {moves.length === 0 ? (
            <p className="mt-2 text-sm text-muted">None yet.</p>
          ) : (
            <ul className="mt-2 max-h-72 divide-y divide-line overflow-y-auto rounded-xl border border-line">
              {moves.map((m) => (
                <li key={m.id} className="flex items-start gap-3 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] text-fg-2" title={m.name}>{m.name}</p>
                    <p className="text-[11px] text-subtle">{dateLabel(m.date)} · {m.kind === "buy" ? "bought from savings" : "sold, back into savings"}</p>
                  </div>
                  <span className={`tabular shrink-0 text-[13px] font-medium ${m.kind === "sale" ? "text-income" : ""}`}>
                    {m.kind === "buy" ? "−" : "+"}{money(m.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-subtle">Imported holdings count as money you already had, so they don&apos;t use this account. To change how a buy was paid, edit it from the holding.</p>
        </div>
      </div>
    </Modal>
  );
}

function Row({ k, v, tone = "" }: { k: string; v: string; tone?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
      <dt className="text-muted">{k}</dt>
      <dd className={`tabular ${tone}`}>{v}</dd>
    </div>
  );
}
