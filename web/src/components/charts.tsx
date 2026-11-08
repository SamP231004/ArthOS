"use client";

import { useId, useState } from "react";

/** Smooth path through points using Catmull-Rom → Bézier. */
function smoothPath(pts: [number, number][]) {
  if (pts.length < 2) return "";
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]}`;
  }
  return d;
}

/**
 * Cumulative spending through the month against a straight "pace" line that would spend all income by month end.
 * Hover reveals the day's running total.
 */
export function SpendCurve({
  daily,
  daysInMonth,
  income,
  incomeLabel = "income",
  format,
}: {
  daily: { date: string; amount: number }[];
  daysInMonth: number;
  income: number;
  incomeLabel?: string;
  format: (n: number) => string;
}) {
  const id = useId();
  const [hover, setHover] = useState<number | null>(null);
  const W = 640;
  const H = 220;
  const P = { t: 16, r: 12, b: 26, l: 12 };

  const cum = daily.reduce<number[]>((acc, d) => [...acc, (acc[acc.length - 1] ?? 0) + d.amount], []);
  const total = cum[cum.length - 1] ?? 0;
  const max = Math.max(income, total, 1) * 1.08;
  const x = (day: number) => P.l + ((day - 1) / Math.max(daysInMonth - 1, 1)) * (W - P.l - P.r);
  const y = (v: number) => H - P.b - (v / max) * (H - P.t - P.b);

  const pts: [number, number][] = cum.map((v, i) => [x(i + 1), y(v)]);
  const line = smoothPath(pts);
  const area = pts.length ? `${line} L${pts[pts.length - 1][0]},${H - P.b} L${pts[0][0]},${H - P.b} Z` : "";
  const h = hover != null ? Math.min(hover, cum.length - 1) : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full touch-none select-none"
        onPointerMove={(e) => {
          const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const day = Math.round(((e.clientX - r.left) / r.width) * (daysInMonth - 1));
          setHover(day >= 0 && day < cum.length ? day : null);
        }}
        onPointerLeave={() => setHover(null)}
        role="img"
        aria-label="Cumulative spending this month"
      >
        <defs>
          <linearGradient id={`${id}-a`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--fg)" stopOpacity="0.14" />
            <stop offset="1" stopColor="var(--fg)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`${id}-l`} x1="0" x2="1">
            <stop offset="0" stopColor="var(--fg)" stopOpacity="0.55" />
            <stop offset="1" stopColor="var(--fg)" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={P.l} x2={W - P.r} y1={P.t + f * (H - P.t - P.b)} y2={P.t + f * (H - P.t - P.b)} stroke="var(--line)" strokeDasharray="2 4" />
        ))}
        {income > 0 && (
          <>
            <line x1={x(1)} y1={y(0)} x2={x(daysInMonth)} y2={y(income)} stroke="var(--income)" strokeOpacity="0.45" strokeDasharray="4 5" />
            <text x={x(daysInMonth) - 4} y={y(income) - 8} textAnchor="end" fill="var(--income)" fillOpacity="0.8" fontSize="11">
              {incomeLabel}
            </text>
          </>
        )}
        {area && <path d={area} fill={`url(#${id}-a)`} />}
        {line && <path d={line} fill="none" stroke={`url(#${id}-l)`} strokeWidth="2.5" strokeLinecap="round" />}
        {pts.length > 0 && <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="4.5" fill="var(--fg)" stroke="var(--bg)" strokeWidth="2" />}
        {h != null && pts[h] && (
          <>
            <line x1={pts[h][0]} x2={pts[h][0]} y1={P.t} y2={H - P.b} stroke="var(--line-strong)" />
            <circle cx={pts[h][0]} cy={pts[h][1]} r="4" fill="var(--fg)" />
          </>
        )}
        {[1, Math.ceil(daysInMonth / 2), daysInMonth].map((d) => (
          <text key={d} x={x(d)} y={H - 6} textAnchor={d === 1 ? "start" : d === daysInMonth ? "end" : "middle"} fill="var(--subtle)" fontSize="11">
            Day {d}
          </text>
        ))}
      </svg>
      {h != null && daily[h] && (
        <div className="pointer-events-none absolute left-3 top-2 rounded-lg border border-line bg-surface-3/90 px-2.5 py-1.5 text-xs backdrop-blur">
          <span className="text-muted">Day {h + 1}</span> · <span className="tabular font-medium">{format(cum[h])}</span>{" "}
          <span className="text-subtle">(+{format(daily[h].amount)})</span>
        </div>
      )}
    </div>
  );
}

