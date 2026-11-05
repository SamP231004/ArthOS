"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "./logo";
import { Button, ErrorNote, Field, Input } from "./ui";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import type { AuthResponse } from "@/lib/types";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const { token, user, hydrated, setSession } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Already signed in → go straight to the app.
  useEffect(() => {
    if (hydrated && token && user) router.replace(user.onboardingCompleted ? "/dashboard" : "/onboarding");
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
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo size="lg" />
        </div>
        <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
          <h1 className="text-xl font-semibold">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
          <p className="mt-1 text-sm text-muted">
            {mode === "login" ? "Sign in to your financial control center." : "One account for the web and the Android app."}
          </p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === "register" && (
              <Field label="Name" error={fieldErrors.name}>
                <Input value={form.name} onChange={set("name")} autoComplete="name" required maxLength={80} />
              </Field>
            )}
            <Field label="Email" error={fieldErrors.email}>
              <Input type="email" value={form.email} onChange={set("email")} autoComplete="email" required />
            </Field>
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
            <Button type="submit" loading={loading} className="w-full">
              {mode === "login" ? "Sign in" : "Create account"}
            </Button>
          </form>
        </div>
        <p className="mt-6 text-center text-sm text-muted">
          {mode === "login" ? (
            <>New to ArthOS? <Link href="/register" className="text-brand hover:underline">Create an account</Link></>
          ) : (
            <>Already have an account? <Link href="/login" className="text-brand hover:underline">Sign in</Link></>
          )}
        </p>
      </div>
    </div>
  );
}
