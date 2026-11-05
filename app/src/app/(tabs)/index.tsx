import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { MonthPicker } from '@/components/month-picker';
import { Screen } from '@/components/screen';
import { TxRow } from '@/components/tx-row';
import { Button, Card, ErrorNote, Loading, T } from '@/components/ui';
import { C, R, S } from '@/constants/theme';
import { useAuth } from '@/lib/auth-store';
import { dayLabel, label, money } from '@/lib/format';
import { useSummary } from '@/lib/queries';
import type { MonthSummary } from '@/lib/types';
import { useMonth } from '@/lib/ui-store';

export default function Home() {
  const month = useMonth();
  const name = useAuth((s) => s.user?.name.split(' ')[0]);
  const { data, isLoading, error, refetch, isRefetching } = useSummary(month);

  return (
    <Screen refreshing={isRefetching} onRefresh={refetch}>
      <View style={{ gap: 2 }}>
        <T variant="muted">Namaste, {name}</T>
        <T variant="title">Your month at a glance</T>
      </View>
      <MonthPicker />

      {isLoading ? <Loading /> : error ? <ErrorNote message={error.message} /> : data ? <Summary s={data} /> : null}
    </Screen>
  );
}

function Summary({ s }: { s: MonthSummary }) {
  const cur = s.currency;
  const spentPct = s.totalIncome > 0 ? Math.min(100, (s.totalExpense / s.totalIncome) * 100) : s.totalExpense > 0 ? 100 : 0;
  const barColor = spentPct >= 90 ? C.expense : spentPct >= 70 ? C.brand : C.income;
  const empty = s.incomeCount === 0 && s.expenseCount === 0;

  return (
    <>
      <Card style={{ gap: S.sm, backgroundColor: C.surface2 }}>
        <T variant="muted">Remaining this month</T>
        <T variant="big" style={s.net < 0 && { color: C.expense }}>{money(s.net, cur)}</T>
        <T variant="muted">{insight(s)}</T>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${spentPct}%`, backgroundColor: barColor }]} />
        </View>
        <T variant="small">{spentPct.toFixed(0)}% of income spent · Budgets arrive in Phase 2</T>
      </Card>

      {/* One-tap quick add */}
      <View style={{ flexDirection: 'row', gap: S.md }}>
        <Button title="+ Income" variant="outline" style={{ flex: 1 }} onPress={() => router.push('/income-form')} />
        <Button title="+ Expense" style={{ flex: 1 }} onPress={() => router.push('/expense-form')} />
      </View>

      <View style={styles.grid}>
        <Stat label="Income" value={money(s.totalIncome, cur)} color={C.income} sub={s.incomeTargetProgress != null ? `${s.incomeTargetProgress}% of target` : `${s.incomeCount} entries`} />
        <Stat label="Spent" value={money(s.totalExpense, cur)} color={C.expense} sub={`${s.expenseCount} entries`} />
        <Stat label="Spent today" value={money(s.todayExpense, cur)} sub={`Avg ${money(s.averageDailyExpense, cur)}/day`} />
        <Stat label="Savings rate" value={s.savingsRate != null ? `${s.savingsRate}%` : '—'} sub="of income kept" />
      </View>

      {empty ? (
        <Card style={{ alignItems: 'center', gap: S.sm, paddingVertical: S.xxl }}>
          <T variant="h2">Nothing logged yet</T>
          <T variant="muted" style={{ textAlign: 'center' }}>Add your salary or first expense and ArthOS will build your monthly picture.</T>
        </Card>
      ) : (
        <>
          {s.expenseByCategory.length > 0 && (
            <Card style={{ gap: S.md }}>
              <T variant="h2">Where money went</T>
              {s.expenseByCategory.slice(0, 5).map((c) => (
                <View key={c.category} style={{ gap: 6 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <T>{label(c.category)}</T>
                    <T variant="muted">{money(c.amount, cur)} · {c.share}%</T>
                  </View>
                  <View style={[styles.track, { height: 6 }]}>
                    <View style={[styles.fill, { height: 6, width: `${c.share}%`, backgroundColor: C.expense + 'cc' }]} />
                  </View>
                </View>
              ))}
            </Card>
          )}
          <Card style={{ padding: 0, paddingTop: S.lg }}>
            <T variant="h2" style={{ paddingHorizontal: S.lg, marginBottom: S.xs }}>Recent activity</T>
            {s.recent.map((r) => (
              <TxRow
                key={`${r.kind}-${r.id}`}
                kind={r.kind}
                title={r.label}
                subtitle={`${label(r.tag)} · ${dayLabel(r.date)}`}
                amount={money(r.amount, cur)}
                onPress={() => router.push(r.kind === 'INCOME' ? `/income-form?id=${r.id}` : `/expense-form?id=${r.id}`)}
              />
            ))}
          </Card>
        </>
      )}
    </>
  );
}

function insight(s: MonthSummary): string {
  if (s.incomeCount === 0 && s.expenseCount === 0) return 'Start logging to see where your month stands.';
  if (s.totalIncome === 0) return 'No income recorded yet — add your salary to see what remains.';
  if (s.net < 0) return "You've spent more than you've earned this month.";
  const top = s.expenseByCategory[0];
  if (top && top.share >= 40) return `${label(top.category)} is ${top.share}% of your spending.`;
  return `You've kept ${s.savingsRate ?? 0}% of this month's income so far.`;
}

function Stat({ label, value, sub, color }: { label: string; value: string; sub: string; color?: string }) {
  return (
    <Card style={styles.stat}>
      <T variant="small">{label}</T>
      <T style={[{ fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'] }, color ? { color } : null]}>{value}</T>
      <T variant="small">{sub}</T>
    </Card>
  );
}

const styles = StyleSheet.create({
  track: { height: 8, borderRadius: R.pill, backgroundColor: C.bg, overflow: 'hidden' },
  fill: { height: 8, borderRadius: R.pill },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: S.md },
  stat: { flexBasis: '47%', flexGrow: 1, gap: 4, padding: S.md },
});