export const CATEGORY_COLORS = ["var(--c1)", "var(--c4)", "var(--c2)", "var(--c6)", "var(--c5)", "var(--c3)", "var(--c7)", "var(--c8)"];

export function Donut({ data, size = 168, center, colors }: { data: { label: string; value: number }[]; size?: number; center?: React.ReactNode; colors?: string[] }) {
  const total = data.reduce((a, d) => a + d.value, 0) || 1;
  const r = 42;
  const C = 2 * Math.PI * r;
  const offsets = data.reduce<number[]>((acc, d, i) => [...acc, i === 0 ? 0 : acc[i - 1] + (data[i - 1].value / total) * C], []);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--surface-3)" strokeWidth="11" />
        {data.map((d, i) => {
          const len = (d.value / total) * C;
          const gap = data.length > 1 ? 1.2 : 0;
          const el = (
            <circle
              key={d.label}
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke={colors?.[i] ?? CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
              strokeWidth="11"
              strokeDasharray={`${Math.max(len - gap, 0.1)} ${C}`}
              strokeDashoffset={-offsets[i]}
            />
          );
          return el;
        })}
      </svg>
      {center && <div className="absolute inset-0 grid place-items-center text-center">{center}</div>}
    </div>
  );
}

export function Sparkline({ values, color = "var(--muted)", className = "h-8 w-24" }: { values: number[]; color?: string; className?: string }) {
  const id = useId();
  if (values.length < 2) return <div className={className} />;
  const max = Math.max(...values, 1);
  const pts: [number, number][] = values.map((v, i) => [(i / (values.length - 1)) * 100, 28 - (v / max) * 24]);
  const line = smoothPath(pts);
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className={className} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.3" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L100,30 L0,30 Z`} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function DailyBars({ data, format }: { data: { date: string; amount: number }[]; format: (n: number) => string }) {
  const [hover, setHover] = useState<number | null>(null);
  if (data.length === 0) return <p className="text-sm text-muted">No days elapsed yet.</p>;
  const max = Math.max(...data.map((d) => d.amount), 1);
  const avg = data.reduce((a, d) => a + d.amount, 0) / data.length;
  return (
    <div className="relative">
      <div className="relative flex h-44 items-end gap-[3px]" onPointerLeave={() => setHover(null)}>
        <div className="pointer-events-none absolute inset-x-0 border-t border-dashed border-fg/15" style={{ bottom: `${(avg / max) * 100}%` }} />
        {data.map((d, i) => (
          <div key={d.date} className="flex h-full flex-1 items-end" onPointerEnter={() => setHover(i)}>
            <div
              className="w-full rounded-t-[3px] transition-colors"
              style={{
                height: `${Math.max(2, (d.amount / max) * 100)}%`,
                // normal days are neutral so only spikes read as red, in both themes
                background: d.amount > avg * 1.6 ? "var(--expense)" : hover === i ? "color-mix(in oklab, var(--fg) 55%, transparent)" : "color-mix(in oklab, var(--fg) 26%, transparent)",
                opacity: d.amount === 0 ? 0.2 : hover == null || hover === i ? 1 : 0.55,
              }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-subtle">
        <span>{hover != null ? `Day ${hover + 1}: ${format(data[hover].amount)}` : `Avg ${format(avg)}/day`}</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-expense" /> spike</span>
      </div>
    </div>
  );
}
