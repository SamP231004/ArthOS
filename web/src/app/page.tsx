import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  ChartPie,
  Check,
  KeyRound,
  Layers,
  Lock,
  Repeat,
  ScanLine,
  ShieldCheck,
  Smartphone,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { DemoButton } from "@/components/demo-button";
import { Logo } from "@/components/logo";
import { BudgetSimulator } from "@/components/marketing/budget-simulator";
import { ProductPreview } from "@/components/marketing/product-preview";
import { SiteNav } from "@/components/marketing/site-nav";
import { SocialLinks } from "@/components/social-links";
import { buttonClass } from "@/lib/button";

const pillars = [
  { icon: ArrowDownLeft, k: "comes in", d: "Salary, freelance, dividends and interest in one ledger.", c: "text-income" },
  { icon: ArrowUpRight, k: "goes out", d: "Every UPI, card and cash spend, categorised and searchable.", c: "text-expense" },
  { icon: TrendingUp, k: "grows", d: "Stocks, mutual funds, gold and bonds in one live portfolio.", c: "text-info" },
  { icon: Wallet, k: "remains", d: "A daily allowance and net worth you can trust at a glance.", c: "text-brand" },
];

const roadmap = [
  ["01", "Foundation", "Accounts, income & expense tracking, monthly summary", "live"],
  ["02", "Budget engine", "Fixed, adaptive and weekly budget modes", "live"],
  ["03", "Investments", "Stocks, MF, gold, bonds with live pricing", "next"],
  ["04", "Automation", "Screenshot-to-transaction OCR, smart categories", "planned"],
  ["05", "Insights", "Trends, anomalies, financial health score", "planned"],
  ["06", "Widgets", "Android home-screen budget & net worth", "planned"],
  ["07", "AI assistant", "Ask anything about your money, in plain language", "planned"],
  ["08", "Scale", "Goals, family sharing, multi-account", "planned"],
] as const;

const faqs = [
  ["Do I need to connect my bank account?", "No. ArthOS never asks for bank credentials. You log what you choose — manually today, and from screenshots of UPI receipts or bank SMS once automation ships."],
  ["What is in the demo?", "A private sandbox with three months of realistic data for a salaried professional in Bengaluru. Add, edit or delete anything — it's yours alone, and it deletes itself after 24 hours."],
  ["Is there an Android app?", "Yes. ArthOS is Android-first; the app and this website share the same account, so anything you log on your phone appears here instantly."],
  ["How is my data protected?", "All traffic is encrypted over HTTPS, passwords are hashed with bcrypt, and every request is scoped to your account with signed session tokens."],
  ["What does it cost?", "ArthOS is free during early access. Premium features are planned for a later phase of the roadmap."],
];

