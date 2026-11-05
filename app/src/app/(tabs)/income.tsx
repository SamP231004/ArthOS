import { router } from 'expo-router';
import { View } from 'react-native';

import { MonthPicker } from '@/components/month-picker';
import { Screen } from '@/components/screen';
import { TxRow } from '@/components/tx-row';
import { Button, Card, ErrorNote, Loading, T } from '@/components/ui';
import { useAuth } from '@/lib/auth-store';
import { dayLabel, label, money } from '@/lib/format';
import { useIncomes } from '@/lib/queries';
import { useMonth } from '@/lib/ui-store';
import { alpha, R, S, useTheme } from '@/theme';

export default function IncomeTab() {
  const { c } = useTheme();
  const month = useMonth();
  const user = useAuth((s) => s.user);
  const cur = user?.currency ?? 'INR';
  const { data, isLoading, error, refetch, isRefetching } = useIncomes(month);
  const total = (data ?? []).reduce((a, i) => a + i.amount, 0);
  const target = user?.monthlyIncomeTarget;
  const pct = target ? Math.min(100, (total / target) * 100) : null;

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

      <Card glow style={{ gap: S.xs }}>
        <T variant="muted">↙ Received this month</T>
        <T variant="big" style={{ color: c.income }}>{money(total, cur)}</T>
        {pct != null ? (
          <>
            <View style={{ height: 8, borderRadius: R.pill, backgroundColor: alpha(c.fg, 0.06), overflow: 'hidden', marginTop: S.sm }}>
              <View style={{ height: 8, width: `${pct}%`, backgroundColor: c.income, borderRadius: R.pill }} />
            </View>
            <T variant="small">{pct.toFixed(0)}% of your {money(target, cur)} target</T>
          </>
        ) : (
          <T variant="small">Set a monthly target in Settings to track progress</T>
        )}
      </Card>

      {isLoading ? (
        <Loading />
      ) : error ? (
        <ErrorNote message={error.message} />
      ) : !data?.length ? (
        <T variant="muted" style={{ textAlign: 'center', marginTop: S.xl }}>No income logged for this month.</T>
      ) : (
        <Card style={{ padding: 0 }}>
          {data.map((i) => (
            <TxRow
              key={i.id}
              kind="INCOME"
              title={i.source}
              subtitle={`${label(i.type)} · ${dayLabel(i.date)}${i.note ? ` · ${i.note}` : ''}`}
              amount={money(i.amount, cur)}
              badge={i.recurring ? 'Monthly' : undefined}
              onPress={() => router.push(`/income-form?id=${i.id}`)}
            />
          ))}
        </Card>
      )}
    </Screen>
  );
}
