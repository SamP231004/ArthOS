"use client";

import { ArrowRight, ChartPie } from "lucide-react";
import Link from "next/link";
import { CLASS_META, signedPct, tone } from "./meta";
import { Skeleton } from "../ui";
import { buttonClass } from "@/lib/button";
import { money } from "@/lib/format";
import { usePortfolio } from "@/lib/queries";

/** Overview card: portfolio value, all-time and today's movement, allocation bar. */
export function PortfolioCard() {
  const { data: p, isLoading } = usePortfolio("1M");
  if (isLoading) return <Skeleton className="h-36" />;
  if (!p) return null;

  if (p.holdings.length === 0) {
    return (
      <div className="panel flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
        <div className="flex items-start gap-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand/10 text-brand">
            <ChartPie size={20} />
          </span>
          <div>
            <p className="font-medium">Track what you own</p>
            <p className="mt-1 text-sm text-muted">Add stocks, funds, gold or bonds and watch your wealth grow — priced live.</p>
          </div>
        </div>
        <Link href="/dashboard/investments" className={buttonClass("secondary")}>
          Add investments <ArrowRight size={15} />
        </Link>
      </div>
    );
  }

  const t = p.totals;
  return (
    <Link href="/dashboard/investments" className="panel group block p-6 transition hover:border-line-strong">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-sm text-muted">
            <ChartPie size={15} className="text-brand" /> Investments
          </p>
          <p className="tabular mt-1 text-4xl font-semibold tracking-tight">{money(t.value, "INR", true)}</p>
          <p className={`tabular mt-1 text-xs ${tone(t.gain)}`}>
            {t.gain >= 0 ? "+" : "−"}{money(Math.abs(t.gain), "INR", true)} ({signedPct(t.gainPct)}) all time
            <span className={`ml-2 ${tone(t.dayChange)}`}>· today {signedPct(t.dayChangePct)}</span>
          </p>
        </div>
        <ArrowRight size={16} className="text-subtle transition group-hover:translate-x-0.5 group-hover:text-fg" />
      </div>
      <div className="mt-5 flex h-2 overflow-hidden rounded-full bg-fg/[0.06]">
        {p.allocation.map((a) => (
          <div key={a.assetClass} style={{ width: `${a.share ?? 0}%`, background: CLASS_META[a.assetClass].color }} title={CLASS_META[a.assetClass].plural} />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-subtle">
        {p.allocation.map((a) => (
          <span key={a.assetClass} className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: CLASS_META[a.assetClass].color }} />
            {CLASS_META[a.assetClass].plural} {a.share?.toFixed(0)}%
          </span>
        ))}
      </div>
    </Link>
  );
}
