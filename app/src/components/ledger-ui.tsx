import { Pressable, Text, View } from 'react-native';

import { Card, T } from '@/components/ui';
import { alpha, F, R, S, useTheme } from '@/theme';

/** Two-by-two summary figures at the top of a ledger (mirrors the website's summary strip). */
export function SummaryGrid({ cells }: { cells: { k: string; v: string; sub?: string; color?: string; pill?: { text: string; color: string } }[] }) {
  const { c } = useTheme();
  return (
    <Card glow style={{ padding: 0, flexDirection: 'row', flexWrap: 'wrap' }}>
      {cells.map((x, i) => (
        <View
          key={x.k}
          style={{
            width: '50%',
            padding: S.md,
            gap: 3,
            borderColor: c.line,
            borderRightWidth: i % 2 === 0 ? 1 : 0,
            borderBottomWidth: i < cells.length - 2 ? 1 : 0,
          }}>
          <T variant="small">{x.k}</T>
          <Text style={{ color: x.color ?? c.fg, fontFamily: F.uiSemibold, fontSize: 18, fontVariant: ['tabular-nums'] }} numberOfLines={1} adjustsFontSizeToFit>
            {x.v}
          </Text>
          {x.pill ? (
            <Text style={{ alignSelf: 'flex-start', color: x.pill.color, backgroundColor: alpha(x.pill.color, 0.1), fontSize: 10, fontFamily: F.uiMedium, paddingHorizontal: 6, paddingVertical: 1, borderRadius: R.pill, overflow: 'hidden' }}>
              {x.pill.text}
            </Text>
          ) : x.sub ? (
            <T variant="small" numberOfLines={1}>{x.sub}</T>
          ) : null}
        </View>
      ))}
    </Card>
  );
}

/** Stacked share bar whose legend doubles as a filter: tap a part to show only it, tap again to clear. */
export function BreakdownBar<K extends string>({
  parts,
  total,
  active,
  onPick,
  fmt,
}: {
  parts: { key: K; label: string; amount: number; color: string }[];
  total: number;
  active?: K;
  onPick: (k: K | undefined) => void;
  fmt: (n: number) => string;
}) {
  const { c } = useTheme();
  if (!parts.length || total <= 0) return null;
  return (
    <View style={{ gap: S.sm }}>
      <View style={{ flexDirection: 'row', height: 10, borderRadius: R.pill, overflow: 'hidden', backgroundColor: alpha(c.fg, 0.05) }}>
        {parts.map((p) => (
          <View key={p.key} style={{ width: `${(p.amount / total) * 100}%`, backgroundColor: p.color, opacity: active && active !== p.key ? 0.25 : 1 }} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {parts.map((p) => {
          const on = active === p.key;
          return (
            <Pressable
              key={p.key}
              onPress={() => onPick(on ? undefined : p.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: on ? p.color : c.line, backgroundColor: on ? alpha(p.color, 0.1) : 'transparent', borderRadius: R.pill, paddingHorizontal: 9, paddingVertical: 4 }}>
              <View style={{ width: 7, height: 7, borderRadius: 2, backgroundColor: p.color }} />
              <Text style={{ color: c.fg2, fontSize: 11, fontFamily: F.uiMedium }}>{p.label}</Text>
              <Text style={{ color: c.subtle, fontSize: 11, fontFamily: F.ui, fontVariant: ['tabular-nums'] }}>
                {Math.round((p.amount / total) * 100)}% · {fmt(p.amount)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** "Recurring last month, not added yet" — one tap re-logs each on the same day this month. */
export function RecurringSuggestions({ items, onAdd, pendingId }: { items: { id: string; title: string; amount: string }[]; onAdd: (id: string) => void; pendingId?: string }) {
  const { c } = useTheme();
  if (!items.length) return null;
  return (
    <View style={{ gap: S.sm, borderWidth: 1, borderStyle: 'dashed', borderColor: alpha(c.info, 0.4), backgroundColor: alpha(c.info, 0.05), borderRadius: R.md, padding: S.md }}>
      <T variant="small" style={{ color: c.fg2 }}>↻ Recurring from last month, not added yet</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm }}>
        {items.map((it) => (
          <Pressable
            key={it.id}
            onPress={() => onAdd(it.id)}
            disabled={!!pendingId}
            style={{ borderWidth: 1, borderColor: c.lineStrong, backgroundColor: c.surface, borderRadius: R.pill, paddingHorizontal: 11, paddingVertical: 6, opacity: pendingId && pendingId !== it.id ? 0.5 : 1 }}>
            <Text style={{ color: c.fg, fontSize: 12, fontFamily: F.uiMedium }}>
              {pendingId === it.id ? 'Adding…' : `+ ${it.title} · ${it.amount}`}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
