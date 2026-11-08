import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  BellRing,
  Bot,
  Check,
  Globe2,
  KeyRound,
  Lock,
  Minus,
  Moon,
  PiggyBank,
  Repeat,
  ScanLine,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Tags,
  TrendingUp,
  UserRound,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { DemoButton } from "@/components/demo-button";
import { Logo } from "@/components/logo";
import { BudgetSimulator } from "@/components/marketing/budget-simulator";
import { InsightsVisual, MoneyFlowVisual, PhoneVisual, PortfolioVisual, ScanVisual } from "@/components/marketing/feature-visuals";
import { ProductPreview } from "@/components/marketing/product-preview";
import { SiteNav } from "@/components/marketing/site-nav";
import { SocialLinks } from "@/components/social-links";
import { buttonClass } from "@/lib/button";

const APK_URL = "https://github.com/SamP231004/ArthOS/releases/tag/android-latest";
const DOCS_URL = "https://github.com/SamP231004/ArthOS#-documentation";

const pillars = [
  { icon: ArrowDownLeft, k: "comes in", d: "Salary, freelance, dividends and interest in one ledger.", c: "text-income" },
  { icon: ArrowUpRight, k: "goes out", d: "Every UPI, card and cash spend — scanned, categorised, searchable.", c: "text-expense" },
  { icon: TrendingUp, k: "grows", d: "Stocks, mutual funds, gold and bonds in one live portfolio.", c: "text-info" },
  { icon: Wallet, k: "remains", d: "Savings set aside first, and one honest number for today.", c: "text-mark" },
];

const extras = [
  { icon: Tags, t: "Smart categories", d: "Learns that Swiggy is Food from you; corrections stick." },
  { icon: Repeat, t: "Recurring detection", d: "Spots monthly bills you forgot to mark." },
  { icon: Search, t: "Search & filters", d: "By merchant, category, amount, payment method, month." },
  { icon: Moon, t: "Forest & Ivory", d: "Two calm themes, with a smooth switch." },
  { icon: Sparkles, t: "Private demo", d: "Six months of sample data, deleted after 24 hours." },
  { icon: UserRound, t: "Google sign-in", d: "One tap on web and Android." },
  { icon: Globe2, t: "Your currency", d: "INR by default, plus USD, EUR, GBP, AED, SGD." },
  { icon: PiggyBank, t: "Savings that carry", d: "A savings account that rolls over every month." },
];

const platforms: [string, boolean | string, boolean | string][] = [
  ["Income, expenses, search & filters", true, true],
  ["Save-first savings account", true, true],
  ["Daily budget, calendar & explanations", true, true],
  ["Investments with live prices, XIRR, analysis", true, true],
  ["Insights & financial health score", true, true],
  ["Scan a payment screenshot or receipt", "Upload", "Share → ArthOS"],
  ["Paste a bank SMS", true, true],
  ["Home-screen widgets", "Preview", true],
  ["Pinned money alerts & bill reminders", false, true],
  ["Google sign-in · private demo", true, true],
];

const roadmap = [
  ["01", "Foundation", "Accounts, income & expenses, month summary, save-first savings", "live"],
  ["02", "Budget engine", "Fixed, adaptive and weekly modes with day-by-day history", "live"],
  ["03", "Investments", "Stocks, MF, gold, bonds — live prices, XIRR, split funding", "live"],
  ["04", "Automation", "Screenshot & SMS scanning, smart categories, recurring bills", "live"],
  ["05", "Insights", "Plain-language summary, health score, anomalies, alerts", "live"],
  ["06", "Widgets", "Android home-screen widgets with hide & refresh", "live"],
  ["07", "AI assistant", "Opt-in “Ask ArthOS”, grounded in your computed numbers", "planned"],
  ["08", "Scale", "Goals, liabilities in net worth, family sharing", "planned"],
] as const;

