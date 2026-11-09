"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DemoButton } from "./demo-button";
import { GoogleButton } from "./google-button";
import { Logo, LogoMark } from "./logo";
import { ThemeToggle } from "./theme-toggle";
import { Button, ErrorNote, Field, Input } from "./ui";
import { api, ApiError } from "@/lib/api";
import { useAuth, useHydrated } from "@/lib/auth-store";
import type { AuthResponse } from "@/lib/types";

/** Everything ArthOS does, as two rows of pills drifting in opposite directions (mirrors the app's login hero). */
const MARQUEE: [string, string][][] = [
  [
    ["#4cc38a", "Save first, automatically"],
    ["#ece7db", "One number for today"],
    ["#84b6d8", "Live investments"],
    ["#4cc38a", "Import from Zerodha & Groww"],
    ["#e8706a", "Scan & Share payments"],
    ["#d9b26f", "Gold, MFs, stocks, bonds"],
    ["#4cc38a", "Savings that carry forward"],
  ],
  [
    ["#e8b45c", "Health score that explains"],
    ["#ece7db", "Home-screen widgets"],
    ["#f07167", "Pinned budget alerts"],
    ["#84b6d8", "Smart categories"],
    ["#b9a5e2", "Subscriptions & bills"],
    ["#4cc38a", "Private · no bank logins"],
  ],
];

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const { token, user, setSession } = useAuth();
  const hydrated = useHydrated();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Already signed in (and not a demo session) → straight to the app.
  useEffect(() => {
    if (hydrated && token && user && !user.demo) router.replace(user.onboardingCompleted ? "/dashboard" : "/onboarding");
  }, [hydrated, token, user, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});
    try {
      const body = mode === "register" ? form : { email: form.email, password: form.password };
      const res = await api<AuthResponse>(`/api/auth/${mode}`, { method: "POST", body, auth: false });
      setSession(res.token, res.user);
      router.replace(res.user.onboardingCompleted ? "/dashboard" : "/onboarding");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.fieldErrors ? null : err.message);
        setFieldErrors(err.fieldErrors ?? {});
      } else setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="relative grid min-h-dvh flex-1 lg:h-dvh lg:grid-cols-[1fr_1fr] lg:overflow-hidden">
      <div className="absolute right-4 top-4 z-10 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>
      {/* Brand panel: the app's login hero (deep forest in both themes, अर्थ watermark, every feature drifting by) */}
      <aside className="relative hidden overflow-hidden border-r border-white/[0.06] bg-[linear-gradient(180deg,#12301f,#0a1d14_55%,#06110c)] text-[#f2efe8] lg:flex lg:flex-col lg:items-center lg:justify-center">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-[58%] rounded-full bg-[rgba(196,58,53,0.12)] blur-[2px]" />
        <span aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[62%] select-none font-deva text-[300px] leading-none text-[rgba(242,239,232,0.045)]">
          अर्थ
        </span>

        <div className="relative flex flex-col items-center text-center">
          <span className="rounded-[22px] shadow-[0_0_44px_rgba(196,58,53,0.55)]">
            <LogoMark size={76} />
          </span>
          <p className="mt-5 font-display text-5xl tracking-tight">
            Arth<span className="text-[#ec7a74]">OS</span>
          </p>
          <p className="mt-2 text-[15px] text-[#a5b0a9]">
            Take control of your <span className="font-deva text-[#ec7a74]">अर्थ</span>
          </p>
        </div>

        <div className="relative mt-12 w-full space-y-2.5 [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]">
          {MARQUEE.map((row, i) => (
            <div key={i} className="flex w-max motion-safe:animate-[marquee_46s_linear_infinite]" style={i % 2 ? { animationDirection: "reverse" } : undefined}>
              {[0, 1].map((copy) => (
                <div key={copy} className="flex shrink-0" aria-hidden={copy === 1}>
                  {row.map(([color, label]) => (
                    <span key={label} className="mr-2.5 flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-[13px] text-[#d9d4c9]">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
                      {label}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>

        <Link href="/#features" className="relative mt-10 inline-flex items-center gap-1.5 text-sm font-medium text-[#ec7a74] hover:underline">
          See everything ArthOS does <ArrowRight size={14} />
        </Link>
        <p className="absolute bottom-8 text-xs text-[#7d8b83]">One account · web and Android</p>
      </aside>

      {/* Form */}
      <div className="relative flex items-center justify-center px-4 py-10 sm:px-8 lg:overflow-y-auto lg:py-6 lg:[scrollbar-width:none]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(50%_100%_at_50%_0%,rgb(var(--glow)/0.08),transparent)] lg:hidden" />
        <div className="relative w-full max-w-[400px] animate-fade-up">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          {user?.demo && (
            <p className="mb-4 rounded-xl border border-brand/25 bg-brand/[0.06] px-3.5 py-2.5 text-sm text-fg-2">
              {mode === "register" ? "Create your account to keep your own data. Your demo sandbox stays available until it expires." : "You're in a demo session — sign in to switch to your own account."}
            </p>
          )}
          <h1 className="font-display text-[2.15rem] leading-tight tracking-tight">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
          <p className="mt-1 text-sm text-muted">
            {mode === "login" ? "Sign in to your financial control center." : "One account for the web and the Android app. Takes under a minute."}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-3.5">
            <div className={mode === "register" ? "grid gap-3.5 sm:grid-cols-2" : ""}>
              {mode === "register" && (
                <Field label="Full name" error={fieldErrors.name}>
                  <Input value={form.name} onChange={set("name")} autoComplete="name" required maxLength={80} />
                </Field>
              )}
              <Field label="Email" error={fieldErrors.email}>
                <Input type="email" value={form.email} onChange={set("email")} autoComplete="email" required />
              </Field>
            </div>
            <Field label="Password" error={fieldErrors.password} hint={mode === "register" ? "At least 8 characters" : undefined}>
              <Input
                type="password"
                value={form.password}
                onChange={set("password")}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
                minLength={mode === "register" ? 8 : undefined}
              />
            </Field>
            <ErrorNote message={error} />
            <Button type="submit" loading={loading} size="lg" className="w-full">
              {mode === "login" ? "Sign in" : "Create account"} {!loading && <ArrowRight size={16} />}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-4 text-[11px] uppercase tracking-widest text-subtle">
            <span className="hairline flex-1" /> or <span className="hairline flex-1" />
          </div>

          <div className="space-y-2.5">
            <GoogleButton onError={setError} />
            <div className="flex flex-col items-stretch [&>span]:w-full [&_button]:w-full">
              <DemoButton size="lg">Explore with demo data</DemoButton>
            </div>
          </div>
          <p className="mt-2 text-center text-xs text-subtle">A private sandbox with 6 months of sample data. No sign-up.</p>

          <p className="mt-6 text-center text-sm text-muted">
            {mode === "login" ? (
              <>New to ArthOS? <Link href="/register" className="text-brand hover:underline">Create an account</Link></>
            ) : (
              <>Already have an account? <Link href="/login" className="text-brand hover:underline">Sign in</Link></>
            )}
          </p>
          <p className="mt-4 text-center text-xs text-subtle">
            By continuing you agree to how we handle your data in the <Link href="/privacy" className="underline hover:text-fg">privacy policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
