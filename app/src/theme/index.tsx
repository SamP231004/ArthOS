import * as SecureStore from 'expo-secure-store';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Image, Platform, StyleSheet, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

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
} as const;

/** Every theme in picker order, with its display name and whether it's dark or light (for system UI). */
export const THEMES: { id: Mode; name: string; scheme: 'dark' | 'light' }[] = [
  { id: 'dark', name: 'Forest', scheme: 'dark' },
  { id: 'light', name: 'Ivory', scheme: 'light' },
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
  const n = parseInt(
    h.length === 3
      ? h
          .split('')
          .map((x) => x + x)
          .join('')
      : h,
    16,
  );
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

const KEY = 'arthos-theme';
const store = {
  get: async () => (Platform.OS === 'web' ? (globalThis.localStorage?.getItem(KEY) ?? null) : SecureStore.getItemAsync(KEY)),
  set: async (v: string) => (Platform.OS === 'web' ? globalThis.localStorage?.setItem(KEY, v) : SecureStore.setItemAsync(KEY, v)),
};

type Ctx = {
  mode: Mode;
  scheme: 'dark' | 'light';
  c: Palette;
  /** Switch theme; with an origin (screen point of the tapped control) it plays the circular reveal. */
  setMode: (m: Mode, origin?: { x: number; y: number }) => void;
  toggle: (origin?: { x: number; y: number }) => void;
  ready: boolean;
};
const ThemeContext = createContext<Ctx>({
  mode: 'dark',
  scheme: 'dark',
  c: palettes.dark,
  setMode: () => {},
  toggle: () => {},
  ready: false,
});

type Origin = { x: number; y: number };
type Reveal = { from: string; to?: string; x: number; y: number; r: number };

const frame = () => new Promise<void>((res) => requestAnimationFrame(() => res()));
type HostView = React.ComponentRef<typeof View>;
// lighter snapshots capture faster; they're only on screen for half a second
const shot = (ref: React.RefObject<HostView | null>) => captureRef(ref, { format: 'jpg', quality: 0.8, result: 'tmpfile' });
const START = 0.002; // starting scale of the circle (a dot at the control)

/**
 * Theme state plus the circular reveal (the app's version of the website's View Transition):
 * 1. snapshot the screen and freeze it on top, so the old theme stays on screen;
 * 2. switch the theme underneath and snapshot the new screen;
 * 3. grow a circle from the tapped control that shows the new screen, until it covers everything.
 * The growth runs on the native UI thread: the circle is drawn full-size and only *scaled*, while an inner layer is
 * scaled by the inverse so the new screen inside it stays perfectly still — smooth even while JS re-renders.
 * Each snapshot is shown only once it has decoded. If anything fails (or there's no origin) the theme just switches.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<Mode>('dark'); // dark is the default (blueprint §11)
  const [ready, setReady] = useState(false);
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [scale] = useState(() => new Animated.Value(START));
  const [inverse] = useState(() => Animated.divide(1, scale));
  const root = useRef<HostView>(null);
  // the app area's real size (not Dimensions "window", which on edge-to-edge Android excludes the system bars and
  // made the frozen snapshot render shorter — the screen appeared to jump up before the reveal)
  const size = useRef({ width: 0, height: 0 });
  const [frame0, setFrame0] = useState({ width: 0, height: 0 });
  const busy = useRef(false);
  // resolved by each snapshot Image's onLoad, so nothing is revealed before it has actually decoded
  const loaded = useRef<{ from?: () => void; to?: () => void }>({});
  const waitLoad = (k: 'from' | 'to') => new Promise<void>((res) => {
    const t = setTimeout(res, 600); // never hang on a missed onLoad
    loaded.current[k] = () => {
      clearTimeout(t);
      res();
    };
  });

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

  const setMode = useCallback(
    async (next: Mode, origin?: Origin) => {
      if (busy.current) return;
      if (!origin || Platform.OS === 'web') return commit(next);
      busy.current = true;
      try {
        // origin comes in window coordinates; make it relative to the app area the snapshots cover
        const off = await new Promise<{ x: number; y: number }>((res) => {
          const node = root.current as unknown as { measureInWindow?: (cb: (x: number, y: number) => void) => void } | null;
          if (node?.measureInWindow) node.measureInWindow((x, y) => res({ x, y }));
          else res({ x: 0, y: 0 });
        });
        const o = { x: origin.x - off.x, y: origin.y - off.y };
        const { width, height } = size.current.width ? size.current : Dimensions.get('window');
        setFrame0({ width, height });
        const r = Math.ceil(Math.hypot(Math.max(o.x, width - o.x), Math.max(o.y, height - o.y))) + 2;

        const from = await shot(root);
        scale.setValue(START);
        const fromShown = waitLoad('from');
        setReveal({ from, x: o.x, y: o.y, r });
        await fromShown; // the frozen old screen is really on top now
        commit(next);
        await frame();
        await frame(); // new theme has painted underneath
        const to = await shot(root);
        const toShown = waitLoad('to');
        setReveal({ from, to, x: o.x, y: o.y, r });
        await toShown;
        Animated.timing(scale, { toValue: 1, duration: 620, easing: Easing.bezier(0.65, 0, 0.35, 1), useNativeDriver: true }).start(() => {
          setReveal(null);
          busy.current = false;
        });
      } catch {
        commit(next);
        setReveal(null);
        busy.current = false;
      }
    },
    [commit, scale],
  );

  const toggle = useCallback((origin?: Origin) => setMode(mode === 'dark' ? 'light' : 'dark', origin), [mode, setMode]);

  const value = useMemo(
    () => ({
      mode,
      scheme: THEMES.find((t) => t.id === mode)?.scheme ?? 'dark',
      c: palettes[mode],
      setMode,
      toggle,
      ready,
    }),
    [mode, setMode, toggle, ready],
  );
  const { width, height } = frame0;
  const d = reveal ? reveal.r * 2 : 0;
  return (
    <ThemeContext.Provider value={value}>
      <View style={{ flex: 1 }}>
        <View
          ref={root}
          collapsable={false}
          style={{ flex: 1 }}
          onLayout={(e) => {
            size.current = { width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height };
          }}>
          {children}
        </View>
        {reveal && (
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
            {/* both snapshots drawn at exactly the captured area's size, so nothing shifts or rescales */}
            <Image
              source={{ uri: reveal.from }}
              fadeDuration={0}
              resizeMode="stretch"
              onLoad={() => loaded.current.from?.()}
              style={{ position: 'absolute', left: 0, top: 0, width, height }}
            />
            {reveal.to && (
              // full-size circle centred on the control, scaled up natively; the inner layer is scaled by the inverse
              // (around the same centre) so the new screen inside stays put while the circle grows
              <Animated.View
                style={{
                  position: 'absolute',
                  left: reveal.x - reveal.r,
                  top: reveal.y - reveal.r,
                  width: d,
                  height: d,
                  borderRadius: reveal.r,
                  overflow: 'hidden',
                  transform: [{ scale }],
                }}>
                <Animated.View style={{ width: d, height: d, transform: [{ scale: inverse }] }}>
                  <Image
                    source={{ uri: reveal.to }}
                    fadeDuration={0}
                    resizeMode="stretch"
                    onLoad={() => loaded.current.to?.()}
                    style={{ position: 'absolute', left: reveal.r - reveal.x, top: reveal.r - reveal.y, width, height }}
                  />
                </Animated.View>
              </Animated.View>
            )}
          </View>
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
