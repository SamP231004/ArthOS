"use client";

import { Clock, Target } from "lucide-react";
import { HORIZON_META, signedPct, tone } from "./meta";
import { money } from "@/lib/format";
import type { HoldingView, Horizon } from "@/lib/types";

type Group = { key: string; label: string; hint?: string; value: number; invested: number; count: number };

function groups(hs: HoldingView[], keyOf: (h: HoldingView) => string, labelOf: (k: string) => { label: string; hint?: string }): Group[] {
  const by = new Map<string, Group>();
  for (const h of hs) {
    const k = keyOf(h);
    const g = by.get(k) ?? { key: k, ...labelOf(k), value: 0, invested: 0, count: 0 };
    g.value += h.currentValue;
    g.invested += h.invested;
    g.count += 1;
    by.set(k, g);
  }
  return [...by.values()].sort((a, b) => b.value - a.value);
}

const HORIZON_ORDER: (Horizon | "NONE")[] = ["SHORT", "MEDIUM", "LONG", "NONE"];
const HORIZON_COLOR: Record<Horizon | "NONE", string> = { SHORT: "var(--c6)", MEDIUM: "var(--c3)", LONG: "var(--c1)", NONE: "var(--c8)" };

/** Portfolio by time horizon and by goal (blueprint §9.3): value, share, P&L and how many holdings sit in each. */
export function GoalHorizon({ holdings }: { holdings: HoldingView[] }) {
  const total = holdings.reduce((a, h) => a + h.currentValue, 0) || 1;
  const byHorizon = groups(
    holdings,
    (h) => h.horizon ?? "NONE",
    (k) => ({ label: HORIZON_META[k as Horizon | "NONE"].label, hint: HORIZON_META[k as Horizon | "NONE"].hint }),
  ).sort((a, b) => HORIZON_ORDER.indexOf(a.key as Horizon) - HORIZON_ORDER.indexOf(b.key as Horizon));
  const byGoal = groups(
    holdings,
    (h) => h.goal?.trim() || "",
    (k) => ({ label: k || "No goal set" }),
  );
  const goalColors = ["var(--c1)", "var(--c4)", "var(--c2)", "var(--c5)", "var(--c6)", "var(--c3)", "var(--c7)"];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <GroupCard icon={Clock} eyebrow="By time horizon" title="When you'll need it" rows={byHorizon} total={total} colorOf={(g) => HORIZON_COLOR[g.key as Horizon | "NONE"]} />
      <GroupCard
        icon={Target}
        eyebrow="By goal"
        title="What it's for"
        rows={byGoal}
        total={total}
        colorOf={(g, i) => (g.key ? goalColors[i % goalColors.length] : "var(--c8)")}
        empty="Add a goal to a holding (Settings tab of any holding) to see it here."
      />
    </div>
  );
}

function GroupCard({
  icon: Icon,
  eyebrow,
  title,
  rows,
  total,
  colorOf,
  empty,
}: {
  icon: typeof Clock;
  eyebrow: string;
  title: string;
  rows: Group[];
  total: number;
  colorOf: (g: Group, i: number) => string;
  empty?: string;
}) {
  const onlyUnset = rows.length === 1 && !rows[0].key;
  return (
    <section className="panel p-6">
      <p className="eyebrow flex items-center gap-1.5">
        <Icon size={12} /> {eyebrow}
      </p>
      <h2 className="mt-1 font-display text-3xl tracking-tight">{title}</h2>
      {onlyUnset && empty ? <p className="mt-2 text-sm text-muted">{empty}</p> : null}
      <ul className="mt-5 space-y-4">
        {rows.map((g, i) => {
          const pl = g.value - g.invested;
          const share = (g.value / total) * 100;
          const color = colorOf(g, i);
          return (
            <li key={g.key || "_none"}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate">
                  <span className="font-medium">{g.label}</span>
                  {g.hint ? <span className="ml-1.5 text-xs text-subtle">{g.hint}</span> : null}
                  <span className="ml-1.5 text-xs text-subtle">· {g.count} {g.count === 1 ? "holding" : "holdings"}</span>
                </span>
                <span className="tabular shrink-0 font-semibold">{money(g.value)}</span>
              </div>
              <div className="mt-1.5 flex items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-fg/[0.06]">
                  <div className="h-full rounded-full" style={{ width: `${share}%`, background: color }} />
                </div>
                <span className="tabular w-12 text-right text-xs text-subtle">{share.toFixed(1)}%</span>
                <span className={`tabular w-28 text-right text-xs font-medium ${tone(pl)}`}>
                  {pl >= 0 ? "+" : "−"}
                  {money(Math.abs(pl), "INR", true)} {signedPct(g.invested ? (pl / g.invested) * 100 : 0)}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
