import { Pressable, StyleSheet, Text, View } from 'react-native';

import { C, R } from '@/constants/theme';
import { currentMonth, monthLabel } from '@/lib/format';
import { useMonth, useUi } from '@/lib/ui-store';

export function MonthPicker() {
  const month = useMonth();
  const shift = useUi((s) => s.shift);
  const atCurrent = month === currentMonth();
  return (
    <View style={styles.box}>
      <Pressable onPress={() => shift(-1)} hitSlop={8} style={styles.arrow} accessibilityLabel="Previous month">
        <Text style={styles.arrowText}>‹</Text>
      </Pressable>
      <Text style={styles.label}>{monthLabel(month)}</Text>
      <Pressable onPress={() => shift(1)} disabled={atCurrent} hitSlop={8} style={[styles.arrow, atCurrent && { opacity: 0.3 }]} accessibilityLabel="Next month">
        <Text style={styles.arrowText}>›</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, borderRadius: R.md },
  arrow: { paddingHorizontal: 14, paddingVertical: 8 },
  arrowText: { color: C.muted, fontSize: 20 },
  label: { color: C.fg, fontSize: 14, fontWeight: '600', minWidth: 120, textAlign: 'center' },
});
