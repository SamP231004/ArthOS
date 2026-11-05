import Link from "next/link";
import { Logo } from "@/components/logo";

const promise = [
  { k: "Comes in", d: "Salary, freelance, dividends — every rupee of income in one ledger.", c: "text-income" },
  { k: "Goes out", d: "Quick-add spends by category and payment source, searchable forever.", c: "text-expense" },
  { k: "Grows", d: "Stocks, mutual funds, gold and bonds rolled into one live portfolio.", c: "text-info" },
  { k: "Remains", d: "A clear daily allowance and net worth you can trust at a glance.", c: "text-brand" },
];

const features = [
  { t: "Adaptive daily budget", d: "Overspent today? Tomorrow quietly adjusts. No guilt, just a realistic plan for the rest of the month." },
  { t: "Screenshot to transaction", d: "Share a UPI receipt or bank SMS — ArthOS reads the amount, date and merchant for you to confirm." },
  { t: "One portfolio view", d: "See gains, allocation and contribution to net worth across every asset class you hold." },
  { t: "Plain-language insights", d: "Month-end summaries that tell you what changed and why, not just another chart." },
  { t: "Home-screen widgets", d: "Budget left, today's spend and portfolio movement without opening the app." },
  { t: "Web + Android, one account", d: "Log on your phone, review on a big screen. Everything stays in sync." },
];

const roadmap = [
  ["Foundation", "Accounts, income & expense tracking, monthly summary", "Live"],
  ["Budgeting", "Fixed, adaptive and weekly budget modes", "Next"],
  ["Investments", "Stocks, MF, gold, bonds with live pricing", "Planned"],
  ["Automation", "OCR screenshot import, smart categories", "Planned"],
] as const;

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-bg/80 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Logo />
          <div className="flex items-center gap-1 sm:gap-2">
            <a href="#features" className="hidden rounded-lg px-3 py-2 text-sm text-muted hover:text-fg sm:block">Features</a>
            <a href="#roadmap" className="hidden rounded-lg px-3 py-2 text-sm text-muted hover:text-fg sm:block">Roadmap</a>
            <Link href="/login" className="rounded-lg px-3 py-2 text-sm text-muted hover:text-fg">Sign in</Link>
            <Link href="/register" className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-brand-fg hover:brightness-110">
              Get started
            </Link>
          </div>
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[900px] -translate-x-1/2 rounded-full bg-brand/10 blur-3xl" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:py-28">
            <div>
              <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted">
                <span className="h-1.5 w-1.5 rounded-full bg-income" /> Your personal financial operating system
              </p>
              <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight sm:text-6xl">
                Take control of your <span className="font-deva text-brand">अर्थ</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg text-muted">
                Earnings, expenses, budgets, investments and net worth — finally in one calm place. Stop juggling four apps and
                start knowing exactly how much you can spend today.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link href="/register" className="rounded-xl bg-brand px-6 py-3 font-medium text-brand-fg hover:brightness-110">
                  Create free account
                </Link>
                <Link href="/login" className="rounded-xl border border-border px-6 py-3 font-medium hover:bg-surface">
                  Open dashboard
                </Link>
              </div>
            </div>

            {/* Product preview */}
            <div className="rounded-3xl border border-border bg-surface p-6 shadow-2xl shadow-black/40">
              <div className="flex items-center justify-between text-xs text-muted">
                <span>November 2026</span>
                <span className="rounded-full bg-income/10 px-2 py-0.5 text-income">On track</span>
              </div>
              <p className="mt-5 text-sm text-muted">Safe to spend today</p>
              <p className="tabular mt-1 text-4xl font-semibold">₹1,240</p>
              <div className="mt-4 h-2 rounded-full bg-surface-2">
                <div className="h-2 w-[38%] rounded-full bg-brand" />
              </div>
              <div className="mt-6 grid grid-cols-3 gap-3 text-sm">
                {[
                  ["Income", "₹82,000", "text-income"],
                  ["Spent", "₹18,460", "text-expense"],
                  ["Net worth", "₹6.4L", "text-info"],
                ].map(([k, v, c]) => (
                  <div key={k} className="rounded-xl bg-surface-2 p-3">
                    <p className="text-xs text-muted">{k}</p>
                    <p className={`tabular mt-1 font-semibold ${c}`}>{v}</p>
                  </div>
                ))}
              </div>
              <p className="mt-6 rounded-xl border border-border p-3 text-sm text-muted">
                💡 Food delivery is 22% higher than last month. Skipping two orders keeps you on target.
              </p>
            </div>
          </div>
        </section>

        {/* Promise */}
        <section className="border-y border-border/60 bg-surface/40">
          <div className="mx-auto grid max-w-6xl gap-px px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
            {promise.map((p) => (
              <div key={p.k} className="py-10 pr-6">
                <p className="text-xs uppercase tracking-widest text-muted">Know what</p>
                <p className={`mt-1 text-2xl font-semibold ${p.c}`}>{p.k}</p>
                <p className="mt-3 text-sm text-muted">{p.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-24 sm:px-6">
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">More than a tracker. A control panel for every rupee in motion.</h2>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.t} className="rounded-2xl border border-border bg-surface p-6">
                <h3 className="font-semibold">{f.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{f.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Budget engine explainer */}
        <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
          <div className="grid gap-10 rounded-3xl border border-border bg-gradient-to-br from-surface to-surface-2 p-8 sm:p-12 lg:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-brand">The budget engine</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">Monthly limits, turned into simple daily decisions.</h2>
              <p className="mt-4 text-muted">
                Set ₹30,000 for the month and ArthOS gives you a daily number. Spend less and the savings roll forward. Spend more
                and the rest of the month rebalances automatically.
              </p>
            </div>
            <div className="space-y-3 self-center">
              {[
                ["Fixed daily", "Same allowance every day, for strict discipline."],
                ["Adaptive daily", "Recalculates after every over- or under-spend."],
                ["Weekly", "Plan in short cycles if you think week-to-week."],
              ].map(([t, d]) => (
                <div key={t} className="flex gap-4 rounded-xl border border-border bg-bg/50 p-4">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand" />
                  <div>
                    <p className="font-medium">{t}</p>
                    <p className="text-sm text-muted">{d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Roadmap */}
        <section id="roadmap" className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-24 sm:px-6">
          <h2 className="text-3xl font-semibold tracking-tight">Built in the open, phase by phase</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {roadmap.map(([t, d, s], i) => (
              <div key={t} className="rounded-2xl border border-border bg-surface p-5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted">Phase {i + 1}</span>
                  <span className={s === "Live" ? "text-income" : s === "Next" ? "text-brand" : "text-muted"}>{s}</span>
                </div>
                <p className="mt-3 font-semibold">{t}</p>
                <p className="mt-1 text-sm text-muted">{d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-4 pb-24 text-center sm:px-6">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Know what remains.</h2>
          <p className="mx-auto mt-3 max-w-md text-muted">Start on the web today. The Android app uses the same account.</p>
          <Link href="/register" className="mt-8 inline-block rounded-xl bg-brand px-7 py-3 font-medium text-brand-fg hover:brightness-110">
            Get started — it&apos;s free
          </Link>
        </section>
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-muted sm:flex-row sm:px-6">
          <Logo />
          <p>© ArthOS. Take control of your अर्थ.</p>
        </div>
      </footer>
    </div>
  );
}
