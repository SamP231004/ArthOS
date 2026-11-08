"use client";

import { AlertTriangle, ArrowDownRight, ArrowUpRight, CalendarClock, ChevronRight, Lightbulb, Repeat, ScanSearch, Sparkles, Zap } from "lucide-react";
import { useState } from "react";
import { MonthPicker } from "@/components/month-picker";
import { PageHeader } from "@/components/page-header";
import { ErrorNote, Skeleton } from "@/components/ui";
import { useAuth } from "@/lib/auth-store";
import { dayLabel, label, money } from "@/lib/format";
import { useInsights } from "@/lib/queries";
import { useMonth } from "@/lib/ui-store";
import type { Insights } from "@/lib/types";

type Fmt = (n: number) => string;

export default function InsightsPage() {
  const month = useMonth();
  const cur = useAuth((s) => s.user?.currency ?? "INR");
  const fmt: Fmt = (n) => money(Math.round(n), cur);
  const { data, isLoading, error } = useInsights(month);

  return (
    <div className="space-y-6">
      <PageHeader title="Insights" subtitle="What your money did — in plain words, with a score that explains itself.">
        <MonthPicker />
      </PageHeader>
      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-64" />
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
          </div>
        </div>
      ) : error ? (
        <ErrorNote message={error.message} />
      ) : (
        data && <InsightsView d={data} fmt={fmt} />
      )}
    </div>
  );
}

function InsightsView({ d, fmt }: { d: Insights; fmt: Fmt }) {
  return (
    <>
      <HealthHero d={d} />
      {d.alerts.length > 0 && <Alerts d={d} />}
      <MonthStory d={d} fmt={fmt} />
      <section className="grid items-start gap-6 lg:grid-cols-[1.35fr_1fr]">
        <Categories d={d} fmt={fmt} />
        <div className="space-y-6">
          {d.suggestions.length > 0 && <Suggestions d={d} fmt={fmt} />}
          <Unusual d={d} fmt={fmt} />
          <Subscriptions d={d} fmt={fmt} />
        </div>
      </section>
    </>
  );
}

// ───────────────────────────────────────── health

const scoreColor = (s: number) => (s >= 80 ? "var(--income)" : s >= 65 ? "var(--info)" : s >= 45 ? "var(--warn)" : "var(--expense)");
const partColor = (pct: number) => (pct >= 80 ? "var(--income)" : pct >= 50 ? "var(--warn)" : "var(--expense)");

