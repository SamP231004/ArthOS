import { Pressable, StyleSheet, Text, View } from 'react-native';

import { initials } from '@/lib/ledger';
import { alpha, F, R, S, useStyles, useTheme, type Palette } from '@/theme';

/** Transaction row with the web's initials avatar, tinted by category/type when `color` is given. */
export function TxRow({
  kind,
  title,
  subtitle,
  amount,
  badge,
  color,
  last,
  onPress,
}: {
  kind: 'INCOME' | 'EXPENSE';
  title: string;
  subtitle: string;
  amount: string;
  badge?: string;
  color?: string;
  /** Last row in its list: no divider below. */
  last?: boolean;
  onPress?: () => void;
}) {
  const { c } = useTheme();
  const s = useStyles(make);
  const income = kind === 'INCOME';
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [s.row, pressed && { backgroundColor: alpha(c.fg, 0.03) }]}>
      {!last && <View style={s.divider} />}
      <View style={[s.avatar, color ? { backgroundColor: alpha(color, 0.14), borderColor: 'transparent' } : income && { backgroundColor: alpha(c.income, 0.1), borderColor: alpha(c.income, 0.25) }]}>
        <Text style={[s.avatarText, color ? { color } : income && { color: c.income }]}>{initials(title)}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.title} numberOfLines={1}>{title}</Text>
        <Text style={s.subtitle} numberOfLines={1}>{subtitle}</Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 3 }}>
        <Text style={[s.amount, income && { color: c.income }]}>
          {income ? '+' : '−'}
          {amount}
        </Text>
        {badge ? <Text style={s.badge}>{badge}</Text> : null}
      </View>
    </Pressable>
  );
}

const make = (c: Palette) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingVertical: 13, paddingHorizontal: S.lg },
    // inset divider, starting under the text (not the avatar)
    divider: { position: 'absolute', left: S.lg + 40 + S.md, right: 0, bottom: 0, height: StyleSheet.hairlineWidth, backgroundColor: c.line },
    avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: alpha(c.fg, 0.04), borderWidth: 1, borderColor: alpha(c.fg, 0.1) },
    avatarText: { color: c.fg2, fontSize: 12, fontFamily: F.uiSemibold },
    title: { color: c.fg, fontSize: 15, fontFamily: F.uiMedium, flexShrink: 1 },
    subtitle: { color: c.subtle, fontSize: 12, marginTop: 2, fontFamily: F.ui },
    amount: { color: c.fg, fontSize: 15, fontFamily: F.uiSemibold, fontVariant: ['tabular-nums'] },
    badge: { color: c.info, backgroundColor: alpha(c.info, 0.1), fontSize: 10, paddingHorizontal: 6, paddingVertical: 1, borderRadius: R.pill, overflow: 'hidden', fontFamily: F.uiMedium },
  });
