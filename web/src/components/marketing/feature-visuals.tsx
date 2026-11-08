import { ArrowDown, ArrowRight, Bell, Check, Eye, RotateCw, ScanLine, Sparkles } from "lucide-react";
import { LogoMark } from "../logo";

/**
 * Static, hand-tuned illustrations for the landing page. Every one mirrors a real screen in the web or Android app,
 * drawn with theme tokens so they follow Forest/Ivory. Not wired to data.
 */

// ───────────────────────────────────────── save first

export function MoneyFlowVisual() {
  const rows = [
    ["Income this month", "₹92,000", "", ""],
    ["Saved first · 20%", "₹18,400", "bg-income", "−"],
    ["Yours to spend", "₹73,600", "", "="],
    ["Spent", "₹35,141", "bg-expense", "−"],
    ["Invested from spending", "₹6,188", "bg-info", "−"],
  ];
  return (
    <div className="panel-glow p-6">
      <p className="text-sm text-muted">Left to spend this month</p>
      <p className="tabular mt-1 text-5xl font-semibold tracking-tight">₹32,271</p>
      <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-fg/[0.06]">
        <div className="w-[20%] bg-income" />
        <div className="w-[38%] bg-expense/80" />
        <div className="w-[7%] bg-info" />
      </div>
      <div className="mt-5 space-y-2.5 rounded-xl border border-line p-4 text-sm">
        {rows.map(([k, v, dot, op]) => (
          <div key={k} className={`flex items-center justify-between ${op === "=" ? "border-t border-dashed border-line pt-2.5" : ""}`}>
            <span className="flex items-center gap-2.5">
              <span className="w-3 text-subtle">{op}</span>
              {dot ? <span className={`h-2 w-2 rounded-full ${dot}`} /> : <span className="w-2" />}
              <span className={op === "=" ? "font-medium" : "text-fg-2"}>{k}</span>
            </span>
            <span className="tabular">{v}</span>
          </div>
        ))}
        <div className="flex items-center justify-between border-t border-line pt-2.5 font-semibold">
          <span className="flex items-center gap-2.5"><span className="w-3 text-subtle">=</span><span className="w-2" />Left to spend</span>
          <span className="tabular">₹32,271</span>
        </div>
      </div>
      <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-muted">
        <Sparkles size={13} className="mt-0.5 shrink-0 text-mark" />
        Your savings account carries ₹1,17,248 into next month — ready to invest.
      </p>
    </div>
  );
}

// ───────────────────────────────────────── investments

