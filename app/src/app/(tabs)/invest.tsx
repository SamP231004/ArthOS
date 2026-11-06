import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { ValueChart } from '@/components/charts';
import { AppHeader } from '@/components/app-header';
import { Screen } from '@/components/screen';
import { Button, Card, Chip, ErrorNote, Loading, Segmented, T } from '@/components/ui';
import { money } from '@/lib/format';
import { CLASS_META, fmtQty, HORIZON_META, signedPct, toneColor } from '@/lib/invest-meta';
import { indianMarketStatus } from '@/lib/market';
import { usePortfolio, useSummary } from '@/lib/queries';
import type { AssetClass, HoldingView, Horizon, Portfolio, PortfolioRange } from '@/lib/types';
import { useMonth } from '@/lib/ui-store';
import { alpha, F, R, S, useStyles, useTheme, type Palette } from '@/theme';

type Tab = AssetClass;
/** Fixed tab order, showing only the classes the user holds (no "All" tab). */
const CLASS_ORDER: AssetClass[] = ['STOCK', 'MUTUAL_FUND', 'GOLD', 'BOND'];
const presentClasses = (p: Portfolio) => CLASS_ORDER.filter((c) => p.holdings.some((h) => h.assetClass === c));

export default function InvestTab() {
  const [range, setRange] = useState<PortfolioRange>('1Y');
  const { data: p, isLoading, error, refetch, isRefetching } = usePortfolio(range);
  const [view, setView] = useState<'holdings' | 'analysis'>('holdings');

  return (
    <Screen refreshing={isRefetching} onRefresh={refetch}>
      <AppHeader />
      <View>
        <T variant="title">Investments</T>
        <T variant="muted">Stocks, mutual funds, gold and bonds — one live portfolio.</T>
      </View>
      <SavingsBalance />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Segmented value={view} onChange={setView} options={[{ value: 'holdings', label: 'Holdings' }, { value: 'analysis', label: 'Analysis' }]} />
        <Button title="+ Add" onPress={() => router.push('/add-holding')} />
      </View>

      {isLoading ? (
        <Loading />
      ) : error ? (
        <ErrorNote message={error.message} />
      ) : !p ? null : p.holdings.length === 0 ? (
        <Card glow style={{ gap: S.md }}>
          <T variant="title" style={{ fontSize: 26 }}>Bring your wealth into one view</T>
          <T variant="muted">Add what you own — ArthOS prices it live and tracks P&amp;L and XIRR.</T>
          <Button title="Add your first investment" size="lg" onPress={() => router.push('/add-holding')} />
        </Card>
      ) : view === 'holdings' ? (
        <Holdings p={p} />
      ) : (
        <Analysis p={p} range={range} setRange={setRange} />
      )}
    </Screen>
  );
}

/** The savings account balance: what's set aside and ready to invest. */
function SavingsBalance() {
  const { c } = useTheme();
  const month = useMonth();
  const a = useSummary(month).data?.savings;
  if (!a) return null;
  const over = a.closing < 0;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: over ? alpha(c.expense, 0.35) : c.line, borderRadius: R.md, paddingHorizontal: S.md, paddingVertical: S.sm }}>
      <T variant="small">{over ? 'Savings account overdrawn' : 'Savings to invest'}</T>
      <Text style={{ color: over ? c.expense : c.fg, fontFamily: F.uiSemibold, fontSize: 15, fontVariant: ['tabular-nums'] }}>{money(Math.abs(a.closing))}</Text>
    </View>
  );
}

