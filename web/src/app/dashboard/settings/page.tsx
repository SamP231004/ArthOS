"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { SavingsRuleField } from "@/components/savings-rule";
import { Button, ErrorNote, Field, Input, Select } from "@/components/ui";
import { useAuth } from "@/lib/auth-store";
import { useUpdateProfile } from "@/lib/queries";

const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED", "SGD"];

export default function SettingsPage() {
  const user = useAuth((s) => s.user)!;
  const update = useUpdateProfile();
  const [f, setF] = useState({
    name: user.name,
    currency: user.currency,
    timezone: user.timezone,
    savingsMode: user.savingsMode ?? "PERCENT",
    savingsValue: String(user.savingsValue ?? 20),
    startingBalance: String(user.savingsStartingBalance ?? 0),
  });
  const [saved, setSaved] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    try {
      await update.mutateAsync({
        name: f.name,
        currency: f.currency,
        timezone: f.timezone,
        savingsMode: f.savingsMode,
        savingsValue: Number(f.savingsValue) || 0,
        savingsStartingBalance: Number(f.startingBalance) || 0,
      });
      setSaved(true);
    } catch {
      /* shown via update.error */
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Settings" subtitle="Profile and preferences, shared with the Android app." />

      <form onSubmit={save} className="panel divide-y divide-line">
        <Section title="Profile" desc="How ArthOS greets you.">
          <Field label="Full name">
            <Input required maxLength={80} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          </Field>
          <Field label="Email" hint={user.demo ? "Demo accounts use a generated address" : "Email can't be changed yet"}>
            <Input value={user.email} disabled />
          </Field>
        </Section>

        <Section title="Save first" desc="Pay yourself first: this is set aside the moment income arrives. Budgets and “left to spend” come out of what remains.">
          <SavingsRuleField
            mode={f.savingsMode}
            value={f.savingsValue}
            currency={f.currency}
            onChange={(savingsMode, savingsValue) => setF({ ...f, savingsMode, savingsValue })}
          />
          <Field label="Savings you already had" hint="Opens your savings account. Every month's saved-first amount is added on top and carried forward.">
            <Input type="number" min={0} step="any" inputMode="decimal" value={f.startingBalance} onChange={(e) => setF({ ...f, startingBalance: e.target.value })} className="tabular" />
          </Field>
        </Section>

        <Section title="Money" desc="How amounts are shown, and when your day rolls over.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Currency">
              <Select value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value })}>
                {CURRENCIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </Field>
            <Field label="Timezone" hint="Decides when your day and month roll over">
              <Input value={f.timezone} onChange={(e) => setF({ ...f, timezone: e.target.value })} />
            </Field>
          </div>
        </Section>

        <div className="flex items-center justify-end gap-3 p-6">
          <ErrorNote message={update.error?.message} />
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-income">
              <Check size={15} /> Saved
            </span>
          )}
          <Button type="submit" loading={update.isPending}>Save changes</Button>
        </div>
      </form>
    </div>
  );
}

function Section({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-6 p-6 md:grid-cols-[200px_1fr]">
      <div>
        <h2 className="font-medium">{title}</h2>
        <p className="mt-1 text-sm text-subtle">{desc}</p>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}
