import { ArrowDown, ArrowRight, Bell, Bluetooth, Check, Copy, Eye, Printer, RotateCw, ScanLine, Sparkles } from "lucide-react";
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
  const step = (n: number, t: string) => (
    <p className="mb-3 flex items-center justify-center gap-2 text-xs text-muted">
      <span className="grid h-5 w-5 place-items-center rounded-full bg-mark/15 text-[11px] font-semibold text-mark">{n}</span>
      {t}
    </p>
  );
  // generic share targets — plain icons, no other company's logo; ArthOS is the one being picked
  const targets: [typeof Printer | null, string][] = [
    [null, "ArthOS"],
    [Printer, "Print"],
    [Bluetooth, "Bluetooth"],
    [Copy, "Copy"],
  ];
  return (
    <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-end lg:justify-center">
      {/* 1–2: a payment app's success screen, with Android's share sheet opened over it */}
      <div>
        {step(1, "Open the payment, tap Share")}
        <div className="relative h-[23rem] w-64 shrink-0 overflow-hidden rounded-[2rem] border border-line-strong bg-[#121212] text-[#e8e8e8] shadow-2xl">
          <div className="px-4 pt-6 text-center opacity-60">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#3a4a8a] text-lg font-semibold">Z</div>
            <p className="mt-2 text-sm">To Zomato</p>
            <p className="mt-1 text-4xl font-light tracking-tight">₹159</p>
            <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-[#9fdcb0]"><Check size={11} /> Completed</p>
            <p className="mt-1 text-[10px] text-[#9a9a9a]">6 Nov 2026, 1:04 pm</p>
          </div>
          <div className="absolute inset-x-0 bottom-0 rounded-t-[1.5rem] border-t border-white/10 bg-[#1c1f24] px-3 pb-4 pt-2">
            <div className="mx-auto h-1 w-8 rounded-full bg-white/25" />
            <div className="mx-auto mt-3 h-24 w-36 overflow-hidden rounded-xl border border-white/15 bg-[#121212] p-2 text-center text-[7px] text-[#bdbdbd]">
              <p>To Zomato</p>
              <p className="text-base font-light text-[#e8e8e8]">₹159</p>
              <p className="text-[#9fdcb0]">✓ Completed</p>
              <div className="mt-1 rounded border border-white/10 p-1 text-left">Payment of ₹159 completed</div>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-y-2.5 text-center text-[9px] text-[#d8d8d8]">
              {targets.map(([Icon, label]) => (
                <div key={label} className="flex flex-col items-center gap-1">
                  {Icon ? (
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-[#cfd6e4]"><Icon size={15} /></span>
                  ) : (
                    <span className="relative grid h-9 w-9 place-items-center">
                      <span className="absolute inset-[-3px] animate-ping rounded-full border-2 border-mark/60" />
                      {/* the logo clipped to a full circle, like the other share targets, with the ring hugging it */}
                      <span className="block h-9 w-9 overflow-hidden rounded-full ring-2 ring-mark ring-offset-0">
                        <LogoMark size={36} />
                      </span>
                    </span>
                  )}
                  <span className={Icon ? "" : "font-semibold text-white"}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-3">{step(2, "Pick ArthOS from the share sheet")}</div>
      </div>

      <div className="grid place-items-center text-subtle lg:mb-40">
        <span className="hidden lg:block"><ArrowRight size={20} /></span>
        <span className="lg:hidden"><ArrowDown size={20} /></span>
        <span className="mt-1 flex items-center gap-1 text-[10px]"><ScanLine size={11} /> read on your phone</span>
      </div>

      {/* 3: ArthOS, the pre-filled expense */}
      <div>
        {step(3, "Check it, save it")}
        <div className="panel w-64 shrink-0 p-5">
          <p className="text-xs text-muted">New expense · from screenshot</p>
          <p className="tabular mt-2 text-3xl font-semibold tracking-tight">₹159</p>
          <div className="mt-4 space-y-2 text-sm">
            {[
              ["Merchant", "Zomato"],
              ["Category", "Food · learned"],
              ["Paid with", "UPI"],
              ["Date", "6 Nov, 1:04 pm"],
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
      <div className="mx-auto mt-4 mb-1 h-1 w-24 rounded-full bg-white/25" />
    </div>
  );
}

// ───────────────────────────────────────── import from your broker

export function ImportVisual() {
  const rows = [
    ["Reliance Industries", "Stock · 10 shares", "₹24,105"],
    ["NIFTYBEES · Nifty 50 ETF", "ETF · 50 units", "₹10,513"],
    ["Parag Parikh Flexi Cap", "Mutual fund · 55.23 units", "₹3,240"],
    ["Titan Company", "Stock · 15 shares", "₹52,701"],
  ];
  return (
    <div className="panel p-6">
      <div className="flex flex-wrap gap-2">
        {["Zerodha", "Groww", "Upstox", "Angel One", "CAS (all funds)"].map((b) => (
          <span key={b} className="rounded-full border border-line px-3 py-1 text-xs text-fg-2">{b}</span>
        ))}
      </div>
      <div className="mt-5 flex items-center gap-3 rounded-xl border-2 border-dashed border-line-strong px-4 py-3 text-sm">
        <span className="text-lg">📄</span>
        <span className="min-w-0 flex-1 truncate">holdings-zerodha.xlsx</span>
        <span className="flex items-center gap-1 text-xs text-income"><Check size={13} /> read on this device</span>
      </div>
      <ul className="mt-4 divide-y divide-line rounded-xl border border-line">
        {rows.map(([n, d, v]) => (
          <li key={n} className="flex items-center gap-3 px-3.5 py-2.5 text-sm">
            <span className="grid h-4 w-4 place-items-center rounded bg-brand text-brand-fg"><Check size={11} /></span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{n}</span>
              <span className="block text-xs text-subtle">{d}</span>
            </span>
            <span className="tabular">{v}</span>
          </li>
        ))}
      </ul>
      <div className="btn-primary mt-4 grid place-items-center rounded-xl py-2.5 text-sm font-medium">Import 4 holdings · ₹90,559</div>
    </div>
  );
}
