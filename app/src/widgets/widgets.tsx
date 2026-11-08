// The widget library calls these components as plain functions (not through React's renderer), so the React
// Compiler's memoisation hooks would throw "Invalid hook call" and leave every widget blank. Opt this file out.
"use no memo";

import { FlexWidget, ImageWidget, OverlapWidget, SvgWidget, TextWidget } from 'react-native-android-widget';

import { money } from '@/lib/format';

import type { WidgetPrefs, WidgetSnapshot, WidgetState } from './data';

/**
 * Home-screen widget layouts (Phase 6). These are not React Native views: react-native-android-widget turns them into
 * native Android RemoteViews, so only its Flex/Text/Image/Svg primitives are used. Colours mirror the app's
 * Forest/Ivory tokens. Layouts read the widget's real size and drop secondary rows rather than letting text get cut.
 *
 * Buttons inside widgets (handled in task-handler.tsx):
 *   TOGGLE_HIDE — the eye: hide/show amounts on this widget
 *   REFRESH     — fetch fresh numbers now
 */

export const WIDGET_NAMES = ['SafeToSpend', 'MonthSnapshot', 'Portfolio', 'QuickAdd'] as const;
export type WidgetName = (typeof WIDGET_NAMES)[number];

type Hex = `#${string}`;
type Tone = { bg: Hex; surface: Hex; line: Hex; fg: Hex; muted: Hex; subtle: Hex; brand: Hex; brandFg: Hex; income: Hex; expense: Hex; warn: Hex; track: Hex };

// same values as app/src/theme palettes (dark = Forest, light = Ivory)
const TONES: Record<'dark' | 'light', Tone> = {
  dark: { bg: '#0c1a13', surface: '#152a20', line: '#1f3329', fg: '#f2efe8', muted: '#a5b0a9', subtle: '#7d8b83', brand: '#ec7a74', brandFg: '#ffffff', income: '#4cc38a', expense: '#f07167', warn: '#e8b45c', track: '#1d2f26' },
  light: { bg: '#ffffff', surface: '#f3f0ea', line: '#e6e2d9', fg: '#171717', muted: '#5e5d58', subtle: '#8b8982', brand: '#1d5a44', brandFg: '#ffffff', income: '#16794c', expense: '#b42318', warn: '#a86b12', track: '#ece8df' },
};

const UI = 'Manrope_500Medium';
const UI_BOLD = 'Manrope_700Bold';
const DISPLAY = 'Newsreader_500Medium';
const LOGO = require('../../assets/images/icon-mark.png');

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

const HIDDEN = '₹ ••••';

function fmt(n: number | undefined | null, d: WidgetSnapshot, prefs: WidgetPrefs) {
  return prefs.hideAmounts ? HIDDEN : money(Math.round(n ?? 0), d.currency);
}

function pct(n: number | undefined | null) {
  const v = Math.abs(n ?? 0);
  return `${v >= 100 ? Math.round(v) : v.toFixed(1)}%`;
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

function timeOf(state: WidgetState) {
  if (state.kind !== 'ok') return undefined;
  const time = new Date(state.data.generatedAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  return state.stale ? `as of ${time}` : time;
}

// lucide icons, drawn as SVG so they stay crisp at any density
const icon = (color: string, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
const EYE = '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>';
const EYE_OFF =
  '<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.53 13.53 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/>';
const REFRESH = '<path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>';

function IconButton({ t, svg, action, label }: { t: Tone; svg: string; action: string; label: string }) {
  return (
    <FlexWidget clickAction={action} accessibilityLabel={label} style={{ padding: 5, borderRadius: 14, marginLeft: 2 }}>
      <SvgWidget svg={icon(t.muted, svg)} style={{ height: 16, width: 16 }} />
    </FlexWidget>
  );
}

/** Logo + title on the left; time, eye and refresh on the right (each only when there's room for it). */
function Header({ t, title, p, eye, refresh }: { t: Tone; title: string; p: Props; eye?: boolean; refresh?: boolean }) {
  const wide = p.width >= 230;
  const time = wide ? timeOf(p.state) : undefined;
  return (
    <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        <ImageWidget image={LOGO} imageWidth={18} imageHeight={18} radius={5} />
        <TextWidget text={time ? `${title} · ${time}` : title} style={{ fontSize: 12, color: t.muted, fontFamily: UI, marginLeft: 6 }} maxLines={1} truncate="END" />
      </FlexWidget>
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
        {eye ? <IconButton t={t} svg={p.prefs.hideAmounts ? EYE_OFF : EYE} action="TOGGLE_HIDE" label={p.prefs.hideAmounts ? 'Show amounts' : 'Hide amounts'} /> : null}
        {refresh && wide ? <IconButton t={t} svg={REFRESH} action="REFRESH" label="Refresh" /> : null}
      </FlexWidget>
    </FlexWidget>
  );
}

function Shell({ t, children, uri, label }: { t: Tone; children: React.ReactNode; uri: string; label: string }) {
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri }}
      accessibilityLabel={label}
      style={{ height: 'match_parent', width: 'match_parent', backgroundColor: t.bg, borderRadius: 22, borderWidth: 1, borderColor: t.line, paddingHorizontal: 14, paddingVertical: 11, flexDirection: 'column', justifyContent: 'space-between' }}
    >
      {children}
    </FlexWidget>
  );
}