export function PortfolioVisual() {
  const mix = [
    ["Mutual funds", 42, "var(--c4)"],
    ["Stocks & ETFs", 35, "var(--c1)"],
    ["Gold", 18, "var(--c3)"],
    ["Bonds", 5, "var(--c6)"],
  ] as const;
  const line = "M0,78 C30,74 50,70 80,66 C110,62 130,64 160,52 C190,40 210,44 240,34 C270,24 290,28 320,18";
  const inv = "M0,82 L60,80 L60,74 L150,72 L150,58 L240,56 L240,46 L320,44";
  return (
    <div className="panel p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted">Net holdings</p>
          <p className="tabular mt-1 text-3xl font-semibold tracking-tight">₹8,34,076</p>
        </div>
        <span className="rounded-full bg-income/10 px-2.5 py-1 text-xs font-medium text-income">XIRR +18.4%</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl bg-fg/[0.03] p-3">
          <p className="text-subtle">1D returns</p>
          <p className="tabular mt-0.5 font-semibold text-income">+₹4,883 (0.6%)</p>
        </div>
        <div className="rounded-xl bg-fg/[0.03] p-3 text-right">
          <p className="text-subtle">Total returns</p>
          <p className="tabular mt-0.5 font-semibold text-income">+₹1,40,080 (20.2%)</p>
        </div>
      </div>
      <svg viewBox="0 0 320 90" className="mt-5 h-24 w-full" aria-hidden>
        <path d={`${line} L320,90 L0,90 Z`} fill="var(--income)" opacity="0.12" />
        <path d={inv} fill="none" stroke="var(--muted)" strokeDasharray="4 4" strokeWidth="1.4" />
        <path d={line} fill="none" stroke="var(--income)" strokeWidth="2.2" />
      </svg>
      <div className="mt-3 flex h-2.5 overflow-hidden rounded-full">
        {mix.map(([k, v, c]) => (
          <div key={k} style={{ width: `${v}%`, background: c }} />
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        {mix.map(([k, v, c]) => (
          <span key={k} className="flex items-center gap-2 text-muted">
            <span className="h-2 w-2 rounded-sm" style={{ background: c }} />
            {k} <span className="tabular ml-auto text-fg-2">{v}%</span>
          </span>
        ))}
      </div>
      <div className="mt-4 rounded-xl border border-line p-3 text-xs text-muted">
        Bought <span className="text-fg">5 × RELIANCE</span> for ₹13,275 — paid <span className="tabular font-medium text-income">₹10,000 from savings</span> +{" "}
        <span className="tabular font-medium text-fg">₹3,275 from spending</span>
      </div>
    </div>
  );
}

// ───────────────────────────────────────── scan & share

export function ScanVisual() {
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-stretch sm:justify-center">
      {/* a payment app's success screen */}
      <div className="w-56 shrink-0 rounded-[1.75rem] border border-line-strong bg-[#121212] p-4 text-center text-[#e8e8e8] shadow-2xl">
        <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-[#3a6ea5] text-lg font-semibold">A</div>
        <p className="mt-2 text-xs">To Annapurna Tiffins</p>
        <p className="mt-1 text-3xl font-light tracking-tight">₹159.44</p>
        <p className="mt-2 inline-flex items-center gap-1 text-[10px] text-[#9fdcb0]"><Check size={10} /> Completed</p>
        <p className="mt-1 text-[10px] text-[#9a9a9a]">6 Nov 2026, 1:04 pm</p>
        <div className="mt-3 space-y-1 rounded-xl border border-white/10 p-2.5 text-left text-[9.5px] text-[#bdbdbd]">
          <p>UPI transaction ID</p>
          <p className="text-[#8a8a8a]">4312 9876 5432</p>
          <p className="pt-1">To: ANNAPURNA TIFFINS</p>
        </div>
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[10px]">Share → <span className="font-semibold">ArthOS</span></p>
      </div>

      <div className="grid place-items-center text-subtle">
        <span className="hidden sm:block"><ArrowRight size={20} /></span>
        <span className="sm:hidden"><ArrowDown size={20} /></span>
        <span className="mt-1 flex items-center gap-1 text-[10px]"><ScanLine size={11} /> read on your phone</span>
      </div>

      {/* ArthOS: the pre-filled expense */}
      <div className="panel w-64 shrink-0 p-5">
        <p className="text-xs text-muted">New expense · from screenshot</p>
        <p className="tabular mt-2 text-3xl font-semibold tracking-tight">₹159.44</p>
        <div className="mt-4 space-y-2 text-sm">
          {[
            ["Merchant", "Annapurna Tiffins"],
            ["Category", "Food · learned"],
            ["Paid with", "UPI"],
            ["Date", "6 Nov, 1:04 pm"],
            ["Reference", "431298765432"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3">
              <span className="text-subtle">{k}</span>
              <span className="truncate font-medium">{v}</span>
            </div>
          ))}
        </div>
        <div className="btn-primary mt-5 grid place-items-center rounded-xl py-2.5 text-sm font-medium">Save expense</div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────── insights

export function InsightsVisual() {
  const R = 46, C = 2 * Math.PI * R, arc = C * (240 / 360);
  const parts = [
    ["Savings rate", 30, 30],
    ["Budget", 20, 20],
    ["Cushion", 5, 20],
    ["Investing", 15, 15],
    ["Fixed costs", 14, 15],
  ] as const;
  return (
    <div className="panel-glow p-6">
      <div className="flex items-center gap-5">
        <div className="relative grid h-28 w-28 shrink-0 place-items-center">
          <svg viewBox="0 0 116 116" className="absolute inset-0 rotate-[150deg]">
            <circle cx="58" cy="58" r={R} fill="none" stroke="var(--line-strong)" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${arc} ${C}`} />
            <circle cx="58" cy="58" r={R} fill="none" stroke="var(--income)" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${0.84 * arc} ${C}`} />
          </svg>
          <div className="text-center">
            <p className="tabular text-3xl font-semibold">84</p>
            <p className="text-[10px] uppercase tracking-wider text-subtle">of 100</p>
          </div>
        </div>
        <div>
          <p className="text-sm text-muted">Financial health</p>
          <p className="text-xl font-semibold text-income">Excellent</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">Biggest opportunity: emergency cushion — keep saving first.</p>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-5 gap-1.5">
        {parts.map(([k, p, m]) => (
          <div key={k} className="rounded-lg border border-line p-2">
            <p className="truncate text-[10px] text-muted">{k}</p>
            <p className="tabular text-sm font-semibold">{p}<span className="text-[10px] font-normal text-subtle">/{m}</span></p>
            <div className="mt-1 h-1 rounded-full bg-fg/[0.07]">
              <div className={`h-full rounded-full ${p / m >= 0.8 ? "bg-income" : p / m >= 0.5 ? "bg-warn" : "bg-expense"}`} style={{ width: `${(p / m) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-full border border-warn/30 bg-warn/[0.08] px-3 py-1 text-xs font-medium">On pace to overspend by ₹4,531</span>
        <span className="rounded-full border border-info/25 bg-info/[0.06] px-3 py-1 text-xs font-medium">Broadband ₹999 due tomorrow</span>
      </div>
      <p className="mt-4 flex gap-2 text-sm leading-relaxed text-fg-2">
        <Sparkles size={14} className="mt-1 shrink-0 text-mark" />
        <span>
          <strong className="font-semibold text-fg">Food</strong> is up <strong className="tabular font-semibold text-fg">32%</strong> — <strong className="tabular font-semibold text-fg">₹6,840</strong> against a usual <strong className="tabular font-semibold text-fg">₹5,180</strong>.
        </span>
      </p>
    </div>
  );
}

// ───────────────────────────────────────── widgets & alerts

export function PhoneVisual() {
  return (
    <div className="relative mx-auto w-[300px] rounded-[2.6rem] border border-line-strong bg-[linear-gradient(160deg,#1c2a24,#0b1410_55%,#2a0e0e)] p-3 shadow-2xl">
      <div className="mx-auto mb-3 h-5 w-24 rounded-full bg-black/60" />
      {/* pinned notification */}
      <div className="flex items-center gap-2.5 rounded-2xl bg-[#1d2622]/95 px-3 py-2.5 text-[#e9e6dd]">
        <LogoMark size={20} />
        <span className="min-w-0 flex-1 truncate text-[11.5px] font-medium">On pace to overspend by ₹4,531</span>
        <Bell size={12} className="shrink-0 text-[#9aa59f]" />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        {/* safe to spend */}
        <div className="rounded-[1.3rem] bg-[#10231a] p-3 text-[#f2efe8]">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-[10px] text-[#a5b0a9]"><LogoMark size={13} /> Safe today</span>
            <Eye size={11} className="text-[#a5b0a9]" />
          </div>
          <p className="mt-2 font-display text-2xl text-[#4cc38a]">₹842</p>
          <p className="text-[9px] text-[#a5b0a9]">of ₹1,290 · 12d left</p>
          <div className="relative mt-2 h-1 rounded-full bg-white/10">
            <div className="h-full w-[58%] rounded-full bg-[#4cc38a]" />
          </div>
        </div>
        {/* quick add */}
        <div className="flex flex-col gap-1.5 rounded-[1.3rem] bg-[#10231a] p-2">
          <span className="grid flex-1 place-items-center rounded-xl bg-[#ece7db] text-[11px] font-bold text-[#0c1a13]">+ Expense</span>
          <span className="grid flex-1 place-items-center rounded-xl bg-[#183126] text-[11px] font-bold text-[#f2efe8]">Scan</span>
          <span className="grid flex-1 place-items-center rounded-xl bg-[#183126] text-[11px] font-bold text-[#f2efe8]">+ Income</span>
        </div>
        {/* portfolio */}
        <div className="col-span-2 rounded-[1.3rem] bg-[#10231a] p-3 text-[#f2efe8]">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-[10px] text-[#a5b0a9]"><LogoMark size={13} /> Portfolio · 5:45 pm</span>
            <span className="flex gap-2 text-[#a5b0a9]"><Eye size={11} /><RotateCw size={11} /></span>
          </div>
          <p className="mt-1.5 text-xl font-bold tracking-tight">₹8,34,076</p>
          <div className="mt-1.5 flex justify-between text-[9.5px]">
            <span><span className="block text-[#7d8b83]">1D returns</span><span className="font-bold text-[#4cc38a]">+₹4,883 (0.6%)</span></span>
            <span className="text-right"><span className="block text-[#7d8b83]">Total returns</span><span className="font-bold text-[#4cc38a]">+₹1,40,080 (20.2%)</span></span>
          </div>
        </div>
      </div>
      <div className="mt-4 flex justify-around px-6 pb-1">
        {["#c2534a", "#5a8dee", "#3f9b6b", "#d9a23f"].map((c) => (
          <span key={c} className="h-9 w-9 rounded-full opacity-80" style={{ background: c }} />
        ))}
      </div>
    </div>
  );
}
