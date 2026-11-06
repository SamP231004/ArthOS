import { router } from 'expo-router';
import { useDeferredValue, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { BreakdownBar, RecurringSuggestions, SummaryGrid, TopEntries } from '@/components/ledger-ui';
import { MonthPicker } from '@/components/month-picker';
import { RecurringSuggestions as AutoRecurring } from '@/components/recurring-suggestions';
import { AppHeader } from '@/components/app-header';
import { Screen } from '@/components/screen';
import { TxRow } from '@/components/tx-row';
import { Button, Card, ErrorNote, Loading, T } from '@/components/ui';
import { useAuth } from '@/lib/auth-store';
import { currentMonth, dayLabel, label, money, shiftMonth, todayISO } from '@/lib/format';
import { pctChange, sameDayIn, tagColor } from '@/lib/ledger';
import { useExpenses, useSaveExpense } from '@/lib/queries';
import { EXPENSE_CATEGORIES, type Expense, type ExpenseCategory } from '@/lib/types';
import { useMonth } from '@/lib/ui-store';
import { alpha, F, R, S, useTheme } from '@/theme';

type SortKey = 'date' | 'amount';
const name = (e: Expense) => e.merchant ?? label(e.category);

export default function ExpensesTab() {
  const { c } = useTheme();
  const month = useMonth();
  const cur = useAuth((s) => s.user?.currency ?? 'INR');
  const fmt = (n: number) => money(n, cur);
  const [category, setCategory] = useState<ExpenseCategory | undefined>();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('date');
  const [pending, setPending] = useState<string | undefined>();
  const q = useDeferredValue(search.trim().toLowerCase());
  // one unfiltered fetch per month: filtering is client-side so the summary always describes the whole month
  const { data, isLoading, error, refetch, isRefetching } = useExpenses(month);
  const prev = useExpenses(shiftMonth(month, -1));
  const save = useSaveExpense();

  const all = data ?? [];
  const total = all.reduce((a, e) => a + e.amount, 0);
  const prevTotal = (prev.data ?? []).reduce((a, e) => a + e.amount, 0);
  const change = pctChange(total, prevTotal);
  const activeDays = new Set(all.map((e) => e.date)).size;
  const parts = EXPENSE_CATEGORIES.map((k) => ({ key: k, label: label(k), amount: all.filter((e) => e.category === k).reduce((a, e) => a + e.amount, 0), color: tagColor(c, 'EXPENSE', k) }))
    .filter((p) => p.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  const top = parts[0];

  const rows = all
    .filter((e) => (!category || e.category === category) && (!q || name(e).toLowerCase().includes(q) || (e.note ?? '').toLowerCase().includes(q)))
    .sort((a, b) => (sort === 'amount' ? b.amount - a.amount : b.date.localeCompare(a.date)));
  const shown = rows.reduce((a, e) => a + e.amount, 0);
  const groups = new Map<string, Expense[]>();
  if (sort === 'date') for (const e of rows) groups.set(e.date, [...(groups.get(e.date) ?? []), e]);

  const missing =
    month === currentMonth()
      ? (prev.data ?? []).filter((p) => p.recurring && !all.some((e) => name(e).toLowerCase() === name(p).toLowerCase() && e.category === p.category))
      : [];
  const addAgain = (id: string) => {
    const p = missing.find((x) => x.id === id);
    if (!p) return;
    setPending(id);
    save.mutate(
      { input: { amount: p.amount, category: p.category, merchant: p.merchant, paymentSource: p.paymentSource, date: sameDayIn(month, p.date, todayISO()), note: p.note, recurring: true } },
      { onSettled: () => setPending(undefined) },
    );
  };

  const row = (e: Expense, n: number, list: Expense[]) => (
    <TxRow
      key={e.id}
      last={n === list.length - 1}
      kind="EXPENSE"
      title={name(e)}
      subtitle={`${label(e.category)} · ${label(e.paymentSource)}${sort === 'amount' ? ` · ${dayLabel(e.date)}` : ''}${e.note ? ` · ${e.note}` : ''}`}
      amount={fmt(e.amount)}
      badge={e.recurring ? 'Recurring' : undefined}
      color={tagColor(c, 'EXPENSE', e.category)}
      onPress={() => router.push(`/expense-form?id=${e.id}`)}
    />
  );

  return (
    <Screen refreshing={isRefetching} onRefresh={refetch}>
      <AppHeader />
      <View>
        <T variant="title">Expenses</T>
        <T variant="muted">Everything going out this month.</T>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <MonthPicker />
        <View style={{ flexDirection: 'row', gap: S.sm }}>
          <Button title="Scan" variant="secondary" onPress={() => router.push('/scan')} />
          <Button title="+ Add" onPress={() => router.push('/expense-form')} />
        </View>
      </View>

      <SummaryGrid
        cells={[
          { k: 'Spent', v: fmt(total), color: c.expense, sub: `${all.length} transactions` },
          { k: 'Per active day', v: activeDays ? fmt(Math.round(total / activeDays)) : '—', sub: `${activeDays} ${activeDays === 1 ? 'day' : 'days'} with spending` },
          { k: 'Top category', v: top ? fmt(top.amount) : '—', sub: top ? `${top.label} · ${Math.round((top.amount / total) * 100)}%` : 'No spending yet' },
          // spending more than last month is the bad direction, so ▲ is red here
          { k: 'Last month', v: prevTotal ? fmt(prevTotal) : '—', pill: change ? { text: change.text, color: change.up ? c.expense : c.income } : undefined, sub: change ? undefined : 'No data' },
        ]}
      />

      <AutoRecurring kind="EXPENSE" currency={cur} />
      <RecurringSuggestions items={missing.map((p) => ({ id: p.id, title: name(p), amount: fmt(p.amount) }))} onAdd={addAgain} pendingId={pending} />
      <ErrorNote message={save.error?.message} />

      <BreakdownBar parts={parts} total={total} active={category} onPick={setCategory} fmt={fmt} />

      <TopEntries
        title="Top 3 expenses"
        items={[...all]
          .sort((x, y) => y.amount - x.amount)
          .slice(0, 3)
          .map((e) => ({ id: e.id, name: name(e), meta: `${label(e.category)} · ${dayLabel(e.date)}`, amount: `−${fmt(e.amount)}`, color: tagColor(c, 'EXPENSE', e.category), onPress: () => router.push(`/expense-form?id=${e.id}`) }))}
      />

      <TextInput
        placeholder="⌕  Search merchant or note…"
        placeholderTextColor={c.subtle}
        value={search}
        onChangeText={setSearch}
        style={{ borderWidth: 1, borderColor: c.lineStrong, backgroundColor: c.field, color: c.fg, borderRadius: R.md, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, fontFamily: F.ui }}
      />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <T variant="small">
          {rows.length} shown · <Text style={{ color: c.fg, fontFamily: F.uiSemibold }}>{fmt(shown)}</Text>
        </T>
        <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: c.line, borderRadius: R.md, padding: 2 }}>
          {(['date', 'amount'] as SortKey[]).map((k) => (
            <Pressable key={k} onPress={() => setSort(k)} style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: R.sm, backgroundColor: sort === k ? alpha(c.fg, 0.08) : 'transparent' }}>
              <Text style={{ color: sort === k ? c.fg : c.muted, fontSize: 12, fontFamily: F.uiMedium }}>{k === 'date' ? 'Latest' : 'Largest'}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {isLoading ? (
        <Loading />
      ) : error ? (
        <ErrorNote message={error.message} />
      ) : !rows.length ? (
        <T variant="muted" style={{ textAlign: 'center', marginTop: S.xl }}>{q || category ? 'No expenses match these filters.' : 'No expenses logged for this month.'}</T>
      ) : sort === 'amount' ? (
        <Card style={{ padding: 0 }}>{rows.map(row)}</Card>
      ) : (
        [...groups.entries()].map(([date, items]) => (
          <View key={date} style={{ gap: S.sm }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <T variant="label">{dayLabel(date)}</T>
              <T variant="small" style={{ fontVariant: ['tabular-nums'] }}>{fmt(items.reduce((a, e) => a + e.amount, 0))}</T>
            </View>
            <Card style={{ padding: 0 }}>{items.map(row)}</Card>
          </View>
        ))
      )}
    </Screen>
  );
}
