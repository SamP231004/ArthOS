import { LinearGradient } from 'expo-linear-gradient';
import { Text, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';

import { ARTH_OFFSET, ARTH_PATH } from '@/lib/brand';
import { F, useTheme } from '@/theme';

/** The अर्थ tile in the theme's logo colours (crimson, cobalt or gold), drawn like the website's. */
export function LogoMark({ size = 32 }: { size?: number }) {
  const { c } = useTheme();
  return (
    <LinearGradient
      colors={[c.logo1, c.logo2, c.logo3]}
      locations={[0, 0.55, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius: (size * 9) / 32, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox="0 0 32 32">
        <G transform={`translate(${ARTH_OFFSET.x} ${ARTH_OFFSET.y})`}>
          <Path d={ARTH_PATH} fill={c.logoFg} />
        </G>
      </Svg>
    </LinearGradient>
  );
}

/** The अर्थ tile + "ArthOS" wordmark, matching the website header. */
export function Logo({ size = 32 }: { size?: number }) {
  const { c } = useTheme();
  const fontSize = Math.round(size * 0.7);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }} accessibilityLabel="ArthOS">
      <LogoMark size={size} />
      {/* Newsreader sits its ink high in the line box; nudge down to centre on the tile (as on the web). */}
      <Text style={{ fontFamily: F.display, fontSize, color: c.fg, letterSpacing: -0.4, transform: [{ translateY: fontSize * 0.04 }] }}>
        Arth<Text style={{ fontFamily: F.displayMedium, color: c.brand }}>OS</Text>
      </Text>
    </View>
  );
}
