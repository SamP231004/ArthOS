// The widget library calls these components as plain functions (not through React's renderer), so the React
// Compiler's memoisation hooks would throw "Invalid hook call" and leave every widget blank. Opt this file out.
"use no memo";

import { FlexWidget, TextWidget } from 'react-native-android-widget';

import { money } from '@/lib/format';

import type { WidgetPrefs, WidgetSnapshot, WidgetState } from './data';

/**
 * Home-screen widget layouts (Phase 6). These are not React Native views: react-native-android-widget turns them into
 * native Android RemoteViews, so only its Flex/Text primitives are used. Colours mirror the app's Forest/Ivory tokens.
 */

export const WIDGET_NAMES = ['SafeToSpend', 'MonthSnapshot', 'Portfolio', 'QuickAdd'] as const;
export type WidgetName = (typeof WIDGET_NAMES)[number];

type Hex = `#${string}`;
type Tone = {
  bg: Hex;
  surface: Hex;
  line: Hex;
  fg: Hex;
  muted: Hex;
  subtle: Hex;
  brand: Hex;
  brandFg: Hex;
  income: Hex;
  expense: Hex;
  warn: Hex;
  track: Hex;
};

// same values as app/src/theme palettes (dark = Forest, light = Ivory)
const TONES: Record<'dark' | 'light', Tone> = {
  dark: {
    bg: '#0c1a13',
    surface: '#11221a',
    line: '#1f3329',
    fg: '#f2efe8',
    muted: '#a5b0a9',
    subtle: '#718078',
    brand: '#ec7a74',
    brandFg: '#ffffff',
    income: '#4cc38a',
    expense: '#f07167',
    warn: '#e8b45c',
    track: '#1d2f26',
  },
  light: {
    bg: '#ffffff',
    surface: '#f8f6f2',
    line: '#e6e2d9',
    fg: '#171717',
    muted: '#5e5d58',
    subtle: '#8b8982',
    brand: '#1d5a44',
    brandFg: '#ffffff',
    income: '#16794c',
    expense: '#b42318',
    warn: '#a86b12',
    track: '#ece8df',
  },
};

const UI = 'Manrope_500Medium';
const UI_BOLD = 'Manrope_700Bold';
const DISPLAY = 'Newsreader_500Medium';

type Props = { state: WidgetState; prefs: WidgetPrefs; scheme: 'dark' | 'light'; width: number; height: number };

export function renderWidgetFor(name: string, p: Props) {
  switch (name as WidgetName) {
    case 'SafeToSpend':
      return <SafeToSpend {...p} />;
    case 'MonthSnapshot':
      return <MonthSnapshot {...p} />;
    case 'Portfolio':
      return <PortfolioWidget {...p} />;
    case 'QuickAdd':
      return <QuickAdd {...p} />;
    default:
      return <SafeToSpend {...p} />;
  }
}

// ------------------------------------------------------------------ helpers

function fmt(n: number | undefined | null, d: WidgetSnapshot, prefs: WidgetPrefs, compact = false) {
  if (prefs.hideAmounts) return '₹ ••••';
  return money(Math.round(n ?? 0), d.currency, compact);
}

function pct(n: number | undefined | null) {
  const v = n ?? 0;
  return `${Math.abs(v) >= 10 ? Math.round(Math.abs(v)) : Math.abs(v).toFixed(1)}%`;
}

function statusTone(t: Tone, status?: string) {
  return status === 'OVER' || status === 'OVER_MONTH' ? t.expense : status === 'CAUTION' ? t.warn : t.income;
}

function statusLabel(status?: string) {
  switch (status) {
    case 'OVER_MONTH':
      return 'Over budget';
    case 'OVER':
      return 'Over today';
    case 'CAUTION':
      return 'Careful';
    default:
      return 'On track';
  }
}

