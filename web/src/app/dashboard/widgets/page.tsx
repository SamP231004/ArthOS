"use client";

import { Download, EyeOff, Hand, Settings2, Smartphone } from "lucide-react";
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
        data && <Previews d={data} hide={hide} />
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
            <Step n={3} icon={Settings2} title="Make it yours" body="Long-press a widget → Settings: theme (match the app, Forest or Ivory) and hide amounts." />
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

// ------------------------------------------------------------------ previews

type Ctx = { d: WidgetSnapshot; hide: boolean };

function fmt({ d, hide }: Ctx, n: number | undefined | null, compact = false) {
  return hide ? "₹ ••••" : money(Math.round(n ?? 0), d.currency, compact);
}

function pct(n?: number | null) {
  const v = Math.abs(n ?? 0);
  return `${v >= 10 ? Math.round(v) : v.toFixed(1)}%`;
}

function statusOf(status?: string) {
  if (status === "OVER" || status === "OVER_MONTH") return { text: "text-expense", bg: "bg-expense", label: status === "OVER" ? "Over today" : "Over budget" };
  if (status === "CAUTION") return { text: "text-warn", bg: "bg-warn", label: "Careful" };
  return { text: "text-income", bg: "bg-income", label: "On track" };
}

function Previews({ d, hide }: { d: WidgetSnapshot; hide: boolean }) {
  const ctx = { d, hide };
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <Labeled name="Safe to spend" size="2 × 2">
        <SafeToSpend {...ctx} />
      </Labeled>
      <Labeled name="Month snapshot" size="4 × 2" wide>
        <MonthSnapshot {...ctx} />
      </Labeled>
      <Labeled name="Portfolio" size="2 × 2">
        <PortfolioTile {...ctx} />
      </Labeled>
      <Labeled name="Quick add" size="2 × 1" wide>
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

function Tile({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`flex h-44 flex-col justify-between rounded-[22px] border border-line bg-surface p-4 shadow-sm ${className}`}>{children}</div>;
}

function Head({ title, right }: { title: string; right?: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-md bg-[#a31c1b] text-[10px] font-bold text-[#fff7f3]">अ</span>
        <span className="truncate text-xs text-muted">{title}</span>
      </div>
      {right && <span className="shrink-0 text-[10.5px] text-subtle">{right}</span>}
    </div>
  );
}

function Bar({ value, color, thick }: { value: number; color: string; thick?: boolean }) {
  return (
    <div className={`w-full overflow-hidden rounded-full bg-fg/[0.07] ${thick ? "h-[7px]" : "h-1.5"}`}>
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <Tile>
      <Head title="ArthOS" />
      <div>
        <p className="text-[15px] font-semibold">{title}</p>
        <p className="mt-0.5 text-xs text-muted">{body}</p>
      </div>
    </Tile>
  );
}

function SafeToSpend(ctx: Ctx) {
  const b = ctx.d.budget;
  if (!b.configured) return <Empty title="Set a budget" body="ArthOS turns it into one number: what you can spend today." />;
  const s = statusOf(b.status);
  return (
    <Tile>
      <Head title="Safe today" />
      <div>
        <p className={`font-display text-[30px] leading-tight tabular ${s.text}`}>{fmt(ctx, b.todayRemaining)}</p>
        <p className="text-[11px] text-muted">
          of {fmt(ctx, b.todayAllowance)} · {b.daysRemaining} day{b.daysRemaining === 1 ? "" : "s"} left
        </p>
      </div>
      <div className="space-y-1">
        <Bar value={b.usedPct ?? 0} color={s.bg} />
        <p className="text-[10px] text-subtle">
          {Math.round(b.usedPct ?? 0)}% of month used · {s.label}
        </p>
      </div>
    </Tile>
  );
}

function MonthSnapshot(ctx: Ctx) {
  const { d } = ctx;
  const b = d.budget;
  const m = d.money;
  const s = statusOf(b.status);
  const monthName = new Date(`${d.month}-01T00:00:00`).toLocaleDateString("en-IN", { month: "long" });
  return (
    <Tile>
      <Head title={`${monthName} so far`} right={b.configured ? s.label : undefined} />
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[10.5px] text-subtle">Spent</p>
          <p className="font-display text-2xl leading-tight tabular">{fmt(ctx, m.spent)}</p>
        </div>
        {b.configured && <p className="mb-1 text-[11px] text-muted">of {fmt(ctx, b.limit)} budget</p>}
      </div>
      {b.configured && <Bar value={b.usedPct ?? 0} color={s.bg} thick />}
      <div className="flex justify-between gap-3">
        <Stat label="Left to spend" value={fmt(ctx, m.leftToSpend)} sub={m.perDayLeft != null && !ctx.hide ? `${fmt(ctx, m.perDayLeft)}/day` : undefined} tone={m.leftToSpend < 0 ? "text-expense" : "text-fg"} />
        <Stat label="Saved first" value={fmt(ctx, m.savedFirst)} tone="text-income" />
        {b.configured && <Stat label="Safe today" value={fmt(ctx, b.todayRemaining)} tone={s.text} />}
      </div>
    </Tile>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone: string }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[10px] text-subtle">{label}</p>
      <p className={`truncate text-[13.5px] font-bold tabular ${tone}`}>{value}</p>
      {sub && <p className="truncate text-[9.5px] text-subtle">{sub}</p>}
    </div>
  );
}

function PortfolioTile(ctx: Ctx) {
  const pf = ctx.d.portfolio;
  if (!pf) return <Empty title="No investments yet" body="Add stocks, mutual funds, gold or bonds to track them here." />;
  const dayUp = pf.dayChange >= 0;
  const allUp = pf.gain >= 0;
  return (
    <Tile>
      <Head title="Portfolio" right={`${pf.holdingsCount} holding${pf.holdingsCount === 1 ? "" : "s"}`} />
      <p className="font-display text-[28px] leading-tight tabular">{fmt(ctx, pf.value)}</p>
      <div>
        <p className={`text-xs font-bold ${dayUp ? "text-income" : "text-expense"}`}>
          {dayUp ? "▲" : "▼"} {ctx.hide ? "" : `${fmt(ctx, Math.abs(pf.dayChange))} `}({pct(pf.dayChangePct)}) today
        </p>
        <p className="mt-0.5 text-[11px] text-muted">
          {allUp ? "+" : "−"}
          {ctx.hide ? "" : `${fmt(ctx, Math.abs(pf.gain))} `}({pct(pf.gainPct)}) overall
        </p>
      </div>
    </Tile>
  );
}

function QuickAdd() {
  return (
    <div className="flex h-[88px] gap-2 rounded-[22px] border border-line bg-surface p-2 shadow-sm">
      <span className="grid flex-1 place-items-center rounded-2xl bg-brand text-[13px] font-bold text-brand-fg">+ Expense</span>
      <span className="grid flex-1 place-items-center rounded-2xl bg-surface-2 text-[13px] font-bold">Scan</span>
    </div>
  );
}
