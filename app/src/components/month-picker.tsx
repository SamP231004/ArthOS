import { Pressable, StyleSheet, Text, View } from 'react-native';

import { currentMonth, monthLabel } from '@/lib/format';
import { useMonth, useUi } from '@/lib/ui-store';
import { F, R, useStyles, type Palette } from '@/theme';

export function MonthPicker() {
  const month = useMonth();
  const shift = useUi((s) => s.shift);
  const s = useStyles(make);
  const atCurrent = month === currentMonth();
  return (
    <View style={s.box}>
      <Pressable onPress={() => shift(-1)} hitSlop={8} style={s.arrow} accessibilityLabel="Previous month">
        <Text style={s.arrowText}>‹</Text>
      </Pressable>
      <Text style={s.label}>{monthLabel(month)}</Text>
      <Pressable onPress={() => shift(1)} disabled={atCurrent} hitSlop={8} style={[s.arrow, atCurrent && { opacity: 0.3 }]} accessibilityLabel="Next month">
        <Text style={s.arrowText}>›</Text>
      </Pressable>
    </View>
  );
}

const make = (c: Palette) =>
  StyleSheet.create({
    box: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', borderWidth: 1, borderColor: c.lineStrong, backgroundColor: c.surface, borderRadius: R.md },
    arrow: { paddingHorizontal: 14, paddingVertical: 8 },
    arrowText: { color: c.muted, fontSize: 20, fontFamily: F.ui },
    label: { color: c.fg, fontSize: 14, fontFamily: F.uiSemibold, minWidth: 120, textAlign: 'center' },
  });
