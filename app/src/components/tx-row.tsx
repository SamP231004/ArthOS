import { Pressable, StyleSheet, Text, View } from 'react-native';

import { C, R, S } from '@/constants/theme';

export function TxRow({
  kind,
  title,
  subtitle,
  amount,
  badge,
  onPress,
}: {
  kind: 'INCOME' | 'EXPENSE';
  title: string;
  subtitle: string;
  amount: string;
  badge?: string;
  onPress?: () => void;
}) {
  const income = kind === 'INCOME';
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.row, pressed && { backgroundColor: C.surface2 }]}>
      <View style={[styles.icon, { backgroundColor: (income ? C.income : C.expense) + '1a' }]}>
        <Text style={{ color: income ? C.income : C.expense, fontSize: 15 }}>{income ? '↓' : '↑'}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {badge ? <Text style={styles.badge}>{badge}</Text> : null}
        </View>
        <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
      </View>
      <Text style={[styles.amount, income && { color: C.income }]}>
        {income ? '+' : '−'}
        {amount}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingVertical: S.md, paddingHorizontal: S.lg },
  icon: { width: 36, height: 36, borderRadius: R.md, alignItems: 'center', justifyContent: 'center' },
  title: { color: C.fg, fontSize: 15, fontWeight: '500', flexShrink: 1 },
  subtitle: { color: C.muted, fontSize: 12, marginTop: 2 },
  amount: { color: C.fg, fontSize: 15, fontWeight: '600', fontVariant: ['tabular-nums'] },
  badge: { color: C.info, backgroundColor: C.info + '1a', fontSize: 10, paddingHorizontal: 6, paddingVertical: 1, borderRadius: R.pill, overflow: 'hidden' },
});
