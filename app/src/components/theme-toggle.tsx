import { Pressable, View } from 'react-native';

import { alpha, palettes, THEMES, useTheme } from '@/theme';

/** Three-part swatch of a theme: background, accent, highlight. */
export function ThemeSwatch({ id, size = 20 }: { id: keyof typeof palettes; size?: number }) {
  const p = palettes[id];
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', flexDirection: 'row', borderWidth: 1, borderColor: alpha(p.fg, 0.2), backgroundColor: p.bg }}>
      <View style={{ flex: 1, backgroundColor: p.bg }} />
      <View style={{ flex: 0.6, backgroundColor: p.accent3 }} />
      <View style={{ flex: 0.4, backgroundColor: p.brand }} />
    </View>
  );
}

/** Shows the current theme's swatch; tapping steps to the next theme (Settings has the full picker). */
export function ThemeToggle() {
  const { mode, toggle, c } = useTheme();
  const i = THEMES.findIndex((t) => t.id === mode);
  const next = THEMES[(i + 1) % THEMES.length];
  return (
    <Pressable
      onPress={toggle}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={`Theme: ${THEMES[i]?.name}. Switch to ${next.name}`}
      style={({ pressed }) => ({ width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? alpha(c.fg, 0.08) : 'transparent' })}>
      <ThemeSwatch id={mode} />
    </Pressable>
  );
}
