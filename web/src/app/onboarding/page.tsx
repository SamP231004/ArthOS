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
        onboardingCompleted: true,
      });
      router.replace("/dashboard");
    } catch {
      /* shown via update.error */
    }
  }

  return (
    <div className="relative flex flex-1 items-center justify-center px-4 py-12">
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(50%_100%_at_50%_0%,rgb(var(--glow)/0.1),transparent)]" />
      <div className="relative w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo size="lg" />
        </div>
        <form onSubmit={finish} className="panel-glow animate-fade-up p-7 sm:p-9">
          <p className="eyebrow">Step 1 of 1 · Setup</p>
          <h1 className="mt-3 font-display text-4xl leading-tight tracking-tight">Hi {user.name.split(" ")[0]}, let&apos;s get you set up</h1>
          <p className="mt-2 text-sm text-muted">
            Pick your currency and timezone — they decide how money is shown and when your day and month roll over.
          </p>
          <div className="mt-6 space-y-4">
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
