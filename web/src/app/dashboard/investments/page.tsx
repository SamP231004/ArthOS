"use client";

import { Info, Plus, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { Donut, Sparkline } from "@/components/charts";
import { AddHoldingModal } from "@/components/invest/add-holding";
import { HoldingModal } from "@/components/invest/holding-detail";
import { CLASS_META, HORIZON_META, holdingSubtitle, signedPct, tone } from "@/components/invest/meta";
import { ValueChart } from "@/components/invest/value-chart";
import { PageHeader } from "@/components/page-header";
import { Button, ErrorNote, Skeleton } from "@/components/ui";
import { money } from "@/lib/format";
import { usePortfolio } from "@/lib/queries";
import type { AssetClass, HoldingView, Portfolio, PortfolioRange } from "@/lib/types";

const RANGES: PortfolioRange[] = ["1M", "3M", "6M", "1Y", "ALL"];
type View = "class" | "holding" | "performance" | "horizon";

export default function InvestmentsPage() {
  const [range, setRange] = useState<PortfolioRange>("1Y");
  const { data: p, isLoading, error, refetch, isFetching } = usePortfolio(range);
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const selected = p?.holdings.find((h) => h.id === open) ?? null;

  return (
    <div className="space-y-6">
      <PageHeader title="Investments" subtitle="Stocks, mutual funds, gold and bonds — one live portfolio.">
        <Button variant="secondary" onClick={() => refetch()} disabled={isFetching} aria-label="Refresh prices">
          <RefreshCw size={15} className={isFetching ? "animate-spin" : ""} /> Refresh
        </Button>
        <Button onClick={() => setAdding(true)}>
          <Plus size={16} /> Add investment
        </Button>
      </PageHeader>

      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-80" />
          <div className="grid gap-6 lg:grid-cols-[1fr_1.6fr]">
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
          </div>
        </div>
      ) : error ? (
        <ErrorNote message={error.message} />
      ) : p && p.holdings.length === 0 ? (
        <Empty onAdd={() => setAdding(true)} />
      ) : (
        p && <Loaded p={p} range={range} setRange={setRange} onOpen={setOpen} />
      )}

      <AddHoldingModal open={adding} onClose={() => setAdding(false)} />
      <HoldingModal holding={selected} onClose={() => setOpen(null)} />
    </div>
  );
}