/** Score gauge + the five parts as tiles; tapping a tile opens how it was scored, in one shared panel. */
function HealthHero({ d }: { d: Insights }) {
  const h = d.health;
  const weakest = [...h.components].sort((a, b) => a.points / a.max - b.points / b.max)[0];
  const [open, setOpen] = useState<string>(weakest?.key ?? "");
  const sel = h.components.find((c) => c.key === open);
  const color = scoreColor(h.score);
  // 240° gauge
  const R = 64, C = 2 * Math.PI * R, arc = C * (240 / 360);

  return (
    <section className="panel-glow overflow-hidden p-6 sm:p-8">
      <div className="grid gap-8 lg:grid-cols-[auto_1fr] lg:items-center">
        <div className="flex items-center gap-6">
          <div className="relative grid h-40 w-40 shrink-0 place-items-center">
            <svg viewBox="0 0 160 160" className="absolute inset-0 rotate-[150deg]">
              <circle cx="80" cy="80" r={R} fill="none" stroke="var(--line-strong)" strokeWidth="12" strokeLinecap="round" strokeDasharray={`${arc} ${C}`} />
              <circle cx="80" cy="80" r={R} fill="none" stroke={color} strokeWidth="12" strokeLinecap="round" strokeDasharray={`${(h.score / 100) * arc} ${C}`} className="transition-all duration-700" />
            </svg>
            <div className="text-center">
              <p className="tabular text-5xl font-semibold tracking-tight">{h.score}</p>
              <p className="text-xs uppercase tracking-[0.14em] text-subtle">of 100</p>
            </div>
          </div>
          <div className="lg:hidden">
            <p className="text-lg font-semibold" style={{ color }}>{h.grade}</p>
            <p className="mt-1 text-sm leading-relaxed text-fg-2">{h.headline}</p>
          </div>
        </div>

        <div className="min-w-0">
          <div className="hidden lg:block">
            <p className="eyebrow">Financial health</p>
            <p className="mt-1 font-display text-3xl tracking-tight">
              <span style={{ color }}>{h.grade}</span>
              <span className="text-fg-2"> — {h.headline}</span>
            </p>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {h.components.map((c) => {
              const pct = (c.points / c.max) * 100;
              const on = c.key === open;
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setOpen(c.key)}
                  aria-pressed={on}
                  className={`rounded-xl border p-3 text-left transition ${on ? "border-brand bg-brand/[0.06]" : "border-line hover:border-line-strong"}`}
                >
                  <p className="truncate text-xs text-muted">{c.label}</p>
                  <p className="tabular mt-1 text-lg font-semibold">
                    {c.points}
                    <span className="text-xs font-normal text-subtle">/{c.max}</span>
                  </p>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-fg/[0.07]">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: partColor(pct) }} />
                  </div>
                </button>
              );
            })}
          </div>
          {sel && (
            <div className="mt-3 rounded-xl border border-line bg-fg/[0.02] p-4 text-sm leading-relaxed">
              <p className="flex items-center justify-between gap-3">
                <span className="font-medium">{sel.label}</span>
                <span className="tabular text-xs text-subtle">{sel.value}</span>
              </p>
              <p className="mt-1 text-fg-2">{sel.explanation}</p>
              <p className="mt-1.5 text-brand">→ {sel.tip}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ───────────────────────────────────────── alerts

const LEVEL = {
  DANGER: { chip: "border-expense/30 bg-expense/[0.07]", icon: "text-expense", Icon: AlertTriangle },
  WARN: { chip: "border-warn/30 bg-warn/[0.08]", icon: "text-warn", Icon: Zap },
  INFO: { chip: "border-info/25 bg-info/[0.06]", icon: "text-info", Icon: CalendarClock },
} as const;

function Alerts({ d }: { d: Insights }) {
  return (
    <section className="flex flex-wrap gap-2.5">
      {d.alerts.map((a) => {
        const L = LEVEL[a.level];
        return (
          <div key={a.key} title={a.body} className={`flex min-w-0 max-w-full items-center gap-2.5 rounded-full border py-2 pl-3 pr-4 ${L.chip}`}>
            <L.Icon size={15} className={`shrink-0 ${L.icon}`} />
            <span className="truncate text-sm font-medium">{a.brief ?? a.title}</span>
          </div>
        );
      })}
    </section>
  );
}

// ───────────────────────────────────────── the month

/** Bold the ₹ amounts and percentages inside a sentence so the numbers stand out. */
function Highlight({ text }: { text: string }) {
  const parts = text.split(/(₹[\d,]+(?:\.\d+)?|\d+(?:\.\d+)?%)/g);
  return (
    <>
      {parts.map((p, i) => (i % 2 === 1 ? <strong key={i} className="tabular font-semibold text-fg">{p}</strong> : <span key={i}>{p}</span>))}
    </>
  );
}

function MonthStory({ d }: { d: Insights; fmt: Fmt }) {
  return (
    <section className="panel p-6">
      <p className="eyebrow">{d.current ? "This month so far" : "The month in a few lines"}</p>
      <ul className="mt-4 grid gap-x-8 gap-y-3 md:grid-cols-2">
        {d.summary.map((s, i) => (
          <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-fg-2">
            <Sparkles size={14} className="mt-1.5 shrink-0 text-brand" />
            <span>
              <Highlight text={s} />
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** One bar per category: this month's spend, with a marker where "usual" sits on the same scale. */
function Categories({ d, fmt }: { d: Insights; fmt: Fmt }) {
  const max = Math.max(...d.trends.map((t) => Math.max(t.thisMonth, t.typical)), 1);
  return (
    <section className="panel p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="eyebrow">Where it went</p>
          <h2 className="mt-1 font-display text-2xl tracking-tight">By category, vs usual</h2>
        </div>
        <span className="flex items-center gap-3 text-[11px] text-subtle">
          <span className="flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm bg-brand" /> {d.current ? "So far" : "This month"}</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-0.5 rounded bg-fg" /> Usual</span>
        </span>
      </div>
      {d.trends.length === 0 ? (
        <p className="mt-6 text-sm text-muted">No spending to compare yet.</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {d.trends.map((t) => {
            const change = t.changePct ?? 0;
            const up = change > 0;
            const notable = t.typical > 0 && Math.abs(change) >= 5;
            return (
              <li key={t.category}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium">{label(t.category)}</span>
                  <span className="flex items-center gap-2">
                    <span className="tabular font-medium">{fmt(t.thisMonth)}</span>
                    {notable ? (
                      <span className={`tabular inline-flex w-14 items-center justify-end gap-0.5 text-xs font-medium ${up ? "text-expense" : "text-income"}`}>
                        {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                        {Math.abs(Math.round(change))}%
                      </span>
                    ) : (
                      <span className="w-14 text-right text-xs text-subtle">{t.typical > 0 ? "usual" : "new"}</span>
                    )}
                  </span>
                </div>
                <div className="relative mt-2 h-2.5 rounded-full bg-fg/[0.05]">
                  <div className={`h-full rounded-full ${up && notable ? "bg-expense/80" : "bg-brand"}`} style={{ width: `${(t.thisMonth / max) * 100}%` }} />
                  {t.typical > 0 && (
                    <div className="absolute -top-1 h-[18px] w-0.5 -translate-x-1/2 rounded bg-fg" style={{ left: `${(t.typical / max) * 100}%` }} title={`Usually ${fmt(t.typical)}`} />
                  )}
                </div>
                {t.typical > 0 && <p className="tabular mt-1 text-[11px] text-subtle">usually {fmt(t.typical)}{d.current ? " by now" : " a month"}</p>}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Suggestions({ d, fmt }: { d: Insights; fmt: Fmt }) {
  return (
    <section className="panel p-6">
      <h2 className="flex items-center gap-2 font-medium">
        <Lightbulb size={16} className="text-warn" /> What you could do
      </h2>
      <ul className="mt-4 space-y-2.5">
        {d.suggestions.map((s) => (
          <li key={s.title} className="rounded-xl border border-line p-3.5">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium">{s.title}</p>
              {s.monthlyImpact != null && s.monthlyImpact > 0 && (
                <span className="tabular shrink-0 rounded-full bg-income/10 px-2 py-0.5 text-[11px] font-medium text-income">+{fmt(s.monthlyImpact)}</span>
              )}
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted">{s.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Unusual({ d, fmt }: { d: Insights; fmt: Fmt }) {
  return (
    <section className="panel p-6">
      <h2 className="flex items-center gap-2 font-medium">
        <ScanSearch size={16} className="text-warn" /> Unusual spending
      </h2>
      {d.anomalies.length === 0 ? (
        <p className="mt-3 text-sm text-muted">Nothing out of the ordinary — every purchase is in line with your usual spending.</p>
      ) : (
        <ul className="mt-3 divide-y divide-line">
          {d.anomalies.map((a) => {
            const times = a.reason.match(/^([\d.]+×)/)?.[1];
            return (
              <li key={a.id} className="flex items-center gap-3 py-3">
                {times && <span className="tabular grid h-10 w-12 shrink-0 place-items-center rounded-lg bg-warn/10 text-xs font-semibold text-warn">{times}</span>}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{a.merchant}</p>
                  <p className="truncate text-xs text-subtle">{label(a.category)} · {dayLabel(a.date)}</p>
                </div>
                <span className="tabular shrink-0 text-sm font-semibold">{fmt(a.amount)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Subscriptions({ d, fmt }: { d: Insights; fmt: Fmt }) {
  const l = d.leakage;
  return (
    <section className="panel p-6">
      <h2 className="flex items-center gap-2 font-medium">
        <Repeat size={16} className="text-info" /> Subscriptions &amp; recurring
      </h2>
      {l.items.length === 0 ? (
        <p className="mt-3 text-sm text-muted">No recurring payments marked yet (rent and EMIs are fixed costs, not counted here).</p>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-fg/[0.03] p-3">
              <p className="text-xs text-subtle">Every month</p>
              <p className="tabular mt-0.5 text-lg font-semibold">{fmt(l.monthly)}</p>
            </div>
            <div className="rounded-xl bg-fg/[0.03] p-3">
              <p className="text-xs text-subtle">Every year</p>
              <p className="tabular mt-0.5 text-lg font-semibold">{fmt(l.yearly)}</p>
            </div>
          </div>
          <ul className="mt-3 space-y-1">
            {l.items.map((i) => {
              const rise = l.priceRises.find((r) => r.name === i.name);
              return (
                <li key={i.name} className="flex items-center gap-3 rounded-lg px-1 py-1.5 text-sm">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-info/10 text-xs font-semibold text-info">{i.name.charAt(0).toUpperCase()}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{i.name}</span>
                    <span className="block text-[11px] text-subtle">{label(i.category)}</span>
                  </span>
                  {rise && <span className="tabular rounded-full bg-warn/10 px-1.5 py-0.5 text-[10px] font-medium text-warn">▲ was {fmt(rise.before)}</span>}
                  <span className="tabular shrink-0">{fmt(i.amount)}</span>
                  <ChevronRight size={14} className="hidden shrink-0 text-subtle" />
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
