"use client";

import { useState } from "react";
import { Button, Card, ErrorNote, Field, Input, Select } from "@/components/ui";
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
    monthlyIncomeTarget: user.monthlyIncomeTarget?.toString() ?? "",
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
        monthlyIncomeTarget: f.monthlyIncomeTarget === "" ? undefined : Number(f.monthlyIncomeTarget),
      });
      setSaved(true);
    } catch {
      /* shown via update.error */
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted">Profile and preferences, shared with the Android app.</p>
      </div>
      <Card>
        <form onSubmit={save} className="space-y-4">
          <Field label="Name">
            <Input required maxLength={80} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          </Field>
          <Field label="Email" hint="Email can't be changed yet">
            <Input value={user.email} disabled className="opacity-60" />
          </Field>
          <Field label="Monthly income target">
            <Input type="number" min={0} step="0.01" value={f.monthlyIncomeTarget} onChange={(e) => setF({ ...f, monthlyIncomeTarget: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Currency">
              <Select value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value })}>
                {CURRENCIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </Field>
            <Field label="Timezone">
              <Input value={f.timezone} onChange={(e) => setF({ ...f, timezone: e.target.value })} />
            </Field>
          </div>
          <ErrorNote message={update.error?.message} />
          <div className="flex items-center gap-3">
            <Button type="submit" loading={update.isPending}>Save</Button>
            {saved && <span className="text-sm text-income">Saved</span>}
          </div>
        </form>
      </Card>
    </div>
  );
}
