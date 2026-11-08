import { ArrowDownLeft, ArrowUpRight, ChartPie, LayoutDashboard, Receipt, Settings, Sparkles, Wallet } from "lucide-react";
import { LogoMark } from "../logo";

const cats = [
  ["Rent", 24000, "var(--c1)"],
  ["Food", 9840, "var(--c4)"],
  ["Groceries", 6420, "var(--c2)"],
  ["Shopping", 5210, "var(--c6)"],
  ["Transport", 3180, "var(--c5)"],
] as const;

/** Static, hand-tuned replica of the dashboard for the hero. Not wired to data. */
export function ProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-6xl">
      {/* glow */}
      <div className="pointer-events-none absolute -inset-x-10 -top-10 bottom-0 rounded-[3rem] bg-[radial-gradient(60%_50%_at_50%_20%,rgb(var(--glow)/0.22),transparent_70%)] blur-2xl" />

      <div className="panel-glow relative overflow-hidden p-0">
        {/* window chrome */}
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-fg/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-fg/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-fg/15" />
          <span className="mx-auto rounded-md bg-fg/[0.04] px-3 py-1 font-mono text-[10.5px] text-subtle">arthos · dashboard</span>
        </div>

        <div className="flex">
          {/* mini sidebar */}
          <div className="hidden w-14 shrink-0 flex-col items-center gap-4 border-r border-line py-5 sm:flex">
            <LogoMark size={28} />
            {[LayoutDashboard, ArrowDownLeft, ArrowUpRight, ChartPie, Settings].map((I, i) => (
              <span key={i} className={`grid h-8 w-8 place-items-center rounded-lg ${i === 0 ? "bg-fg/[0.07] text-mark" : "text-subtle"}`}>
                <I size={15} />
              </span>
            ))}
          </div>

          <div className="min-w-0 flex-1 space-y-4 p-4 sm:p-6">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[11px] text-subtle">November 2026</p>
                <p className="font-display text-xl sm:text-2xl">Good evening, Samarth</p>
              </div>
              <div className="hidden gap-2 sm:flex">
                <span className="btn-glass rounded-lg px-3 py-1.5 text-[11px]">+ Income</span>
                <span className="btn-primary rounded-lg px-3 py-1.5 text-[11px] font-medium">+ Expense</span>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
              <div className="panel p-4 sm:p-5">
                <p className="text-[11px] text-muted">Remaining this month</p>
                <p className="tabular mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
                  ₹38,420<span className="text-lg text-subtle">.50</span>
                </p>
                <p className="mt-1 text-[11px] text-income">▲ 41.8% of income kept so far</p>
                <svg viewBox="0 0 300 90" className="mt-3 h-24 w-full" aria-hidden>
                  <defs>
                    <linearGradient id="pp-a" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0" stopColor="var(--fg)" stopOpacity=".14" />
                      <stop offset="1" stopColor="var(--fg)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <line x1="0" y1="88" x2="300" y2="6" stroke="var(--c2)" strokeOpacity=".45" strokeDasharray="4 5" />
                  <path d="M0,86 C20,70 30,66 50,64 S80,60 100,55 S130,52 150,46 S180,41 200,38" fill="none" stroke="var(--fg)" strokeWidth="2.2" />
                  <path d="M0,86 C20,70 30,66 50,64 S80,60 100,55 S130,52 150,46 S180,41 200,38 L200,90 L0,90Z" fill="url(#pp-a)" />
                  <circle cx="200" cy="38" r="4" fill="var(--fg)" stroke="var(--bg)" strokeWidth="2" />
                </svg>
              </div>

              <div className="panel p-4 sm:p-5">
                <p className="text-[11px] text-muted">Where money went</p>
                <div className="mt-3 space-y-2.5">
                  {cats.map(([l, v, c]) => (
                    <div key={l}>
                      <div className="flex justify-between text-[11px]">
                        <span className="flex items-center gap-1.5 text-fg-2">
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />
                          {l}
                        </span>
                        <span className="tabular text-subtle">₹{v.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="mt-1 h-1 rounded-full bg-fg/5">
                        <div className="h-1 rounded-full" style={{ width: `${(v / 24000) * 100}%`, background: c }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                [Wallet, "Income", "₹92,412", "text-income"],
                [Receipt, "Spent", "₹53,991", "text-fg"],
                [ArrowUpRight, "Today", "₹1,126", "text-fg"],
                [Sparkles, "Savings", "41.8%", "text-income"],
              ].map(([I, l, v, c]) => {
                const Icon = I as typeof Wallet;
                return (
                  <div key={l as string} className="panel p-3">
                    <div className="flex items-center gap-1.5 text-[10.5px] text-subtle">
                      <Icon size={12} /> {l as string}
                    </div>
                    <p className={`tabular mt-1 text-sm font-semibold sm:text-base ${c}`}>{v as string}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* floating chips */}
      <div className="panel absolute -left-12 top-[44%] hidden animate-fade-up items-center gap-3 rounded-2xl px-4 py-3 [animation-delay:400ms] xl:flex">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand/15 text-brand">
          <Wallet size={16} />
        </span>
        <div>
          <p className="text-[10.5px] text-subtle">Safe to spend today</p>
          <p className="tabular text-sm font-semibold">₹1,240</p>
        </div>
      </div>
      <div className="panel absolute -right-12 -bottom-6 hidden animate-fade-up items-center gap-3 rounded-2xl px-4 py-3 [animation-delay:650ms] xl:flex">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-info/15 text-info">
          <Sparkles size={16} />
        </span>
        <div>
          <p className="text-[10.5px] text-subtle">Food delivery is up 22%</p>
          <p className="text-sm font-medium">Two fewer orders keeps you on track</p>
        </div>
      </div>
    </div>
  );
}