function Shell({ t, children, uri, label, padding = 14 }: { t: Tone; children: React.ReactNode; uri: string; label: string; padding?: number }) {
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri }}
      accessibilityLabel={label}
      style={{ height: 'match_parent', width: 'match_parent', backgroundColor: t.bg, borderRadius: 22, borderWidth: 1, borderColor: t.line, padding, flexDirection: 'column', justifyContent: 'space-between' }}
    >
      {children}
    </FlexWidget>
  );
}

function Header({ t, title, right }: { t: Tone; title: string; right?: string }) {
  return (
    <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
        <FlexWidget style={{ height: 18, width: 18, borderRadius: 6, backgroundColor: '#a31c1b', alignItems: 'center', justifyContent: 'center', marginRight: 6 }}>
          <TextWidget text="अ" style={{ fontSize: 10, color: '#fff7f3', fontFamily: UI_BOLD }} />
        </FlexWidget>
        <TextWidget text={title} style={{ fontSize: 12, color: t.muted, fontFamily: UI }} maxLines={1} />
      </FlexWidget>
      {right ? <TextWidget text={right} style={{ fontSize: 10.5, color: t.subtle, fontFamily: UI }} maxLines={1} /> : null}
    </FlexWidget>
  );
}

/** A horizontal bar: `value` of 100 filled, optional `marker` (e.g. how much of the month has passed). */
function Bar({ t, value, color, width, height = 6 }: { t: Tone; value: number; color: Hex; width: number; height?: number }) {
  const w = Math.max(0, Math.round(width));
  const fill = Math.max(0, Math.min(w, Math.round((w * Math.min(100, Math.max(0, value))) / 100)));
  return (
    <FlexWidget style={{ width: w, height, borderRadius: height, backgroundColor: t.track, flexDirection: 'row' }}>
      {fill > 0 ? <FlexWidget style={{ width: fill, height, borderRadius: height, backgroundColor: color }} /> : null}
    </FlexWidget>
  );
}

function Message({ t, title, body, uri, label }: { t: Tone; title: string; body: string; uri: string; label: string }) {
  return (
    <Shell t={t} uri={uri} label={label}>
      <Header t={t} title="ArthOS" />
      <FlexWidget style={{ flexDirection: 'column' }}>
        <TextWidget text={title} style={{ fontSize: 15, color: t.fg, fontFamily: UI_BOLD }} maxLines={2} />
        <TextWidget text={body} style={{ fontSize: 11.5, color: t.muted, fontFamily: UI, marginTop: 2 }} maxLines={3} />
      </FlexWidget>
    </Shell>
  );
}

/** Shown if a widget fails to build: the message makes the problem visible instead of an empty box. */
export function errorWidget(e: unknown, _size: { width: number; height: number }) {
  const t = TONES.dark;
  const msg = e instanceof Error ? e.message : String(e);
  return <Message t={t} title="Widget error" body={`${msg}`.slice(0, 140)} uri="arthos://" label="Open ArthOS" />;
}

/** Loading / signed-out / unreachable states shared by every data widget; null when there is data to show. */
function fallback(p: Props, t: Tone) {
  if (p.state.kind === 'loading') return <Message t={t} title="ArthOS" body="Loading your numbers…" uri="arthos://" label="Open ArthOS" />;
  if (p.state.kind === 'signed-out') return <Message t={t} title="Sign in to ArthOS" body="Your numbers will show up here." uri="arthos://" label="Open ArthOS to sign in" />;
  if (p.state.kind === 'error') return <Message t={t} title="Can't reach ArthOS" body="Tap to open the app; the widget refreshes on its own." uri="arthos://" label="Open ArthOS" />;
  return null;
}

function asOf(state: WidgetState) {
  if (state.kind !== 'ok') return undefined;
  const d = new Date(state.data.generatedAt);
  const time = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  return state.stale ? `as of ${time}` : time;
}

// ------------------------------------------------------------------ Safe to spend (small)

