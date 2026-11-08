import * as SecureStore from 'expo-secure-store';

import { API_URL } from '@/lib/api';

/**
 * Data for the home-screen widgets. Widgets render in a headless JS task (the app may not be running), so this reads
 * the session straight from SecureStore instead of the app's stores, and keeps the last good snapshot so a widget is
 * never blank when the phone is offline or the server is waking up.
 */

/** Mirrors backend/src/main/java/com/arthos/widget/WidgetController.java */
export type WidgetSnapshot = {
  month: string;
  currency: string;
  today: string;
  dayOfMonth: number;
  daysInMonth: number;
  budget: {
    configured: boolean;
    todayRemaining?: number;
    todayAllowance?: number;
    spentToday?: number;
    spentMonth?: number;
    limit?: number;
    remainingMonth?: number;
    usedPct?: number;
    elapsedPct?: number;
    status?: 'ON_TRACK' | 'CAUTION' | 'OVER' | 'OVER_MONTH' | 'UPCOMING' | 'COMPLETED';
    mode?: string;
    daysRemaining: number;
  };
  money: { income: number; spent: number; savedFirst: number; spendable: number; leftToSpend: number; perDayLeft?: number; savingsBalance?: number };
  portfolio?: { value: number; invested: number; gain: number; gainPct?: number; dayChange: number; dayChangePct?: number; holdingsCount: number };
  generatedAt: string;
};

export type WidgetState =
  | { kind: 'loading' }
  | { kind: 'signed-out' }
  | { kind: 'ok'; data: WidgetSnapshot; stale: boolean }
  | { kind: 'error' };

export type WidgetTheme = 'app' | 'dark' | 'light';
export type WidgetPrefs = { theme: WidgetTheme; hideAmounts: boolean };
export const DEFAULT_PREFS: WidgetPrefs = { theme: 'app', hideAmounts: false };

const AUTH_KEY = 'arthos-auth'; // the app's persisted session (zustand persist format)
const CACHE_KEY = 'arthos-widget-cache';
const THEME_KEY = 'arthos-theme';
const prefsKey = (widgetId: number) => `arthos-widget-${widgetId}`;

async function token(): Promise<string | null> {
  try {
    const raw = await SecureStore.getItemAsync(AUTH_KEY);
    return raw ? (JSON.parse(raw)?.state?.token ?? null) : null;
  } catch {
    return null;
  }
}

export async function cachedSnapshot(): Promise<WidgetState | null> {
  if (!(await token())) return { kind: 'signed-out' };
  try {
    const raw = await SecureStore.getItemAsync(CACHE_KEY);
    return raw ? { kind: 'ok', data: JSON.parse(raw), stale: true } : null;
  } catch {
    return null;
  }
}

/** Fresh numbers from the backend; falls back to the last good snapshot. */
export async function loadSnapshot(timeoutMs = 20_000): Promise<WidgetState> {
  const t = await token();
  if (!t) {
    await SecureStore.deleteItemAsync(CACHE_KEY).catch(() => {});
    return { kind: 'signed-out' };
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_URL}/api/widget`, { headers: { Authorization: `Bearer ${t}`, Accept: 'application/json' }, signal: ctrl.signal });
    if (res.status === 401) return { kind: 'signed-out' };
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as WidgetSnapshot;
    await SecureStore.setItemAsync(CACHE_KEY, JSON.stringify(data)).catch(() => {});
    return { kind: 'ok', data, stale: false };
  } catch {
    return (await cachedSnapshot()) ?? { kind: 'error' };
  } finally {
    clearTimeout(timer);
  }
}

export async function readPrefs(widgetId: number): Promise<WidgetPrefs> {
  try {
    const raw = await SecureStore.getItemAsync(prefsKey(widgetId));
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

export async function writePrefs(widgetId: number, prefs: WidgetPrefs): Promise<void> {
  await SecureStore.setItemAsync(prefsKey(widgetId), JSON.stringify(prefs)).catch(() => {});
}

export async function deletePrefs(widgetId: number): Promise<void> {
  await SecureStore.deleteItemAsync(prefsKey(widgetId)).catch(() => {});
}

/** The app's current theme, when the app itself triggers a refresh (fresher than storage mid-switch). */
let appScheme: 'dark' | 'light' | null = null;
export function setAppScheme(s: 'dark' | 'light') {
  appScheme = s;
}

/** 'app' follows the theme chosen in the app (Forest by default). */
export async function resolveScheme(theme: WidgetTheme): Promise<'dark' | 'light'> {
  if (theme !== 'app') return theme;
  if (appScheme) return appScheme;
  try {
    return (await SecureStore.getItemAsync(THEME_KEY)) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}
