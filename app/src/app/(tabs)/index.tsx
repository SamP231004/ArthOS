import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { Logo } from '@/components/logo';
import { MonthPicker } from '@/components/month-picker';
import { Screen } from '@/components/screen';
import { ThemeToggle } from '@/components/theme-toggle';
import { TxRow } from '@/components/tx-row';
import { Badge, Button, Card, ErrorNote, Loading, T } from '@/components/ui';
import { useAuth } from '@/lib/auth-store';
import { STATUS_META } from '@/lib/budget-meta';
import { dayLabel, label, money } from '@/lib/format';
import { CLASS_META, signedPct, toneColor } from '@/lib/invest-meta';
import { useBudget, usePortfolio, useSummary } from '@/lib/queries';
import { ruleLabel } from '@/lib/savings';
import type { MonthSummary } from '@/lib/types';
import { useMonth } from '@/lib/ui-store';
import { alpha, F, R, S, useStyles, useTheme, type Palette } from '@/theme';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export default function Home() {
  const { c } = useTheme();
  const month = useMonth();
  const user = useAuth((s) => s.user);
  const { data, isLoading, error, refetch, isRefetching } = useSummary(month);

  return (
    <Screen refreshing={isRefetching} onRefresh={refetch}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Logo size={30} />
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <ThemeToggle />
          <Pressable onPress={() => router.push('/settings')} hitSlop={8} style={{ width: 38, height: 38, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel="Settings">
            <Svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke={c.muted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <Circle cx={12} cy={12} r={3} />
            </Svg>
          </Pressable>
        </View>
      </View>

      {user?.demo && (
        <View style={{ backgroundColor: alpha(c.brand, 0.1), borderColor: alpha(c.brand, 0.3), borderWidth: 1, borderRadius: R.md, padding: S.md }}>
          <T variant="small" style={{ color: c.fg2 }}>✦ You&apos;re exploring a private demo with sample data. It resets in ~24h.</T>
        </View>
      )}

      <View>
        <T variant="muted">{greeting()},</T>
        <T variant="display">{user?.name.split(' ')[0]}</T>
      </View>
      <MonthPicker />

      {isLoading ? <Loading /> : error ? <ErrorNote message={error.message} /> : data ? <Summary s={data} /> : null}
    </Screen>
  );
}

function Summary({ s }: { s: MonthSummary }) {
  const { c } = useTheme();
  const st = useStyles(make);
  const cur = s.currency;
  const spentPct = s.spendable > 0 ? Math.min(100, (s.totalExpense / s.spendable) * 100) : s.totalExpense > 0 ? 100 : 0;
  const monthPct = (s.daysElapsed / s.daysInMonth) * 100;
  const empty = s.incomeCount === 0 && s.expenseCount === 0;
  const [whole, paise] = money(s.leftToSpend, cur).split('.');
  const dipped = s.leftToSpend < 0;
  const fmt = (n: number) => money(n, cur);

  return (
    <>
      <Card glow style={{ gap: S.sm }}>
        <T variant="muted">{dipped ? 'Spent beyond your spendable' : 'Left to spend this month'}</T>
        <Text style={[st.hero, dipped && { color: c.expense }]}>
          {whole}
          {paise ? <Text style={st.paise}>.{paise}</Text> : null}
        </Text>
        <T variant="small">After saving first · {fmt(s.totalIncome)} in − {fmt(s.savedFirst)} saved − {fmt(s.totalExpense)} spent</T>
        <FlowBar s={s} fmt={fmt} />
        <T style={{ color: c.fg2, fontSize: 14 }}>✦ {insight(s, fmt)}</T>
        <Meter label="Spendable used" value={spentPct} color={spentPct >= 90 ? c.expense : spentPct >= 70 ? c.warn : c.income} />
        <Meter label="Month elapsed" value={monthPct} color={alpha(c.fg, 0.3)} />
      </Card>

      <View style={{ flexDirection: 'row', gap: S.md }}>
        <Button title="+ Income" variant="secondary" style={{ flex: 1 }} onPress={() => router.push('/income-form')} />
        <Button title="+ Expense" style={{ flex: 1 }} onPress={() => router.push('/expense-form')} />
      </View>

      <BudgetMini month={s.month} cur={cur} />
      <PortfolioMini />

      <View style={st.grid}>
        <Stat label="Income" value={money(s.totalIncome, cur)} color={c.income} sub={`${s.incomeCount} ${s.incomeCount === 1 ? 'entry' : 'entries'}`} />
        <Stat label="Spent" value={money(s.totalExpense, cur)} color={c.expense} sub={`${s.expenseCount} transactions`} />
        <Stat label="Spent today" value={money(s.todayExpense, cur)} sub={`Avg ${money(s.averageDailyExpense, cur)}/day`} />
        <Stat
          label="Saved first"
          value={fmt(s.savedFirst)}
          color={c.brand}
          sub={s.investedThisMonth > 0 ? `${fmt(s.investedThisMonth)} invested` : ruleLabel(s.savingsRule, fmt)}
        />
      </View>

      {empty ? (
        <Card style={{ alignItems: 'center', gap: S.sm, paddingVertical: S.xxl }}>
          <T variant="title" style={{ fontSize: 24 }}>A blank page for your month</T>
          <T variant="muted" style={{ textAlign: 'center' }}>Add your salary or first expense and ArthOS will build your monthly picture.</T>
        </Card>
      ) : (
        <>
          {s.expenseByCategory.length > 0 && (
            <Card style={{ gap: S.md }}>
              <T variant="h2">Where money went</T>
              {s.expenseByCategory.slice(0, 6).map((cat, i) => {
                const col = [c.c1, c.c4, c.c2, c.c6, c.c5, c.c3][i % 6];
                return (
                  <View key={cat.category} style={{ gap: 6 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={{ width: 9, height: 9, borderRadius: 2, backgroundColor: col }} />
                        <T style={{ color: c.fg2, fontSize: 14 }}>{label(cat.category)}</T>
                      </View>
                      <T variant="small" style={{ fontVariant: ['tabular-nums'] }}>{money(cat.amount, cur)} · {cat.share}%</T>
                    </View>
                    <View style={st.track}>
                      <View style={[st.fill, { width: `${cat.share}%`, backgroundColor: col }]} />
                    </View>
                  </View>
                );
              })}
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

function BudgetMini({ month, cur }: { month: string; cur: string }) {
  const { c } = useTheme();
  const { data: b } = useBudget(month);
  if (!b) return null;
  if (!b.configured) {
    return (
      <Pressable onPress={() => router.push('/budget')}>
        <Card style={{ gap: 4 }}>
          <T variant="h2">Turn your month into one daily number</T>
          <T variant="muted">Set a budget and ArthOS tells you exactly how much is safe to spend today ›</T>
        </Card>
      </Pressable>
    );
  }
  const st = STATUS_META[b.status];
  const closed = b.daysRemaining === 0;
  const tc = st.tone === 'expense' ? c.expense : st.tone === 'income' ? c.income : st.tone === 'gold' ? c.warn : c.muted;
  return (
    <Pressable onPress={() => router.push('/budget')}>
      <Card style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ gap: 2 }}>
          <T variant="small">{closed ? 'Budget · month closed' : 'Safe to spend today'}</T>
          <T variant="num" style={{ fontSize: 26 }}>{money(closed ? Math.abs(b.remainingMonth) : b.status === 'UPCOMING' ? b.todayAllowance : b.todayRemaining, cur)}</T>
          <T variant="small">{money(b.remainingMonth, cur)} left this month</T>
        </View>
        <Badge label={`${st.label} ›`} color={tc} />
      </Card>
    </Pressable>
  );
}

function PortfolioMini() {
  const { c } = useTheme();
  const { data: p } = usePortfolio('1M');
  if (!p || p.holdings.length === 0) return null;
  const t = p.totals;
  return (
    <Pressable onPress={() => router.push('/invest')}>
      <Card style={{ gap: S.sm }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View>
            <T variant="small">Investments</T>
            <T variant="num" style={{ fontSize: 26 }}>{money(t.value, 'INR', true)}</T>
            <T variant="small" style={{ color: toneColor(c, t.gain) }}>
              {signedPct(t.gainPct)} all time · today {signedPct(t.dayChangePct)}
            </T>
          </View>
          <T variant="small" style={{ color: c.brand }}>View ›</T>
        </View>
        <View style={{ flexDirection: 'row', height: 6, borderRadius: R.pill, overflow: 'hidden', backgroundColor: alpha(c.fg, 0.06) }}>
          {p.allocation.map((a) => (
            <View key={a.assetClass} style={{ width: `${a.share ?? 0}%`, backgroundColor: CLASS_META[a.assetClass].color(c) }} />
          ))}
        </View>
      </Card>
    </Pressable>
  );
}

function Meter({ label: l, value, color }: { label: string; value: number; color: string }) {
  const st = useStyles(make);
  return (
    <View style={{ gap: 6, marginTop: S.xs }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <T variant="small">{l}</T>
        <T variant="small" style={{ fontVariant: ['tabular-nums'] }}>{value.toFixed(0)}%</T>
      </View>
      <View style={st.track}>
        <View style={[st.fill, { width: `${value}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function Stat({ label: l, value, sub, color }: { label: string; value: string; sub: string; color?: string }) {
  const st = useStyles(make);
  return (
    <Card style={st.stat}>
      <T variant="small">{l}</T>
      <T variant="num" style={color ? { color } : null}>{value}</T>
      <T variant="small">{sub}</T>
    </Card>
  );
}

function insight(s: MonthSummary, fmt: (n: number) => string): string {
  if (s.incomeCount === 0 && s.expenseCount === 0) return 'Start logging to see where your month stands.';
  if (s.totalIncome === 0) return 'No income yet. When it lands, your savings are set aside first and the rest is yours to spend.';
  if (s.net < 0) return "You've spent more than you've earned — your savings are gone and then some.";
  if (s.leftToSpend < 0) return `You've dipped ${fmt(-s.leftToSpend)} into the ${fmt(s.savedFirst)} you set aside.`;
  if (s.savedFirst > 0 && s.investedThisMonth >= s.savedFirst) return `Your ${fmt(s.savedFirst)} of savings is fully invested this month.`;
  if (s.savedFirst > 0 && s.investedThisMonth > 0) return `${fmt(s.investedThisMonth)} of your ${fmt(s.savedFirst)} savings is invested — ${fmt(s.savedFirst - s.investedThisMonth)} still to put to work.`;
  const top = s.expenseByCategory[0];
  if (top && top.share >= 40) return `Savings are safe. ${label(top.category)} is ${top.share}% of your spending.`;
  return `Savings are safe — ${fmt(s.leftToSpend)} is yours to spend, guilt-free.`;
}

/** Where income went: saved first, then spent, then left. Overspending eats into the savings slice. */
function FlowBar({ s, fmt }: { s: MonthSummary; fmt: (n: number) => string }) {
  const { c } = useTheme();
  if (s.totalIncome <= 0) return null;
  const total = Math.max(s.totalIncome, s.totalExpense);
  const dip = Math.max(0, Math.min(s.savedFirst, -s.leftToSpend));
  const parts = [
    { key: 'saved', label: 'Saved first', v: s.savedFirst - dip, color: c.income },
    { key: 'dip', label: 'From savings', v: dip, color: c.expense },
    { key: 'spent', label: 'Spent', v: Math.min(s.totalExpense, s.spendable), color: alpha(c.expense, 0.7) },
    { key: 'left', label: 'Left', v: Math.max(0, s.leftToSpend), color: alpha(c.fg, 0.14) },
  ].filter((p) => p.v > 0);
  return (
    <View style={{ gap: 6, marginTop: S.xs }}>
      <View style={{ flexDirection: 'row', height: 10, borderRadius: R.pill, overflow: 'hidden', backgroundColor: alpha(c.fg, 0.05) }}>
        {parts.map((p) => (
          <View key={p.key} style={{ width: `${(p.v / total) * 100}%`, backgroundColor: p.color }} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: S.md, rowGap: 4 }}>
        {parts.map((p) => (
          <View key={p.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: p.color }} />
            <T variant="small">{p.label} {fmt(p.v)}</T>
          </View>
        ))}
      </View>
    </View>
  );
}

const make = (c: Palette) =>
  StyleSheet.create({
    hero: { color: c.fg, fontFamily: F.uiSemibold, fontSize: 44, letterSpacing: -1.4, fontVariant: ['tabular-nums'] },
    paise: { color: c.subtle, fontSize: 20 },
    track: { height: 6, borderRadius: R.pill, backgroundColor: alpha(c.fg, 0.06), overflow: 'hidden' },
    fill: { height: 6, borderRadius: R.pill },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: S.md },
    stat: { flexBasis: '47%', flexGrow: 1, gap: 4, padding: S.md },
  });
