"use client";

import { AlertTriangle, ArrowRight, Zap } from "lucide-react";
import Link from "next/link";
import { useInsights } from "@/lib/queries";

/** Overview teaser: health score + headline, and any urgent alerts (budget, overdrawn savings) — links to Insights. */
export function InsightsStrip({ month }: { month: string }) {
  const { data } = useInsights(month);
  if (!data) return null;
  const urgent = data.alerts.filter((a) => a.level !== "INFO");
  const h = data.health;
  const color = h.score >= 80 ? "var(--income)" : h.score >= 65 ? "var(--info)" : h.score >= 45 ? "var(--warn)" : "var(--expense)";
  return (
    <section className="space-y-3">
      {urgent.map((a) => (
        <div key={a.key} className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${a.level === "DANGER" ? "border-expense/30 bg-expense/[0.07]" : "border-warn/30 bg-warn/[0.08]"}`}>
          {a.level === "DANGER" ? <AlertTriangle size={16} className="mt-0.5 shrink-0 text-expense" /> : <Zap size={16} className="mt-0.5 shrink-0 text-warn" />}
          <p>
            <span className="font-medium">{a.title}.</span> <span className="text-fg-2">{a.body}</span>
          </p>
        </div>
      ))}
      <Link href="/dashboard/insights" className="panel group flex items-center gap-4 px-5 py-4 transition hover:border-line-strong">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-[3px] text-base font-semibold tabular" style={{ borderColor: color }}>
          {h.score}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">
            Financial health · <span style={{ color }}>{h.grade}</span>
          </span>
          <span className="block truncate text-xs text-muted">{h.headline}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1 text-xs text-muted transition group-hover:text-brand">
          Insights <ArrowRight size={12} />
        </span>
      </Link>
    </section>
  );
}
