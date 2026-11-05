import { Pressable, Text, View } from 'react-native';

import { T } from '@/components/ui';
import { money, monthLabel } from '@/lib/format';
import { useSummary } from '@/lib/queries';
import type { FundingSource } from '@/lib/types';
import { alpha, F, R, S, useTheme } from '@/theme';

/** "Pay from" for a purchase: the savings account, or this month's spending money (then it counts as spending). */
export function FundingPicker({ value, onChange, amount, date }: { value: FundingSource; onChange: (v: FundingSource) => void; amount: number; date: string }) {
  const { c } = useTheme();
  const month = (date || '').slice(0, 7);
  const { data: s } = useSummary(month);
  const balance = s?.savings?.closing;
  const left = s?.leftToSpend;
  const short = value === 'SAVINGS' && balance != null && amount > 0 && amount > balance ? amount - Math.max(balance, 0) : 0;
  const overSpend = value === 'SPENDING' && left != null && amount > 0 && amount > left;

  const options: { v: FundingSource; title: string; detail: string }[] = [
    { v: 'SAVINGS', title: 'Savings account', detail: balance != null ? `${money(balance)} available` : 'Money you set aside' },
    { v: 'SPENDING', title: 'Spending money', detail: left != null ? `Counts as ${month ? monthLabel(month) : "this month's"} spending · ${money(Math.max(left, 0))} left` : "Counts as this month's spending" },
  ];

  return (
    <View style={{ gap: S.xs }}>
      <T variant="label">Pay from</T>
      <View style={{ flexDirection: 'row', gap: S.sm }} accessibilityRole="radiogroup">
        {options.map((o) => {
          const on = value === o.v;
          return (
            <Pressable
              key={o.v}
              onPress={() => onChange(o.v)}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              style={{ flex: 1, borderWidth: 1, borderRadius: R.md, padding: S.md, borderColor: on ? c.brand : c.lineStrong, backgroundColor: on ? alpha(c.brand, 0.07) : 'transparent' }}>
              <Text style={{ color: c.fg, fontFamily: F.uiSemibold, fontSize: 14 }}>{o.title}</Text>
              <Text style={{ color: c.subtle, fontFamily: F.ui, fontSize: 11, marginTop: 2, lineHeight: 15 }}>{o.detail}</Text>
            </Pressable>
          );
        })}
      </View>
      {short > 0 && <T variant="small" style={{ color: c.warn }}>⚠ That&apos;s {money(short)} more than your savings hold — the account would go negative.</T>}
      {overSpend && <T variant="small" style={{ color: c.warn }}>⚠ More than you have left to spend this month — it would eat into your savings.</T>}
    </View>
  );
}