function Holdings({ p }: { p: Portfolio }) {
  const { c } = useTheme();
  const classes = presentClasses(p);
  const [picked, setTab] = useState<Tab>(classes[0]);
  const tab = classes.includes(picked) ? picked : classes[0]; // the picked class may have been emptied
  const items = p.holdings.filter((h) => h.assetClass === tab).sort((a, b) => b.currentValue - a.currentValue);
  const invested = items.reduce((x, h) => x + h.invested, 0);
  const current = items.reduce((x, h) => x + h.currentValue, 0);
  const pl = current - invested;
  const day = items.reduce((x, h) => x + h.dayChange, 0);
  const asOf = p.pricesAsOf ? new Date(p.pricesAsOf).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : null;
  const t = p.totals;
  const market = indianMarketStatus();

  return (
    <>
      <Card glow style={{ gap: 0 }}>
        <T variant="small">Current value</T>
        <T variant="big" style={{ marginTop: 2 }}>{money(t.value, 'INR', false).split('.')[0]}</T>
        <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.lineStrong, marginVertical: S.md }} />
        <Line k="Invested" v={money(t.invested)} />
        <Line k="Total returns" v={`${t.gain >= 0 ? '+' : '−'}${money(Math.abs(t.gain))} (${signedPct(t.gainPct)})`} color={toneColor(c, t.gain)} />
        <Line k="1D returns" v={`${t.dayChange >= 0 ? '+' : '−'}${money(Math.abs(t.dayChange))} (${signedPct(t.dayChangePct)})`} color={toneColor(c, t.dayChange)} />
        <Line k="XIRR" v={t.xirr != null ? signedPct(t.xirr) : '—'} color={toneColor(c, t.xirr)} />
        {t.realizedGain !== 0 && <Line k="Realised profit" v={`${t.realizedGain >= 0 ? '+' : '−'}${money(Math.abs(t.realizedGain))}`} color={toneColor(c, t.realizedGain)} />}
      </Card>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S.sm }}>
        {classes.map((x) => (
          <Chip key={x} label={CLASS_META[x].plural} active={tab === x} onPress={() => setTab(x)} />
        ))}
      </ScrollView>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 2 }}>
        <View>
          <T style={{ fontFamily: F.uiSemibold, fontSize: 15 }}>{CLASS_META[tab].plural} ({items.length})</T>
          <T variant="small">{money(invested)} invested · {money(current)} now</T>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: toneColor(c, pl), fontFamily: F.uiSemibold, fontSize: 14, fontVariant: ['tabular-nums'] }}>{pl >= 0 ? '+' : '−'}{money(Math.abs(pl))}</Text>
          <Text style={{ color: toneColor(c, day), fontFamily: F.ui, fontSize: 11.5, fontVariant: ['tabular-nums'] }}>1D {day >= 0 ? '+' : '−'}{money(Math.abs(day))}</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: market.open ? c.income : c.subtle }} />
        <T variant="small" style={{ flex: 1 }}>
          <Text style={{ color: market.open ? c.income : c.fg2, fontFamily: F.uiSemibold }}>{market.label}</Text> · {market.detail} · {asOf ? `prices as of ${asOf}` : 'prices pending'}
        </T>
      </View>

      <Card style={{ padding: 0 }}>
        {items.map((h, i) => (
          <Row key={h.id} h={h} last={i === items.length - 1} share={invested ? (h.invested / invested) * 100 : 0} />
        ))}
      </Card>
      {p.priceNotes.length > 0 && <T variant="small" style={{ color: c.warn }}>{p.priceNotes.join(' ')}</T>}
    </>
  );
}

/**
 * Holding row: name + current value, then the symbol and total returns (as a coloured pill), then a labelled
 * QTY · AVG PRICE · LTP strip so the three figures are never confused, and finally the holding's share of its class
 * as a bar in the class colour.
 */
