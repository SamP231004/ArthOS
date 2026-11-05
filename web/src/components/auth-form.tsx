"use client";

import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DemoButton } from "./demo-button";
import { GoogleButton } from "./google-button";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";
import { Button, ErrorNote, Field, Input } from "./ui";
import { api, ApiError } from "@/lib/api";
import { useAuth, useHydrated } from "@/lib/auth-store";
import type { AuthResponse } from "@/lib/types";

const perks = [
  "Income, expenses and savings rate in one dashboard",
  "Stocks, mutual funds, gold and bonds priced live",
  "Same account on the web and the Android app",
  "Adaptive daily budgets that tell you what's safe to spend today",
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
    <div className="relative grid min-h-screen flex-1 lg:grid-cols-[1fr_1fr]">
      <div className="absolute right-4 top-4 z-10 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>
      {/* Brand panel */}
      <aside className="noise relative hidden overflow-hidden border-r border-line bg-bg-2 lg:flex lg:items-center lg:justify-center lg:p-12">
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-60" />
        <div className="pointer-events-none absolute -left-40 top-1/3 h-[520px] w-[520px] rounded-full bg-brand/10 blur-[120px]" />
        <div className="relative flex min-h-[560px] w-full max-w-md flex-col justify-between gap-12 py-4">
        <Logo />
        <div>
          <p className="eyebrow">Personal financial OS</p>
          <h2 className="mt-5 font-display text-5xl leading-[1.05] tracking-tight">
            <span className="text-silver">Every rupee,</span>
            <br />
            <span className="italic text-accent">in motion.</span>
          </h2>
          <ul className="mt-10 space-y-3.5">
            {perks.map((p) => (
              <li key={p} className="flex items-start gap-3 text-sm text-fg-2">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand/15 text-brand">
                  <Check size={12} />
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>
        <div className="panel max-w-sm p-5">
          <p className="text-xs text-subtle">This month · remaining</p>
          <p className="tabular mt-1 text-3xl font-semibold">₹38,420</p>
          <div className="mt-3 h-1.5 rounded-full bg-fg/5">
            <div className="h-full w-[58%] rounded-full bg-gradient-to-r from-accent-3 to-accent-1" />
          </div>
          <p className="mt-2 text-xs text-income">41.8% of income kept so far</p>
        </div>
        </div>
      </aside>

      {/* Form */}
      <div className="relative flex items-center justify-center px-4 py-14 sm:px-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(50%_100%_at_50%_0%,rgb(var(--glow)/0.08),transparent)] lg:hidden" />
        <div className="relative w-full max-w-[400px] animate-fade-up">
          <div className="mb-10 lg:hidden">
            <Logo />
          </div>
          {user?.demo && (
            <p className="mb-6 rounded-xl border border-brand/25 bg-brand/[0.06] px-3.5 py-2.5 text-sm text-fg-2">
              {mode === "register" ? "Create your account to keep your own data. Your demo sandbox stays available until it expires." : "You're in a demo session — sign in to switch to your own account."}
            </p>
          )}
          <h1 className="font-display text-4xl tracking-tight">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
          <p className="mt-2 text-sm text-muted">
            {mode === "login" ? "Sign in to your financial control center." : "Free during early access. Takes under a minute."}
          </p>

          <form onSubmit={submit} className="mt-9 space-y-4">
            {mode === "register" && (
              <Field label="Full name" error={fieldErrors.name}>
                <Input value={form.name} onChange={set("name")} autoComplete="name" required maxLength={80} placeholder="Samarth Patel" />
              </Field>
            )}
            <Field label="Email" error={fieldErrors.email}>
              <Input type="email" value={form.email} onChange={set("email")} autoComplete="email" required placeholder="you@example.com" />
            </Field>
            <Field label="Password" error={fieldErrors.password} hint={mode === "register" ? "At least 8 characters" : undefined}>
              <Input
                type="password"
                value={form.password}
                onChange={set("password")}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
                minLength={mode === "register" ? 8 : undefined}
                placeholder="••••••••"
              />
            </Field>
            <ErrorNote message={error} />
            <Button type="submit" loading={loading} size="lg" className="w-full">
              {mode === "login" ? "Sign in" : "Create account"} {!loading && <ArrowRight size={16} />}
            </Button>
          </form>

          <div className="my-7 flex items-center gap-4 text-[11px] uppercase tracking-widest text-subtle">
            <span className="hairline flex-1" /> or <span className="hairline flex-1" />
          </div>

          <div className="space-y-3">
            <GoogleButton onError={setError} />
            <div className="flex flex-col items-stretch [&>span]:w-full [&_button]:w-full">
              <DemoButton size="lg">Explore with demo data</DemoButton>
            </div>
          </div>
          <p className="mt-2.5 text-center text-xs text-subtle">A private sandbox with 3 months of sample data. No sign-up.</p>

          <p className="mt-10 text-center text-sm text-muted">
            {mode === "login" ? (
              <>New to ArthOS? <Link href="/register" className="text-brand hover:underline">Create an account</Link></>
            ) : (
              <>Already have an account? <Link href="/login" className="text-brand hover:underline">Sign in</Link></>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
