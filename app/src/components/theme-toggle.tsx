import { useEffect, useState } from 'react';
import { Animated, Pressable } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { alpha, useTheme } from '@/theme';

/** Sun/moon toggle with a spin, like the website's. */
export function ThemeToggle() {
  const { mode, toggle, c } = useTheme();
  const [spin] = useState(() => new Animated.Value(mode === 'dark' ? 0 : 1));
  useEffect(() => {
    Animated.spring(spin, { toValue: mode === 'dark' ? 0 : 1, useNativeDriver: true, friction: 6 }).start();
  }, [mode, spin]);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  return (
    <Pressable
      // reveal from the icon's centre, measured in window coordinates
      onPress={(e) => {
        const t = e.currentTarget as unknown as { measureInWindow: (cb: (x: number, y: number, w: number, h: number) => void) => void };
        t.measureInWindow((x, y, w, h) => toggle({ x: x + w / 2, y: y + h / 2 }));
      }}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={`Switch to ${mode === 'dark' ? 'light' : 'dark'} theme`}
      style={({ pressed }) => ({ width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? alpha(c.fg, 0.08) : 'transparent' })}>
      <Animated.View style={{ transform: [{ rotate }] }}>
        <Svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke={c.muted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          {mode === 'dark' ? (
            <Path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
          ) : (
            <>
              <Circle cx={12} cy={12} r={4} />
              <Path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
            </>
          )}
        </Svg>
      </Animated.View>
    </Pressable>
  );
}