function Row({ h, last, share }: { h: HoldingView; last: boolean; share: number }) {
  const { c } = useTheme();
  const s = useStyles(make);
  const col = CLASS_META[h.assetClass].color(c);
  const gainTone = toneColor(c, h.gain);
  const live = h.priceSource === 'LIVE' && h.dayChangePct != null;
  const dayTone = toneColor(c, h.dayChangePct);
  const sub = [h.symbol, h.exchange].filter(Boolean).join(' · ') || CLASS_META[h.assetClass].label;
  const qtyUnit = h.assetClass === 'GOLD' ? ' g' : '';
  return (
    <Pressable onPress={() => router.push(`/holding?id=${h.id}`)} style={({ pressed }) => [s.row, !last && s.rowBorder, pressed && { backgroundColor: alpha(c.fg, 0.03) }]}>
      <View style={s.line}>
        <Text style={[s.name, { flex: 1 }]} numberOfLines={1}>{h.name}</Text>
        <Text style={s.value}>{money(h.currentValue)}</Text>
      </View>
      <View style={s.line}>
        <Text style={[s.sub, { flex: 1 }]} numberOfLines={1}>{sub}</Text>
        <View style={[s.pill, { backgroundColor: alpha(gainTone, 0.12) }]}>
          <Text style={[s.pillText, { color: gainTone }]}>
            {h.gain >= 0 ? '+' : '−'}{money(Math.abs(h.gain))}  {(h.gainPct ?? 0) >= 0 ? '▲' : '▼'} {Math.abs(h.gainPct ?? 0).toFixed(2)}%
          </Text>
        </View>
      </View>

      <View style={s.facts}>
        <Fact k={h.assetClass === 'GOLD' ? 'Grams' : 'Qty'} v={`${fmtQty(h.quantity)}${qtyUnit}`} />
        <View style={s.factDivider} />
        <Fact k="Avg price" v={money(h.avgCost)} />
        <View style={s.factDivider} />
        <Fact
          k={h.assetClass === 'MUTUAL_FUND' ? 'NAV' : h.priceSource === 'LIVE' ? 'LTP' : 'Price'}
          v={money(h.price)}
          extra={live ? `${(h.dayChangePct ?? 0) >= 0 ? '▲' : '▼'}${Math.abs(h.dayChangePct ?? 0).toFixed(2)}%` : h.priceSource === 'MANUAL' ? 'manual' : h.priceSource === 'FACE_VALUE' ? 'face value' : 'last trade'}
          extraColor={live ? dayTone : c.subtle}
        />
      </View>

      <View style={[s.line, { marginTop: 2 }]}>
        <View style={s.track}>
          <View style={{ width: `${Math.min(100, share)}%`, height: '100%', borderRadius: R.pill, backgroundColor: col }} />
        </View>
        <Text style={[s.sub, { minWidth: 92, textAlign: 'right' }]}>
          <Text style={{ color: c.fg2, fontFamily: F.uiSemibold }}>{share.toFixed(1)}%</Text> of {CLASS_META[h.assetClass].plural.toLowerCase()}
        </Text>
      </View>
    </Pressable>
  );
}

/** One labelled figure in the QTY · AVG · LTP strip: tiny caps label above the value. */
function Fact({ k, v, extra, extraColor }: { k: string; v: string; extra?: string; extraColor?: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
      <Text style={{ color: c.subtle, fontFamily: F.uiMedium, fontSize: 9.5, letterSpacing: 0.8, textTransform: 'uppercase' }}>{k}</Text>
      <Text style={{ color: c.fg, fontFamily: F.uiSemibold, fontSize: 13, fontVariant: ['tabular-nums'] }} numberOfLines={1} adjustsFontSizeToFit>
        {v}
      </Text>
      {extra ? <Text style={{ color: extraColor ?? c.subtle, fontFamily: F.uiMedium, fontSize: 10.5, fontVariant: ['tabular-nums'] }}>{extra}</Text> : null}
    </View>
  );
}

/** Label on the left, value on the right — the summary-card line. */
function Line({ k, v, color }: { k: string; v: string; color?: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 }}>
      <T variant="muted" style={{ fontSize: 13 }}>{k}</T>
      <Text style={{ color: color ?? c.fg, fontFamily: F.uiSemibold, fontSize: 13.5, fontVariant: ['tabular-nums'] }}>{v}</Text>
    </View>
  );
}