/** A bar: `value` of 100 filled; optional `marker` (another percentage, e.g. how much of the month has passed). */
function Bar({ t, value, color, width, height = 6, marker }: { t: Tone; value: number; color: Hex; width: number; height?: number; marker?: number }) {
  const w = Math.max(10, Math.round(width));
  const clamp = (v: number) => Math.max(0, Math.min(100, v));
  const fill = Math.round((w * clamp(value)) / 100);
  const track = (
    <FlexWidget style={{ width: w, height, borderRadius: height, backgroundColor: t.track, flexDirection: 'row' }}>
      {fill > 0 ? <FlexWidget style={{ width: Math.max(height, fill), height, borderRadius: height, backgroundColor: color }} /> : null}
    </FlexWidget>
  );
  if (marker == null) return track;
  const left = Math.max(0, Math.min(w - 2, Math.round((w * clamp(marker)) / 100) - 1));
  return (
    <OverlapWidget style={{ width: w, height: height + 6 }}>
      <FlexWidget style={{ width: w, height: height + 6, justifyContent: 'center' }}>{track}</FlexWidget>
      <FlexWidget style={{ width: 2, height: height + 6, borderRadius: 1, backgroundColor: t.fg, marginLeft: left }} />
    </OverlapWidget>
  );
}

function Message({ t, title, body, uri, label }: { t: Tone; title: string; body: string; uri: string; label: string }) {
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri }}
      accessibilityLabel={label}
      style={{ height: 'match_parent', width: 'match_parent', backgroundColor: t.bg, borderRadius: 22, borderWidth: 1, borderColor: t.line, paddingHorizontal: 14, paddingVertical: 11, flexDirection: 'column', justifyContent: 'space-between' }}
    >
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
        <ImageWidget image={LOGO} imageWidth={18} imageHeight={18} radius={5} />
        <TextWidget text="ArthOS" style={{ fontSize: 12, color: t.muted, fontFamily: UI, marginLeft: 6 }} />
      </FlexWidget>
      <FlexWidget style={{ flexDirection: 'column' }}>
        <TextWidget text={title} style={{ fontSize: 14.5, color: t.fg, fontFamily: UI_BOLD }} maxLines={1} truncate="END" />
        <TextWidget text={body} style={{ fontSize: 11.5, color: t.muted, fontFamily: UI, marginTop: 2 }} maxLines={2} truncate="END" />
      </FlexWidget>
    </FlexWidget>
  );
}

/** Shown if a widget fails to build: the message makes the problem visible instead of an empty box. */
export function errorWidget(e: unknown, _size: { width: number; height: number }) {
  const msg = e instanceof Error ? e.message : String(e);
  return <Message t={TONES.dark} title="Widget error" body={msg.slice(0, 140)} uri="arthos://" label="Open ArthOS" />;
}

/** Loading / signed-out / unreachable states shared by every data widget; null when there is data to show. */
function fallback(p: Props, t: Tone) {
  if (p.state.kind === 'loading') return <Message t={t} title="ArthOS" body="Loading your numbers…" uri="arthos://" label="Open ArthOS" />;
  if (p.state.kind === 'signed-out') return <Message t={t} title="Sign in to ArthOS" body="Your numbers will show up here." uri="arthos://" label="Open ArthOS to sign in" />;
  if (p.state.kind === 'error') return <Message t={t} title="Can't reach ArthOS" body="Tap to open the app; the widget refreshes on its own." uri="arthos://" label="Open ArthOS" />;
  return null;
}