const faqs = [
  ["Do I need to connect my bank account?", "No. ArthOS never asks for bank credentials. You add transactions yourself — typed, pasted from a bank SMS, or scanned from a payment screenshot."],
  ["Do my screenshots get uploaded?", "No. Text is read on your device (Google ML Kit on Android, Tesseract in the browser). Only the extracted text is sent to ArthOS to fill in the form, and nothing is saved until you confirm."],
  ["Does it use AI?", "Not today. Insights and the health score are transparent rules you can read in our docs — no data goes to an AI provider. An optional assistant is planned, and it will be opt-in."],
  ["What is in the demo?", "A private sandbox with six months of realistic data for a salaried professional in Bengaluru. Change anything — it's yours alone, and it deletes itself after 24 hours."],
  ["Is there an iPhone app?", "Not yet. ArthOS is Android-first; the website works on any phone or computer, with the same account."],
  ["What does it cost?", "ArthOS is free during early access."],
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
              Web + Android · six phases shipped
              <ArrowRight size={12} />
            </a>

            <h1 className="mx-auto mt-8 max-w-4xl animate-fade-up font-display text-[3rem] font-[350] leading-[1.02] tracking-[-0.035em] [animation-delay:80ms] sm:text-[4.25rem] lg:text-[5.25rem]">
              <span className="text-silver">Take control</span>
              <br />
              <span className="text-silver">of your </span>
              <span className="font-deva text-accent inline-block px-[0.04em] pt-[0.22em] -mt-[0.22em] leading-[1.15]">अर्थ</span>
            </h1>

            <p className="mx-auto mt-7 max-w-2xl animate-fade-up text-base leading-relaxed text-muted [animation-delay:160ms] sm:text-lg">
              The personal financial operating system. Save first, spend with one daily number, scan payments in a tap, watch investments grow — and get insights that explain themselves.
            </p>

            <div className="mt-10 flex animate-fade-up flex-col items-center justify-center gap-3 [animation-delay:240ms] sm:flex-row">
              <DemoButton variant="primary" size="lg">
                Explore the live demo
              </DemoButton>
              <Link href="/register" className={buttonClass("secondary", "lg")}>
                Create free account <ArrowRight size={16} />
              </Link>
              <a href={APK_URL} target="_blank" rel="noreferrer" className={buttonClass("ghost", "lg")}>
                <Smartphone size={16} /> Get the Android app
              </a>
            </div>
            <p className="mt-4 animate-fade-up text-xs text-subtle [animation-delay:300ms]">No sign-up needed for the demo · No bank logins, ever · Free during early access</p>
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
            <h2 className="mt-3 font-display text-4xl leading-tight tracking-tight sm:text-5xl">
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

        {/* ───────────── Feature tour ───────────── */}
        <div id="features" className="scroll-mt-28">
          <Feature
            eyebrow="Save first"
            title={<>Pay yourself first. <span className="italic text-muted">Automatically.</span></>}
            body="A share of every income goes into your savings account the moment it arrives. What's left is yours to spend — so “left to spend” is always honest."
            points={["20% of income, or a fixed amount — your rule", "Savings carry forward month after month", "Invest from savings, from spending, or split it", "See exactly where this month's money went"]}
            visual={<MoneyFlowVisual />}
          />

          <section id="budget" className="scroll-mt-28 border-y border-line bg-bg-2/60">
            <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
              <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:items-start">
                <div>
                  <p className="eyebrow">The budget engine</p>
                  <h2 className="mt-3 font-display text-4xl leading-tight tracking-tight sm:text-5xl">
                    A monthly limit, turned into <span className="italic text-accent">one daily number.</span>
                  </h2>
                  <p className="mt-4 text-muted">Move the sliders and watch an adaptive budget respond to a real month instead of punishing it.</p>
                  <Points items={["Fixed, adaptive or weekly — switch in one tap", "Rent and EMIs kept out of the daily number", "Day-by-day calendar with what you spent", "“How is today's number worked out?” — every step shown"]} />
                  <Platforms />
                </div>
                <BudgetSimulator />
              </div>
            </div>
          </section>

          <Feature
            eyebrow="Investments"
            title={<>Every rupee that grows, <span className="italic text-muted">in one place.</span></>}
            body="Stocks and ETFs on NSE/BSE, mutual funds from official AMFI NAVs, gold by the gram and bonds — valued live, with the returns that matter."
            points={["Live prices refreshed every 15 minutes", "P&L, XIRR, realised gains and day change", "Value vs invested over time, by class, horizon and goal", "Buying again merges into one holding; edit any transaction"]}
            visual={<PortfolioVisual />}
            flip
          />

          <section className="border-y border-line bg-bg-2/60">
            <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
              <div className="mx-auto max-w-2xl text-center">
                <p className="eyebrow">Scan &amp; Share</p>
                <h2 className="mt-3 font-display text-4xl leading-tight tracking-tight sm:text-5xl">
                  Share a payment screenshot. <span className="italic text-accent">That&apos;s the entry.</span>
                </h2>
                <p className="mt-4 text-muted">
                  From GPay, PhonePe, Paytm or your bank app, tap <span className="text-fg">Share → ArthOS</span>. The amount, merchant, date, reference and category fill themselves in — you just confirm.
                </p>
              </div>
              <div className="mt-14">
                <ScanVisual />
              </div>
              <div className="mx-auto mt-12 grid max-w-4xl gap-3 sm:grid-cols-3">
                {[
                  [ScanLine, "Read on your device", "The image never leaves your phone or browser."],
                  [Tags, "Learns your categories", "Correct it once; ArthOS remembers."],
                  [Repeat, "Finds recurring bills", "Subscriptions and EMIs, spotted for you."],
                ].map(([I, t, d]) => {
                  const Icon = I as typeof ScanLine;
                  return (
                    <div key={t as string} className="panel p-5">
                      <Icon size={17} className="text-mark" />
                      <p className="mt-3 font-medium">{t as string}</p>
                      <p className="mt-1 text-sm text-muted">{d as string}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <Feature
            eyebrow="Insights"
            title={<>A score that <span className="italic text-muted">explains itself.</span></>}
            body="Your month in plain words, a 100-point financial health score broken into five parts, unusual spending, and subscriptions that quietly add up — all from transparent rules, no AI."
            points={["What changed vs your usual — by the same day of the month", "Unusual purchases flagged, with how unusual", "Subscriptions, yearly totals and price rises", "Concrete suggestions with what they'd free up"]}
            visual={<InsightsVisual />}
          />

          <Feature
            id="app"
            eyebrow="On your phone"
            title={<>Your money on your <span className="italic text-accent">home screen.</span></>}
            body="The Android app adds what only a phone can do: widgets you can glance at, and alerts that don't get lost."
            points={["Safe to spend, month, portfolio and quick-add widgets", "Tap the eye to hide amounts — right on the widget", "A pinned alert when you're over budget — survives “Clear all”", "Bill reminders at 9 am on the due date"]}
            visual={<PhoneVisual />}
            flip
            cta={
              <a href={APK_URL} target="_blank" rel="noreferrer" className={`${buttonClass("primary", "md")} mt-8`}>
                <Smartphone size={16} /> Download for Android
              </a>
            }
          />
        </div>

        {/* ───────────── Everything else ───────────── */}
        <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
          <p className="eyebrow">And everything around it</p>
          <h2 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">The small things, done properly.</h2>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {extras.map((e) => (
              <div key={e.t} className="panel p-5">
                <e.icon size={18} className="text-fg-2" />
                <p className="mt-4 font-medium">{e.t}</p>
                <p className="mt-1 text-sm text-muted">{e.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ───────────── Web vs app ───────────── */}
        <section id="platforms" className="mx-auto max-w-5xl scroll-mt-28 px-4 pb-24 sm:px-6">
          <p className="eyebrow text-center">One account, two ways in</p>
          <h2 className="mt-3 text-center font-display text-4xl tracking-tight sm:text-5xl">Web and Android, always in sync.</h2>
          <div className="panel mt-12 overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-line text-left">
                  <th className="px-5 py-4 font-medium text-muted">Feature</th>
                  <th className="px-5 py-4 text-center font-medium"><span className="inline-flex items-center gap-1.5"><Globe2 size={15} /> Web</span></th>
                  <th className="px-5 py-4 text-center font-medium"><span className="inline-flex items-center gap-1.5"><Smartphone size={15} /> Android</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {platforms.map(([f, w, a]) => (
                  <tr key={f}>
                    <td className="px-5 py-3.5 text-fg-2">{f}</td>
                    <td className="px-5 py-3.5 text-center"><Cell v={w} /></td>
                    <td className="px-5 py-3.5 text-center"><Cell v={a} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ───────────── Privacy ───────────── */}
        <section id="privacy" className="scroll-mt-28 border-y border-line bg-bg-2/60">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 py-24 sm:px-6 lg:grid-cols-[1fr_1.4fr] lg:items-center">
            <div>
              <p className="eyebrow">Private by design</p>
              <h2 className="mt-3 font-display text-4xl leading-tight tracking-tight sm:text-5xl">
                Your money is personal. <span className="italic text-muted">So is your data.</span>
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                [ShieldCheck, "No bank logins", "ArthOS never asks for net-banking credentials."],
                [ScanLine, "Screenshots stay put", "Text is read on your device; images are never uploaded."],
                [Bot, "No external AI", "Insights are rules you can read — nothing sent to an AI provider."],
                [Lock, "Encrypted in transit", "Every request travels over HTTPS."],
                [KeyRound, "Hashed passwords", "Stored with bcrypt, never in plain text."],
                [BellRing, "Local alerts", "Notifications are scheduled on your phone — no push server."],
              ].map(([I, t, d]) => {
                const Icon = I as typeof Lock;
                return (
                  <div key={t as string} className="panel p-5">
                    <Icon size={18} className="text-fg-2" />
                    <p className="mt-4 font-medium">{t as string}</p>
                    <p className="mt-1 text-sm text-muted">{d as string}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ───────────── Roadmap ───────────── */}
        <section id="roadmap" className="mx-auto max-w-7xl scroll-mt-28 px-4 py-24 sm:px-6">
          <p className="eyebrow">Roadmap</p>
          <h2 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">Built in the open, phase by phase.</h2>
          <div className="mt-12 grid gap-px overflow-hidden rounded-3xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {roadmap.map(([n, t, d, s]) => (
              <div key={n} className={`relative p-6 ${s === "live" ? "bg-surface" : "bg-bg-2"}`}>
                {s === "live" && <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-mark to-transparent" />}
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-subtle">{n}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-medium ${s === "live" ? "bg-income/15 text-income" : "text-subtle"}`}>{s === "live" ? "Live" : "Planned"}</span>
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
          <h2 className="mt-3 text-center font-display text-4xl tracking-tight sm:text-5xl">Questions, answered.</h2>
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
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_60%_at_50%_100%,rgb(var(--glow)/0.14),transparent_70%)]" />
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
                <a href={APK_URL} target="_blank" rel="noreferrer" className={buttonClass("ghost", "lg")}>
                  <Smartphone size={16} /> Android app
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-14 sm:px-6 md:flex-row md:items-start md:justify-between">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm text-muted">The personal financial operating system. Take control of your अर्थ.</p>
          </div>
          <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm">
            <a href="#features" className="text-muted hover:text-fg">Features</a>
            <a href={APK_URL} target="_blank" rel="noreferrer" className="text-muted hover:text-fg">Android app</a>
            <a href="#privacy" className="text-muted hover:text-fg">Privacy</a>
            <a href={DOCS_URL} target="_blank" rel="noreferrer" className="text-muted hover:text-fg">Documentation</a>
            <a href="#roadmap" className="text-muted hover:text-fg">Roadmap</a>
            <Link href="/login" className="text-muted hover:text-fg">Sign in</Link>
          </div>
          <div className="md:text-right">
            <p className="mb-3 text-xs text-subtle">
              Forged by <span className="text-fg-2">Samarth Patel</span>
            </p>
            <SocialLinks />
          </div>
        </div>
      </footer>
    </div>
  );
}

function Points({ items }: { items: string[] }) {
  return (
    <ul className="mt-6 space-y-2.5">
      {items.map((t) => (
        <li key={t} className="flex gap-3 text-sm text-fg-2">
          <Check size={16} className="mt-0.5 shrink-0 text-income" />
          {t}
        </li>
      ))}
    </ul>
  );
}

function Platforms({ app = true, web = true }: { app?: boolean; web?: boolean }) {
  return (
    <div className="mt-6 flex gap-2 text-xs text-muted">
      {web && <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1"><Globe2 size={12} /> Web</span>}
      {app && <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1"><Smartphone size={12} /> Android</span>}
    </div>
  );
}

function Feature({
  id,
  eyebrow,
  title,
  body,
  points,
  visual,
  flip,
  cta,
}: {
  id?: string;
  eyebrow: string;
  title: React.ReactNode;
  body: string;
  points: string[];
  visual: React.ReactNode;
  flip?: boolean;
  cta?: React.ReactNode;
}) {
  return (
    <section id={id} className="mx-auto max-w-7xl scroll-mt-28 px-4 py-24 sm:px-6">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div className={flip ? "lg:order-2" : ""}>
          <p className="eyebrow">{eyebrow}</p>
          <h2 className="mt-3 font-display text-4xl leading-tight tracking-tight sm:text-5xl">{title}</h2>
          <p className="mt-4 max-w-lg text-muted">{body}</p>
          <Points items={points} />
          {cta ?? <Platforms app web={id !== "app"} />}
        </div>
        <div className={flip ? "lg:order-1" : ""}>{visual}</div>
      </div>
    </section>
  );
}

function Cell({ v }: { v: boolean | string }) {
  if (v === true) return <Check size={17} className="mx-auto text-income" aria-label="Yes" />;
  if (v === false) return <Minus size={17} className="mx-auto text-subtle" aria-label="No" />;
  return <span className="text-xs text-muted">{v}</span>;
}
