import { router } from 'expo-router';
import { View } from 'react-native';

import { MonthPicker } from '@/components/month-picker';
import { Screen } from '@/components/screen';
import { TxRow } from '@/components/tx-row';
import { Button, Card, ErrorNote, Loading, T } from '@/components/ui';
import { C, R, S } from '@/constants/theme';
import { useAuth } from '@/lib/auth-store';
import { dayLabel, label, money } from '@/lib/format';
import { useIncomes } from '@/lib/queries';
import { useMonth } from '@/lib/ui-store';

export default function IncomeTab() {
  const month = useMonth();
  const user = useAuth((s) => s.user);
  const cur = user?.currency ?? 'INR';
  const { data, isLoading, error, refetch, isRefetching } = useIncomes(month);
  const total = (data ?? []).reduce((a, i) => a + i.amount, 0);
  const target = user?.monthlyIncomeTarget;
  const pct = target ? Math.min(100, (total / target) * 100) : null;

  return (
    <Screen refreshing={isRefetching} onRefresh={refetch}>
      <T variant="title">Income</T>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <MonthPicker />
        <Button title="+ Add" onPress={() => router.push('/income-form')} />
      </View>

      <Card style={{ gap: S.xs }}>
        <T variant="muted">Received</T>
        <T variant="big" style={{ color: C.income, fontSize: 32 }}>{money(total, cur)}</T>
        <T variant="small">{target ? `Target ${money(target, cur)}` : 'Set a monthly target in Settings'}</T>
        {pct != null && (
          <View style={{ height: 8, borderRadius: R.pill, backgroundColor: C.bg, overflow: 'hidden', marginTop: S.sm }}>
            <View style={{ height: 8, width: `${pct}%`, backgroundColor: C.income }} />
          </View>
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
