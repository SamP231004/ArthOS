import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MonthPicker } from '@/components/month-picker';
import { Screen } from '@/components/screen';
import { Badge, Button, Card, Chip, ErrorNote, Input, Loading, T } from '@/components/ui';
import { useAuth } from '@/lib/auth-store';
import { explain, MODE_META, STATUS_META, warningFor, type Tone } from '@/lib/budget-meta';
import { label, money, monthLabel } from '@/lib/format';
import { useBudget, useSaveBudget } from '@/lib/queries';
import { BUDGET_MODES, EXPENSE_CATEGORIES, type BudgetMode, type BudgetStatus, type ExpenseCategory } from '@/lib/types';
import { useMonth } from '@/lib/ui-store';
import { alpha, F, R, S, useStyles, useTheme, type Palette } from '@/theme';

export default function BudgetTab() {
  const month = useMonth();
  const cur = useAuth((s) => s.user?.currency ?? 'INR');
  const fmt = (n: number) => money(n, cur);
  const { data: b, isLoading, error, refetch, isRefetching } = useBudget(month);
  const [editing, setEditing] = useState(false);

  return (
    <Screen refreshing={isRefetching} onRefresh={refetch}>
      <View>
        <T variant="title">Budget</T>
        <T variant="muted">Your month, turned into one simple daily decision.</T>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <MonthPicker />
        {b?.configured && !editing && <Button title="Edit" variant="secondary" onPress={() => setEditing(true)} />}
      </View>

      {isLoading ? (
        <Loading />
      ) : error ? (
        <ErrorNote message={error.message} />
      ) : !b ? null : editing || !b.configured ? (
        <BudgetEditor month={month} current={b} onDone={() => setEditing(false)} canCancel={b.configured} />
      ) : (
        <BudgetView b={b} fmt={fmt} month={month} />
      )}
    </Screen>
  );
}

function BudgetView({ b, fmt, month }: { b: BudgetStatus; fmt: (n: number) => string; month: string }) {
  const { c } = useTheme();
  const s = useStyles(make);
  const toneOf = (t: Tone) => ({ income: c.income, gold: c.warn, expense: c.expense, neutral: c.muted, info: c.info })[t];
  const st = STATUS_META[b.status];
  const warn = warningFor(b, fmt);
  const closed = b.daysRemaining === 0;
  const used = Math.min(100, b.usedPct ?? 0);

  return (
    <>
      {b.inherited && b.inheritedFrom && <T variant="small">↻ Carried over from {monthLabel(b.inheritedFrom)}</T>}
      {warn && (
        <View style={[s.warn, b.status === 'CAUTION' && { borderColor: alpha(c.warn, 0.35), backgroundColor: alpha(c.warn, 0.08) }]}>
          <Text style={{ color: b.status === 'CAUTION' ? c.fg2 : c.expense, fontSize: 13, fontFamily: F.ui }}>⚠ {warn}</Text>
        </View>
      )}

      <ModeSwitch b={b} fmt={fmt} month={month} />

      <Card glow style={{ gap: S.sm }}>
        <View style={{ flexDirection: 'row', gap: S.sm, flexWrap: 'wrap' }}>
          <Badge label={st.label} color={toneOf(st.tone)} />
          <Badge label={MODE_META[b.mode].name} />
        </View>
        <T variant="muted" style={{ marginTop: S.sm }}>
          {closed ? (b.remainingMonth >= 0 ? 'Finished under budget by' : 'Finished over budget by') : b.status === 'UPCOMING' ? 'Daily allowance from day 1' : 'Safe to spend today'}
        </T>
        <T variant="big" style={!closed && b.todayRemaining === 0 && b.status !== 'UPCOMING' ? { color: c.expense } : null}>
          {closed ? fmt(Math.abs(b.remainingMonth)) : fmt(b.status === 'UPCOMING' ? b.todayAllowance : b.todayRemaining)}
        </T>
        {!closed && b.status !== 'UPCOMING' && <T variant="small">{fmt(b.spentToday)} spent of today&apos;s {fmt(b.todayAllowance)}</T>}
        <View style={s.track}>
          <View style={{ height: 8, width: `${used}%`, backgroundColor: used >= 100 ? c.expense : used >= 80 ? c.warn : c.income, borderRadius: R.pill }} />
          {!closed && <View style={[s.marker, { left: `${b.elapsedPct}%` }]} />}
        </View>
        <T variant="small">{fmt(b.spentMonth)} of {fmt(b.limit)} used · {fmt(b.remainingMonth)} left</T>
      </Card>

      <View style={{ flexDirection: 'row', gap: S.md }}>
        <Card style={{ flex: 1, padding: S.md, gap: 2 }}>
          <T variant="small">{closed ? 'Month-end total' : 'Projected month-end'}</T>
          <T variant="num" style={{ color: b.projectedSpend != null && b.projectedSpend > b.limit ? c.expense : c.income }}>{b.projectedSpend != null ? fmt(b.projectedSpend) : '—'}</T>
        </Card>
        <Card style={{ flex: 1, padding: S.md, gap: 2 }}>
          <T variant="small">Week {b.week.index} left</T>
          <T variant="num" style={{ color: b.week.remaining < 0 ? c.expense : c.fg }}>{fmt(b.week.remaining)}</T>
        </Card>
      </View>

      <Card style={{ gap: S.md }}>
        <T variant="h2">{closed ? 'How this month added up' : b.status === 'UPCOMING' ? 'How this month will work' : 'How today’s number works'}</T>
        {explain(b, fmt).map((step, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: S.sm }}>
            <Text style={s.stepNo}>{i + 1}</Text>
            <T style={{ flex: 1, fontSize: 14, lineHeight: 20, color: c.fg2 }}>{step}</T>
          </View>
        ))}
      </Card>

      <Card style={{ gap: S.md }}>
        <T variant="h2">Day by day</T>
        <Calendar b={b} fmt={fmt} />
      </Card>
    </>
  );
}

