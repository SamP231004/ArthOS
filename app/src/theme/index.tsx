import * as SecureStore from 'expo-secure-store';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Platform, View } from 'react-native';

/**
 * ArthOS design tokens — the same values as web/src/app/globals.css, so the app and the website look identical.
 * Palette: Forest Green #06110C · Charcoal #171717 · Crimson #A31C1B.
 * Dark "Forest" (default): forest base, ivory type, crimson accent. Light "Ivory": paper base, charcoal type, forest accent.
 */
export const palettes = {
  dark: {
    bg: '#06110c',
    bg2: '#08160f',
    surface: '#0c1a13',
    surface2: '#11221a',
    surface3: '#182d23',
    line: 'rgba(214,232,222,0.08)',
    lineStrong: 'rgba(214,232,222,0.14)',
    fg: '#f2efe8',
    fg2: '#d9d4c9',
    muted: '#a5b0a9',
    subtle: '#718078',
    accent1: '#e8706a',
    accent2: '#c43a35',
    accent3: '#a31c1b',
    accentFg: '#fff7f3',
    brand: '#ec7a74',
    brandFg: '#ffffff',
    glow: 'rgba(196,58,53,',
    income: '#4cc38a',
    expense: '#f07167',
    warn: '#e8b45c',
    info: '#84b6d8',
    field: 'rgba(0,0,0,0.28)',
    c1: '#c94540',
    c2: '#4cc38a',
    c3: '#d9b26f',
    c4: '#84b6d8',
    c5: '#b9a5e2',
    c6: '#e8946a',
    c7: '#6fb7ae',
    c8: '#8a948e',
    logo1: '#c43a35',
    logo2: '#a31c1b',
    logo3: '#6e1110',
    logoFg: '#fff7f3',
  },
  light: {
    bg: '#f6f4ef',
    bg2: '#efebe3',
    surface: '#ffffff',
    surface2: '#f8f6f2',
    surface3: '#eeeae2',
    line: 'rgba(23,23,23,0.08)',
    lineStrong: 'rgba(23,23,23,0.14)',
    fg: '#171717',
    fg2: '#2d2d2b',
    muted: '#5e5d58',
    subtle: '#8b8982',
    accent1: '#2f6e55',
    accent2: '#1d4d3b',
    accent3: '#0c2b20',
    accentFg: '#f6f4ef',
    brand: '#1d5a44',
    brandFg: '#ffffff',
    glow: 'rgba(29,77,59,',
    income: '#16794c',
    expense: '#b42318',
    warn: '#a86b12',
    info: '#2c6e9b',
    field: '#ffffff',
    c1: '#1d4d3b',
    c2: '#b88a3e',
    c3: '#2c6e9b',
    c4: '#9c4a3a',
    c5: '#6b4fa8',
    c6: '#2a8c80',
    c7: '#c8643c',
    c8: '#8b8982',
    logo1: '#c43a35',
    logo2: '#a31c1b',
    logo3: '#6e1110',
    logoFg: '#fff7f3',
  },
  cobalt: {
    bg: '#030407',
    bg2: '#05070c',
    surface: '#0a0e17',
    surface2: '#0f1420',
    surface3: '#161d2d',
    line: 'rgba(196,212,255,0.08)',
    lineStrong: 'rgba(196,212,255,0.15)',
    fg: '#eef1f7',
    fg2: '#d3d9e6',
    muted: '#9aa4b8',
    subtle: '#677189',
    accent1: '#3d7bf0',
    accent2: '#1f63d8',
    accent3: '#1558c9',
    accentFg: '#ffffff',
    brand: '#d4ff24',
    brandFg: '#030407',
    glow: 'rgba(21,88,201,',
    income: '#3ddc97',
    expense: '#ff6b6b',
    warn: '#ffb547',
    info: '#7aa7ff',
    field: 'rgba(0,0,0,0.4)',
    c1: '#3d7bf0',
    c2: '#d4ff24',
    c3: '#3ddc97',
    c4: '#8fb3ff',
    c5: '#b9a5ff',
    c6: '#ff8a5c',
    c7: '#4fd1d9',
    c8: '#7f889c',
    logo1: '#3d7bf0',
    logo2: '#1558c9',
    logo3: '#0b3a8c',
    logoFg: '#d4ff24',
  },
  noir: {
    bg: '#08090b',
    bg2: '#0b0c0f',
    surface: '#111216',
    surface2: '#17181d',
    surface3: '#1f2026',
    line: 'rgba(245,243,239,0.08)',
    lineStrong: 'rgba(245,243,239,0.15)',
    fg: '#f5f3ef',
    fg2: '#dcd9d2',
    muted: '#a3a09a',
    subtle: '#75736e',
    accent1: '#ffdc4d',
    accent2: '#ffc900',
    accent3: '#e0a800',
    accentFg: '#08090b',
    brand: '#ffc900',
    brandFg: '#08090b',
    glow: 'rgba(255,201,0,',
    income: '#5fd39a',
    expense: '#ff6b5e',
    warn: '#ff9f43',
    info: '#8ab4f8',
    field: 'rgba(0,0,0,0.4)',
    c1: '#ffc900',
    c2: '#5fd39a',
    c3: '#8ab4f8',
    c4: '#ff8a5c',
    c5: '#c3a6ff',
    c6: '#4fd1d9',
    c7: '#e0a800',
    c8: '#8a8780',
    logo1: '#ffdc4d',
    logo2: '#ffc900',
    logo3: '#c99400',
    logoFg: '#08090b',
  },
} as const;