function SafeToSpend(p: Props) {
  const t = TONES[p.scheme];
  const f = fallback(p, t);
  if (f || p.state.kind !== 'ok') return f;
  const d = p.state.data;
  const b = d.budget;
  if (!b.configured) {
    return <Message t={t} title="Set a budget" body="ArthOS turns it into one number: what you can spend today." uri="arthos://budget" label="Set a budget in ArthOS" />;
  }
  const tone = statusTone(t, b.status);
  return (
    <Shell t={t} uri="arthos://budget" label={`Safe to spend today ${fmt(b.todayRemaining, d, p.prefs)}`}>
      <Header t={t} title="Safe today" right={asOf(p.state)} />
      <FlexWidget style={{ flexDirection: 'column' }}>
        <TextWidget text={fmt(b.todayRemaining, d, p.prefs)} style={{ fontSize: 30, color: tone, fontFamily: DISPLAY, adjustsFontSizeToFit: true }} maxLines={1} />
        <TextWidget
          text={`of ${fmt(b.todayAllowance, d, p.prefs)} · ${b.daysRemaining} day${b.daysRemaining === 1 ? '' : 's'} left`}
          style={{ fontSize: 11, color: t.muted, fontFamily: UI }}
          maxLines={1}
        />
      </FlexWidget>
      <FlexWidget style={{ flexDirection: 'column' }}>
        <Bar t={t} value={b.usedPct ?? 0} color={tone} width={p.width - 28} />
        <TextWidget text={`${Math.round(b.usedPct ?? 0)}% of month used · ${statusLabel(b.status)}`} style={{ fontSize: 10, color: t.subtle, fontFamily: UI, marginTop: 4 }} maxLines={1} />
      </FlexWidget>
    </Shell>
  );
}

// ------------------------------------------------------------------ Month snapshot (medium)

