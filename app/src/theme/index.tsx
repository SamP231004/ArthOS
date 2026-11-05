import * as SecureStore from 'expo-secure-store';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

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
  },
} as const;

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

type Ctx = { mode: Mode; c: Palette; toggle: () => void; ready: boolean };
const ThemeContext = createContext<Ctx>({ mode: 'dark', c: palettes.dark, toggle: () => {}, ready: false });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<Mode>('dark'); // dark is the default (blueprint §11)
  const [ready, setReady] = useState(false);

  useEffect(() => {
    store
      .get()
      .then((v) => v === 'light' && setMode('light'))
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const toggle = useCallback(() => {
    setMode((m) => {
      const next = m === 'dark' ? 'light' : 'dark';
      store.set(next).catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo(() => ({ mode, c: palettes[mode], toggle, ready }), [mode, toggle, ready]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

/** Memoised, theme-aware StyleSheet: `const s = useStyles(makeStyles)` where makeStyles = (c) => StyleSheet.create(...) */
export function useStyles<T>(factory: (c: Palette, mode: Mode) => T): T {
  const { c, mode } = useTheme();
  return useMemo(() => factory(c, mode), [factory, c, mode]);
}
