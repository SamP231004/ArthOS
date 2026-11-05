"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button, ErrorNote, Field, Input, Select } from "@/components/ui";
import { useAuth } from "@/lib/auth-store";
import { useUpdateProfile } from "@/lib/queries";

const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED", "SGD"];

function Onboarding() {
  const router = useRouter();
  const user = useAuth((s) => s.user)!;
  const update = useUpdateProfile();
  const [target, setTarget] = useState(user.monthlyIncomeTarget?.toString() ?? "");
  const [currency, setCurrency] = useState(user.currency ?? "INR");
  const [timezone, setTimezone] = useState(
    user.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata",
  );

  async function finish(e: React.FormEvent) {
    e.preventDefault();
    try {
      await update.mutateAsync({
        currency,
        timezone,
        monthlyIncomeTarget: target ? Number(target) : undefined,
        onboardingCompleted: true,
      });
      router.replace("/dashboard");
    } catch {
      /* shown via update.error */
    }
  }

  return (
    <div className="relative flex flex-1 items-center justify-center px-4 py-12">
      <ThemeToggle className="absolute right-4 top-4" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(50%_100%_at_50%_0%,rgb(var(--glow)/0.1),transparent)]" />
      <div className="relative w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo size="lg" />
        </div>
        <form onSubmit={finish} className="panel-glow animate-fade-up p-7 sm:p-9">
          <p className="eyebrow">Step 1 of 1 · Setup</p>
          <h1 className="mt-3 font-display text-4xl leading-tight tracking-tight">Hi {user.name.split(" ")[0]}, let&apos;s set up your month</h1>
          <p className="mt-2 text-sm text-muted">
            A monthly earning target lets ArthOS show how close you are each month. You can change it anytime.
          </p>
          <div className="mt-6 space-y-4">
            <Field label="Monthly income target" hint="Optional — what you expect to earn in a typical month">
              <Input type="number" inputMode="decimal" min={0} step="0.01" placeholder="e.g. 80000" value={target} onChange={(e) => setTarget(e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Currency">
                <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                  {CURRENCIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Timezone">
                <Input value={timezone} onChange={(e) => setTimezone(e.target.value)} />
              </Field>
            </div>
            <ErrorNote message={update.error?.message} />
            <Button type="submit" size="lg" loading={update.isPending} className="w-full">
              Go to my dashboard
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <AuthGuard requireOnboarded={false}>
      <Onboarding />
    </AuthGuard>
  );
}