// ------------------------------------------------------------------ Safe to spend (2×2)

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
  const roomy = p.height >= 130;
  return (
    <Shell t={t} uri="arthos://budget" label={`Safe to spend today ${fmt(b.todayRemaining, d, p.prefs)}`}>
      <Header t={t} title="Safe today" p={p} eye />
      <FlexWidget style={{ flexDirection: 'column' }}>
        <TextWidget text={fmt(b.todayRemaining, d, p.prefs)} style={{ fontSize: roomy ? 30 : 26, color: tone, fontFamily: DISPLAY, adjustsFontSizeToFit: true }} maxLines={1} />
        <TextWidget text={`of ${fmt(b.todayAllowance, d, p.prefs)} today · ${b.daysRemaining}d left`} style={{ fontSize: 11, color: t.muted, fontFamily: UI }} maxLines={1} truncate="END" />
      </FlexWidget>
      {roomy ? (
        <FlexWidget style={{ flexDirection: 'column' }}>
          <Bar t={t} value={b.usedPct ?? 0} color={tone} width={p.width - 28} marker={b.elapsedPct} />
          <TextWidget text={`${Math.round(b.usedPct ?? 0)}% of budget · ${statusLabel(b.status)}`} style={{ fontSize: 10, color: t.subtle, fontFamily: UI, marginTop: 2 }} maxLines={1} truncate="END" />
        </FlexWidget>
      ) : (
        <Bar t={t} value={b.usedPct ?? 0} color={tone} width={p.width - 28} />
      )}
    </Shell>
  );
}

// ------------------------------------------------------------------ Month (4×2)
// One story, one set of numbers: with a budget, everything is the budget's view (spending that counts against it,
// i.e. without rent/EMIs), so "left", the bar and "per day" always agree with "Safe today". Without a budget, it's
// the money left after saving first.