export default function Home() {
  return (
    <div className="relative flex flex-1 flex-col overflow-x-clip">
      <SiteNav />

      <main className="flex-1">
        {/* ───────────── Hero ───────────── */}
        <section className="noise relative pt-36 sm:pt-44">
          <div className="bg-grid pointer-events-none absolute inset-0" />
          <div className="pointer-events-none absolute left-1/2 top-0 h-[620px] w-[1100px] -translate-x-1/2 glow-top" />

          <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6">
            <a href="#roadmap" className="mx-auto inline-flex animate-fade-up items-center gap-2 rounded-full border border-line bg-fg/[0.03] py-1 pl-1 pr-3 text-xs text-muted backdrop-blur transition hover:border-line-strong">
              <span className="rounded-full bg-income/15 px-2 py-0.5 font-medium text-income">Live</span>
              Phase 2 · The budget engine is here
              <ArrowRight size={12} />
            </a>

            <h1 className="mx-auto mt-8 max-w-4xl animate-fade-up font-display text-[3rem] font-[350] leading-[1.02] tracking-[-0.035em] [animation-delay:80ms] sm:text-[4.25rem] lg:text-[5.25rem]">
              <span className="text-silver">Take control</span>
              <br />
              <span className="text-silver">of your </span>
              <span className="font-deva text-accent inline-block px-[0.04em] pt-[0.22em] -mt-[0.22em] leading-[1.15]">अर्थ</span>
            </h1>

            <p className="mx-auto mt-7 max-w-xl animate-fade-up text-base leading-relaxed text-muted [animation-delay:160ms] sm:text-lg">
              The personal financial operating system. Income, spending, budgets and investments — finally in one calm, intelligent place.
            </p>

            <div className="mt-10 flex animate-fade-up flex-col items-center justify-center gap-3 [animation-delay:240ms] sm:flex-row">
              <DemoButton variant="primary" size="lg">
                Explore the live demo
              </DemoButton>
              <Link href="/register" className={buttonClass("secondary", "lg")}>
                Create free account <ArrowRight size={16} />
              </Link>
            </div>
            <p className="mt-4 animate-fade-up text-xs text-subtle [animation-delay:300ms]">No sign-up needed · Private sandbox · Resets after 24 hours</p>
          </div>

          <div id="product" className="relative mt-16 scroll-mt-28 px-4 pb-8 sm:mt-20 sm:px-6">
            <div className="animate-fade-up [animation-delay:380ms]">
              <ProductPreview />
            </div>
          </div>
        </section>

        {/* ───────────── Four questions ───────────── */}
        <section className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6">
          <div className="max-w-2xl">
            <p className="eyebrow">The promise</p>
            <h2 className="mt-4 font-display text-4xl leading-tight tracking-tight sm:text-5xl">
              Four questions. <span className="italic text-muted">One place to answer them.</span>
            </h2>
          </div>
          <div className="mt-14 grid gap-px overflow-hidden rounded-3xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {pillars.map((p) => (
              <div key={p.k} className="bg-bg-2 p-7 transition hover:bg-surface">
                <p.icon size={20} className={p.c} />
                <p className="mt-8 text-sm text-subtle">Know what</p>
                <p className={`font-display text-3xl ${p.c}`}>{p.k}</p>
                <p className="mt-3 text-sm leading-relaxed text-muted">{p.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ───────────── Bento ───────────── */}
        <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              <p className="eyebrow">Product</p>
              <h2 className="mt-4 font-display text-4xl leading-tight tracking-tight sm:text-5xl">
                More than a tracker. <br className="hidden sm:block" />
                <span className="italic text-accent">A control panel for every rupee.</span>
              </h2>
            </div>
            <DemoButton>See it with real data</DemoButton>
          </div>

          <div className="mt-14 grid gap-4 md:grid-cols-6">
            {/* Adaptive budget */}
            <div className="panel-glow overflow-hidden p-7 md:col-span-4">
              <Tag icon={Wallet}>Adaptive daily budget</Tag>
              <h3 className="mt-4 max-w-md text-xl font-medium">Overspent on Saturday? Sunday quietly adjusts.</h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">Your monthly limit becomes a single daily number that rebalances itself — no guilt, just a plan that matches real life.</p>
              <div className="mt-8 flex h-28 items-end gap-1.5">
                {[52, 64, 40, 92, 58, 44, 100, 38, 46, 50, 48, 55, 47, 52, 49, 51].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t-md"
                    style={{
                      height: `${h}%`,
                      background: h > 85 ? "var(--expense)" : i > 7 ? "linear-gradient(180deg,var(--accent-1),var(--accent-3))" : "color-mix(in oklab, var(--fg) 14%, transparent)",
                      opacity: i > 7 ? 1 : 0.8,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* OCR */}
            <div className="panel p-7 md:col-span-2">
              <Tag icon={ScanLine}>Screenshot → transaction</Tag>
              <h3 className="mt-4 text-xl font-medium">Share a receipt. We&apos;ll do the typing.</h3>
              <div className="mt-6 space-y-2 rounded-2xl border border-line bg-bg/60 p-4 font-mono text-[11px]">
                <div className="flex justify-between"><span className="text-subtle">Paid to</span><span>Third Wave Coffee</span></div>
                <div className="flex justify-between"><span className="text-subtle">Amount</span><span className="text-brand">₹386.00</span></div>
                <div className="flex justify-between"><span className="text-subtle">Category</span><span className="text-info">Food · auto</span></div>
                <div className="hairline my-2" />
                <div className="flex items-center gap-1.5 text-income"><Check size={12} /> Ready to confirm</div>
              </div>
              <p className="mt-4 text-xs text-subtle">Arriving in Phase 4</p>
            </div>

            {/* Portfolio */}
            <div className="panel p-7 md:col-span-2">
              <Tag icon={ChartPie}>One portfolio view</Tag>
              <h3 className="mt-4 text-xl font-medium">Stocks, MF, gold and bonds — together.</h3>
              <div className="mt-6 flex items-center gap-5">
                <svg viewBox="0 0 42 42" className="h-24 w-24 -rotate-90">
                  {[
                    [44, 0, "var(--c1)"],
                    [28, 44, "var(--c4)"],
                    [16, 72, "var(--c2)"],
                    [12, 88, "var(--c5)"],
                  ].map(([v, o, c]) => (
                    <circle key={c as string} cx="21" cy="21" r="15.9" fill="none" stroke={c as string} strokeWidth="5" strokeDasharray={`${(v as number) - 1} 100`} strokeDashoffset={-(o as number)} pathLength={100} />
                  ))}
                </svg>
                <ul className="space-y-1.5 text-xs text-muted">
                  <li><span className="text-brand">●</span> Equity 44%</li>
                  <li><span className="text-info">●</span> Mutual funds 28%</li>
                  <li><span className="text-income">●</span> Gold 16%</li>
                  <li><span className="text-violet">●</span> Bonds 12%</li>
                </ul>
              </div>
            </div>

            {/* Insights */}
            <div className="panel p-7 md:col-span-2">
              <Tag icon={Sparkles}>Plain-language insights</Tag>
              <h3 className="mt-4 text-xl font-medium">Answers, not just charts.</h3>
              <div className="mt-6 rounded-2xl rounded-tl-sm border border-line bg-fg/[0.03] p-4 text-sm leading-relaxed text-fg-2">
                You kept <span className="text-income">41%</span> of your income in October — your best month yet. Dining out was the only category above average.
              </div>
            </div>

            {/* Widgets */}
            <div className="panel p-7 md:col-span-2">
              <Tag icon={Smartphone}>Home-screen widgets</Tag>
              <h3 className="mt-4 text-xl font-medium">Your number, without opening the app.</h3>
              <div className="mx-auto mt-6 w-40 rounded-[1.4rem] border border-line-strong bg-gradient-to-b from-surface-3 to-surface p-4 shadow-2xl">
                <p className="text-[10px] text-subtle">Today · safe to spend</p>
                <p className="tabular mt-1 text-2xl font-semibold text-accent">₹1,240</p>
                <div className="mt-3 h-1 rounded-full bg-fg/10"><div className="h-1 w-2/5 rounded-full bg-brand" /></div>
              </div>
            </div>

            {/* Sync */}
            <div className="panel flex flex-col justify-between gap-6 p-7 md:col-span-6 md:flex-row md:items-center">
              <div className="flex items-start gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-fg/5 text-brand"><Layers size={20} /></span>
                <div>
                  <h3 className="text-lg font-medium">Android app + web, one account</h3>
                  <p className="mt-1 text-sm text-muted">Log on your phone in two taps. Review on a big screen. Everything stays in sync.</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-muted">
                {["Recurring bills", "Smart categories", "Search everything", "Monthly summaries"].map((t) => (
                  <span key={t} className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5"><Repeat size={11} className="text-brand" />{t}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ───────────── Budget simulator ───────────── */}
        <section id="budget" className="scroll-mt-28 border-y border-line bg-bg-2/60">
          <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
            <div className="max-w-2xl">
              <p className="eyebrow">The budget engine</p>
              <h2 className="mt-4 font-display text-4xl leading-tight tracking-tight sm:text-5xl">
                Monthly limits, turned into <span className="italic text-accent">one daily decision.</span>
              </h2>
              <p className="mt-4 text-muted">Move the sliders. Watch how an adaptive budget responds to a real month instead of punishing it.</p>
            </div>
            <div className="mt-14">
              <BudgetSimulator />
            </div>
          </div>
        </section>

        {/* ───────────── Security ───────────── */}
        <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:items-center">
            <div>
              <p className="eyebrow">Private by design</p>
              <h2 className="mt-4 font-display text-4xl leading-tight tracking-tight sm:text-5xl">Your money is personal. <span className="italic text-muted">So is your data.</span></h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                [ShieldCheck, "No bank logins", "ArthOS never asks for net-banking credentials."],
                [Lock, "Encrypted in transit", "Every request travels over HTTPS."],
                [KeyRound, "Hashed passwords", "Stored with bcrypt — never in plain text."],
                [Bell, "Scoped sessions", "Signed tokens; every record belongs to one account."],
              ].map(([I, t, d]) => {
                const Icon = I as typeof Lock;
                return (
                  <div key={t as string} className="panel p-5">
                    <Icon size={18} className="text-brand" />
                    <p className="mt-4 font-medium">{t as string}</p>
                    <p className="mt-1 text-sm text-muted">{d as string}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ───────────── Roadmap ───────────── */}
        <section id="roadmap" className="mx-auto max-w-7xl scroll-mt-28 px-4 pb-24 sm:px-6">
          <p className="eyebrow">Roadmap</p>
          <h2 className="mt-4 font-display text-4xl tracking-tight sm:text-5xl">Built in the open, phase by phase.</h2>
          <div className="mt-12 grid gap-px overflow-hidden rounded-3xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {roadmap.map(([n, t, d, s]) => (
              <div key={n} className={`relative p-6 ${s === "live" ? "bg-surface" : "bg-bg-2"}`}>
                {s === "live" && <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand to-transparent" />}
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-subtle">{n}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-medium ${s === "live" ? "bg-income/15 text-income" : s === "next" ? "bg-brand/15 text-brand" : "text-subtle"}`}>
                    {s === "live" ? "Live" : s === "next" ? "Up next" : "Planned"}
                  </span>
                </div>
                <p className="mt-6 font-medium">{t}</p>
                <p className="mt-1 text-sm text-muted">{d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ───────────── FAQ ───────────── */}
        <section id="faq" className="mx-auto max-w-3xl scroll-mt-28 px-4 pb-24 sm:px-6">
          <p className="eyebrow text-center">FAQ</p>
          <h2 className="mt-4 text-center font-display text-4xl tracking-tight sm:text-5xl">Questions, answered.</h2>
          <div className="mt-12 divide-y divide-line rounded-3xl border border-line bg-bg-2">
            {faqs.map(([q, a]) => (
              <details key={q} className="group px-6 py-5">
                <summary className="flex cursor-pointer items-center justify-between gap-4 font-medium">
                  {q}
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-line text-muted transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted">{a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ───────────── CTA ───────────── */}
        <section className="px-4 pb-24 sm:px-6">
          <div className="panel-glow noise relative mx-auto max-w-7xl overflow-hidden px-6 py-20 text-center">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_60%_at_50%_100%,rgb(var(--glow)/0.18),transparent_70%)]" />
            <div className="relative">
              <h2 className="font-display text-5xl tracking-tight sm:text-6xl">
                Know what <span className="italic text-accent">remains.</span>
              </h2>
              <p className="mx-auto mt-4 max-w-md text-muted">Start in seconds on the web. The Android app uses the same account.</p>
              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href="/register" className={buttonClass("primary", "lg")}>
                  Create free account <ArrowRight size={16} />
                </Link>
                <DemoButton size="lg">Try the demo first</DemoButton>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-14 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm text-muted">The personal financial operating system. Take control of your अर्थ.</p>
          </div>
          <div className="md:text-right">
            <p className="mb-3 text-xs text-subtle">
              Designed &amp; built by <span className="text-fg-2">Samarth Patel</span>
            </p>
            <SocialLinks />
          </div>
        </div>
      </footer>
    </div>
  );
}

function Tag({ icon: Icon, children }: { icon: typeof Wallet; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs font-medium text-brand">
      <Icon size={14} /> {children}
    </span>
  );
}
