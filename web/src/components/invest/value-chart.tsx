"use client";

import { useId, useState } from "react";
import { money, shortMoney } from "@/lib/format";

function path(pts: [number, number][]) {
  if (pts.length < 2) return "";
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2;
    d += ` C${p1[0] + (p2[0] - p0[0]) / 6},${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6},${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]},${p2[1]}`;
  }
  return d;
}

const dateLabel = (iso: string) => new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" });

/** Portfolio value (area) vs money invested (dashed) over time, with value/date axes, a legend and a hover readout. */
export function ValueChart({ data }: { data: { date: string; value: number; invested: number }[]; format?: (n: number) => string }) {
  const id = useId();
  const [hover, setHover] = useState<number | null>(null);
  if (data.length < 2) return <div className="grid h-56 place-items-center text-sm text-subtle">Not enough history yet</div>;

  const W = 720, H = 240, P = { t: 10, r: 6, b: 6, l: 6 };
  const vals = data.flatMap((d) => [d.value, d.invested]);
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const pad = (hi - lo) * 0.12 || hi * 0.05 || 1;
  const min = Math.max(0, lo - pad), max = hi + pad;
  const x = (i: number) => P.l + (i / (data.length - 1)) * (W - P.l - P.r);
  const y = (v: number) => P.t + (1 - (v - min) / (max - min)) * (H - P.t - P.b);
  const vp = data.map((d, i) => [x(i), y(d.value)] as [number, number]);
  const ip = data.map((d, i) => [x(i), y(d.invested)] as [number, number]);
  const last = data[data.length - 1];
  const up = last.value >= last.invested;
  const gain = last.value - last.invested;
  const h = hover != null ? data[hover] : null;
  const ticks = [0, 1, 2, 3, 4].map((k) => min + ((max - min) * k) / 4);
  const xTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * (data.length - 1)));

  return (
    <div>
      {/* legend: what each line is, with today's numbers */}
      <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <span className="flex items-center gap-2">
          <span className={`h-[3px] w-5 rounded-full ${up ? "bg-income" : "bg-expense"}`} />
          <span className="text-muted">Current value</span>
          <span className="tabular font-semibold">{money(Math.round(last.value))}</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="w-5 border-t-2 border-dashed border-muted" />
          <span className="text-muted">Invested</span>
          <span className="tabular font-semibold">{money(Math.round(last.invested))}</span>
        </span>
        <span className={`tabular text-xs font-medium ${up ? "text-income" : "text-expense"}`}>
          {gain >= 0 ? "+" : "−"}
          {money(Math.abs(Math.round(gain)))} ({last.invested ? ((gain / last.invested) * 100).toFixed(1) : "0"}%)
        </span>
      </div>

      <div className="relative grid grid-cols-[56px_1fr] gap-2">
        {/* y axis */}
        <div className="relative">
          {ticks.map((t) => (
            <span key={t} className="tabular absolute right-0 -translate-y-1/2 text-[10.5px] text-subtle" style={{ top: `${(y(t) / H) * 100}%` }}>
              {shortMoney(t)}
            </span>
          ))}
        </div>
        <div className="relative">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="h-auto w-full touch-none select-none"
            role="img"
            aria-label="Portfolio value and money invested over time"
            onPointerMove={(e) => {
              const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
              const i = Math.round(((e.clientX - r.left) / r.width) * (data.length - 1));
              setHover(Math.max(0, Math.min(data.length - 1, i)));
            }}
            onPointerLeave={() => setHover(null)}
          >
            <defs>
              <linearGradient id={`${id}-f`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor={up ? "var(--income)" : "var(--expense)"} stopOpacity="0.22" />
                <stop offset="1" stopColor={up ? "var(--income)" : "var(--expense)"} stopOpacity="0" />
              </linearGradient>
            </defs>
            {ticks.map((t) => (
              <line key={t} x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeDasharray="2 4" />
            ))}
            <line x1={P.l} x2={P.l} y1={P.t} y2={H - P.b} stroke="var(--line-strong)" />
            <line x1={P.l} x2={W - P.r} y1={H - P.b} y2={H - P.b} stroke="var(--line-strong)" />
            <path d={`${path(vp)} L${vp[vp.length - 1][0]},${H - P.b} L${vp[0][0]},${H - P.b} Z`} fill={`url(#${id}-f)`} />
            <path d={path(ip)} fill="none" stroke="var(--muted)" strokeOpacity="0.7" strokeWidth="1.5" strokeDasharray="5 5" />
            <path d={path(vp)} fill="none" stroke={up ? "var(--income)" : "var(--expense)"} strokeWidth="2.4" strokeLinecap="round" />
            {hover != null && (
              <>
                <line x1={vp[hover][0]} x2={vp[hover][0]} y1={P.t} y2={H - P.b} stroke="var(--line-strong)" />
                <circle cx={vp[hover][0]} cy={vp[hover][1]} r="4.5" fill={up ? "var(--income)" : "var(--expense)"} stroke="var(--bg)" strokeWidth="2" />
                <circle cx={ip[hover][0]} cy={ip[hover][1]} r="3" fill="var(--muted)" />
              </>
            )}
          </svg>
          {/* x axis */}
          <div className="relative mt-1.5 h-4 text-[10.5px] text-subtle">
            {xTicks.map((i, k) => (
              <span
                key={k}
                className={`absolute whitespace-nowrap ${k === 0 ? "" : k === xTicks.length - 1 ? "-translate-x-full" : "-translate-x-1/2"}`}
                style={{ left: `${(x(i) / W) * 100}%` }}
              >
                {dateLabel(data[i].date)}
              </span>
            ))}
          </div>
          {h && (
            <div className="pointer-events-none absolute left-2 top-1 rounded-lg border border-line bg-surface-3/90 px-3 py-2 text-xs backdrop-blur">
              <p className="text-muted">{dateLabel(h.date)}</p>
              <p className="tabular mt-0.5 font-semibold">Value {money(Math.round(h.value))}</p>
              <p className="tabular text-subtle">Invested {money(Math.round(h.invested))}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