function Analysis({ p, range, setRange }: { p: Portfolio; range: PortfolioRange; setRange: (r: PortfolioRange) => void }) {
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  const classes = presentClasses(p);
  const [tab, setTab] = useState<Tab>(classes[0]);
  const [period, setPeriod] = useState<'month' | 'year'>('month');
  const hs = p.holdings.filter((h) => h.assetClass === tab);

  const flows = useMemo(() => {
    const by = new Map<string, number>();
    let first: string | null = null;
    for (const h of hs) for (const l of h.lots) {
      const k = period === 'month' ? l.date.slice(0, 7) : l.date.slice(0, 4);
      by.set(k, (by.get(k) ?? 0) + (l.type === 'BUY' ? 1 : -1) * l.amount);
      if (!first || k < first) first = k;
    }
    if (!first) return [];
    const out: { label: string; amount: number }[] = [];
    const now = new Date();
    if (period === 'year') for (let y = Number(first); y <= now.getFullYear(); y++) out.push({ label: String(y), amount: by.get(String(y)) ?? 0 });
    else {
      let [y, m] = first.split('-').map(Number);
      while (y < now.getFullYear() || (y === now.getFullYear() && m <= now.getMonth() + 1)) {
        out.push({ label: new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short' }), amount: by.get(`${y}-${String(m).padStart(2, '0')}`) ?? 0 });
        m++;
        if (m > 12) { m = 1; y++; }
      }
    }
    return out.slice(-14);
  }, [hs, period]);
  const max = Math.max(...flows.map((f) => Math.abs(f.amount)), 1);

  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S.sm }}>
        {classes.map((x) => (
          <Chip key={x} label={CLASS_META[x].plural} active={tab === x} onPress={() => setTab(x)} />
        ))}
      </ScrollView>

      <Card style={{ gap: S.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View>
            <T variant="eyebrow">Invested amount</T>
            <T variant="title" style={{ fontSize: 24 }}>Trend over time</T>
          </View>
          <Segmented value={period} onChange={setPeriod} options={[{ value: 'month', label: 'Monthly' }, { value: 'year', label: 'Yearly' }]} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 140, gap: 3 }}>
          {flows.map((f, i) => (
            <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
              <View style={{ width: '100%', height: `${Math.max(f.amount === 0 ? 0 : 3, (Math.abs(f.amount) / max) * 100)}%`, backgroundColor: f.amount < 0 ? c.expense : alpha(c.income, 0.7), borderTopLeftRadius: 4, borderTopRightRadius: 4 }} />
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 3 }}>
          {flows.map((f, i) => (
            <Text key={i} style={{ flex: 1, textAlign: 'center', color: c.subtle, fontSize: 9, fontFamily: F.ui }}>{i % 2 === 0 ? f.label : ''}</Text>
          ))}
        </View>
        <T variant="small">Net {money(flows.reduce((x, f) => x + f.amount, 0), 'INR', true)} put in · purchases minus withdrawals</T>
      </Card>

      <Card style={{ gap: S.md }}>
        <T variant="eyebrow">Investment allocation</T>
        <T variant="title" style={{ fontSize: 24 }}>Portfolio mix</T>
        <View style={{ flexDirection: 'row', height: 10, borderRadius: R.pill, overflow: 'hidden' }}>
          {p.allocation.map((a) => (
            <View key={a.assetClass} style={{ width: `${p.totals.invested ? (a.invested / p.totals.invested) * 100 : 0}%`, backgroundColor: CLASS_META[a.assetClass].color(c) }} />
          ))}
        </View>
        {p.allocation.map((a) => (
          <View key={a.assetClass} style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm, backgroundColor: alpha(c.fg, 0.03), borderRadius: R.md, padding: S.md }}>
            <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: CLASS_META[a.assetClass].color(c) }} />
            <T style={{ flex: 1, fontFamily: F.uiSemibold }}>{CLASS_META[a.assetClass].plural}</T>
            <View style={{ alignItems: 'flex-end' }}>
              <T variant="num" style={{ fontSize: 15 }}>{money(a.invested)}</T>
              <T variant="small" style={{ color: toneColor(c, a.gainPct) }}>now {money(a.value, 'INR', true)} · {signedPct(a.gainPct)}</T>
            </View>
          </View>
        ))}
      </Card>

      <Card style={{ gap: S.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <T variant="h2">Value vs invested</T>
        </View>
        <Segmented value={range} onChange={setRange} options={(['1M', '3M', '6M', '1Y', 'ALL'] as PortfolioRange[]).map((r) => ({ value: r, label: r }))} />
        <ValueChart data={p.history} format={(n) => money(n, 'INR', true)} width={width - S.lg * 2 - S.lg * 2 - 2} />
      </Card>

      <GroupCard
        title="By time horizon"
        rows={groupBy(p.holdings, (h) => h.horizon ?? 'NONE', (k) => HORIZON_META[k as Horizon | 'NONE'].label).sort(
          (x, y) => HORIZON_ORDER.indexOf(x.key as Horizon | 'NONE') - HORIZON_ORDER.indexOf(y.key as Horizon | 'NONE'),
        )}
        colorOf={(g) => ({ SHORT: c.c6, MEDIUM: c.c3, LONG: c.c1, NONE: c.c8 })[g.key as Horizon | 'NONE']}
      />
      <GroupCard
        title="By goal"
        rows={groupBy(p.holdings, (h) => h.goal?.trim() || '', (k) => k || 'No goal set')}
        colorOf={(g, i) => (g.key ? [c.c1, c.c4, c.c2, c.c5, c.c6, c.c3, c.c7][i % 7] : c.c8)}
      />
    </>
  );
}

