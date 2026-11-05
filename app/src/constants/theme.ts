// ArthOS design tokens (dark "Forest" theme), kept in sync with web/src/app/globals.css.
export const C = {
  bg: '#06110c', // forest green
  surface: '#0c1a13',
  surface2: '#11221a',
  border: '#1e3329',
  fg: '#f2efe8',
  muted: '#a5b0a9',
  brand: '#b52a27', // crimson for fills (buttons, active states)
  brandText: '#ec7a74', // crimson tuned for text on forest
  brandFg: '#fff7f3',
  income: '#4cc38a',
  expense: '#f07167',
  warn: '#e8b45c',
  info: '#84b6d8',
} as const;

export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const R = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 } as const;