function MonthSnapshot(p: Props) {
  const t = TONES[p.scheme];
  const f = fallback(p, t);
  if (f || p.state.kind !== 'ok') return f;
  const d = p.state.data;
  const b = d.budget;
  const m = d.money;
  const monthName = new Date(`${d.month}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'long' });
  const tone = b.configured ? statusTone(t, b.status) : t.brand;
  const inner = p.width - 28;
  return (
    <Shell t={t} uri="arthos://" label={`${monthName}: spent ${fmt(m.spent, d, p.prefs)}, left to spend ${fmt(m.leftToSpend, d, p.prefs)}`}>
      <Header t={t} title={`${monthName} so far`} right={b.configured ? statusLabel(b.status) : asOf(p.state)} />
      <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <FlexWidget style={{ flexDirection: 'column' }}>
          <TextWidget text="Spent" style={{ fontSize: 10.5, color: t.subtle, fontFamily: UI }} />
          <TextWidget text={fmt(m.spent, d, p.prefs)} style={{ fontSize: 24, color: t.fg, fontFamily: DISPLAY }} maxLines={1} />
        </FlexWidget>
        {b.configured ? (
          <TextWidget text={`of ${fmt(b.limit, d, p.prefs)} budget`} style={{ fontSize: 11, color: t.muted, fontFamily: UI, marginBottom: 4 }} maxLines={1} />
        ) : null}
      </FlexWidget>
      {b.configured ? <Bar t={t} value={b.usedPct ?? 0} color={tone} width={inner} height={7} /> : null}
      <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', justifyContent: 'space-between' }}>
        <Stat t={t} label="Left to spend" value={fmt(m.leftToSpend, d, p.prefs)} sub={m.perDayLeft != null && !p.prefs.hideAmounts ? `${fmt(m.perDayLeft, d, p.prefs)}/day` : undefined} color={m.leftToSpend < 0 ? t.expense : t.fg} />
        <Stat t={t} label="Saved first" value={fmt(m.savedFirst, d, p.prefs)} color={t.income} />
        {b.configured ? <Stat t={t} label="Safe today" value={fmt(b.todayRemaining, d, p.prefs)} color={tone} /> : null}
      </FlexWidget>
    </Shell>
  );
}

function Stat({ t, label, value, sub, color }: { t: Tone; label: string; value: string; sub?: string; color: Hex }) {
  return (
    <FlexWidget style={{ flexDirection: 'column' }}>
      <TextWidget text={label} style={{ fontSize: 10, color: t.subtle, fontFamily: UI }} maxLines={1} />
      <TextWidget text={value} style={{ fontSize: 13.5, color, fontFamily: UI_BOLD }} maxLines={1} />
      {sub ? <TextWidget text={sub} style={{ fontSize: 9.5, color: t.subtle, fontFamily: UI }} maxLines={1} /> : null}
    </FlexWidget>
  );
}

// ------------------------------------------------------------------ Portfolio

function PortfolioWidget(p: Props) {
  const t = TONES[p.scheme];
  const f = fallback(p, t);
  if (f || p.state.kind !== 'ok') return f;
  const d = p.state.data;
  const pf = d.portfolio;
  if (!pf) return <Message t={t} title="No investments yet" body="Add stocks, mutual funds, gold or bonds to track them here." uri="arthos://invest" label="Add investments in ArthOS" />;
  const dayUp = pf.dayChange >= 0;
  const allUp = pf.gain >= 0;
  return (
    <Shell t={t} uri="arthos://invest" label={`Portfolio ${fmt(pf.value, d, p.prefs)}`}>
      <Header t={t} title="Portfolio" right={`${pf.holdingsCount} holding${pf.holdingsCount === 1 ? '' : 's'}`} />
      <TextWidget text={fmt(pf.value, d, p.prefs, true)} style={{ fontSize: 28, color: t.fg, fontFamily: DISPLAY, adjustsFontSizeToFit: true }} maxLines={1} />
      <FlexWidget style={{ flexDirection: 'column' }}>
        <TextWidget
          text={`${dayUp ? '▲' : '▼'} ${p.prefs.hideAmounts ? '' : `${fmt(Math.abs(pf.dayChange), d, p.prefs)} `}(${pct(pf.dayChangePct)}) today`}
          style={{ fontSize: 12, color: dayUp ? t.income : t.expense, fontFamily: UI_BOLD }}
          maxLines={1}
        />
        <TextWidget
          text={`${allUp ? '+' : '−'}${p.prefs.hideAmounts ? '' : `${fmt(Math.abs(pf.gain), d, p.prefs, true)} `}(${pct(pf.gainPct)}) overall`}
          style={{ fontSize: 11, color: t.muted, fontFamily: UI, marginTop: 2 }}
          maxLines={1}
        />
      </FlexWidget>
    </Shell>
  );
}

// ------------------------------------------------------------------ Quick add

function QuickAdd(p: Props) {
  const t = TONES[p.scheme];
  const tall = p.height >= 100;
  return (
    <FlexWidget
      style={{ height: 'match_parent', width: 'match_parent', backgroundColor: t.bg, borderRadius: 22, borderWidth: 1, borderColor: t.line, padding: 8, flexDirection: tall ? 'column' : 'row', flexGap: 8 }}
    >
      <Action t={t} text="+ Expense" uri="arthos://expense-form" primary />
      <Action t={t} text="Scan" uri="arthos://scan" />
      {tall ? <Action t={t} text="+ Income" uri="arthos://income-form" /> : null}
    </FlexWidget>
  );
}

function Action({ t, text, uri, primary }: { t: Tone; text: string; uri: string; primary?: boolean }) {
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri }}
      accessibilityLabel={text}
      style={{ flex: 1, height: 'match_parent', width: 'match_parent', borderRadius: 16, backgroundColor: primary ? t.brand : t.surface, alignItems: 'center', justifyContent: 'center' }}
    >
      <TextWidget text={text} style={{ fontSize: 13, color: primary ? t.brandFg : t.fg, fontFamily: UI_BOLD }} maxLines={1} />
    </FlexWidget>
  );
}
