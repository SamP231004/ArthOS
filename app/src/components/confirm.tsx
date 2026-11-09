import { useEffect, useState } from 'react';
import { Animated, Easing, Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';

import { alpha, F, R, S, useTheme } from '@/theme';

/**
 * Themed confirmation sheet, replacing Android's grey system dialog. Call `confirm({...})` from anywhere; it resolves
 * true when the action is confirmed. `<ConfirmHost />` is mounted once in the root layout.
 */
type Options = {
  title: string;
  body?: string;
  confirmText?: string;
  cancelText?: string;
  /** danger = destructive action (red button and icon) */
  tone?: 'danger' | 'default';
  /** A single glyph shown in the icon circle. */
  icon?: string;
};

/** `closing` keeps the sheet mounted while it animates away. */
type State = { opts: Options | null; closing: boolean; resolve: ((ok: boolean) => void) | null };
const useConfirmStore = create<State>(() => ({ opts: null, closing: false, resolve: null }));

export function confirm(opts: Options): Promise<boolean> {
  return new Promise((resolve) => {
    useConfirmStore.getState().resolve?.(false); // a newer dialog replaces an open one
    useConfirmStore.setState({ opts, closing: false, resolve });
  });
}

export function ConfirmHost() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { opts: shown, closing, resolve } = useConfirmStore();
  const [anim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!shown) return;
    if (!closing) {
      anim.setValue(0);
      Animated.timing(anim, { toValue: 1, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    } else {
      Animated.timing(anim, { toValue: 0, duration: 180, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() =>
        useConfirmStore.setState({ opts: null, closing: false }),
      );
    }
  }, [shown, closing, anim]);

  const close = (ok: boolean) => {
    if (closing) return;
    resolve?.(ok);
    useConfirmStore.setState({ closing: true, resolve: null });
  };

  if (!shown) return null;
  const danger = shown.tone === 'danger';
  const tone = danger ? c.expense : c.fg;

  return (
    <Modal transparent visible statusBarTranslucent animationType="none" onRequestClose={() => close(false)}>
      <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', opacity: anim }}>
        <Pressable style={{ flex: 1 }} onPress={() => close(false)} accessibilityLabel="Cancel" />
      </Animated.View>
      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: c.surface,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          borderWidth: 1,
          borderBottomWidth: 0,
          borderColor: c.line,
          paddingHorizontal: S.lg,
          paddingTop: S.md,
          paddingBottom: insets.bottom + S.lg,
          gap: S.md,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [320, 0] }) }],
        }}
        accessibilityViewIsModal
      >
        <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: c.lineStrong }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, marginTop: S.xs }}>
          <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: alpha(tone, 0.1), alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: tone, fontSize: 20, fontFamily: F.uiSemibold }}>{shown.icon ?? (danger ? '!' : '?')}</Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: c.fg, fontFamily: F.display, fontSize: 24, letterSpacing: -0.4 }}>{shown.title}</Text>
            {shown.body ? <Text style={{ color: c.muted, fontFamily: F.ui, fontSize: 14, lineHeight: 20 }}>{shown.body}</Text> : null}
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: S.sm, marginTop: S.xs }}>
          <Pressable
            onPress={() => close(false)}
            accessibilityRole="button"
            style={({ pressed }) => ({ flex: 1, height: 52, borderRadius: R.md, borderWidth: 1, borderColor: c.lineStrong, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}
          >
            <Text style={{ color: c.fg, fontFamily: F.uiSemibold, fontSize: 15 }}>{shown.cancelText ?? 'Cancel'}</Text>
          </Pressable>
          <Pressable
            onPress={() => close(true)}
            accessibilityRole="button"
            style={({ pressed }) => ({
              flex: 1,
              height: 52,
              borderRadius: R.md,
              backgroundColor: danger ? c.expense : c.brand,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text style={{ color: danger ? '#ffffff' : c.brandFg, fontFamily: F.uiSemibold, fontSize: 15 }}>{shown.confirmText ?? 'Confirm'}</Text>
          </Pressable>
        </View>
      </Animated.View>
    </Modal>
  );
}
