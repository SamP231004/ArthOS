"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { Logo } from "@/components/logo";
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
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo size="lg" />
        </div>
        <form onSubmit={finish} className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
          <p className="text-sm text-brand">Step 1 of 1</p>
          <h1 className="mt-1 text-2xl font-semibold">Hi {user.name.split(" ")[0]}, let&apos;s set up your month</h1>
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
            <Button type="submit" loading={update.isPending} className="w-full">
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
