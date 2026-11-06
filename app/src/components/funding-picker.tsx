import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { T } from '@/components/ui';
import { money, monthLabel } from '@/lib/format';
import { useSummary } from '@/lib/queries';
import type { FundingSource } from '@/lib/types';
import { alpha, F, R, S, useTheme } from '@/theme';

/**
 * How a purchase is paid for (same rules as the website):
 * AUTO "Savings first" — what the savings account holds, the rest from spending money (default);
 * SAVINGS / SPENDING — all from one; SPLIT — the user types the savings part, the rest is spending.
 */
export type FundingMode = 'AUTO' | 'SAVINGS' | 'SPENDING' | 'SPLIT';
export type Funding = ReturnType<typeof useFunding>;

export function useFunding(amount: number, date: string, initial?: { mode: FundingMode; split?: number }) {
  const [mode, setMode] = useState<FundingMode>(initial?.mode ?? 'AUTO');
  const [split, setSplit] = useState(initial?.split != null ? String(initial.split) : '');
  const month = (date || '').slice(0, 7);
  const s = useSummary(month).data;
  const balance = s?.savings?.closing;
  const left = s?.leftToSpend;
  const amt = Math.max(0, amount || 0);
  const clamp = (v: number) => Math.round(Math.min(Math.max(v, 0), amt) * 100) / 100;
  const fromSavings =
    mode === 'SAVINGS' ? amt : mode === 'SPENDING' ? 0 : mode === 'SPLIT' ? clamp(Number(split) || 0) : clamp(balance == null ? amt : Math.max(balance, 0));
  const fromSpending = Math.max(0, Math.round((amt - fromSavings) * 100) / 100) || 0;
  const payload = { fromSavings, fundedFrom: (fromSavings > 0 ? 'SAVINGS' : 'SPENDING') as FundingSource };
  return { mode, setMode, split, setSplit, month, balance, left, amount: amt, fromSavings, fromSpending, payload };
}

/** Initial picker state for an existing buy, from how it was paid. */
export function fundingOf(fromSavings: number | undefined, amount: number): { mode: FundingMode; split?: number } {
  if (fromSavings == null || fromSavings >= amount - 0.005) return { mode: 'SAVINGS' };
  if (fromSavings <= 0.005) return { mode: 'SPENDING' };
  return { mode: 'SPLIT', split: fromSavings };
}

const MODES: { v: FundingMode; label: string }[] = [
  { v: 'AUTO', label: 'Savings first' },
  { v: 'SAVINGS', label: 'Savings' },
  { v: 'SPENDING', label: 'Spending' },
  { v: 'SPLIT', label: 'Split' },
];

export function FundingPicker({ f }: { f: Funding }) {
  const { c } = useTheme();
  const shortSavings = f.balance != null && f.fromSavings > Math.max(f.balance, 0) + 0.005;
  const overSpend = f.left != null && f.fromSpending > Math.max(f.left, 0) + 0.005;
  return (
    <View style={{ gap: S.sm, borderWidth: 1, borderColor: c.line, borderRadius: R.lg, padding: S.md, backgroundColor: alpha(c.fg, 0.02) }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <T variant="label">Pay from</T>
        <T variant="small">
          Savings {f.balance != null ? money(f.balance) : '—'} · left {f.left != null ? money(Math.max(f.left, 0)) : '—'}
        </T>
      </View>
      <View style={{ flexDirection: 'row', gap: 4, padding: 3, borderRadius: R.md, backgroundColor: alpha(c.fg, 0.05) }} accessibilityRole="radiogroup">
        {MODES.map((m) => {
          const on = f.mode === m.v;
          return (
            <Pressable
              key={m.v}
              onPress={() => {
                f.setMode(m.v);
                if (m.v === 'SPLIT' && !f.split) f.setSplit(String(Math.min(f.amount, Math.max(f.balance ?? 0, 0))));
              }}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              style={{ flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: R.sm, backgroundColor: on ? c.surface : 'transparent', borderWidth: on ? 1 : 0, borderColor: c.lineStrong }}>
              <Text style={{ color: on ? c.fg : c.muted, fontFamily: on ? F.uiSemibold : F.uiMedium, fontSize: 11.5 }} numberOfLines={1} adjustsFontSizeToFit>
                {m.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {f.mode === 'SPLIT' && (
        <View style={{ flexDirection: 'row', gap: S.sm, alignItems: 'center' }}>
          <View style={{ flex: 1, gap: 4 }}>
            <T variant="small">From savings</T>
            <TextInput
              keyboardType="decimal-pad"
              value={f.split}
              onChangeText={(t) => f.setSplit(t.replace(/[^0-9.]/g, ''))}
              style={{ borderWidth: 1, borderColor: c.lineStrong, backgroundColor: c.field, color: c.fg, borderRadius: R.md, paddingHorizontal: 12, paddingVertical: 9, fontFamily: F.uiSemibold, fontSize: 15 }}
            />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <T variant="small">From spending</T>
            <Text style={{ borderWidth: 1, borderColor: c.line, borderRadius: R.md, paddingHorizontal: 12, paddingVertical: 10, color: c.fg2, fontFamily: F.uiSemibold, fontSize: 15 }}>{money(f.fromSpending)}</Text>
          </View>
        </View>
      )}
      {f.amount > 0 && (
        <T variant="small" style={{ color: c.fg2 }}>
          {money(f.fromSavings)} from savings · {money(f.fromSpending)} from spending{f.fromSpending > 0 && f.month ? ` (counts as ${monthLabel(f.month)} spending)` : ''}
        </T>
      )}
      {shortSavings && <T variant="small" style={{ color: c.warn }}>⚠ More than your savings hold — the account would go negative. Try “Savings first”.</T>}
      {overSpend && <T variant="small" style={{ color: c.warn }}>⚠ More than you have left to spend this month — it would eat into your savings.</T>}
    </View>
  );
}
