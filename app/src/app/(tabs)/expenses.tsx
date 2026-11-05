import { router } from 'expo-router';
import { useDeferredValue, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';

import { MonthPicker } from '@/components/month-picker';
import { Screen } from '@/components/screen';
import { TxRow } from '@/components/tx-row';
import { Button, Card, Chip, ErrorNote, Loading, T } from '@/components/ui';
import { useAuth } from '@/lib/auth-store';
import { dayLabel, label, money } from '@/lib/format';
import { useExpenses } from '@/lib/queries';
import { EXPENSE_CATEGORIES, type Expense } from '@/lib/types';
import { useMonth } from '@/lib/ui-store';
import { F, R, S, useTheme } from '@/theme';

export default function ExpensesTab() {
  const { c } = useTheme();
  const month = useMonth();
  const cur = useAuth((s) => s.user?.currency ?? 'INR');
  const [category, setCategory] = useState<string | undefined>();
  const [search, setSearch] = useState('');
  const q = useDeferredValue(search.trim());
  const { data, isLoading, error, refetch, isRefetching } = useExpenses(month, { category, q: q || undefined });
  const total = (data ?? []).reduce((a, e) => a + e.amount, 0);

  const groups = new Map<string, Expense[]>();
  for (const e of data ?? []) groups.set(e.date, [...(groups.get(e.date) ?? []), e]);

  return (
    <Screen refreshing={isRefetching} onRefresh={refetch}>
      <View>
        <T variant="title">Expenses</T>
        <T variant="muted">Everything going out this month.</T>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <MonthPicker />
        <Button title="+ Add" onPress={() => router.push('/expense-form')} />
      </View>

      <TextInput
        placeholder="⌕  Search merchant or note…"
        placeholderTextColor={c.subtle}
        value={search}
        onChangeText={setSearch}
        style={{ borderWidth: 1, borderColor: c.lineStrong, backgroundColor: c.field, color: c.fg, borderRadius: R.md, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, fontFamily: F.ui }}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S.sm }}>
        <Chip label="All" active={!category} onPress={() => setCategory(undefined)} />
        {EXPENSE_CATEGORIES.map((cat) => (
          <Chip key={cat} label={label(cat)} active={category === cat} onPress={() => setCategory(category === cat ? undefined : cat)} />
        ))}
      </ScrollView>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <T variant="small">{data?.length ?? 0} transactions</T>
        <T variant="num">{money(total, cur)}</T>
      </View>

      {isLoading ? (
        <Loading />
      ) : error ? (
        <ErrorNote message={error.message} />
      ) : !data?.length ? (
        <T variant="muted" style={{ textAlign: 'center', marginTop: S.xl }}>{q || category ? 'No expenses match these filters.' : 'No expenses logged for this month.'}</T>
      ) : (
        [...groups.entries()].map(([date, items]) => (
          <View key={date} style={{ gap: S.sm }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <T variant="label">{dayLabel(date)}</T>
              <T variant="small" style={{ fontVariant: ['tabular-nums'] }}>{money(items.reduce((a, e) => a + e.amount, 0), cur)}</T>
            </View>
            <Card style={{ padding: 0 }}>
              {items.map((e) => (
                <TxRow
                  key={e.id}
                  kind="EXPENSE"
                  title={e.merchant ?? label(e.category)}
                  subtitle={`${label(e.category)} · ${label(e.paymentSource)}${e.note ? ` · ${e.note}` : ''}`}
                  amount={money(e.amount, cur)}
                  badge={e.recurring ? 'Recurring' : undefined}
                  onPress={() => router.push(`/expense-form?id=${e.id}`)}
                />
              ))}
            </Card>
          </View>
        ))
      )}
    </Screen>
  );
}