/** Every theme in picker order, with its display name and whether it's dark or light (for system UI). */
export const THEMES: { id: Mode; name: string; scheme: 'dark' | 'light' }[] = [
  { id: 'dark', name: 'Forest', scheme: 'dark' },
  { id: 'light', name: 'Ivory', scheme: 'light' },
  { id: 'cobalt', name: 'Cobalt', scheme: 'dark' },
  { id: 'noir', name: 'Noir Gold', scheme: 'dark' },
];

export type Mode = keyof typeof palettes;
export type Palette = { [K in keyof (typeof palettes)['dark']]: string };

/** Font families (custom fonts on Android need one family per weight — never combine with fontWeight). */
export const F = {
  display: 'Newsreader_400Regular',
  displayItalic: 'Newsreader_400Regular_Italic',
  displayMedium: 'Newsreader_500Medium',
  ui: 'Manrope_400Regular',
  uiMedium: 'Manrope_500Medium',
  uiSemibold: 'Manrope_600SemiBold',
  uiBold: 'Manrope_700Bold',
  mono: 'IBMPlexMono_400Regular',
  deva: 'TiroDevanagariHindi_400Regular',
} as const;

export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const R = { sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, pill: 999 } as const;

/** Translucent version of a hex colour, e.g. alpha(c.brand, 0.12). */
export function alpha(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

const KEY = 'arthos-theme';
const store = {
  get: async () => (Platform.OS === 'web' ? globalThis.localStorage?.getItem(KEY) ?? null : SecureStore.getItemAsync(KEY)),
  set: async (v: string) => (Platform.OS === 'web' ? globalThis.localStorage?.setItem(KEY, v) : SecureStore.setItemAsync(KEY, v)),
};

type Ctx = {
  mode: Mode;
  scheme: 'dark' | 'light';
  c: Palette;
  /** Switch to a theme; with an origin (screen point of the tapped control) it plays the circular reveal. */
  setMode: (m: Mode, origin?: { x: number; y: number }) => void;
  toggle: (origin?: { x: number; y: number }) => void;
  ready: boolean;
};
const ThemeContext = createContext<Ctx>({ mode: 'dark', scheme: 'dark', c: palettes.dark, setMode: () => {}, toggle: () => {}, ready: false });

type Origin = { x: number; y: number };
type Reveal = { id: number; x: number; y: number; d: number; color: string; next: Mode };

/**
 * Theme state plus the switch animation. The theme switches at once and a ripple in the new theme's accent spreads
 * from the tapped control while fading out. (An earlier version covered the screen with the new background until the
 * app repainted, which read as the screen going black on the dark themes.)
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<Mode>('dark'); // dark is the default (blueprint §11)
  const [ready, setReady] = useState(false);
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [grow] = useState(() => new Animated.Value(0));
  const [fade] = useState(() => new Animated.Value(1));
  const busy = useRef(false);

  useEffect(() => {
    store
      .get()
      .then((v) => v && v in palettes && setModeState(v as Mode))
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const commit = useCallback((next: Mode) => {
    setModeState(next);
    store.set(next).catch(() => {});
  }, []);

  const choose = useCallback(
    (next: Mode, origin?: Origin) => {
      if (next === mode || busy.current) return;
      if (!origin) return commit(next);
      const { width, height } = Dimensions.get('window');
      // diameter that reaches the farthest corner from the origin
      const d = 2 * Math.hypot(Math.max(origin.x, width - origin.x), Math.max(origin.y, height - origin.y));
      busy.current = true;
      grow.setValue(0);
      fade.setValue(1);
      commit(next); // switch immediately — the ripple plays over the new theme, never hiding the screen
      setReveal({ id: Date.now(), x: origin.x, y: origin.y, d, color: palettes[next].accent2, next });
    },
    [mode, commit, grow, fade],
  );

  useEffect(() => {
    if (!reveal) return;
    // grow and fade together: a soft wave that starts as a tint at the control and is gone by the screen's edge
    fade.setValue(0.32);
    Animated.parallel([
      Animated.timing(grow, { toValue: 1, duration: 620, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(fade, { toValue: 0, duration: 620, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]).start(() => {
      setReveal(null);
      busy.current = false;
    });
  }, [reveal, grow, fade]);

  /** Steps to the next theme in picker order, revealing from `origin` when given. */
  const toggle = useCallback(
    (origin?: Origin) => choose(THEMES[(THEMES.findIndex((t) => t.id === mode) + 1) % THEMES.length].id, origin),
    [mode, choose],
  );

  const value = useMemo(
    () => ({ mode, scheme: THEMES.find((t) => t.id === mode)?.scheme ?? 'dark', c: palettes[mode], setMode: choose, toggle, ready }),
    [mode, choose, toggle, ready],
  );
  return (
    <ThemeContext.Provider value={value}>
      <View style={{ flex: 1 }}>
        {children}
        {reveal && (
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: reveal.x - reveal.d / 2,
              top: reveal.y - reveal.d / 2,
              width: reveal.d,
              height: reveal.d,
              borderRadius: reveal.d / 2,
              backgroundColor: reveal.color,
              opacity: fade,
              transform: [{ scale: grow.interpolate({ inputRange: [0, 1], outputRange: [0.001, 1] }) }],
            }}
          />
        )}
      </View>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

/** Memoised, theme-aware StyleSheet: `const s = useStyles(makeStyles)` where makeStyles = (c) => StyleSheet.create(...) */
export function useStyles<T>(factory: (c: Palette, mode: Mode) => T): T {
  const { c, mode } = useTheme();
  return useMemo(() => factory(c, mode), [factory, c, mode]);
}
