"use client";

import { ArrowDown, ArrowUp, ChartPie, ChevronDown, ChevronsUpDown, LayoutGrid, Minus, Pencil, PiggyBank, Plus, RefreshCw, Trash2, TrendingUp, Wallet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Donut } from "@/components/charts";
import { AddHoldingModal } from "@/components/invest/add-holding";
import { ContributionChart } from "@/components/invest/contribution-chart";
import { GoalHorizon } from "@/components/invest/goal-horizon";
import { HoldingModal, type DetailTab } from "@/components/invest/holding-detail";
import { CLASS_META, fmtQty, signedPct, tone } from "@/components/invest/meta";
import { ValueChart } from "@/components/invest/value-chart";
import { PageHeader } from "@/components/page-header";
import { Button, ErrorNote, Modal, Skeleton } from "@/components/ui";
import { money } from "@/lib/format";
import { indianMarketStatus } from "@/lib/market";
import { useDeleteHolding, usePortfolio, useSummary } from "@/lib/queries";
import { useMonth } from "@/lib/ui-store";
import type { AssetClass, HoldingView, Portfolio, PortfolioRange } from "@/lib/types";

type Tab = AssetClass;
/** Fixed tab order, showing only the classes the user holds. */
const CLASS_ORDER: AssetClass[] = ["STOCK", "MUTUAL_FUND", "GOLD", "BOND"];
const presentClasses = (p: Portfolio) => CLASS_ORDER.filter((c) => p.holdings.some((h) => h.assetClass === c));
type View = "holdings" | "analysis";
const RANGES: PortfolioRange[] = ["1M", "3M", "6M", "1Y", "ALL"];

export default function InvestmentsPage() {
  const [range, setRange] = useState<PortfolioRange>("1Y");
  const { data: p, isLoading, error, refetch, isFetching } = usePortfolio(range);
  const [view, setView] = useState<View>("holdings");
  const [adding, setAdding] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [open, setOpen] = useState<{ id: string; tab: DetailTab } | null>(null);
  const selected = p?.holdings.find((h) => h.id === open?.id) ?? null;

  const month = useMonth();
  const savings = useSummary(month).data?.savings;
  return (
    <div className="space-y-6">
      <PageHeader title="Investments" subtitle="Stocks, mutual funds, gold and bonds — one live portfolio.">
        {savings && (
          <span className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm ${savings.closing < 0 ? "border-expense/30 text-expense" : "border-line text-fg-2"}`} title="Savings account balance: saved first every month, carried forward">
            <PiggyBank size={15} className="text-brand" />
            <span className="text-muted">{savings.closing < 0 ? "Savings overdrawn" : "Savings to invest"}</span>
            <span className="tabular font-semibold">{money(Math.abs(savings.closing))}</span>
          </span>
        )}
        <div className="flex rounded-xl border border-line bg-surface p-1 text-sm">
          {([["holdings", "Holdings", LayoutGrid], ["analysis", "Analysis", ChartPie]] as [View, string, typeof ChartPie][]).map(([v, l, I]) => (
            <button key={v} onClick={() => setView(v)} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${view === v ? "bg-fg/[0.07] text-fg" : "text-muted hover:text-fg"}`}>
              <I size={14} /> {l}
            </button>
          ))}
        </div>
        <Button variant="secondary" onClick={() => setWithdrawing(true)} disabled={!p?.holdings.length}>
          <Minus size={15} /> Withdraw
        </Button>
        <Button onClick={() => setAdding(true)}>
          <Plus size={16} /> Add
        </Button>
      </PageHeader>

      {isLoading ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <Skeleton className="h-[560px]" />
          <div className="space-y-6"><Skeleton className="h-40" /><Skeleton className="h-40" /></div>
        </div>
      ) : error ? (
        <ErrorNote message={error.message} />
      ) : p && p.holdings.length === 0 ? (
        <Empty onAdd={() => setAdding(true)} />
      ) : p && view === "holdings" ? (
        <HoldingsView p={p} refresh={() => refetch()} refreshing={isFetching} onOpen={(id, tab) => setOpen({ id, tab })} />
      ) : (
        p && <AnalysisView p={p} range={range} setRange={setRange} />
      )}

      <AddHoldingModal open={adding} onClose={() => setAdding(false)} />
      <WithdrawPicker open={withdrawing} holdings={p?.holdings ?? []} onClose={() => setWithdrawing(false)} onPick={(id) => { setWithdrawing(false); setOpen({ id, tab: "withdraw" }); }} />
      <HoldingModal holding={selected} initialTab={open?.tab} onClose={() => setOpen(null)} />
    </div>
  );
}

