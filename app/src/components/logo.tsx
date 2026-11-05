import { Image, Text, View } from 'react-native';

import { F, useTheme } from '@/theme';

/** The अर्थ tile + "ArthOS" wordmark, matching the website header. */
export function Logo({ size = 32 }: { size?: number }) {
  const { c } = useTheme();
  const fontSize = Math.round(size * 0.7);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }} accessibilityLabel="ArthOS">
      <Image source={require('@/assets/images/icon-mark.png')} style={{ width: size, height: size, borderRadius: size * 0.28 }} />
      {/* Newsreader sits its ink high in the line box; nudge down to centre on the tile (as on the web). */}
      <Text style={{ fontFamily: F.display, fontSize, color: c.fg, letterSpacing: -0.4, transform: [{ translateY: fontSize * 0.04 }] }}>
        Arth<Text style={{ fontFamily: F.displayMedium, color: c.brand }}>OS</Text>
      </Text>
    </View>
  );
}
