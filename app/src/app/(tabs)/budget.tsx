import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MonthPicker } from '@/components/month-picker';
import { Screen } from '@/components/screen';
import { Button, Card, Chip, ErrorNote, Input, Loading, T } from '@/components/ui';
import { C, R, S } from '@/constants/theme';
import { useAuth } from '@/lib/auth-store';
import { explain, MODE_META, STATUS_META, warningFor, type Tone } from '@/lib/budget-meta';
import { label, money, monthLabel } from '@/lib/format';
import { useBudget, useSaveBudget } from '@/lib/queries';
import { BUDGET_MODES, EXPENSE_CATEGORIES, type BudgetMode, type BudgetStatus, type ExpenseCategory } from '@/lib/types';
import { useMonth } from '@/lib/ui-store';

const TONE: Record<Tone, string> = { income: C.income, gold: C.warn, expense: C.expense, neutral: C.muted, info: C.info };
const DAY_COLOR = { UNDER: C.income, NEAR: C.warn, OVER: C.expense, TODAY: C.fg, FUTURE: C.border } as const;

export default function BudgetTab() {
  const month = useMonth();
  const cur = useAuth((s) => s.user?.currency ?? 'INR');
  const fmt = (n: number) => money(n, cur);
  const { data: b, isLoading, error, refetch, isRefetching } = useBudget(month);
  const [editing, setEditing] = useState(false);

  return (
    <Screen refreshing={isRefetching} onRefresh={refetch}>
      <T variant="title">Budget</T>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <MonthPicker />
        {b?.configured && !editing && <Button title="Edit" variant="outline" onPress={() => setEditing(true)} />}
      </View>

      {isLoading ? (
        <Loading />
      ) : error ? (
        <ErrorNote message={error.message} />
      ) : !b ? null : editing || !b.configured ? (
        <BudgetEditor month={month} current={b} onDone={() => setEditing(false)} canCancel={b.configured} />
      ) : (
        <BudgetView b={b} fmt={fmt} />
      )}
    </Screen>
  );
}

