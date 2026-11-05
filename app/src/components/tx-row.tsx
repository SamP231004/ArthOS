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
  onPress,
}: {
  kind: 'INCOME' | 'EXPENSE';
  title: string;
  subtitle: string;
  amount: string;
  badge?: string;
  color?: string;
  onPress?: () => void;
}) {
  const { c } = useTheme();
  const s = useStyles(make);
  const income = kind === 'INCOME';
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [s.row, pressed && { backgroundColor: alpha(c.fg, 0.03) }]}>
      <View style={[s.avatar, color ? { backgroundColor: alpha(color, 0.14), borderColor: 'transparent' } : income && { backgroundColor: alpha(c.income, 0.1), borderColor: alpha(c.income, 0.25) }]}>
        <Text style={[s.avatarText, color ? { color } : income && { color: c.income }]}>{initials(title)}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={s.title} numberOfLines={1}>{title}</Text>
          {badge ? <Text style={s.badge}>{badge}</Text> : null}
        </View>
        <Text style={s.subtitle} numberOfLines={1}>{subtitle}</Text>
      </View>
      <Text style={[s.amount, income && { color: c.income }]}>
        {income ? '+' : '−'}
        {amount}
      </Text>
    </Pressable>
  );
}

const make = (c: Palette) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingVertical: S.md, paddingHorizontal: S.lg },
    avatar: { width: 40, height: 40, borderRadius: R.md, alignItems: 'center', justifyContent: 'center', backgroundColor: alpha(c.fg, 0.04), borderWidth: 1, borderColor: alpha(c.fg, 0.1) },
    avatarText: { color: c.fg2, fontSize: 12, fontFamily: F.uiSemibold },
    title: { color: c.fg, fontSize: 15, fontFamily: F.uiMedium, flexShrink: 1 },
    subtitle: { color: c.subtle, fontSize: 12, marginTop: 2, fontFamily: F.ui },
    amount: { color: c.fg, fontSize: 15, fontFamily: F.uiSemibold, fontVariant: ['tabular-nums'] },
    badge: { color: c.info, backgroundColor: alpha(c.info, 0.1), fontSize: 10, paddingHorizontal: 6, paddingVertical: 1, borderRadius: R.pill, overflow: 'hidden', fontFamily: F.uiMedium },
  });