// ───────────────────────────────────────── Holdings

const COLS = [
  ["name", "Name"],
  ["quantity", "Qty"],
  ["invested", "Invested"],
  ["price", "Price"],
  ["currentValue", "Current"],
  ["gain", "P&L"],
] as const;
type SortKey = (typeof COLS)[number][0];

function HoldingsView({ p, refresh, refreshing, onOpen }: { p: Portfolio; refresh: () => void; refreshing: boolean; onOpen: (id: string, tab: DetailTab) => void }) {
  const classes = presentClasses(p);
  const [tab, setTab] = useState<Tab>(classes[0]);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "currentValue", dir: -1 });
  const del = useDeleteHolding();

  const items = useMemo(() => {
    const hs = p.holdings.filter((h) => h.assetClass === tab);
    return [...hs].sort((a, b) => {
      const va = a[sort.key], vb = b[sort.key];
      return (typeof va === "string" ? va.localeCompare(vb as string) : (va as number) - (vb as number)) * sort.dir;
    });
  }, [p, tab, sort]);

  const invested = items.reduce((s, h) => s + h.invested, 0);
  const current = items.reduce((s, h) => s + h.currentValue, 0);
  const pl = current - invested;
  const day = items.reduce((s, h) => s + h.dayChange, 0);
  const asOf = p.pricesAsOf ? new Date(p.pricesAsOf).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : null;
  const [market, setMarket] = useState(() => indianMarketStatus());
  useEffect(() => {
    const t = setInterval(() => setMarket(indianMarketStatus()), 60_000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="grid items-start gap-6 2xl:grid-cols-[1fr_300px]">
      <section className="panel overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 p-4 sm:p-5">
          <div className="flex flex-wrap rounded-xl bg-fg/[0.05] p-1 text-sm">
            {classes.map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`rounded-lg px-3 py-1.5 transition ${tab === t ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg"}`}>
                {CLASS_META[t].plural}
              </button>
            ))}
          </div>
        </div>

        {/* summary strip */}
        <div className="mx-4 grid grid-cols-2 overflow-hidden rounded-2xl border border-line sm:mx-5 lg:grid-cols-4">
          <Cell k="Invested" v={money(invested)} sub={`${items.length} holding${items.length === 1 ? "" : "s"}`} />
          <Cell k="Current value" v={money(current)} sub="At market price" />
          <Cell k="Unrealised P&L" v={`${pl >= 0 ? "+" : "−"}${money(Math.abs(pl))}`} tone={tone(pl)} pill={signedPct(invested ? (pl / invested) * 100 : 0)} />
          <Cell k="Today" v={`${day >= 0 ? "+" : "−"}${money(Math.abs(day))}`} tone={tone(day)} sub={signedPct(current - day ? (day / (current - day)) * 100 : 0)} />
          <div className="col-span-full flex items-center justify-between border-t border-line px-4 py-2.5 text-xs text-muted">
            <span className="flex items-center gap-2">
              <span className={`relative flex h-2 w-2 rounded-full ${market.open ? "bg-income" : "bg-subtle"}`}>
                {market.open && <span className="absolute inset-0 animate-ping rounded-full bg-income opacity-60" />}
              </span>
              <span className={market.open ? "font-medium text-income" : "font-medium text-fg-2"}>{market.label}</span>
              <span className="text-subtle">· {market.detail}</span>
              <span className="text-subtle">· {asOf ? `prices as of ${asOf}` : "prices pending"}</span>
            </span>
            <button onClick={refresh} className="rounded-lg p-1 text-subtle transition hover:bg-fg/5 hover:text-fg" aria-label="Refresh prices">
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* table */}
        <div className="mt-4 overflow-x-auto px-4 pb-4 sm:px-5 sm:pb-5">
          <table className="w-full min-w-[820px] whitespace-nowrap text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[11px] uppercase tracking-[0.12em] text-subtle">
                {COLS.map(([k, l]) => (
                  <th key={k} className={`py-3 font-medium ${k === "name" ? "pl-2 pr-3" : k === "invested" ? "px-3 text-center" : "px-3 text-right"}`}>
                    <button onClick={() => setSort((s) => ({ key: k, dir: s.key === k ? (s.dir === 1 ? -1 : 1) : k === "name" ? 1 : -1 }))} className="inline-flex items-center gap-1 hover:text-fg">
                      {l}
                      {sort.key === k ? sort.dir === 1 ? <ArrowUp size={11} /> : <ArrowDown size={11} /> : <ChevronsUpDown size={11} className="opacity-40" />}
                    </button>
                  </th>
                ))}
                <th className="w-16 py-3 pr-2"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map((h) => {
                const M = CLASS_META[h.assetClass];
                const share = invested ? (h.invested / invested) * 100 : 0;
                return (
                  <tr key={h.id} className="group cursor-pointer transition hover:bg-fg/[0.025]" onClick={() => onOpen(h.id, "overview")}>
                    <td className="py-3.5 pl-2 pr-3">
                      <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-xs font-semibold" style={{ background: `color-mix(in oklab, ${M.color} 14%, transparent)`, color: M.color }}>
                          {initials(h.name)}
                        </span>
                        <div className="min-w-0">
                          <p className="max-w-[210px] truncate font-medium" title={h.name}>{h.name}</p>
                          <p className="text-xs text-subtle">Avg {money(h.avgCost)}{h.assetClass === "GOLD" ? "/g" : ""}</p>
                        </div>
                      </div>
                    </td>
                    <td className="tabular px-3 py-3.5 text-right">{fmtQty(h.quantity)}{h.assetClass === "GOLD" ? " g" : ""}</td>
                    <td className="px-3 py-3.5 text-center">
                      <p className="tabular">{money(h.invested)}</p>
                      <div className="mt-1 flex items-center justify-center gap-2">
                        <span className="h-1 w-16 overflow-hidden rounded-full bg-fg/[0.07]">
                          <span className="block h-full rounded-full" style={{ width: `${share}%`, background: M.color }} />
                        </span>
                        <span className="tabular w-10 text-right text-[11px] text-subtle">{share.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-right">
                      <p className="tabular">{money(h.price)}</p>
                      <p className={`tabular text-xs ${h.priceSource === "LIVE" ? tone(h.dayChangePct) : "text-subtle"}`}>
                        {h.priceSource === "LIVE" ? signedPct(h.dayChangePct) : h.priceSource === "MANUAL" ? "manual" : h.priceSource === "FACE_VALUE" ? "face value" : "last trade"}
                      </p>
                    </td>
                    <td className="tabular px-3 py-3.5 text-right font-medium">{money(h.currentValue)}</td>
                    <td className="px-3 py-3.5 text-right">
                      <p className={`tabular font-medium ${tone(h.gain)}`}>{h.gain >= 0 ? "+" : "−"}{money(Math.abs(h.gain))}</p>
                      <p className={`tabular text-xs ${tone(h.gainPct)}`}>{signedPct(h.gainPct)}</p>
                    </td>
                    <td className="py-3.5 pr-2 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex gap-1">
                        <button onClick={() => onOpen(h.id, "edit")} className="rounded-lg p-1.5 text-subtle transition hover:bg-fg/5 hover:text-fg" aria-label={`Edit ${h.name}`} title="Edit transactions (quantity, price/NAV, date, funding)">
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => confirm(`Remove ${h.name} and all its transactions?`) && del.mutate(h.id)}
                          className="rounded-lg p-1.5 text-subtle transition hover:bg-expense/10 hover:text-expense"
                          aria-label={`Delete ${h.name}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {p.priceNotes.length > 0 && <p className="px-5 pb-5 text-xs text-warn">{p.priceNotes.join(" ")}</p>}
      </section>

      <aside className="order-first grid gap-6 md:grid-cols-3 2xl:order-none 2xl:grid-cols-1">
        <NetHoldings p={p} />
        <RealizedProfit p={p} />
        <div className="panel p-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-subtle">Allocation</p>
          <div className="mt-4 flex items-center gap-4">
            <Donut size={112} data={p.allocation.map((a) => ({ label: a.assetClass, value: a.value }))} colors={p.allocation.map((a) => CLASS_META[a.assetClass].color)} />
            <ul className="flex-1 space-y-2 text-sm">
              {p.allocation.map((a) => (
                <li key={a.assetClass} className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-sm" style={{ background: CLASS_META[a.assetClass].color }} />
                  <span className="flex-1 text-fg-2">{CLASS_META[a.assetClass].plural}</span>
                  <span className="tabular text-subtle">{a.share?.toFixed(0)}%</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </aside>
    </div>
  );
}

function NetHoldings({ p }: { p: Portfolio }) {
  const t = p.totals;
  return (
    <div className="panel-glow p-5">
      <div className="flex items-start justify-between">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-subtle">Net holdings</p>
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand/10 text-brand"><Wallet size={16} /></span>
      </div>
      <p className="tabular mt-2 text-3xl font-semibold tracking-tight">{money(t.value, "INR", false).split(".")[0]}</p>
      <p className="mt-1 text-xs text-muted">Current value across all categories · {money(t.invested, "INR", true)} invested</p>
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl bg-fg/[0.03] p-2.5">
          <p className="text-subtle">All-time</p>
          <p className={`tabular mt-0.5 font-semibold ${tone(t.gain)}`}>{signedPct(t.gainPct)}</p>
        </div>
        <div className="rounded-xl bg-fg/[0.03] p-2.5">
          <p className="text-subtle">XIRR</p>
          <p className={`tabular mt-0.5 font-semibold ${tone(t.xirr)}`}>{t.xirr != null ? signedPct(t.xirr) : "—"}</p>
        </div>
      </div>
    </div>
  );
}

function RealizedProfit({ p }: { p: Portfolio }) {
  const [open, setOpen] = useState(false);
  const r = p.totals.realizedGain;
  const rows = p.holdings.filter((h) => h.realizedGain !== 0).sort((a, b) => b.realizedGain - a.realizedGain);
  return (
    <div className="panel p-5">
      <div className="flex items-start justify-between">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-subtle">Realised profit</p>
        {r !== 0 && (
          <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${r > 0 ? "bg-income/10 text-income" : "bg-expense/10 text-expense"}`}>
            <TrendingUp size={11} className={r < 0 ? "rotate-180" : ""} /> {r > 0 ? "Gain" : "Loss"}
          </span>
        )}
      </div>
      <p className={`tabular mt-2 text-3xl font-semibold tracking-tight ${tone(r)}`}>{r >= 0 ? "" : "−"}{money(Math.abs(r))}</p>
      <div className="mt-1 flex items-center justify-between text-xs">
        <span className="text-muted">Booked from withdrawals till now</span>
        {rows.length > 0 && (
          <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-0.5 font-medium text-brand">
            Breakdown <ChevronDown size={13} className={`transition ${open ? "rotate-180" : ""}`} />
          </button>
        )}
      </div>
      {open && (
        <ul className="mt-3 divide-y divide-line rounded-xl border border-line text-sm">
          {rows.map((h) => (
            <li key={h.id} className="flex justify-between gap-3 px-3 py-2">
              <span className="truncate text-fg-2">{h.name}</span>
              <span className={`tabular ${tone(h.realizedGain)}`}>{h.realizedGain >= 0 ? "+" : "−"}{money(Math.abs(h.realizedGain))}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ───────────────────────────────────────── Analysis

function AnalysisView({ p, range, setRange }: { p: Portfolio; range: PortfolioRange; setRange: (r: PortfolioRange) => void }) {
  const classes = presentClasses(p);
  const [tab, setTab] = useState<Tab>(classes[0]);
  const [period, setPeriod] = useState<"month" | "year">("month");
  const hs = p.holdings.filter((h) => h.assetClass === tab);

  const flows = useMemo(() => {
    const by = new Map<string, number>();
    let first: string | null = null;
    for (const h of hs) for (const l of h.lots) {
      const k = period === "month" ? l.date.slice(0, 7) : l.date.slice(0, 4);
      by.set(k, (by.get(k) ?? 0) + (l.type === "BUY" ? 1 : -1) * l.amount);
      if (!first || k < first) first = k;
    }
    if (!first) return [];
    const out: { label: string; amount: number }[] = [];
    const now = new Date();
    if (period === "year") {
      for (let y = Number(first); y <= now.getFullYear(); y++) out.push({ label: String(y), amount: by.get(String(y)) ?? 0 });
    } else {
      let [y, m] = first.split("-").map(Number);
      while (y < now.getFullYear() || (y === now.getFullYear() && m <= now.getMonth() + 1)) {
        const k = `${y}-${String(m).padStart(2, "0")}`;
        const d = new Date(y, m - 1, 1);
        out.push({ label: m === 1 || out.length === 0 ? `${d.toLocaleDateString("en-IN", { month: "short" })} ’${String(y).slice(2)}` : d.toLocaleDateString("en-IN", { month: "short" }), amount: by.get(k) ?? 0 });
        m++;
        if (m > 12) { m = 1; y++; }
      }
    }
    return out;
  }, [hs, period]);

  const mix = p.allocation.map((a) => ({ ...a, investedShare: p.totals.invested ? (a.invested / p.totals.invested) * 100 : 0 }));

  return (
    <div className="space-y-6">
      <div className="panel flex flex-wrap items-center justify-between gap-3 p-3">
        <div className="flex flex-wrap rounded-xl bg-fg/[0.05] p-1 text-sm">
          {classes.map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`rounded-lg px-3 py-1.5 transition ${tab === t ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg"}`}>
              {CLASS_META[t].plural}
            </button>
          ))}
        </div>
        <div className="flex rounded-xl bg-fg/[0.05] p-1 text-sm">
          {(["month", "year"] as const).map((x) => (
            <button key={x} onClick={() => setPeriod(x)} className={`rounded-lg px-3 py-1.5 transition ${period === x ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg"}`}>
              {x === "month" ? "Monthly" : "Yearly"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <section className="panel p-6">
          <p className="eyebrow">Invested amount</p>
          <h2 className="mt-1 font-display text-3xl tracking-tight">Trend over time</h2>
          <p className="mt-1 text-sm text-muted">Money put in each {period === "month" ? "month" : "year"} (purchases minus withdrawals).</p>
          <div className="mt-6">
            <ContributionChart data={flows} format={(n) => money(n, "INR", true)} />
          </div>
        </section>

        <section className="panel p-6">
          <p className="eyebrow">Investment allocation</p>
          <h2 className="mt-1 font-display text-3xl tracking-tight">Portfolio mix</h2>
          <div className="mt-6 flex justify-center">
            <Donut
              size={180}
              data={mix.map((a) => ({ label: a.assetClass, value: a.invested }))}
              colors={mix.map((a) => CLASS_META[a.assetClass].color)}
              center={
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-subtle">Total invested</p>
                  <p className="tabular text-base font-semibold">{money(p.totals.invested, "INR", true)}</p>
                </div>
              }
            />
          </div>
          <ul className="mt-6 space-y-2">
            {mix.map((a) => (
              <li key={a.assetClass} className="flex items-center gap-3 rounded-xl bg-fg/[0.03] px-3.5 py-2.5 text-sm">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: CLASS_META[a.assetClass].color }} />
                <span className="flex-1 font-medium">{CLASS_META[a.assetClass].plural}</span>
                <span className="text-right">
                  <span className="tabular block">{money(a.invested)}</span>
                  <span className="tabular block text-[11px] text-subtle">{a.investedShare.toFixed(1)}%</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <GoalHorizon holdings={p.holdings} />

      <section className="panel p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Growth</p>
            <h2 className="mt-1 font-display text-3xl tracking-tight">Value vs invested</h2>
          </div>
          <div className="flex rounded-lg bg-fg/[0.05] p-0.5 text-xs">
            {RANGES.map((r) => (
              <button key={r} onClick={() => setRange(r)} className={`rounded-md px-2.5 py-1 transition ${r === range ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg"}`}>
                {r}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-5">
          <ValueChart data={p.history} format={(n) => money(n, "INR", true)} />
        </div>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[11px] uppercase tracking-[0.12em] text-subtle">
                <th className="py-2.5 font-medium">Class</th>
                <th className="py-2.5 text-right font-medium">Invested</th>
                <th className="py-2.5 text-right font-medium">Current</th>
                <th className="py-2.5 text-right font-medium">P&amp;L</th>
                <th className="py-2.5 text-right font-medium">Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {p.allocation.map((a) => (
                <tr key={a.assetClass}>
                  <td className="py-3"><span className="mr-2 inline-block h-2 w-2 rounded-sm" style={{ background: CLASS_META[a.assetClass].color }} />{CLASS_META[a.assetClass].plural}</td>
                  <td className="tabular py-3 text-right">{money(a.invested)}</td>
                  <td className="tabular py-3 text-right">{money(a.value)}</td>
                  <td className={`tabular py-3 text-right ${tone(a.gain)}`}>{a.gain >= 0 ? "+" : "−"}{money(Math.abs(a.gain))} <span className="text-xs">({signedPct(a.gainPct)})</span></td>
                  <td className="tabular py-3 text-right text-subtle">{a.share?.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

// ───────────────────────────────────────── bits

function Cell({ k, v, sub, tone = "", pill }: { k: string; v: string; sub?: string; tone?: string; pill?: string }) {
  return (
    <div className="border-b border-r border-line p-4 last:border-r-0 lg:border-b-0">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-subtle">{k}</p>
      <p className={`tabular mt-1.5 text-xl font-semibold tracking-tight sm:text-2xl ${tone}`}>{v}</p>
      {pill ? (
        <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${tone.includes("income") ? "bg-income/10" : tone.includes("expense") ? "bg-expense/10" : "bg-fg/5"} ${tone}`}>{pill}</span>
      ) : (
        <p className="mt-0.5 text-xs text-subtle">{sub}</p>
      )}
    </div>
  );
}

function WithdrawPicker({ open, holdings, onClose, onPick }: { open: boolean; holdings: HoldingView[]; onClose: () => void; onPick: (id: string) => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Withdraw" subtitle="Pick the holding you sold">
      <ul className="max-h-[60vh] divide-y divide-line overflow-y-auto rounded-xl border border-line">
        {holdings.filter((h) => h.quantity > 0).map((h) => (
          <li key={h.id}>
            <button onClick={() => onPick(h.id)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-fg/[0.03]">
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{h.name}</span>
                <span className="text-xs text-subtle">{CLASS_META[h.assetClass].label} · {fmtQty(h.quantity)} {CLASS_META[h.assetClass].unit}</span>
              </span>
              <span className="tabular text-sm">{money(h.currentValue)}</span>
            </button>
          </li>
        ))}
      </ul>
    </Modal>
  );
}

function Empty({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="panel-glow p-8 sm:p-12">
      <h2 className="font-display text-4xl tracking-tight">Bring your wealth into one view</h2>
      <p className="mt-3 max-w-xl text-muted">Add what you own — ArthOS prices it live, tracks P&amp;L and XIRR, and shows how it all adds up.</p>
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

function initials(name: string) {
  const w = name.replace(/[^A-Za-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
  return ((w[0]?.[0] ?? "") + (w[1]?.[0] ?? w[0]?.[1] ?? "")).toUpperCase();
}