/** One-tap switch between the three modes, each previewing today's number under it. */
function ModeSwitch({ b, fmt, month }: { b: BudgetStatus; fmt: (n: number) => string; month: string }) {
  const { c } = useTheme();
  const s = useStyles(make);
  const save = useSaveBudget(month);
  const [pending, setPending] = useState<BudgetMode | null>(null);
  const closed = b.daysRemaining === 0;
  const upcoming = b.status === 'UPCOMING';
  const byMode = new Map((b.modes ?? []).map((m) => [m.mode, m]));
  const pick = (mode: BudgetMode) => {
    if (mode === b.mode || save.isPending) return;
    setPending(mode);
    save.mutate({ limit: b.limit, mode, excludedCategories: b.excludedCategories }, { onSettled: () => setPending(null) });
  };
  const short = { ADAPTIVE_DAILY: 'Adaptive', FIXED_DAILY: 'Fixed', WEEKLY: 'Weekly' } as const;

  return (
    <View style={{ gap: S.xs }}>
      <T variant="label">Pace my budget</T>
      <View style={s.switch} accessibilityRole="radiogroup">
        {BUDGET_MODES.map((m) => {
          const active = m === b.mode;
          const o = byMode.get(m);
          const value = !o ? null : m === 'WEEKLY' ? o.weekRemaining : upcoming ? o.todayAllowance : o.todayRemaining;
          return (
            <Pressable
              key={m}
              onPress={() => pick(m)}
              accessibilityRole="radio"
              accessibilityState={{ checked: active, busy: pending === m }}
              style={[s.seg, active && s.segActive]}>
              <Text style={{ color: active ? c.fg : c.fg2, fontFamily: active ? F.uiSemibold : F.uiMedium, fontSize: 13 }}>{short[m]}</Text>
              {!closed && value != null && (
                <Text style={{ color: value < 0 ? c.expense : active ? c.brand : c.muted, fontFamily: F.uiSemibold, fontSize: 12, marginTop: 2 }} numberOfLines={1} adjustsFontSizeToFit>
                  {pending === m ? 'Switching…' : fmt(Math.abs(value))}
                </Text>
              )}
              <Text style={{ color: c.subtle, fontFamily: F.ui, fontSize: 10, marginTop: 1 }}>{m === 'WEEKLY' ? (value != null && value < 0 ? 'over this week' : 'this week') : upcoming ? 'per day' : 'today'}</Text>
            </Pressable>
          );
        })}
      </View>
      <T variant="small">{MODE_META[b.mode].short} · tap to switch</T>
      <ErrorNote message={save.error?.message} />
    </View>
  );
}

function Calendar({ b, fmt }: { b: BudgetStatus; fmt: (n: number) => string }) {
  const { c } = useTheme();
  const s = useStyles(make);
  const color = { UNDER: c.income, NEAR: c.warn, OVER: c.expense, TODAY: c.fg, FUTURE: c.line } as const;
  const [sel, setSel] = useState<number | null>(null);
  const lead = (new Date(b.days[0].date + 'T00:00:00').getDay() + 6) % 7;
  const cells: (number | null)[] = [...Array(lead).fill(null), ...b.days.map((_, i) => i)];
  const picked = sel != null ? b.days[sel] : null;
  return (
    <View style={{ gap: S.sm }}>
      <View style={s.grid}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <Text key={i} style={[s.cell, s.weekday]}>{d}</Text>
        ))}
        {cells.map((i, k) =>
          i == null ? (
            <View key={`l${k}`} style={s.cell} />
          ) : (
            <View key={i} style={s.cell}>
              <Pressable
                onPress={() => setSel(sel === i ? null : i)}
                accessibilityLabel={`Day ${i + 1}`}
                style={[s.day, { borderColor: b.days[i].status === 'FUTURE' ? c.line : alpha(color[b.days[i].status], 0.5), backgroundColor: b.days[i].status === 'FUTURE' ? 'transparent' : alpha(color[b.days[i].status], 0.1) }, sel === i && { borderColor: c.brand, borderWidth: 2 }]}>
                <Text style={{ color: c.fg, fontSize: 12, fontFamily: b.days[i].status === 'TODAY' ? F.uiBold : F.uiMedium }}>{i + 1}</Text>
              </Pressable>
            </View>
          ),
        )}
      </View>
      <T variant="small" style={{ textAlign: 'center' }}>
        {picked ? `Day ${sel! + 1}: ${picked.status === 'FUTURE' ? `allowance ${fmt(picked.allowance)}` : `${fmt(picked.spent)} of ${fmt(picked.allowance)}`}` : 'Tap a day · green under · amber close · red over'}
      </T>
    </View>
  );
}

