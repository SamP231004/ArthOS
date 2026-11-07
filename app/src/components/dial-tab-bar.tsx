import { LinearGradient } from 'expo-linear-gradient';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { useEffect, useState } from 'react';
import { Animated, BackHandler, Image, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { alpha, F, useTheme } from '@/theme';

type Item = { key: string; label: string; icon: ImageSourcePropType; route: string };

const ITEMS: Item[] = [
  { key: 'index', label: 'Home', icon: require('@/assets/images/tabIcons/home.png'), route: 'index' },
  { key: 'income', label: 'Income', icon: require('@/assets/images/tabIcons/income.png'), route: 'income' },
  { key: 'expenses', label: 'Expenses', icon: require('@/assets/images/tabIcons/expense.png'), route: 'expenses' },
  { key: 'budget', label: 'Budget', icon: require('@/assets/images/tabIcons/budget.png'), route: 'budget' },
  { key: 'invest', label: 'Invest', icon: require('@/assets/images/tabIcons/invest.png'), route: 'invest' },
  { key: 'insights', label: 'Insights', icon: require('@/assets/images/tabIcons/insights.png'), route: 'insights' },
];

const R = 128; // arc radius
const DIAL = 62;

/**
 * Omnitrix-style navigation (same as the website's mobile dial): a round dial docked at the bottom shows the current
 * tab; tapping it twists open a semicircle of destinations along an arc.
 */
export function DialTabBar({ state, navigateToTab }: BottomTabBarProps) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [anim] = useState(() => new Animated.Value(0));
  const current = ITEMS.find((i) => i.route === state.routes[state.index]?.name) ?? ITEMS[0];

  useEffect(() => {
    Animated.spring(anim, { toValue: open ? 1 : 0, useNativeDriver: true, friction: 7, tension: 60 }).start();
  }, [open, anim]);

  useEffect(() => {
    if (!open) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setOpen(false);
      return true;
    });
    return () => sub.remove();
  }, [open]);

  const go = (it: Item) => {
    setOpen(false);
    const r = state.routes.find((x) => x.name === it.route);
    if (r) navigateToTab(r.key);
  };
  const bottom = Math.max(insets.bottom, 10);
  const rotate = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '135deg'] });
  const counter = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-135deg'] });

  return (
    <>
      {/* backdrop */}
      <Animated.View pointerEvents={open ? 'auto' : 'none'} style={[StyleSheet.absoluteFill, { backgroundColor: alpha(c.bg, 0.72), opacity: anim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} accessibilityLabel="Close navigation" />
      </Animated.View>

      <View pointerEvents="box-none" style={[styles.wrap, { bottom: 0, height: R + DIAL + bottom + 40 }]}>
        {/* semicircle face */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.face,
            {
              width: R * 2 + 84,
              height: R + 76 + bottom,
              borderTopLeftRadius: R + 42,
              borderTopRightRadius: R + 42,
              backgroundColor: c.surface,
              borderColor: c.lineStrong,
              opacity: anim,
              transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }, { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [80, 0] }) }],
            },
          ]}>
          <View style={[styles.bezel, { borderColor: c.line, borderTopLeftRadius: R + 20, borderTopRightRadius: R + 20 }]} />
        </Animated.View>

        {/* destinations along the arc */}
        {ITEMS.map((it, i) => {
          const theta = Math.PI - ((i + 0.5) * Math.PI) / ITEMS.length;
          const x = Math.cos(theta) * R;
          const y = Math.sin(theta) * R;
          const active = it.key === current.key;
          return (
            <Animated.View
              key={it.key}
              pointerEvents={open ? 'auto' : 'none'}
              style={[
                styles.item,
                {
                  bottom: bottom + DIAL / 2 - 4,
                  opacity: anim,
                  transform: [
                    { translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [0, x] }) },
                    { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -y] }) },
                    { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) },
                  ],
                },
              ]}>
              <Pressable onPress={() => go(it)} accessibilityRole="button" accessibilityLabel={it.label} style={{ alignItems: 'center', gap: 4 }}>
                <View style={[styles.itemCircle, { backgroundColor: active ? alpha(c.brand, 0.15) : c.surface2, borderColor: active ? c.brand : c.lineStrong }]}>
                  <Image source={it.icon} style={{ width: 20, height: 20, tintColor: active ? c.brand : c.fg2 }} />
                </View>
                <Text style={{ color: active ? c.brand : c.muted, fontSize: 10, fontFamily: F.uiMedium }}>{it.label}</Text>
              </Pressable>
            </Animated.View>
          );
        })}

        {/* docked half-disc */}
        <View pointerEvents="none" style={[styles.dock, { height: 30 + bottom, backgroundColor: alpha(c.surface, 0.96), borderColor: c.lineStrong }]} />
        {!open && (
          <View pointerEvents="none" style={[styles.label, { bottom: bottom + DIAL + 8, backgroundColor: alpha(c.surface, 0.95), borderColor: c.line }]}>
            <Text style={{ color: c.muted, fontSize: 10, fontFamily: F.uiMedium }}>{current.label}</Text>
          </View>
        )}

        {/* the dial */}
        <Pressable onPress={() => setOpen((o) => !o)} accessibilityRole="button" accessibilityLabel={open ? 'Close navigation' : `${current.label}. Open navigation`} style={[styles.dialHit, { bottom }]}>
          <Animated.View style={{ transform: [{ rotate }] }}>
            <LinearGradient colors={[c.accent1, c.accent2, c.accent3]} style={styles.dial}>
              <View style={styles.dialRing} />
              <View style={styles.dialInner} />
              <Animated.View style={{ transform: [{ rotate: counter }] }}>
                {open ? (
                  <Text style={{ color: c.accentFg, fontSize: 22, fontFamily: F.uiMedium, marginTop: -2 }}>✕</Text>
                ) : (
                  <Image source={current.icon} style={{ width: 22, height: 22, tintColor: c.accentFg }} />
                )}
              </Animated.View>
            </LinearGradient>
          </Animated.View>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  face: { position: 'absolute', bottom: 0, borderWidth: 1, borderBottomWidth: 0, overflow: 'hidden', alignItems: 'center' },
  bezel: { position: 'absolute', left: 22, right: 22, top: 22, bottom: 0, borderWidth: 1, borderBottomWidth: 0, borderStyle: 'dashed' },
  item: { position: 'absolute' },
  itemCircle: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dock: { position: 'absolute', bottom: 0, width: 132, borderTopLeftRadius: 66, borderTopRightRadius: 66, borderWidth: 1, borderBottomWidth: 0 },
  label: { position: 'absolute', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, borderWidth: 1 },
  dialHit: { position: 'absolute' },
  dial: { width: DIAL, height: DIAL, borderRadius: DIAL / 2, alignItems: 'center', justifyContent: 'center', elevation: 8 },
  dialRing: { position: 'absolute', top: 3, left: 3, right: 3, bottom: 3, borderRadius: DIAL / 2, borderWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.35)' },
  dialInner: { position: 'absolute', top: 9, left: 9, right: 9, bottom: 9, borderRadius: DIAL / 2, backgroundColor: 'rgba(0,0,0,0.15)' },
});