function BudgetView({ b, fmt }: { b: BudgetStatus; fmt: (n: number) => string }) {
  const st = STATUS_META[b.status];
  const warn = warningFor(b, fmt);
  const closed = b.daysRemaining === 0;
  const used = Math.min(100, b.usedPct ?? 0);

  return (
    <>
      {b.inherited && b.inheritedFrom && <T variant="small">Carried over from {monthLabel(b.inheritedFrom)}</T>}
      {warn && (
        <View style={[styles.warn, b.status === 'CAUTION' && { borderColor: C.warn + '55', backgroundColor: C.warn + '14' }]}>
          <Text style={{ color: b.status === 'CAUTION' ? C.fg : C.expense, fontSize: 13 }}>{warn}</Text>
        </View>
      )}

      <Card style={{ gap: S.sm, backgroundColor: C.surface2 }}>
        <View style={{ flexDirection: 'row', gap: S.sm, flexWrap: 'wrap' }}>
          <Text style={[styles.pill, { color: TONE[st.tone], borderColor: TONE[st.tone] + '55' }]}>{st.label}</Text>
          <Text style={[styles.pill, { color: C.muted, borderColor: C.border }]}>{MODE_META[b.mode].name}</Text>
        </View>
        <T variant="muted">{closed ? (b.remainingMonth >= 0 ? 'Finished under budget by' : 'Finished over budget by') : b.status === 'UPCOMING' ? 'Daily allowance from day 1' : 'Safe to spend today'}</T>
        <T variant="big" style={!closed && b.todayRemaining === 0 && b.status !== 'UPCOMING' ? { color: C.expense } : null}>
          {closed ? fmt(Math.abs(b.remainingMonth)) : fmt(b.status === 'UPCOMING' ? b.todayAllowance : b.todayRemaining)}
        </T>
        {!closed && b.status !== 'UPCOMING' && <T variant="small">{fmt(b.spentToday)} spent of today&apos;s {fmt(b.todayAllowance)}</T>}
        <View style={styles.track}>
          <View style={{ height: 8, width: `${used}%`, backgroundColor: used >= 100 ? C.expense : used >= 80 ? C.warn : C.income, borderRadius: R.pill }} />
          {!closed && <View style={[styles.marker, { left: `${b.elapsedPct}%` }]} />}
        </View>
        <T variant="small">
          {fmt(b.spentMonth)} of {fmt(b.limit)} used · {fmt(b.remainingMonth)} left
        </T>
      </Card>

      <View style={{ flexDirection: 'row', gap: S.md }}>
        <Card style={{ flex: 1, padding: S.md, gap: 2 }}>
          <T variant="small">Projected month-end</T>
          <T style={{ fontSize: 17, fontWeight: '700', color: b.projectedSpend != null && b.projectedSpend > b.limit ? C.expense : C.income }}>
            {b.projectedSpend != null ? fmt(b.projectedSpend) : '—'}
          </T>
        </Card>
        <Card style={{ flex: 1, padding: S.md, gap: 2 }}>
          <T variant="small">Week {b.week.index} left</T>
          <T style={{ fontSize: 17, fontWeight: '700', color: b.week.remaining < 0 ? C.expense : C.fg }}>{fmt(b.week.remaining)}</T>
        </Card>
      </View>

      <Card style={{ gap: S.md }}>
        <T variant="h2">How today&apos;s number works</T>
        {explain(b, fmt).map((s, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: S.sm }}>
            <Text style={styles.stepNo}>{i + 1}</Text>
            <T style={{ flex: 1, fontSize: 14, lineHeight: 20 }}>{s}</T>
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

function Calendar({ b, fmt }: { b: BudgetStatus; fmt: (n: number) => string }) {
  const [sel, setSel] = useState<number | null>(null);
  const lead = (new Date(b.days[0].date + 'T00:00:00').getDay() + 6) % 7;
  const cells: (number | null)[] = [...Array(lead).fill(null), ...b.days.map((_, i) => i)];
  const picked = sel != null ? b.days[sel] : null;
  return (
    <View style={{ gap: S.sm }}>
      <View style={styles.grid}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <Text key={i} style={[styles.cell, styles.weekday]}>{d}</Text>
        ))}
        {cells.map((i, k) =>
          i == null ? (
            <View key={`l${k}`} style={styles.cell} />
          ) : (
            <View key={i} style={styles.cell}>
            <Pressable onPress={() => setSel(sel === i ? null : i)} accessibilityLabel={`Day ${i + 1}`} style={[styles.day, { borderColor: DAY_COLOR[b.days[i].status] + (b.days[i].status === 'FUTURE' ? '' : '88'), backgroundColor: b.days[i].status === 'FUTURE' ? 'transparent' : DAY_COLOR[b.days[i].status] + '1a' }, sel === i && { borderColor: C.brandText, borderWidth: 2 }]}>
              <Text style={{ color: C.fg, fontSize: 12, fontWeight: b.days[i].status === 'TODAY' ? '700' : '500' }}>{i + 1}</Text>
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
  const save = useSaveBudget(month);
  const [limit, setLimit] = useState(current.configured ? String(current.limit) : '');
  const [mode, setMode] = useState<BudgetMode>(current.configured ? current.mode : 'ADAPTIVE_DAILY');
  const [excluded, setExcluded] = useState<ExpenseCategory[]>(current.configured ? current.excludedCategories : ['RENT', 'EMI']);

  return (
    <Card style={{ gap: S.lg }}>
      <View style={{ gap: S.xs }}>
        <T variant="h2">{current.configured ? 'Edit budget' : 'How much can you spend today?'}</T>
        <T variant="muted">Set one monthly limit. ArthOS turns it into a daily number and adjusts when real life happens.</T>
      </View>
      <Input label="Monthly spending limit" keyboardType="decimal-pad" value={limit} onChangeText={(t) => setLimit(t.replace(/[^0-9.]/g, ''))} placeholder="30000" style={{ fontSize: 22, fontWeight: '700' }} />
      <View style={{ gap: S.sm }}>
        <T variant="label">Mode</T>
        {BUDGET_MODES.map((m) => (
          <Pressable key={m} onPress={() => setMode(m)} style={[styles.mode, mode === m && { borderColor: C.brandText, backgroundColor: C.brand + '1f' }]}>
            <Text style={{ color: C.fg, fontWeight: '600' }}>{MODE_META[m].name}</Text>
            <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{MODE_META[m].long}</Text>
          </Pressable>
        ))}
      </View>
      <View style={{ gap: S.sm }}>
        <T variant="label">Don&apos;t count these fixed costs</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm }}>
          {EXPENSE_CATEGORIES.map((c) => (
            <Chip key={c} label={label(c)} active={excluded.includes(c)} onPress={() => setExcluded((xs) => (xs.includes(c) ? xs.filter((x) => x !== c) : [...xs, c]))} />
          ))}
        </View>
      </View>
      <ErrorNote message={save.error?.message} />
      <Button
        title={current.configured ? 'Save budget' : 'Start budgeting'}
        disabled={!(Number(limit) >= 1)}
        loading={save.isPending}
        onPress={() => save.mutate({ limit: Number(limit), mode, excludedCategories: excluded }, { onSuccess: onDone })}
      />
      {canCancel && <Button title="Cancel" variant="ghost" onPress={onDone} />}
    </Card>
  );
}

const styles = StyleSheet.create({
  warn: { borderWidth: 1, borderColor: C.expense + '55', backgroundColor: C.expense + '14', borderRadius: R.md, padding: S.md },
  pill: { fontSize: 11, borderWidth: 1, borderRadius: R.pill, paddingHorizontal: 8, paddingVertical: 2, overflow: 'hidden' },
  track: { height: 8, borderRadius: R.pill, backgroundColor: C.bg, overflow: 'hidden', marginTop: S.sm },
  marker: { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: C.fg },
  stepNo: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: C.border, color: C.muted, fontSize: 11, textAlign: 'center', lineHeight: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, padding: 2 },
  weekday: { color: C.muted, fontSize: 11, textAlign: 'center', aspectRatio: undefined, paddingVertical: 4 },
  day: { flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: R.sm },
  mode: { borderWidth: 1, borderColor: C.border, borderRadius: R.md, padding: S.md },
});