function Empty({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="panel-glow p-8 sm:p-12">
      <h2 className="font-display text-4xl tracking-tight">Bring your wealth into one view</h2>
      <p className="mt-3 max-w-xl text-muted">Add what you own — ArthOS prices it live, tracks gains and XIRR, and shows how it all adds up.</p>
      <Button size="lg" className="mt-8" onClick={onAdd}>
        <Plus size={16} /> Add your first investment
      </Button>
      <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(Object.keys(CLASS_META) as AssetClass[]).map((c) => {
          const M = CLASS_META[c];
          return (
            <div key={c} className="panel p-4">
              <M.icon size={18} style={{ color: M.color }} />
              <p className="mt-3 font-medium">{M.plural}</p>
              <p className="mt-1 text-xs text-muted">{M.blurb}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Loaded({ p, range, setRange, onOpen }: { p: Portfolio; range: PortfolioRange; setRange: (r: PortfolioRange) => void; onOpen: (id: string) => void }) {
  const t = p.totals;
  const [view, setView] = useState<View>("class");
  const asOf = p.pricesAsOf ? new Date(p.pricesAsOf).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : null;
  const first = p.history[0], last = p.history[p.history.length - 1];
  const periodChange = first && last ? last.value - first.value - (last.invested - first.invested) : 0;

  return (
    <>
      {/* Hero */}
      <section className="panel-glow overflow-hidden p-6 sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.5fr] lg:items-center">
          <div>
            <p className="text-sm text-muted">Portfolio value</p>
            <p className="tabular mt-1 text-5xl font-semibold tracking-tight text-silver sm:text-6xl">{money(t.value, "INR", false).split(".")[0]}</p>
            <p className={`tabular mt-2 text-sm ${tone(t.gain)}`}>
              {t.gain >= 0 ? "+" : "−"}{money(Math.abs(t.gain))} ({signedPct(t.gainPct)}) on {money(t.invested)} invested
            </p>
            <div className="mt-6 grid grid-cols-3 gap-3">
              <Mini k="Today" v={`${t.dayChange >= 0 ? "+" : "−"}${money(Math.abs(t.dayChange))}`} sub={signedPct(t.dayChangePct)} tone={tone(t.dayChange)} />
              <Mini k="XIRR" v={t.xirr != null ? signedPct(t.xirr) : "—"} sub="annualised" tone={tone(t.xirr)} />
              <Mini k="Realised" v={`${t.realizedGain >= 0 ? "+" : "−"}${money(Math.abs(t.realizedGain))}`} sub="from sales" tone={tone(t.realizedGain)} />
            </div>
            <p className="mt-5 flex items-center gap-1.5 text-[11px] text-subtle">
              <Info size={12} /> {asOf ? `Prices as of ${asOf}` : "Prices pending"} · NSE/BSE via Yahoo Finance, NAVs via AMFI, gold at international spot
            </p>
          </div>
          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3 text-xs text-subtle">
                <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 rounded bg-income" /> value</span>
                <span className="flex items-center gap-1.5"><span className="h-0 w-3 border-t border-dashed border-muted" /> invested</span>
                <span className={tone(periodChange)}>{periodChange >= 0 ? "+" : "−"}{money(Math.abs(periodChange))} growth in {range === "ALL" ? "all time" : range}</span>
              </div>
              <div className="flex rounded-lg bg-fg/[0.05] p-0.5 text-xs">
                {RANGES.map((r) => (
                  <button key={r} onClick={() => setRange(r)} className={`rounded-md px-2.5 py-1 transition ${r === range ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg"}`}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <ValueChart data={p.history} format={(n) => money(n, "INR", true)} />
          </div>
        </div>
        {p.priceNotes.length > 0 && <p className="mt-4 text-xs text-warn">{p.priceNotes.join(" ")}</p>}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1.6fr]">
        {/* Allocation */}
        <div className="panel p-6">
          <h2 className="font-medium">Allocation</h2>
          <div className="mt-6 flex flex-col items-center gap-6">
            <Donut
              size={180}
              data={p.allocation.map((a) => ({ label: a.assetClass, value: a.value }))}
              colors={p.allocation.map((a) => CLASS_META[a.assetClass].color)}
              center={
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-subtle">{t.holdingsCount} holdings</p>
                  <p className="tabular text-base font-semibold">{money(t.value, "INR", true)}</p>
                </div>
              }
            />
            <ul className="w-full space-y-3">
              {p.allocation.map((a) => (
                <li key={a.assetClass} className="flex items-center gap-3 text-sm">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: CLASS_META[a.assetClass].color }} />
                  <span className="flex-1 text-fg-2">{CLASS_META[a.assetClass].plural}</span>
                  <span className="tabular w-12 text-right text-subtle">{a.share?.toFixed(1)}%</span>
                  <span className={`tabular w-16 text-right text-xs ${tone(a.gainPct)}`}>{signedPct(a.gainPct)}</span>
                  <span className="tabular w-24 text-right">{money(a.value, "INR", true)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Holdings */}
        <div className="panel overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-6">
            <h2 className="font-medium">Holdings</h2>
            <div className="flex rounded-lg bg-fg/[0.05] p-0.5 text-xs">
              {([["class", "By class"], ["holding", "By value"], ["performance", "Gain / loss"], ["horizon", "By horizon"]] as [View, string][]).map(([v, l]) => (
                <button key={v} onClick={() => setView(v)} className={`rounded-md px-2.5 py-1 transition ${v === view ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg"}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <Holdings p={p} view={view} onOpen={onOpen} />
        </div>
      </section>
    </>
  );
}

function Holdings({ p, view, onOpen }: { p: Portfolio; view: View; onOpen: (id: string) => void }) {
  const groups = useMemo(() => {
    const hs = p.holdings;
    if (view === "holding") return [{ title: null as string | null, items: hs }];
    if (view === "performance") {
      const sorted = [...hs].sort((a, b) => (b.gainPct ?? 0) - (a.gainPct ?? 0));
      return [
        { title: "Gaining", items: sorted.filter((h) => h.gain >= 0) },
        { title: "Losing", items: sorted.filter((h) => h.gain < 0).reverse() },
      ].filter((g) => g.items.length);
    }
    const key = (h: HoldingView) => (view === "class" ? h.assetClass : h.horizon ?? "NONE");
    const order = view === "class" ? p.allocation.map((a) => a.assetClass as string) : ["LONG", "MEDIUM", "SHORT", "NONE"];
    return order
      .map((k) => ({
        title: view === "class" ? CLASS_META[k as AssetClass].plural : HORIZON_META[k as keyof typeof HORIZON_META].label,
        items: hs.filter((h) => key(h) === k),
      }))
      .filter((g) => g.items.length);
  }, [p, view]);

  return (
    <div className="mt-3">
      {groups.map((g) => {
        const value = g.items.reduce((s, h) => s + h.currentValue, 0);
        const gain = g.items.reduce((s, h) => s + h.gain, 0);
        return (
          <div key={g.title ?? "all"}>
            {g.title && (
              <div className="flex justify-between border-y border-line bg-surface-2/60 px-6 py-2 text-[11px] font-medium uppercase tracking-wider text-subtle">
                <span>{g.title}</span>
                <span className="tabular">
                  {money(value, "INR", true)} · <span className={tone(gain)}>{gain >= 0 ? "+" : "−"}{money(Math.abs(gain), "INR", true)}</span>
                </span>
              </div>
            )}
            <ul className="divide-y divide-line">
              {g.items.map((h) => (
                <Row key={h.id} h={h} onOpen={onOpen} />
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function Row({ h, onOpen }: { h: HoldingView; onOpen: (id: string) => void }) {
  const M = CLASS_META[h.assetClass];
  const up = h.spark.length > 1 && h.spark[h.spark.length - 1] >= h.spark[0];
  return (
    <li>
      <button onClick={() => onOpen(h.id)} className="flex w-full items-center gap-4 px-6 py-3.5 text-left transition hover:bg-fg/[0.025]">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: `color-mix(in oklab, ${M.color} 13%, transparent)`, color: M.color }}>
          <M.icon size={17} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{h.name}</span>
          <span className="block truncate text-xs text-subtle">{holdingSubtitle(h)}</span>
        </span>
        <span className="hidden w-24 sm:block">
          {h.spark.length > 1 ? <Sparkline values={h.spark} color={up ? "var(--income)" : "var(--expense)"} className="h-8 w-24" /> : <span className="block text-center text-[11px] text-subtle">{h.priceSource === "LIVE" ? "" : "no feed"}</span>}
        </span>
        <span className="w-32 text-right">
          <span className="tabular block font-medium">{money(h.currentValue)}</span>
          <span className={`tabular block text-xs ${tone(h.gain)}`}>
            {signedPct(h.gainPct)}
            {h.priceSource === "LIVE" && h.dayChange !== 0 && <span className="text-subtle"> · {h.dayChange > 0 ? "▲" : "▼"} {signedPct(h.dayChangePct)}</span>}
          </span>
        </span>
      </button>
    </li>
  );
}

function Mini({ k, v, sub, tone = "" }: { k: string; v: string; sub: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-line bg-fg/[0.02] p-3">
      <p className="text-[11px] text-subtle">{k}</p>
      <p className={`tabular mt-0.5 text-sm font-semibold sm:text-base ${tone}`}>{v}</p>
      <p className="text-[11px] text-subtle">{sub}</p>
    </div>
  );
}
