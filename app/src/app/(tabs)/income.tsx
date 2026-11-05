import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { BreakdownBar, RecurringSuggestions, SummaryGrid } from '@/components/ledger-ui';
import { MonthPicker } from '@/components/month-picker';
import { Screen } from '@/components/screen';
import { TxRow } from '@/components/tx-row';
import { Button, Card, ErrorNote, Loading, T } from '@/components/ui';
import { useAuth } from '@/lib/auth-store';
import { currentMonth, dayLabel, label, money, shiftMonth, todayISO } from '@/lib/format';
import { pctChange, sameDayIn, tagColor } from '@/lib/ledger';
import { useIncomes, useSaveIncome } from '@/lib/queries';
import { ruleLabel, setAside } from '@/lib/savings';
import { INCOME_TYPES, type IncomeType } from '@/lib/types';
import { useMonth } from '@/lib/ui-store';
import { S, useTheme } from '@/theme';

export default function IncomeTab() {
  const { c } = useTheme();
  const month = useMonth();
  const user = useAuth((s) => s.user);
  const cur = user?.currency ?? 'INR';
  const fmt = (n: number) => money(n, cur);
  const { data, isLoading, error, refetch, isRefetching } = useIncomes(month);
  const prev = useIncomes(shiftMonth(month, -1));
  const save = useSaveIncome();
  const [type, setType] = useState<IncomeType | undefined>();
  const [pending, setPending] = useState<string | undefined>();

  const all = data ?? [];
  const total = all.reduce((a, i) => a + i.amount, 0);
  const prevTotal = (prev.data ?? []).reduce((a, i) => a + i.amount, 0);
  const change = pctChange(total, prevTotal);
  const rule = { mode: user?.savingsMode ?? 'PERCENT', value: user?.savingsValue ?? 20 } as const;
  const saved = setAside(rule, total);
  const parts = INCOME_TYPES.map((t) => ({ key: t, label: label(t), amount: all.filter((i) => i.type === t).reduce((a, i) => a + i.amount, 0), color: tagColor(c, 'INCOME', t) })).filter((p) => p.amount > 0);
  const rows = type ? all.filter((i) => i.type === type) : all;

  // last month's recurring income that hasn't been logged yet (current month only)
  const missing =
    month === currentMonth()
      ? (prev.data ?? []).filter((p) => p.recurring && !all.some((i) => i.source.toLowerCase() === p.source.toLowerCase() && i.type === p.type))
      : [];
  const addAgain = (id: string) => {
    const p = missing.find((x) => x.id === id);
    if (!p) return;
    setPending(id);
    save.mutate(
      { input: { amount: p.amount, source: p.source, type: p.type, date: sameDayIn(month, p.date, todayISO()), note: p.note, recurring: true } },
      { onSettled: () => setPending(undefined) },
    );
  };

  return (
    <Screen refreshing={isRefetching} onRefresh={refetch}>
      <View>
        <T variant="title">Income</T>
        <T variant="muted">Everything coming in this month.</T>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <MonthPicker />
        <Button title="+ Add" onPress={() => router.push('/income-form')} />
      </View>

      <SummaryGrid
        cells={[
          { k: 'Received', v: fmt(total), color: c.income, sub: `${all.length} ${all.length === 1 ? 'entry' : 'entries'}` },
          { k: 'Saved first', v: fmt(saved), color: c.brand, sub: ruleLabel(rule, fmt) },
          { k: 'To spend', v: fmt(total - saved), sub: 'after saving first' },
          { k: 'Last month', v: prevTotal ? fmt(prevTotal) : '—', pill: change ? { text: change.text, color: change.up ? c.income : c.expense } : undefined, sub: change ? undefined : 'No data' },
        ]}
      />

      <RecurringSuggestions items={missing.map((p) => ({ id: p.id, title: p.source, amount: fmt(p.amount) }))} onAdd={addAgain} pendingId={pending} />
      <ErrorNote message={save.error?.message} />

      <BreakdownBar parts={parts} total={total} active={type} onPick={setType} fmt={fmt} />

      {isLoading ? (
        <Loading />
      ) : error ? (
        <ErrorNote message={error.message} />
      ) : !rows.length ? (
        <T variant="muted" style={{ textAlign: 'center', marginTop: S.xl }}>{type ? `No ${label(type).toLowerCase()} income this month.` : 'No income logged for this month.'}</T>
      ) : (
        <Card style={{ padding: 0 }}>
          {rows.map((i) => (
            <TxRow
              key={i.id}
              kind="INCOME"
              title={i.source}
              subtitle={`${label(i.type)} · ${dayLabel(i.date)}${i.note ? ` · ${i.note}` : ''}`}
              amount={fmt(i.amount)}
              badge={i.recurring ? 'Monthly' : undefined}
              color={tagColor(c, 'INCOME', i.type)}
              onPress={() => router.push(`/income-form?id=${i.id}`)}
            />
          ))}
        </Card>
      )}
    </Screen>
  );
}
