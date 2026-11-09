import { useEffect, useState } from 'react';
import { Animated, Easing, Text, View } from 'react-native';

import { F } from '@/theme';

/**
 * Everything ArthOS does, as two rows of pills drifting in opposite directions (for the login hero). Each row is
 * rendered twice side by side and slides by exactly one copy's width, so the loop is seamless.
 */
const ROWS: [string, string][][] = [
  [
    ['#4cc38a', 'Save first, automatically'],
    ['#ece7db', 'One number for today'],
    ['#84b6d8', 'Live investments'],
    ['#e8706a', 'Scan & Share payments'],
    ['#d9b26f', 'Gold, MFs, stocks, bonds'],
    ['#4cc38a', 'Savings that carry forward'],
  ],
  [
    ['#e8b45c', 'Health score that explains'],
    ['#ece7db', 'Home-screen widgets'],
    ['#f07167', 'Pinned budget alerts'],
    ['#84b6d8', 'Smart categories'],
    ['#b9a5e2', 'Subscriptions & bills'],
    ['#4cc38a', 'Private · no bank logins'],
  ],
];

export function FeatureMarquee() {
  return (
    <View style={{ gap: 8, width: '100%', overflow: 'hidden' }}>
      {ROWS.map((row, i) => (
        <MarqueeRow key={i} items={row} reverse={i % 2 === 1} />
      ))}
    </View>
  );
}

function MarqueeRow({ items, reverse }: { items: [string, string][]; reverse: boolean }) {
  const [w, setW] = useState(0);
  const [x] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!w) return;
    x.setValue(reverse ? -w : 0);
    const loop = Animated.loop(Animated.timing(x, { toValue: reverse ? 0 : -w, duration: w * 32, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [w, reverse, x]);

  const copy = (key: string, measure?: boolean) => (
    <View key={key} onLayout={measure ? (e) => setW(Math.round(e.nativeEvent.layout.width)) : undefined} style={{ flexDirection: 'row' }}>
      {items.map(([color, label]) => (
        <View
          key={label}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginRight: 8, borderWidth: 1, borderColor: 'rgba(242,239,232,0.12)', backgroundColor: 'rgba(242,239,232,0.04)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 }}
        >
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
          <Text style={{ color: '#d9d4c9', fontFamily: F.uiMedium, fontSize: 12.5 }}>{label}</Text>
        </View>
      ))}
    </View>
  );

  return (
    <Animated.View style={{ flexDirection: 'row', transform: [{ translateX: x }] }}>
      {copy('a', true)}
      {copy('b')}
    </Animated.View>
  );
}
