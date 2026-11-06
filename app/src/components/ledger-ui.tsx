import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, T } from '@/components/ui';
import { alpha, F, R, S, useTheme } from '@/theme';

/**
 * Ledger summary in the style of Indian finance apps: the first figure is the headline, the rest are plain
 * label-and-value lines (with an optional pill, e.g. the change vs last month).
 */
export function SummaryGrid({ cells }: { cells: { k: string; v: string; sub?: string; color?: string; pill?: { text: string; color: string } }[] }) {
  const { c } = useTheme();
  const [head, ...rest] = cells;
  return (
    <Card glow style={{ gap: 0 }}>
      <T variant="small">{head.k}</T>
      <Text style={{ color: head.color ?? c.fg, fontFamily: F.uiSemibold, fontSize: 30, letterSpacing: -0.8, marginTop: 2, fontVariant: ['tabular-nums'] }} numberOfLines={1} adjustsFontSizeToFit>
        {head.v}
      </Text>
      {head.sub ? <T variant="small">{head.sub}</T> : null}
      <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.lineStrong, marginVertical: S.md }} />
      {rest.map((x) => (
        <View key={x.k} style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm, paddingVertical: 5 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <T variant="muted" style={{ fontSize: 13 }}>{x.k}</T>
            {x.sub && !x.pill ? <T variant="small" numberOfLines={1}>{x.sub}</T> : null}
          </View>
          <View style={{ alignItems: 'flex-end', gap: 2 }}>
            <Text style={{ color: x.color ?? c.fg, fontFamily: F.uiSemibold, fontSize: 14, fontVariant: ['tabular-nums'] }}>{x.v}</Text>
            {x.pill ? (
              <Text style={{ color: x.pill.color, backgroundColor: alpha(x.pill.color, 0.1), fontSize: 10, fontFamily: F.uiMedium, paddingHorizontal: 6, paddingVertical: 1, borderRadius: R.pill, overflow: 'hidden' }}>
                {x.pill.text}
              </Text>
            ) : null}
          </View>
        </View>
      ))}
    </Card>
  );
}

/**
 * Share bar for the top 3 categories, kept to a single row: each gets a slice and an equal-width chip (name, then share
 * and amount; tap to filter, tap again to clear). Everything else is one unlabelled grey slice — no "Others" chip, since
 * "Other" is already a real category.
 */
export function BreakdownBar<K extends string>({
  parts,
  total,
  active,
  onPick,
  fmt,
  limit = 3,
}: {
  parts: { key: K; label: string; amount: number; color: string }[];
  total: number;
  active?: K;
  onPick: (k: K | undefined) => void;
  fmt: (n: number) => string;
  limit?: number;
}) {
  const { c } = useTheme();
  if (!parts.length || total <= 0) return null;
  const top = [...parts].sort((x, y) => y.amount - x.amount).slice(0, limit);
  const restAmount = total - top.reduce((sum, p) => sum + p.amount, 0);

  return (
    <View style={{ gap: S.sm }}>
      <View style={{ flexDirection: 'row', height: 10, borderRadius: R.pill, overflow: 'hidden', backgroundColor: alpha(c.fg, 0.05) }}>
        {top.map((p) => (
          <View key={p.key} style={{ width: `${(p.amount / total) * 100}%`, backgroundColor: p.color, opacity: active && active !== p.key ? 0.25 : 1 }} />
        ))}
        {restAmount > 0.005 && <View style={{ width: `${(restAmount / total) * 100}%`, backgroundColor: alpha(c.fg, 0.16), opacity: active ? 0.25 : 1 }} />}
      </View>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {top.map((p) => {
          const on = active === p.key;
          return (
            <Pressable
              key={p.key}
              onPress={() => onPick(on ? undefined : p.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${p.label}, ${Math.round((p.amount / total) * 100)} percent, ${fmt(p.amount)}`}
              style={{ flex: 1, minWidth: 0, borderWidth: 1, borderColor: on ? p.color : c.line, backgroundColor: on ? alpha(p.color, 0.1) : 'transparent', borderRadius: R.md, paddingHorizontal: 9, paddingVertical: 7, gap: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <View style={{ width: 7, height: 7, borderRadius: 2, backgroundColor: p.color }} />
                <Text style={{ flex: 1, color: c.fg, fontSize: 12, fontFamily: F.uiSemibold }} numberOfLines={1}>{p.label}</Text>
              </View>
              <Text style={{ color: c.subtle, fontSize: 11, fontFamily: F.ui, fontVariant: ['tabular-nums'] }} numberOfLines={1} adjustsFontSizeToFit>
                {Math.round((p.amount / total) * 100)}% · {fmt(p.amount)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** The month's largest individual entries, ranked: where the big money went, at a glance. */
export function TopEntries({ title, items }: { title: string; items: { id: string; name: string; meta: string; amount: string; color: string; onPress?: () => void }[] }) {
  const { c } = useTheme();
  if (!items.length) return null;
  return (
    <Card style={{ gap: 0, paddingVertical: S.sm }}>
      <T variant="label" style={{ marginBottom: S.xs }}>{title}</T>
      {items.map((it, i) => (
        <Pressable
          key={it.id}
          onPress={it.onPress}
          disabled={!it.onPress}
          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: S.md, paddingVertical: 9, borderTopWidth: i ? StyleSheet.hairlineWidth : 0, borderTopColor: c.line, opacity: pressed ? 0.7 : 1 })}>
          <View style={{ width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: alpha(it.color, 0.15) }}>
            <Text style={{ color: it.color, fontFamily: F.uiBold, fontSize: 11 }}>{i + 1}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: c.fg, fontFamily: F.uiMedium, fontSize: 14 }} numberOfLines={1}>{it.name}</Text>
            <Text style={{ color: c.subtle, fontFamily: F.ui, fontSize: 11.5 }} numberOfLines={1}>{it.meta}</Text>
          </View>
          <Text style={{ color: c.fg, fontFamily: F.uiSemibold, fontSize: 14, fontVariant: ['tabular-nums'] }}>{it.amount}</Text>
        </Pressable>
      ))}
    </Card>
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
