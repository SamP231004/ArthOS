import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { T } from '@/components/ui';
import { label, money } from '@/lib/format';
import { useMarkRecurring, useRecurringCandidates } from '@/lib/queries';
import type { RecurringCandidate } from '@/lib/types';
import { alpha, F, R, S, useTheme } from '@/theme';

const KEY = 'arthos-recurring-dismissed';

/** "These came back every month — mark them recurring?" with a dismiss that's remembered on the device. */
export function RecurringSuggestions({ kind, currency }: { kind: 'INCOME' | 'EXPENSE'; currency: string }) {
  const { c } = useTheme();
  const { data } = useRecurringCandidates();
  const mark = useMarkRecurring();
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    SecureStore.getItemAsync(KEY)
      .then((v) => v && setDismissed(JSON.parse(v)))
      .catch(() => {});
  }, []);

  const id = (x: RecurringCandidate) => `${x.kind}:${x.key}`;
  const items = (data ?? []).filter((x) => x.kind === kind && !dismissed.includes(id(x)));
  if (!items.length) return null;

  const dismiss = (x: RecurringCandidate) => {
    const next = [...dismissed, id(x)];
    setDismissed(next);
    SecureStore.setItemAsync(KEY, JSON.stringify(next)).catch(() => {});
  };

  return (
    <View style={{ gap: S.sm, borderWidth: 1, borderColor: c.line, borderRadius: R.lg, padding: S.md, backgroundColor: c.surface }}>
      <T style={{ fontFamily: F.uiSemibold, fontSize: 14 }}>↻ Looks recurring</T>
      <T variant="small" style={{ marginTop: -4 }}>These came back every month. Mark them so ArthOS reminds you each month.</T>
      {items.map((x) => (
        <View key={id(x)} style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm, borderTopWidth: 1, borderTopColor: c.line, paddingTop: S.sm }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: c.fg, fontFamily: F.uiMedium, fontSize: 14 }} numberOfLines={1}>{x.name}</Text>
            <Text style={{ color: c.subtle, fontFamily: F.ui, fontSize: 11.5 }} numberOfLines={1}>
              ~{money(x.typicalAmount, currency)} · around the {ordinal(x.dayOfMonth)} · {x.months} months{x.tag ? ` · ${label(x.tag)}` : ''}
            </Text>
          </View>
          <Pressable
            onPress={() => mark.mutate({ kind: x.kind, key: x.key })}
            disabled={mark.isPending}
            style={{ borderWidth: 1, borderColor: alpha(c.brand, 0.4), backgroundColor: alpha(c.brand, 0.1), borderRadius: R.sm, paddingHorizontal: 10, paddingVertical: 6, opacity: mark.isPending ? 0.5 : 1 }}>
            <Text style={{ color: c.brand, fontFamily: F.uiSemibold, fontSize: 12 }}>Mark</Text>
          </Pressable>
          <Pressable onPress={() => dismiss(x)} hitSlop={8} accessibilityLabel={`Not recurring: ${x.name}`} style={{ padding: 4 }}>
            <Text style={{ color: c.subtle, fontSize: 16 }}>✕</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

function ordinal(n: number): string {
  const s = n % 100 >= 11 && n % 100 <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th');
  return `${n}${s}`;
}