function BudgetEditor({ month, current, onDone, canCancel }: { month: string; current: BudgetStatus; onDone: () => void; canCancel: boolean }) {
  const { c } = useTheme();
  const s = useStyles(make);
  const save = useSaveBudget(month);
  const [limit, setLimit] = useState(current.configured ? String(current.limit) : '');
  const [mode, setMode] = useState<BudgetMode>(current.configured ? current.mode : 'ADAPTIVE_DAILY');
  const [excluded, setExcluded] = useState<ExpenseCategory[]>(current.configured ? current.excludedCategories : ['RENT', 'EMI']);

  return (
    <Card glow={!current.configured} style={{ gap: S.lg }}>
      <View style={{ gap: S.xs }}>
        <T variant="title" style={{ fontSize: 26 }}>{current.configured ? 'Edit budget' : 'How much can you spend today?'}</T>
        <T variant="muted">Set one monthly limit. ArthOS turns it into a daily number and adjusts when real life happens.</T>
      </View>
      <Input label="Monthly spending limit" keyboardType="decimal-pad" value={limit} onChangeText={(t) => setLimit(t.replace(/[^0-9.]/g, ''))} placeholder="30000" style={{ fontSize: 22, fontFamily: F.uiSemibold }} />
      <View style={{ gap: S.sm }}>
        <T variant="label">Mode</T>
        {BUDGET_MODES.map((m) => (
          <Pressable key={m} onPress={() => setMode(m)} style={[s.mode, mode === m && { borderColor: c.brand, backgroundColor: alpha(c.brand, 0.07) }]}>
            <Text style={{ color: c.fg, fontFamily: F.uiSemibold }}>{MODE_META[m].name}{m === 'ADAPTIVE_DAILY' ? '  · Recommended' : ''}</Text>
            <Text style={{ color: c.muted, fontSize: 12, marginTop: 2, fontFamily: F.ui, lineHeight: 17 }}>{MODE_META[m].long}</Text>
          </Pressable>
        ))}
      </View>
      <View style={{ gap: S.sm }}>
        <T variant="label">Don&apos;t count these fixed costs</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm }}>
          {EXPENSE_CATEGORIES.map((cat) => (
            <Chip key={cat} label={label(cat)} active={excluded.includes(cat)} onPress={() => setExcluded((xs) => (xs.includes(cat) ? xs.filter((x) => x !== cat) : [...xs, cat]))} />
          ))}
        </View>
      </View>
      <ErrorNote message={save.error?.message} />
      <Button
        title={current.configured ? 'Save budget' : 'Start budgeting'}
        size="lg"
        disabled={!(Number(limit) >= 1)}
        loading={save.isPending}
        onPress={() => save.mutate({ limit: Number(limit), mode, excludedCategories: excluded }, { onSuccess: onDone })}
      />
      {canCancel && <Button title="Cancel" variant="ghost" onPress={onDone} />}
    </Card>
  );
}

const make = (c: Palette) =>
  StyleSheet.create({
    warn: { borderWidth: 1, borderColor: alpha(c.expense, 0.3), backgroundColor: alpha(c.expense, 0.08), borderRadius: R.md, padding: S.md },
    track: { height: 8, borderRadius: R.pill, backgroundColor: alpha(c.fg, 0.06), overflow: 'hidden', marginTop: S.sm },
    marker: { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: c.fg },
    stepNo: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: c.lineStrong, color: c.muted, fontSize: 11, textAlign: 'center', lineHeight: 20, fontFamily: F.mono },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    switch: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: R.lg, borderWidth: 1, borderColor: c.line, backgroundColor: alpha(c.fg, 0.02) },
    seg: { flex: 1, alignItems: 'center', paddingVertical: S.sm, paddingHorizontal: 4, borderRadius: R.md, borderWidth: 1, borderColor: 'transparent' },
    segActive: { backgroundColor: c.surface, borderColor: alpha(c.brand, 0.45) },
    cell: { width: `${100 / 7}%`, aspectRatio: 1, padding: 2 },
    weekday: { color: c.subtle, fontSize: 11, textAlign: 'center', aspectRatio: undefined, paddingVertical: 4, fontFamily: F.uiMedium },
    day: { flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: R.sm },
    mode: { borderWidth: 1, borderColor: c.lineStrong, borderRadius: R.md, padding: S.md },
  });