type Group = { key: string; label: string; value: number; invested: number; count: number };
const HORIZON_ORDER: (Horizon | 'NONE')[] = ['SHORT', 'MEDIUM', 'LONG', 'NONE'];

function groupBy(hs: HoldingView[], keyOf: (h: HoldingView) => string, labelOf: (k: string) => string): Group[] {
  const by = new Map<string, Group>();
  for (const h of hs) {
    const k = keyOf(h);
    const g = by.get(k) ?? { key: k, label: labelOf(k), value: 0, invested: 0, count: 0 };
    g.value += h.currentValue;
    g.invested += h.invested;
    g.count += 1;
    by.set(k, g);
  }
  return [...by.values()].sort((x, y) => y.value - x.value);
}

/** Portfolio grouped by horizon or goal (blueprint §9.3): value, share bar, P&L, holdings count. */
function GroupCard({ title, rows, colorOf }: { title: string; rows: Group[]; colorOf: (g: Group, i: number) => string }) {
  const { c } = useTheme();
  const total = rows.reduce((x, g) => x + g.value, 0) || 1;
  return (
    <Card style={{ gap: S.md }}>
      <T variant="h2">{title}</T>
      {rows.map((g, i) => {
        const pl = g.value - g.invested;
        const share = (g.value / total) * 100;
        return (
          <View key={g.key || '_none'} style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: S.sm }}>
              <Text style={{ flex: 1, color: c.fg, fontFamily: F.uiMedium, fontSize: 14 }} numberOfLines={1}>
                {g.label}
                <Text style={{ color: c.subtle, fontFamily: F.ui, fontSize: 12 }}>{`  ·  ${g.count} ${g.count === 1 ? 'holding' : 'holdings'}`}</Text>
              </Text>
              <Text style={{ color: c.fg, fontFamily: F.uiSemibold, fontSize: 14, fontVariant: ['tabular-nums'] }}>{money(g.value)}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
              <View style={{ flex: 1, height: 5, borderRadius: R.pill, backgroundColor: alpha(c.fg, 0.07), overflow: 'hidden' }}>
                <View style={{ width: `${share}%`, height: '100%', borderRadius: R.pill, backgroundColor: colorOf(g, i) }} />
              </View>
              <Text style={{ color: c.subtle, fontFamily: F.ui, fontSize: 11.5, width: 42, textAlign: 'right', fontVariant: ['tabular-nums'] }}>{share.toFixed(1)}%</Text>
              <Text style={{ color: toneColor(c, pl), fontFamily: F.uiSemibold, fontSize: 11.5, width: 64, textAlign: 'right', fontVariant: ['tabular-nums'] }}>
                {signedPct(g.invested ? (pl / g.invested) * 100 : 0)}
              </Text>
            </View>
          </View>
        );
      })}
    </Card>
  );
}

const make = (c: Palette) =>
  StyleSheet.create({
    row: { gap: 6, paddingHorizontal: S.lg, paddingVertical: 14 },
    line: { flexDirection: 'row', alignItems: 'center', gap: S.md },
    pill: { borderRadius: R.pill, paddingHorizontal: 8, paddingVertical: 2 },
    pillText: { fontFamily: F.uiSemibold, fontSize: 11.5, fontVariant: ['tabular-nums'] },
    facts: { flexDirection: 'row', alignItems: 'flex-start', gap: S.sm, marginTop: 2, paddingVertical: 8, paddingHorizontal: S.sm, borderRadius: R.sm, backgroundColor: alpha(c.fg, 0.035) },
    factDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: c.line },
    track: { flex: 1, height: 5, borderRadius: R.pill, backgroundColor: alpha(c.fg, 0.07), overflow: 'hidden' },
    rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line },
    name: { color: c.fg, fontFamily: F.uiSemibold, fontSize: 15 },
    sub: { color: c.subtle, fontFamily: F.ui, fontSize: 12, fontVariant: ['tabular-nums'] },
    value: { color: c.fg, fontFamily: F.uiSemibold, fontSize: 15, fontVariant: ['tabular-nums'] },
  });
