"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Check, ChevronRight, Globe2, LayoutGrid, LogOut, Palette, PiggyBank, Smartphone, Trash2, UserRound } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { SavingsRuleField } from "@/components/savings-rule";
import { Button, ErrorNote, Field, Input, Modal, Select } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import { currentMonth, money } from "@/lib/format";
import { useSummary, useUpdateProfile } from "@/lib/queries";
import { switchTheme, THEMES, useTheme } from "@/lib/theme";

const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED", "SGD"];
const TIMEZONES = ["Asia/Kolkata", "Asia/Dubai", "Asia/Singapore", "Europe/London", "Europe/Berlin", "America/New_York", "America/Los_Angeles", "Australia/Sydney"];
const APK_URL = "https://github.com/SamP231004/ArthOS/releases/tag/android-latest";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default function SettingsPage() {
  const user = useAuth((s) => s.user)!;
  const signOut = useAuth((s) => s.signOut);
  const qc = useQueryClient();
  const update = useUpdateProfile();
  const initial = {
    name: user.name,
    currency: user.currency,
    timezone: user.timezone,
    savingsMode: user.savingsMode ?? "PERCENT",
    savingsValue: String(user.savingsValue ?? 20),
    startingBalance: String(user.savingsStartingBalance ?? 0),
  };
  const [f, setF] = useState(initial);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [delBusy, setDelBusy] = useState(false);
  const [delError, setDelError] = useState<string | null>(null);
  const dirty = JSON.stringify(f) !== JSON.stringify(initial);

  async function save() {
    setSaved(false);
    try {
      await update.mutateAsync({
        name: f.name.trim() || user.name,
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

  async function deleteAccount() {
    setDelBusy(true);
    setDelError(null);
    try {
      await api<void>("/api/users/me", { method: "DELETE" });
      signOut();
      qc.clear();
      window.location.replace("/");
    } catch (e) {
      setDelError(e instanceof Error ? e.message : "Couldn't delete the account");
      setDelBusy(false);
    }
  }

  function logout() {
    const dest = user.demo ? "/" : "/login";
    signOut();
    qc.clear();
    window.location.replace(dest);
  }

  const since = user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-IN", { month: "long", year: "numeric" }) : null;

  return (
    <div className="max-w-5xl space-y-6 pb-24">
      <PageHeader title="Settings" subtitle="Your profile and preferences — shared with the Android app." />

      {/* profile */}
      <section className="panel-glow flex flex-wrap items-center gap-5 p-6">
        <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-accent-2 to-accent-3 text-xl font-semibold text-accent-fg">{initials(user.name)}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-2xl tracking-tight">{user.name}</p>
          <p className="truncate text-sm text-muted">{user.email}</p>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
            {user.demo ? (
              <span className="rounded-full bg-brand/10 px-2 py-0.5 font-medium text-brand">Demo · resets in 24h</span>
            ) : (
              since && <span className="rounded-full bg-fg/5 px-2 py-0.5 text-muted">Member since {since}</span>
            )}
            <span className="rounded-full bg-fg/5 px-2 py-0.5 text-muted">{user.currency} · {user.timezone}</span>
          </div>
        </div>
        <Button type="button" variant="secondary" onClick={logout}>
          <LogOut size={15} /> Sign out
        </Button>
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card icon={UserRound} title="Profile" desc="How ArthOS greets you.">
          <Field label="Full name">
            <Input required maxLength={80} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          </Field>
          <Field label="Email" hint={user.demo ? "Demo accounts use a generated address" : "Email can't be changed yet"}>
            <Input value={user.email} disabled />
          </Field>
        </Card>

        <Card icon={Palette} title="Appearance" desc="Applies on this device; the app has its own switch.">
          <ThemePicker />
        </Card>

        <Card icon={PiggyBank} title="Save first" desc="Set aside the moment income arrives. Budgets and “left to spend” use what remains.">
          <SavingsRuleField mode={f.savingsMode} value={f.savingsValue} currency={f.currency} onChange={(savingsMode, savingsValue) => setF({ ...f, savingsMode, savingsValue })} />
          <SaveFirstPreview mode={f.savingsMode} value={Number(f.savingsValue) || 0} currency={f.currency} />
          <Field label="Savings you already had" hint="Opens your savings account; each month's saved-first amount is added and carried forward.">
            <Input type="number" min={0} step="any" inputMode="decimal" value={f.startingBalance} onChange={(e) => setF({ ...f, startingBalance: e.target.value })} className="tabular" />
          </Field>
        </Card>

        <div className="space-y-6">
          <Card icon={Globe2} title="Money & region" desc="How amounts are shown, and when your day rolls over.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Currency">
                <Select value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value })}>
                  {CURRENCIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Timezone">
                <Select value={f.timezone} onChange={(e) => setF({ ...f, timezone: e.target.value })}>
                  {(TIMEZONES.includes(f.timezone) ? TIMEZONES : [f.timezone, ...TIMEZONES]).map((z) => (
                    <option key={z}>{z}</option>
                  ))}
                </Select>
              </Field>
            </div>
          </Card>

          <Card icon={Smartphone} title="On your phone" desc="The Android app shares this account.">
            <Link href="/dashboard/widgets" className="flex items-center gap-3 rounded-xl border border-line p-3 transition hover:border-line-strong">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand/10 text-brand"><LayoutGrid size={16} /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">Home-screen widgets</span>
                <span className="block text-xs text-subtle">Preview them with your numbers</span>
              </span>
              <ChevronRight size={16} className="text-subtle" />
            </Link>
            <a href={APK_URL} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl border border-line p-3 transition hover:border-line-strong">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand/10 text-brand"><Smartphone size={16} /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">Get the Android app</span>
                <span className="block text-xs text-subtle">Scan payments, widgets and alerts</span>
              </span>
              <ChevronRight size={16} className="text-subtle" />
            </a>
          </Card>

          <Card icon={Trash2} title="Account" desc="Your data, your call.">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted">Permanently erase your account and everything in it, on the web and the app.</p>
              <Button type="button" variant="danger" onClick={() => setDeleting(true)}>Delete account</Button>
            </div>
            <p className="text-xs text-subtle"><Link href="/privacy" className="underline hover:text-fg">Privacy policy</Link></p>
          </Card>
        </div>
      </div>

      <Modal open={deleting} onClose={() => !delBusy && setDeleting(false)} title="Delete your account?" subtitle="This can't be undone.">
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-fg-2">
            Your account and everything in it — income, expenses, budgets, savings history, investments and settings — will be <strong className="text-fg">permanently erased</strong> on the website and the Android app.
          </p>
          <ErrorNote message={delError} />
          <div className="flex gap-3">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setDeleting(false)} disabled={delBusy}>Cancel</Button>
            <Button type="button" variant="danger" className="flex-1" loading={delBusy} onClick={deleteAccount}>Delete forever</Button>
          </div>
        </div>
      </Modal>

      {/* save bar: only when something changed */}
      {(dirty || saved || update.error) && (
        <div className="fixed inset-x-0 bottom-24 z-30 flex justify-center px-4 lg:bottom-6 lg:left-64">
          <div className="panel flex w-full max-w-xl items-center gap-3 px-4 py-3 shadow-lg">
            <span className="min-w-0 flex-1 text-sm">
              {update.error ? <ErrorNote message={update.error.message} /> : dirty ? "You have unsaved changes" : (
                <span className="flex items-center gap-1.5 text-income"><Check size={15} /> Saved</span>
              )}
            </span>
            {dirty && (
              <>
                <button type="button" onClick={() => setF(initial)} className="text-sm text-muted hover:text-fg">Discard</button>
                <Button type="button" loading={update.isPending} onClick={save}>Save changes</Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Card({ icon: Icon, title, desc, children }: { icon: React.ComponentType<{ size?: number; className?: string }>; title: string; desc: string; children: React.ReactNode }) {
  return (
    <section className="panel p-6">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-fg/[0.04] text-brand"><Icon size={17} /></span>
        <div>
          <h2 className="font-medium">{title}</h2>
          <p className="mt-0.5 text-sm text-subtle">{desc}</p>
        </div>
      </div>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

function ThemePicker() {
  const theme = useTheme();
  return (
    <div className="grid grid-cols-2 gap-3">
      {THEMES.map((t) => {
        const on = theme === t.id;
        return (
          <button
            key={t.id}
            type="button"
            aria-pressed={on}
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              switchTheme(t.id, { x: r.left + r.width / 2, y: r.top + r.height / 2 });
            }}
            className={`overflow-hidden rounded-xl border text-left transition ${on ? "border-brand ring-2 ring-brand/30" : "border-line hover:border-line-strong"}`}
          >
            <div className="h-16 p-3" style={{ background: t.swatch[0] }}>
              <div className="h-2 w-12 rounded-full" style={{ background: t.swatch[2], opacity: 0.85 }} />
              <div className="mt-2 h-2 w-8 rounded-full" style={{ background: t.swatch[1] }} />
            </div>
            <div className="flex items-center justify-between px-3 py-2 text-sm">
              <span className="font-medium">{t.name}</span>
              <span className="text-xs text-subtle">{t.scheme === "dark" ? "Dark" : "Light"}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/** "Of this month's ₹92,000 income: ₹18,400 saved first, ₹73,600 to spend" — the rule applied to real numbers. */
function SaveFirstPreview({ mode, value, currency }: { mode: string; value: number; currency: string }) {
  const { data: s } = useSummary(currentMonth());
  const income = s?.totalIncome ?? 0;
  if (income <= 0) return null;
  const saved = mode === "FIXED" ? Math.min(value, income) : (income * Math.min(value, 100)) / 100;
  const fmt = (n: number) => money(Math.round(n), currency);
  const pct = (saved / income) * 100;
  return (
    <div className="rounded-xl bg-fg/[0.03] p-3.5">
      <div className="flex h-2 overflow-hidden rounded-full bg-fg/[0.06]">
        <div className="h-full bg-income" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted">
        Of this month&apos;s <span className="tabular font-medium text-fg">{fmt(income)}</span> income:{" "}
        <span className="tabular font-medium text-income">{fmt(saved)}</span> saved first,{" "}
        <span className="tabular font-medium text-fg">{fmt(income - saved)}</span> to spend.
      </p>
    </div>
  );
}
