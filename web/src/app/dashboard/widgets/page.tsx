"use client";

import { Download, Eye, EyeOff, Hand, RotateCw, Settings2, Smartphone } from "lucide-react";
import { LogoMark } from "@/components/logo";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { ErrorNote, Skeleton } from "@/components/ui";
import { money } from "@/lib/format";
import { useWidgetSnapshot } from "@/lib/queries";
import type { WidgetSnapshot } from "@/lib/types";

const APK_URL = "https://github.com/SamP231004/ArthOS/releases/tag/android-latest";

/**
 * Home-screen widgets live on Android (a browser can't place anything on a phone's home screen). This page previews
 * them with the user's live numbers — the same /api/widget snapshot the phone draws — and explains how to add them.
 * Layouts mirror app/src/widgets/widgets.tsx.
 */
export default function WidgetsPage() {
  const { data, isLoading, error } = useWidgetSnapshot();
  const [hide, setHide] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader title="Widgets" subtitle="Your money on your Android home screen — here's what they'd show right now.">
        <button
          type="button"
          onClick={() => setHide((h) => !h)}
          aria-pressed={hide}
          className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm transition ${hide ? "border-brand text-brand" : "border-line-strong text-fg-2 hover:text-fg"}`}
        >
          <EyeOff size={15} /> Hide amounts
        </button>
      </PageHeader>

      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-44" />
          <Skeleton className="h-44 sm:col-span-2" />
          <Skeleton className="h-44" />
        </div>
      ) : error ? (
        <ErrorNote message={error.message} />
      ) : (
        data && <Previews d={data} hide={hide} onEye={() => setHide((h) => !h)} />
      )}

      <div className="panel grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-center">
        <div className="space-y-4">
          <div>
            <h2 className="font-medium">Add them to your phone</h2>
            <p className="mt-1 text-sm text-subtle">Widgets need the ArthOS Android app — a website can&apos;t place anything on a home screen.</p>
          </div>
          <ol className="grid gap-3 sm:grid-cols-3">
            <Step n={1} icon={Download} title="Install the app" body="Download the latest APK and sign in with this account." />
            <Step n={2} icon={Hand} title="Long-press your home screen" body="Tap Widgets, find ArthOS, and drag one out. Resize it as you like." />
            <Step n={3} icon={Settings2} title="Make it yours" body="Tap the eye on a widget to hide amounts; long-press it → Settings to pick its theme (match the app, Forest or Ivory)." />
          </ol>
          <p className="text-xs text-subtle">
            Widgets refresh every 30 minutes, right after you save anything in the app, and whenever you open it. They keep the last numbers when you&apos;re offline.
          </p>
        </div>
        <a href={APK_URL} target="_blank" rel="noreferrer" className="btn-primary inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-medium">
          <Smartphone size={16} /> Get the Android app
        </a>
      </div>
    </div>
  );
}

function Step({ n, icon: Icon, title, body }: { n: number; icon: React.ComponentType<{ size?: number; className?: string }>; title: string; body: string }) {
  return (
    <li className="rounded-xl border border-line bg-surface-2 p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-brand/15 text-xs text-brand">{n}</span>
        <Icon size={15} className="text-subtle" />
        {title}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-subtle">{body}</p>
    </li>
  );
}

// ------------------------------------------------------------------ previews (mirror app/src/widgets/widgets.tsx)

type Ctx = { d: WidgetSnapshot; hide: boolean; onEye: () => void };

function fmt({ d, hide }: Ctx, n: number | undefined | null) {
  return hide ? "₹ ••••" : money(Math.round(n ?? 0), d.currency);
}

function pct(n?: number | null) {
  const v = Math.abs(n ?? 0);
  return `${v >= 100 ? Math.round(v) : v.toFixed(1)}%`;
}

function statusOf(status?: string) {
  if (status === "OVER" || status === "OVER_MONTH") return { text: "text-expense", bg: "bg-expense", label: status === "OVER" ? "Over today" : "Over budget" };
  if (status === "CAUTION") return { text: "text-warn", bg: "bg-warn", label: "Careful" };
  return { text: "text-income", bg: "bg-income", label: "On track" };
}

function Previews({ d, hide, onEye }: { d: WidgetSnapshot; hide: boolean; onEye: () => void }) {
  const ctx = { d, hide, onEye };
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <Labeled name="Safe to spend" size="2 × 2">
        <SafeToSpend {...ctx} />
      </Labeled>
      <Labeled name="Month" size="4 × 2" wide>
        <MonthTile {...ctx} />
      </Labeled>
      <Labeled name="Portfolio" size="4 × 2" wide>
        <PortfolioTile {...ctx} />
      </Labeled>
      <Labeled name="Quick add" size="2 × 1">
        <QuickAdd />
      </Labeled>
    </div>
  );
}

function Labeled({ name, size, wide, children }: { name: string; size: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <figure className={`space-y-2 ${wide ? "sm:col-span-2" : ""}`}>
      {children}
      <figcaption className="flex items-center justify-between px-1 text-xs text-subtle">
        <span className="font-medium text-fg-2">{name}</span>
        <span>{size}</span>
      </figcaption>
    </figure>
  );
}

function Tile({ children }: { children: React.ReactNode }) {
  return <div className="flex h-44 flex-col justify-between rounded-[22px] border border-line bg-surface px-4 py-3 shadow-sm">{children}</div>;
}

function Head({ ctx, title, eye, refresh }: { ctx: Ctx; title: string; eye?: boolean; refresh?: boolean }) {
  const time = new Date(ctx.d.generatedAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-1.5">
        <LogoMark size={18} />
        <span className="truncate text-xs text-muted">{refresh ? `${title} · ${time}` : title}</span>
      </div>
      <div className="flex shrink-0 items-center gap-0.5 text-muted">
        {eye && (
          <button type="button" onClick={ctx.onEye} className="grid h-7 w-7 place-items-center rounded-full hover:bg-fg/5" aria-label={ctx.hide ? "Show amounts" : "Hide amounts"}>
            {ctx.hide ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        )}
        {refresh && (
          <span className="grid h-7 w-7 place-items-center rounded-full" aria-hidden>
            <RotateCw size={14} />
          </span>
        )}
      </div>
    </div>
  );
}

function Bar({ value, color, marker, thick }: { value: number; color: string; marker?: number; thick?: boolean }) {
  return (
    <div className={`relative w-full rounded-full bg-fg/[0.07] ${thick ? "h-[7px]" : "h-1.5"}`}>
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      {marker != null && <div className="absolute -top-[3px] h-[calc(100%+6px)] w-0.5 -translate-x-1/2 rounded bg-fg" style={{ left: `${Math.min(100, Math.max(0, marker))}%` }} />}
    </div>
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex h-44 flex-col justify-between rounded-[22px] border border-line bg-surface px-4 py-3 shadow-sm">
      <div className="flex items-center gap-1.5">
        <LogoMark size={18} />
        <span className="text-xs text-muted">ArthOS</span>
      </div>
      <div>
        <p className="text-[15px] font-semibold">{title}</p>
        <p className="mt-0.5 text-xs text-muted">{body}</p>
      </div>
    </div>
  );
}

function SafeToSpend(ctx: Ctx) {
  const b = ctx.d.budget;
  if (!b.configured) return <Empty title="Set a budget" body="ArthOS turns it into one number: what you can spend today." />;
  const s = statusOf(b.status);
  return (
    <Tile>
      <Head ctx={ctx} title="Safe today" eye />
      <div>
        <p className={`font-display text-[30px] leading-tight tabular ${s.text}`}>{fmt(ctx, b.todayRemaining)}</p>
        <p className="text-[11px] text-muted">
          of {fmt(ctx, b.todayAllowance)} today · {b.daysRemaining}d left
        </p>
      </div>
      <div className="space-y-1">
        <Bar value={b.usedPct ?? 0} color={s.bg} marker={b.elapsedPct} />
        <p className="text-[10px] text-subtle">
          {Math.round(b.usedPct ?? 0)}% of budget · {s.label}
        </p>
      </div>
    </Tile>
  );
}

function MonthTile(ctx: Ctx) {
  const { d } = ctx;
  const b = d.budget;
  const m = d.money;
  const monthName = new Date(`${d.month}-01T00:00:00`).toLocaleDateString("en-IN", { month: "long" });
  const title = `${monthName} · day ${d.dayOfMonth} of ${d.daysInMonth}`;
  if (b.configured) {
    const left = b.remainingMonth ?? 0;
    const over = left < 0;
    const s = statusOf(b.status);
    const perDay = b.daysRemaining > 0 ? Math.max(0, left) / b.daysRemaining : 0;
    return (
      <Tile>
        <Head ctx={ctx} title={title} eye refresh />
        <p className="flex items-baseline gap-2">
          <span className={`font-display text-2xl leading-tight tabular ${over ? "text-expense" : ""}`}>{fmt(ctx, Math.abs(left))}</span>
          <span className="text-xs text-muted">{over ? "over budget" : `left of ${fmt(ctx, b.limit)}`}</span>
        </p>
        <Bar value={b.usedPct ?? 0} color={s.bg} marker={b.elapsedPct} thick />
        <p className="text-[11px] text-muted">
          {fmt(ctx, b.spentMonth)} spent · {ctx.hide ? "" : `${fmt(ctx, perDay)}/day for `}
          {b.daysRemaining} days
        </p>
        <div className="flex justify-between">
          <Stat label="Safe today" value={fmt(ctx, b.todayRemaining)} tone={s.text} />
          <Stat label="Saved first" value={fmt(ctx, m.savedFirst)} tone="text-income" right />
        </div>
      </Tile>
    );
  }
  const left = m.leftToSpend;
  const used = m.spendable > 0 ? ((m.spendable - left) / m.spendable) * 100 : 0;
  return (
    <Tile>
      <Head ctx={ctx} title={title} eye refresh />
      <p className="flex items-baseline gap-2">
        <span className={`font-display text-2xl leading-tight tabular ${left < 0 ? "text-expense" : ""}`}>{fmt(ctx, Math.abs(left))}</span>
        <span className="text-xs text-muted">{left < 0 ? "spent beyond" : "left to spend"}</span>
      </p>
      <Bar value={used} color={left < 0 ? "bg-expense" : "bg-brand"} marker={(d.dayOfMonth / d.daysInMonth) * 100} thick />
      <p className="text-[11px] text-muted">
        {fmt(ctx, m.savedFirst)} saved first · {ctx.hide ? "" : `${fmt(ctx, m.perDayLeft)}/day for `}
        {b.daysRemaining} days
      </p>
    </Tile>
  );
}

function Stat({ label, value, tone, right }: { label: string; value: string; tone: string; right?: boolean }) {
  return (
    <div className={`min-w-0 ${right ? "text-right" : ""}`}>
      <p className="truncate text-[10px] text-subtle">{label}</p>
      <p className={`truncate text-[13px] font-bold tabular ${tone}`}>{value}</p>
    </div>
  );
}

function PortfolioTile(ctx: Ctx) {
  const pf = ctx.d.portfolio;
  if (!pf) return <Empty title="No investments yet" body="Add stocks, mutual funds, gold or bonds to track them here." />;
  const dayUp = pf.dayChange >= 0;
  const allUp = pf.gain >= 0;
  const signed = (n: number, up: boolean) => `${up ? "+" : "−"}${money(Math.abs(Math.round(n)), ctx.d.currency)}`;
  return (
    <Tile>
      <Head ctx={ctx} title="Portfolio" eye refresh />
      <p className="tabular text-[28px] font-bold leading-tight tracking-tight">{ctx.hide ? "₹ ••••••" : money(Math.round(pf.value), ctx.d.currency)}</p>
      <div className="flex justify-between">
        <Returns label="1D returns" up={dayUp} value={ctx.hide ? `${dayUp ? "▲" : "▼"} ${pct(pf.dayChangePct)}` : `${signed(pf.dayChange, dayUp)} (${pct(pf.dayChangePct)})`} />
        <Returns label="Total returns" up={allUp} value={ctx.hide ? `${allUp ? "▲" : "▼"} ${pct(pf.gainPct)}` : `${signed(pf.gain, allUp)} (${pct(pf.gainPct)})`} right />
      </div>
    </Tile>
  );
}

function Returns({ label, value, up, right }: { label: string; value: string; up: boolean; right?: boolean }) {
  return (
    <div className={right ? "text-right" : ""}>
      <p className="text-[10.5px] text-subtle">{label}</p>
      <p className={`tabular text-[13px] font-bold ${up ? "text-income" : "text-expense"}`}>{value}</p>
    </div>
  );
}

function QuickAdd() {
  return (
    <div className="flex h-[88px] gap-2 rounded-[22px] border border-line bg-surface p-2 shadow-sm">
      <span className="btn-primary grid flex-1 place-items-center rounded-2xl text-[13px] font-bold">+ Expense</span>
      <span className="grid flex-1 place-items-center rounded-2xl bg-surface-2 text-[13px] font-bold">Scan</span>
    </div>
  );
}