function MonthSnapshot(p: Props) {
  const t = TONES[p.scheme];
  const f = fallback(p, t);
  if (f || p.state.kind !== 'ok') return f;
  const d = p.state.data;
  const b = d.budget;
  const m = d.money;
  const monthName = new Date(`${d.month}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'long' });
  const inner = p.width - 28;
  const roomy = p.height >= 140;
  const daysLeft = b.daysRemaining;
  const title = `${monthName} · day ${d.dayOfMonth} of ${d.daysInMonth}`;

  if (b.configured) {
    const left = b.remainingMonth ?? 0;
    const over = left < 0;
    const tone = statusTone(t, b.status);
    const perDay = daysLeft > 0 ? Math.max(0, left) / daysLeft : 0;
    return (
      <Shell t={t} uri="arthos://budget" label={`${monthName}: ${fmt(Math.abs(left), d, p.prefs)} ${over ? 'over' : 'left in'} budget`}>
        <Header t={t} title={title} p={p} eye refresh />
        <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', alignItems: 'flex-end' }}>
          <TextWidget text={fmt(Math.abs(left), d, p.prefs)} style={{ fontSize: 24, color: over ? t.expense : t.fg, fontFamily: DISPLAY }} maxLines={1} />
          <TextWidget text={over ? '  over budget' : `  left of ${fmt(b.limit, d, p.prefs)}`} style={{ fontSize: 12, color: t.muted, fontFamily: UI, marginBottom: 4 }} maxLines={1} truncate="END" />
        </FlexWidget>
        <Bar t={t} value={b.usedPct ?? 0} color={tone} width={inner} height={7} marker={b.elapsedPct} />
        <TextWidget
          text={`${fmt(b.spentMonth, d, p.prefs)} spent · ${p.prefs.hideAmounts ? '' : `${fmt(perDay, d, p.prefs)}/day for `}${daysLeft} days`}
          style={{ fontSize: 11, color: t.muted, fontFamily: UI }}
          maxLines={1}
          truncate="END"
        />
        {roomy ? (
          <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', justifyContent: 'space-between' }}>
            <Stat t={t} label="Safe today" value={fmt(b.todayRemaining, d, p.prefs)} color={tone} />
            <Stat t={t} label="Saved first" value={fmt(m.savedFirst, d, p.prefs)} color={t.income} right />
          </FlexWidget>
        ) : null}
      </Shell>
    );
  }

  const left = m.leftToSpend;
  const usedPct = m.spendable > 0 ? ((m.spendable - left) / m.spendable) * 100 : 0;
  return (
    <Shell t={t} uri="arthos://" label={`${monthName}: ${fmt(left, d, p.prefs)} left to spend`}>
      <Header t={t} title={title} p={p} eye refresh />
      <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', alignItems: 'flex-end' }}>
        <TextWidget text={fmt(Math.abs(left), d, p.prefs)} style={{ fontSize: 24, color: left < 0 ? t.expense : t.fg, fontFamily: DISPLAY }} maxLines={1} />
        <TextWidget text={left < 0 ? '  spent beyond' : '  left to spend'} style={{ fontSize: 12, color: t.muted, fontFamily: UI, marginBottom: 4 }} maxLines={1} />
      </FlexWidget>
      <Bar t={t} value={usedPct} color={left < 0 ? t.expense : t.brand} width={inner} height={7} marker={(d.dayOfMonth / d.daysInMonth) * 100} />
      <TextWidget
        text={`${fmt(m.savedFirst, d, p.prefs)} saved first · ${p.prefs.hideAmounts ? '' : `${fmt(m.perDayLeft, d, p.prefs)}/day for `}${daysLeft} days`}
        style={{ fontSize: 11, color: t.muted, fontFamily: UI }}
        maxLines={1}
        truncate="END"
      />
    </Shell>
  );
}

function Stat({ t, label, value, color, right }: { t: Tone; label: string; value: string; color: Hex; right?: boolean }) {
  return (
    <FlexWidget style={{ flexDirection: 'column', alignItems: right ? 'flex-end' : 'flex-start' }}>
      <TextWidget text={label} style={{ fontSize: 10, color: t.subtle, fontFamily: UI }} maxLines={1} />
      <TextWidget text={value} style={{ fontSize: 13, color, fontFamily: UI_BOLD }} maxLines={1} />
    </FlexWidget>
  );
}

// ------------------------------------------------------------------ Portfolio (Groww-style)

function PortfolioWidget(p: Props) {
  const t = TONES[p.scheme];
  const f = fallback(p, t);
  if (f || p.state.kind !== 'ok') return f;
  const d = p.state.data;
  const pf = d.portfolio;
  if (!pf) return <Message t={t} title="No investments yet" body="Add stocks, mutual funds, gold or bonds to track them here." uri="arthos://invest" label="Add investments in ArthOS" />;
  const hide = p.prefs.hideAmounts;
  const dayUp = pf.dayChange >= 0;
  const allUp = pf.gain >= 0;
  const wide = p.width >= 230;
  const signed = (n: number, up: boolean) => `${up ? '+' : '−'}${money(Math.abs(Math.round(n)), d.currency)}`;
  const day = hide ? `${dayUp ? '▲' : '▼'} ${pct(pf.dayChangePct)}` : `${signed(pf.dayChange, dayUp)} (${pct(pf.dayChangePct)})`;
  const total = hide ? `${allUp ? '▲' : '▼'} ${pct(pf.gainPct)}` : `${signed(pf.gain, allUp)} (${pct(pf.gainPct)})`;

  return (
    <Shell t={t} uri="arthos://invest" label={`Portfolio ${hide ? '' : money(pf.value, d.currency)}`}>
      <Header t={t} title="Portfolio" p={p} eye refresh />
      <TextWidget text={hide ? '₹ ••••••' : money(Math.round(pf.value), d.currency)} style={{ fontSize: wide ? 26 : 22, color: t.fg, fontFamily: UI_BOLD, adjustsFontSizeToFit: true }} maxLines={1} />
      {wide ? (
        <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', justifyContent: 'space-between' }}>
          <Returns t={t} label="1D returns" value={day} color={dayUp ? t.income : t.expense} />
          <Returns t={t} label="Total returns" value={total} color={allUp ? t.income : t.expense} right />
        </FlexWidget>
      ) : (
        <FlexWidget style={{ flexDirection: 'column' }}>
          <TextWidget text={`1D  ${day}`} style={{ fontSize: 11.5, color: dayUp ? t.income : t.expense, fontFamily: UI_BOLD }} maxLines={1} truncate="END" />
          <TextWidget text={`Total  ${total}`} style={{ fontSize: 11, color: allUp ? t.income : t.expense, fontFamily: UI, marginTop: 1 }} maxLines={1} truncate="END" />
        </FlexWidget>
      )}
    </Shell>
  );
}

function Returns({ t, label, value, color, right }: { t: Tone; label: string; value: string; color: Hex; right?: boolean }) {
  return (
    <FlexWidget style={{ flexDirection: 'column', alignItems: right ? 'flex-end' : 'flex-start' }}>
      <TextWidget text={label} style={{ fontSize: 10.5, color: t.subtle, fontFamily: UI }} maxLines={1} />
      <TextWidget text={value} style={{ fontSize: 13, color, fontFamily: UI_BOLD, marginTop: 1 }} maxLines={1} />
    </FlexWidget>
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
