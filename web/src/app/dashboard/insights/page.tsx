"use client";

import { AlertTriangle, ArrowDownRight, ArrowUpRight, Bell, CalendarClock, Lightbulb, Repeat, Sparkles, TrendingUp, Zap } from "lucide-react";
import { useState } from "react";
import { MonthPicker } from "@/components/month-picker";
import { PageHeader } from "@/components/page-header";
import { ErrorNote, Skeleton } from "@/components/ui";
import { useAuth } from "@/lib/auth-store";
import { dayLabel, label, money } from "@/lib/format";
import { useInsights } from "@/lib/queries";
import { useMonth } from "@/lib/ui-store";
import type { Insights } from "@/lib/types";

export default function InsightsPage() {
  const month = useMonth();
  const cur = useAuth((s) => s.user?.currency ?? "INR");
  const fmt = (n: number) => money(n, cur);
  const { data, isLoading, error } = useInsights(month);

  return (
    <div className="space-y-6">
      <PageHeader title="Insights" subtitle="What your money did this month — in plain words, with a score that explains itself.">
        <MonthPicker />
      </PageHeader>
      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-72" />
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
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

function InsightsView({ d, fmt }: { d: Insights; fmt: (n: number) => string }) {
  return (
    <>
      {d.alerts.length > 0 && <Alerts d={d} />}
      <section className="grid gap-6 lg:grid-cols-[1.05fr_1fr]">
        <HealthCard d={d} />
        <div className="panel-glow p-6">
          <h2 className="flex items-center gap-2 font-medium">
            <Sparkles size={16} className="text-brand" /> {d.current ? "This month so far" : "The month in a few lines"}
          </h2>
          <ul className="mt-4 space-y-3">
            {d.summary.map((s, i) => (
              <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-fg-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                {s}
              </li>
            ))}
          </ul>
          {d.suggestions.length > 0 && (
            <div className="mt-6 space-y-2.5">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-subtle">Suggestions</p>
              {d.suggestions.map((s) => (
                <div key={s.title} className="flex gap-3 rounded-xl border border-line bg-fg/[0.02] p-3.5">
                  <Lightbulb size={16} className="mt-0.5 shrink-0 text-warn" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{s.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted">{s.body}</p>
                  </div>
                  {s.monthlyImpact != null && s.monthlyImpact > 0 && (
                    <span className="tabular shrink-0 self-start rounded-full bg-income/10 px-2 py-0.5 text-[11px] font-medium text-income">+{fmt(s.monthlyImpact)}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Trends d={d} fmt={fmt} />
        <div className="space-y-6">
          <Unusual d={d} fmt={fmt} />
          <Leakage d={d} fmt={fmt} />
        </div>
      </section>
    </>
  );
}

const LEVEL = {
  DANGER: { box: "border-expense/30 bg-expense/[0.07]", icon: "text-expense", Icon: AlertTriangle },
  WARN: { box: "border-warn/30 bg-warn/[0.08]", icon: "text-warn", Icon: Zap },
  INFO: { box: "border-info/25 bg-info/[0.06]", icon: "text-info", Icon: CalendarClock },
} as const;

function Alerts({ d }: { d: Insights }) {
  return (
    <section className="grid gap-3 md:grid-cols-2">
      {d.alerts.map((a) => {
        const L = LEVEL[a.level];
        return (
          <div key={a.key} className={`flex gap-3 rounded-2xl border px-4 py-3 ${L.box}`}>
            <L.Icon size={17} className={`mt-0.5 shrink-0 ${L.icon}`} />
            <div>
              <p className="text-sm font-medium">{a.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-fg-2">{a.body}</p>
            </div>
          </div>
        );
      })}
    </section>
  );
}

/** Ring gauge + the five components, each with its points, what was measured and how to improve. */
function HealthCard({ d }: { d: Insights }) {
  const [open, setOpen] = useState<string | null>(null);
  const h = d.health;
  const color = h.score >= 80 ? "var(--income)" : h.score >= 65 ? "var(--info)" : h.score >= 45 ? "var(--warn)" : "var(--expense)";
  const R = 52;
  const C = 2 * Math.PI * R;
  return (
    <div className="panel p-6">
      <h2 className="flex items-center gap-2 font-medium">
        <TrendingUp size={16} className="text-brand" /> Financial health
      </h2>
      <div className="mt-5 flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        <div className="relative grid h-36 w-36 shrink-0 place-items-center">
          <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90">
            <circle cx="60" cy="60" r={R} fill="none" stroke="var(--line-strong)" strokeWidth="10" />
            <circle cx="60" cy="60" r={R} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(h.score / 100) * C} ${C}`} className="transition-all duration-700" />
          </svg>
          <div className="text-center">
            <p className="tabular text-4xl font-semibold tracking-tight">{h.score}</p>
            <p className="text-xs font-medium" style={{ color }}>{h.grade}</p>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-fg-2 sm:pt-4">{h.headline}</p>
      </div>
      <ul className="mt-6 space-y-2">
        {h.components.map((c) => {
          const pct = (c.points / c.max) * 100;
          const isOpen = open === c.key;
          return (
            <li key={c.key} className="rounded-xl border border-line">
              <button type="button" onClick={() => setOpen(isOpen ? null : c.key)} className="w-full px-3.5 py-2.5 text-left" aria-expanded={isOpen}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium">{c.label}</span>
                  <span className="text-xs text-subtle">
                    {c.value} · <span className="tabular font-semibold text-fg">{c.points}</span>/{c.max}
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-fg/[0.06]">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct >= 80 ? "var(--income)" : pct >= 50 ? "var(--warn)" : "var(--expense)" }} />
                </div>
              </button>
              {isOpen && (
                <div className="border-t border-line px-3.5 py-2.5 text-xs leading-relaxed">
                  <p className="text-fg-2">{c.explanation}</p>
                  <p className="mt-1 text-brand">→ {c.tip}</p>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-[11px] text-subtle">Tap a line to see how it was scored.</p>
    </div>
  );
}

/** This month vs usual, per category (same days of earlier months, so mid-month numbers compare fairly). */
function Trends({ d, fmt }: { d: Insights; fmt: (n: number) => string }) {
  const max = Math.max(...d.trends.map((t) => Math.max(t.thisMonth, t.typical)), 1);
  return (
    <div className="panel p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-medium">Spending by category</h2>
        <span className="flex items-center gap-3 text-[11px] text-subtle">
          <span className="flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm bg-brand" /> {d.current ? "So far" : "This month"}</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm bg-fg/20" /> Usual</span>
        </span>
      </div>
      {d.trends.length === 0 ? (
        <p className="mt-6 text-sm text-muted">No spending to compare yet.</p>
      ) : (
        <ul className="mt-5 space-y-4">
          {d.trends.map((t) => {
            const up = (t.changePct ?? 0) > 0;
            return (
              <li key={t.category}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium">{label(t.category)}</span>
                  <span className="flex items-center gap-2">
                    <span className="tabular">{fmt(Math.round(t.thisMonth))}</span>
                    {t.changePct != null && t.typical > 0 && Math.abs(t.changePct) >= 5 && (
                      <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${up ? "bg-expense/10 text-expense" : "bg-income/10 text-income"}`}>
                        {up ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                        {Math.abs(Math.round(t.changePct))}%
                      </span>
                    )}
                  </span>
                </div>
                <div className="mt-1.5 space-y-1">
                  <div className="h-2 overflow-hidden rounded-full bg-fg/[0.05]">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${(t.thisMonth / max) * 100}%` }} />
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-fg/[0.04]">
                    <div className="h-full rounded-full bg-fg/20" style={{ width: `${(t.typical / max) * 100}%` }} />
                  </div>
                </div>
                {t.typical > 0 && <p className="mt-1 text-[11px] text-subtle">usually {fmt(Math.round(t.typical))} {d.current ? "by now" : "a month"}</p>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Unusual({ d, fmt }: { d: Insights; fmt: (n: number) => string }) {
  return (
    <div className="panel p-6">
      <h2 className="flex items-center gap-2 font-medium">
        <Bell size={16} className="text-warn" /> Unusual spending
      </h2>
      {d.anomalies.length === 0 ? (
        <p className="mt-3 text-sm text-muted">Nothing out of the ordinary — every purchase is in line with your usual spending.</p>
      ) : (
        <ul className="mt-3 divide-y divide-line">
          {d.anomalies.map((a) => (
            <li key={a.id} className="flex items-start justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{a.merchant}</p>
                <p className="text-xs text-subtle">{label(a.category)} · {dayLabel(a.date)} · {a.reason}</p>
              </div>
              <span className="tabular shrink-0 text-sm font-semibold">{fmt(a.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Leakage({ d, fmt }: { d: Insights; fmt: (n: number) => string }) {
  const l = d.leakage;
  return (
    <div className="panel p-6">
      <h2 className="flex items-center gap-2 font-medium">
        <Repeat size={16} className="text-info" /> Subscriptions & recurring
      </h2>
      {l.items.length === 0 ? (
        <p className="mt-3 text-sm text-muted">No recurring payments marked yet (rent and EMIs are counted as fixed costs, not here).</p>
      ) : (
        <>
          <p className="mt-2 text-sm text-fg-2">
            <span className="tabular font-semibold text-fg">{fmt(l.monthly)}</span> a month ·{" "}
            <span className="tabular font-semibold text-fg">{fmt(l.yearly)}</span> a year
          </p>
          <ul className="mt-3 space-y-2">
            {l.items.map((i) => {
              const rise = l.priceRises.find((r) => r.name === i.name);
              return (
                <li key={i.name} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate">
                    {i.name} <span className="text-xs text-subtle">· {label(i.category)}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {rise && <span className="rounded-full bg-warn/10 px-1.5 py-0.5 text-[10px] font-medium text-warn">▲ was {fmt(rise.before)}</span>}
                    <span className="tabular">{fmt(i.amount)}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
