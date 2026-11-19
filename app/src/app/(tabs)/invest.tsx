import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { FlowChart, ValueChart } from '@/components/charts';
import { AppHeader } from '@/components/app-header';
import { Screen } from '@/components/screen';
import { Button, Card, Chip, ErrorNote, Loading, Segmented, T } from '@/components/ui';
import { dateLabel, money, monthLabel } from '@/lib/format';
import { CLASS_META, fmtQty, HORIZON_META, signedPct, toneColor, usd } from '@/lib/invest-meta';
import { indianMarketStatus, usMarketStatus } from '@/lib/market';
import { usePortfolio, useRefreshPrices, useSummary } from '@/lib/queries';
import type { AssetClass, HoldingView, Horizon, Portfolio, PortfolioRange } from '@/lib/types';
import { useMonth } from '@/lib/ui-store';
import { alpha, F, R, S, useStyles, useTheme, type Mode, type Palette } from '@/theme';

type Tab = AssetClass;
/** Fixed tab order, showing only the classes the user holds (no "All" tab). */
/** US stocks get their own tab right after Indian stocks — shown only when the user holds some. */
const CLASS_ORDER: AssetClass[] = ['STOCK', 'US_STOCK', 'MUTUAL_FUND', 'GOLD', 'BOND'];
/** Where a holding counts: a gold fund or gold ETF sits under Gold (it's still valued by NAV / market price). */
const cat = (h: HoldingView) => h.category ?? h.assetClass;
const presentClasses = (p: Portfolio) => CLASS_ORDER.filter((c) => p.holdings.some((h) => cat(h) === c));
/** Fully sold holdings stay in the data (their realised profit counts) but aren't listed as holdings. */
const isHeld = (h: HoldingView) => h.quantity > 1e-9;
const heldClasses = (p: Portfolio) => {
  const c = CLASS_ORDER.filter((x) => p.holdings.some((h) => cat(h) === x && isHeld(h)));
  return c.length ? c : presentClasses(p);
};

export default function InvestTab() {
  const [range, setRange] = useState<PortfolioRange>('1Y');
  const { data: p, isLoading, error, isRefetching } = usePortfolio(range);
  const live = useRefreshPrices(range); // pull-to-refresh and the Refresh button both ask for live prices
  const [view, setView] = useState<'holdings' | 'analysis'>('holdings');

  return (
    <Screen refreshing={isRefetching || live.isPending} onRefresh={() => live.mutate()}>
      <AppHeader />
      <View>
        <T variant="title">Investments</T>
        <T variant="muted">Stocks, mutual funds, gold and bonds — one live portfolio.</T>
      </View>
      <SavingsBalance key={view} p={p} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Segmented value={view} onChange={setView} options={[{ value: 'holdings', label: 'Holdings' }, { value: 'analysis', label: 'Analysis' }]} />
        <View style={{ flexDirection: 'row', gap: S.sm }}>
          <Button title="Import" variant="secondary" onPress={() => router.push('/import')} />
          <Button title="+ Add" onPress={() => router.push('/add-holding')} />
        </View>
      </View>

      {isLoading ? (
        <Loading />
      ) : error ? (
        <ErrorNote message={error.message} />
      ) : !p ? null : p.holdings.length === 0 ? (
        <Card glow style={{ gap: S.md }}>
          <T variant="title" style={{ fontSize: 26 }}>Bring your wealth into one view</T>
          <T variant="muted">Import from Zerodha, Groww, any broker or your mutual-fund CAS — read on your phone, never uploaded — or add holdings by hand.</T>
          <Button title="Import from your broker" size="lg" onPress={() => router.push('/import')} />
          <Button title="Add by hand" variant="secondary" onPress={() => router.push('/add-holding')} />
        </Card>
      ) : view === 'holdings' ? (
        <Holdings p={p} onRefresh={() => live.mutate()} refreshing={live.isPending} />
      ) : (
        <Analysis p={p} range={range} setRange={setRange} />
      )}
    </Screen>
  );
}

/** The savings account balance: what's set aside and ready to invest. Tap to see how it was worked out. */
function SavingsBalance({ p }: { p?: Portfolio }) {
  const { c } = useTheme();
  const month = useMonth();
  const a = useSummary(month).data?.savings;
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  // opens compact every time you come back to the tab
  useFocusEffect(
    useCallback(
      () => () => {
        setOpen(false);
        setShowAll(false);
      },
      [],
    ),
  );
  if (!a) return null;
  const over = a.closing < 0;
  const first = a.history[0];
  const saved = a.history.reduce((x, h) => x + h.saved, 0);
  const invested = a.history.reduce((x, h) => x + h.invested, 0);
  const proceeds = a.history.reduce((x, h) => x + h.proceeds, 0);
  const signed = (n: number) => `${n < 0 ? '−' : ''}${money(Math.abs(n))}`;
  // mirrors SavingsService.flows: imported holdings (owned before ArthOS) never touch the account
  const end = `${a.month}-31`;
  const moves = (p?.holdings ?? [])
    .flatMap((h) =>
      h.lots
        .filter((l) => !l.importedFrom && l.date <= end && (l.type === 'SELL' || (l.fromSavings ?? 0) > 0))
        .map((l) => ({ id: l.id, date: l.date, name: h.name, sale: l.type === 'SELL', amount: l.type === 'SELL' ? l.quantity * l.price : l.fromSavings! })),
    )
    .sort((x, y) => (x.date < y.date ? 1 : -1));
  const row = (k: string, v: string, color?: string, bold?: boolean) => (
    <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: S.sm, paddingVertical: 4 }}>
      <Text style={{ flex: 1, color: bold ? c.fg : c.muted, fontFamily: bold ? F.uiSemibold : F.ui, fontSize: 13 }}>{k}</Text>
      <Text style={{ color: color ?? c.fg, fontFamily: bold ? F.uiSemibold : F.uiMedium, fontSize: 13, fontVariant: ['tabular-nums'] }}>{v}</Text>
    </View>
  );
  return (
    <View style={{ borderWidth: 1, borderColor: over ? alpha(c.expense, 0.35) : c.line, borderRadius: R.md }}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityLabel="Show how the savings balance was worked out"
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: S.md, paddingVertical: S.sm }}>
        <T variant="small">{over ? 'Savings account overdrawn' : 'Savings to invest'}  <Text style={{ color: c.subtle }}>{open ? '▴' : '▾'}</Text></T>
        <Text style={{ color: over ? c.expense : c.fg, fontFamily: F.uiSemibold, fontSize: 15, fontVariant: ['tabular-nums'] }}>{money(Math.abs(a.closing))}</Text>
      </Pressable>
      {open && (
        <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line, paddingHorizontal: S.md, paddingVertical: S.sm, gap: S.sm }}>
          <View>
            {row(!first || first.opening === a.startingBalance ? 'Savings you already had' : `Carried in before ${monthLabel(first.month)}`, signed(first?.opening ?? a.startingBalance))}
            {row('Saved first from income', `+${money(saved)}`, c.income)}
            {row('Investments paid from savings', `−${money(invested)}`)}
            {proceeds > 0 && row('Sales paid back in', `+${money(proceeds)}`, c.income)}
            {row(over ? 'Overdrawn' : 'Available to invest', signed(a.closing), over ? c.expense : c.fg, true)}
          </View>
          <View>
            <Text style={{ color: c.subtle, fontFamily: F.uiMedium, fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 2 }}>Month by month</Text>
            {a.history.map((h, i) => {
              // one block per month: month and the balance it ended on, then what moved, each with a label
              const r = (n: number) => money(Math.round(n));
              const parts = [
                h.saved ? { k: 'Saved', v: `+${r(h.saved)}`, color: c.income } : null,
                h.invested ? { k: 'Invested', v: `−${r(h.invested)}`, color: c.fg2 } : null,
                h.proceeds ? { k: 'Sales', v: `+${r(h.proceeds)}`, color: c.income } : null,
              ].filter((x) => x != null);
              return (
                <View key={h.month} style={{ paddingVertical: 7, borderTopWidth: i ? StyleSheet.hairlineWidth : 0, borderTopColor: c.line, gap: 3 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: S.sm }}>
                    <Text style={{ color: c.fg, fontFamily: F.uiSemibold, fontSize: 13.5 }}>{monthLabel(h.month).replace(/^(\w{3})\w*/, '$1')}</Text>
                    <Text style={{ color: h.closing < 0 ? c.expense : c.fg, fontFamily: F.uiSemibold, fontSize: 13.5, fontVariant: ['tabular-nums'] }}>
                      <Text style={{ color: c.subtle, fontFamily: F.ui, fontSize: 11.5 }}>{h.closing < 0 ? 'overdrawn ' : 'balance '}</Text>
                      {money(Math.abs(h.closing))}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: S.md, rowGap: 2 }}>
                    {parts.length === 0 ? (
                      <Text style={{ color: c.subtle, fontFamily: F.ui, fontSize: 12 }}>No change</Text>
                    ) : (
                      parts.map((x) => (
                        <Text key={x.k} style={{ color: c.subtle, fontFamily: F.ui, fontSize: 12, fontVariant: ['tabular-nums'] }}>
                          {x.k} <Text style={{ color: x.color, fontFamily: F.uiMedium }}>{x.v}</Text>
                        </Text>
                      ))
                    )}
                  </View>
                </View>
              );
            })}
          </View>
          {moves.length > 0 && (
            <View>
              <Text style={{ color: c.subtle, fontFamily: F.uiMedium, fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 2 }}>Used savings</Text>
              {(showAll ? moves : moves.slice(0, 5)).map((m) => (
                <View key={m.id} style={{ flexDirection: 'row', gap: S.sm, paddingVertical: 4 }}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={{ color: c.fg2, fontFamily: F.ui, fontSize: 13 }}>{m.name}</Text>
                    <Text style={{ color: c.subtle, fontFamily: F.ui, fontSize: 11 }}>{dateLabel(m.date)} · {m.sale ? 'sold, back into savings' : 'bought from savings'}</Text>
                  </View>
                  <Text style={{ color: m.sale ? c.income : c.fg, fontFamily: F.uiMedium, fontSize: 13, fontVariant: ['tabular-nums'] }}>{m.sale ? '+' : '−'}{money(m.amount)}</Text>
                </View>
              ))}
              {moves.length > 5 && (
                <Pressable onPress={() => setShowAll((x) => !x)} hitSlop={8} accessibilityRole="button" style={{ paddingTop: 6 }}>
                  <Text style={{ color: c.brand, fontFamily: F.uiSemibold, fontSize: 12.5 }}>{showAll ? 'Show fewer' : `Show all ${moves.length}`}</Text>
                </Pressable>
              )}
            </View>
          )}
          {over && <T variant="small">More was invested from savings than was set aside. Raise how much you save first, mark past buys as paid from spending money, or set the savings you already had in Settings.</T>}
        </View>
      )}
    </View>
  );
}

/**
 * 'prices as of' for the rows on screen. Fund NAVs come once a day after the close, so they're labelled by date on
 * their own: one old NAV must not make live stock prices look stale.
 */
function asOfLabel(items: HoldingView[]): string | null {
  const live = items.filter((h) => h.priceSource === 'LIVE' && h.priceAsOf);
  const oldest = (hs: HoldingView[]) => hs.map((h) => h.priceAsOf!).sort()[0];
  const nav = live.filter((h) => h.assetClass === 'MUTUAL_FUND'), market = live.filter((h) => h.assetClass !== 'MUTUAL_FUND');
  const parts: string[] = [];
  if (market.length) {
    const d = new Date(oldest(market));
    const today = d.toDateString() === new Date().toDateString();
    // today: just the time, so the market line fits on one row
    parts.push(`prices ${today ? d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : `as of ${d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}`}`);
  }
  if (nav.length) parts.push(`NAVs as of ${new Date(oldest(nav)).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`);
  return parts.length ? parts.join(' · ') : null;
}

type SortKey = 'currentValue' | 'gain' | 'gainPct' | 'dayChangePct' | 'invested' | 'xirr' | 'name';
const SORTS: [SortKey, string][] = [
  ['currentValue', 'Current'],
  ['gain', 'Returns'],
  ['gainPct', 'Returns %'],
  ['dayChangePct', '1D %'],
  ['invested', 'Invested'],
  ['name', 'Name'],
];
const MF_SORTS: [SortKey, string][] = [
  ['currentValue', 'Current'],
  ['gain', 'Returns'],
  ['gainPct', 'Returns %'],
  ['xirr', 'XIRR'],
  ['dayChangePct', '1D %'],
  ['invested', 'Invested'],
  ['name', 'Name'],
];

function Holdings({ p, onRefresh, refreshing }: { p: Portfolio; onRefresh: () => void; refreshing: boolean }) {
  const { c } = useTheme();
  const classes = heldClasses(p);
  const [picked, setTab] = useState<Tab>(classes[0]);
  const tab = classes.includes(picked) ? picked : classes[0]; // the picked class may have been emptied
  const all = p.holdings.filter((h) => cat(h) === tab);
  const [sortBy, setSortBy] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'currentValue', dir: -1 });
  const sorts = tab === 'MUTUAL_FUND' ? MF_SORTS : SORTS;
  const sort = sorts.some(([k]) => k === sortBy.key) ? sortBy : { key: 'currentValue' as SortKey, dir: -1 as const };
  const sortLabel = sorts.find(([k]) => k === sort.key)?.[1] ?? 'Current';
  const [sortOpen, setSortOpen] = useState(false);
  const items = (all.some(isHeld) ? all.filter(isHeld) : all).sort((a, b) => {
    const va = a[sort.key], vb = b[sort.key];
    if (typeof va === 'string' || typeof vb === 'string') return String(va).localeCompare(String(vb)) * sort.dir;
    return ((va ?? -Infinity) - (vb ?? -Infinity) || 0) * sort.dir;
  });
  const invested = items.reduce((x, h) => x + h.invested, 0);
  const current = items.reduce((x, h) => x + h.currentValue, 0);
  const pl = current - invested;
  const day = items.reduce((x, h) => x + h.dayChange, 0);
  const asOf = asOfLabel(items);
  const t = p.totals;
  const market = tab === 'US_STOCK' ? usMarketStatus() : indianMarketStatus();
  // the card follows the selected category, like the web's summary strip; the whole portfolio sits in its footer
  const slice = p.allocation.find((a) => a.assetClass === tab);
  const realized = all.reduce((x, h) => x + h.realizedGain, 0); // fully sold holdings included
  const dayPct = current - day ? (day / (current - day)) * 100 : 0;

  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S.sm }}>
        {classes.map((x) => (
          <Chip key={x} label={CLASS_META[x].plural} active={tab === x} onPress={() => setTab(x)} />
        ))}
      </ScrollView>

      <Card glow style={{ gap: 0 }}>
        <T variant="small">{CLASS_META[tab].plural} · current value</T>
        <T variant="big" style={{ marginTop: 2 }}>{money(current, 'INR', false).split('.')[0]}</T>
        <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.lineStrong, marginVertical: S.md }} />
        <Line k="Invested" v={money(invested)} />
        <Line k="Total returns" v={`${pl >= 0 ? '+' : '−'}${money(Math.abs(pl))} (${signedPct(invested ? (pl / invested) * 100 : 0)})`} color={toneColor(c, pl)} />
        <Line k="1D returns" v={`${day >= 0 ? '+' : '−'}${money(Math.abs(day))} (${signedPct(dayPct)})`} color={toneColor(c, day)} />
        <Line k="XIRR" v={slice?.xirr != null ? signedPct(slice.xirr) : '—'} color={toneColor(c, slice?.xirr)} />
        {Math.abs(realized) >= 0.005 && <Line k="Realised profit" v={`${realized >= 0 ? '+' : '−'}${money(Math.abs(realized))}`} color={toneColor(c, realized)} />}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', columnGap: S.sm, marginTop: S.sm, paddingTop: S.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line }}>
          <T variant="small">All investments</T>
          <Text style={{ color: c.fg2, fontFamily: F.uiMedium, fontSize: 12.5, fontVariant: ['tabular-nums'] }}>
            {money(Math.round(t.value))}
            <Text style={{ color: toneColor(c, t.gain) }}>{`  ${signedPct(t.gainPct)}`}</Text>
            {t.xirr != null && <Text style={{ color: c.subtle }}>{`  · XIRR ${signedPct(t.xirr)}`}</Text>}
          </Text>
        </View>
      </Card>

      <View style={{ gap: 2, paddingHorizontal: 2 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: S.sm }}>
          <T style={{ fontFamily: F.uiSemibold, fontSize: 15, flexShrink: 1 }} numberOfLines={1}>{CLASS_META[tab].plural} ({items.length})</T>
          <Pressable
            onPress={() => setSortOpen((o) => !o)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Sort holdings, now by ${sortLabel}`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: sortOpen ? c.brand : c.line, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text maxFontSizeMultiplier={1.2} style={{ color: c.fg2, fontFamily: F.uiMedium, fontSize: 12 }}>{sort.dir === -1 ? '↓' : '↑'} {sortLabel}</Text>
            <Text maxFontSizeMultiplier={1.2} style={{ color: c.subtle, fontSize: 10 }}>{sortOpen ? '▴' : '▾'}</Text>
          </Pressable>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: market.open ? c.income : c.subtle }} />
        <T variant="small" style={{ flex: 1 }}>
          <Text style={{ color: market.open ? c.income : c.fg2, fontFamily: F.uiSemibold }}>{market.label}</Text> · {market.detail} · {asOf ?? 'prices pending'}
        </T>
        <Pressable
          onPress={onRefresh}
          disabled={refreshing}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Refresh prices"
          style={{ flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: c.line, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
          {refreshing ? <ActivityIndicator size="small" color={c.muted} style={{ transform: [{ scale: 0.7 }], width: 12, height: 12 }} /> : <Text maxFontSizeMultiplier={1.2} style={{ color: c.fg2, fontSize: 13 }}>↻</Text>}
          <Text maxFontSizeMultiplier={1.2} style={{ color: c.fg2, fontSize: 11.5, fontFamily: F.uiMedium }}>{refreshing ? 'Updating' : 'Refresh'}</Text>
        </Pressable>
      </View>

      {sortOpen && (
        <View style={{ borderWidth: 1, borderColor: c.line, borderRadius: R.md, paddingVertical: 4, backgroundColor: c.surface }}>
          {sorts.map(([k, l]) => {
            const on = sort.key === k;
            return (
              <Pressable
                key={k}
                onPress={() => {
                  setSortBy({ key: k, dir: on ? (sort.dir === 1 ? -1 : 1) : k === 'name' ? 1 : -1 });
                  if (!on) setSortOpen(false); // tapping the current one flips it and keeps the list open
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={({ pressed }) => ({ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: S.md, paddingVertical: 9, backgroundColor: pressed ? alpha(c.fg, 0.04) : 'transparent' })}>
                <Text style={{ color: on ? c.fg : c.fg2, fontFamily: on ? F.uiSemibold : F.ui, fontSize: 14 }}>{l}</Text>
                {on && <Text style={{ color: c.brand, fontFamily: F.uiSemibold, fontSize: 12.5 }}>{sort.key === 'name' ? (sort.dir === 1 ? 'A → Z' : 'Z → A') : sort.dir === -1 ? 'High → low' : 'Low → high'}</Text>}
              </Pressable>
            );
          })}
        </View>
      )}

      <Card style={{ padding: 0 }}>
        {items.map((h, i) => (
          <Row key={h.id} h={h} last={i === items.length - 1} share={invested ? (h.invested / invested) * 100 : 0} />
        ))}
      </Card>
      {p.priceNotes.length > 0 && <T variant="small" style={{ color: c.warn }}>{p.priceNotes.join(' ')}</T>}
      <RealizedProfit p={p} />
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
  const gainTone = toneColor(c, h.gain);
  const live = h.priceSource === 'LIVE' && h.dayChangePct != null;
  const dayTone = toneColor(c, h.dayChangePct);
  const counted = cat(h) !== h.assetClass ? (h.assetClass === 'MUTUAL_FUND' ? 'Fund · NAV' : 'ETF') : null; // e.g. a gold fund under Gold
  const sub = [counted, h.symbol, h.exchange].filter(Boolean).join(' · ') || CLASS_META[h.assetClass].label;
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

      {h.assetClass === 'MUTUAL_FUND' ? (
        // funds: what people track — invested, today's move and XIRR, not units or NAV
        <View style={s.facts}>
          <Fact k="Invested" v={money(h.invested)} />
          <View style={s.factDivider} />
          <Fact
            k="1D change"
            v={`${h.dayChange >= 0 ? '+' : '−'}${money(Math.abs(h.dayChange))}`}
            vColor={toneColor(c, h.dayChange)}
            extra={h.dayChangePct != null ? `${h.dayChangePct >= 0 ? '▲' : '▼'}${Math.abs(h.dayChangePct).toFixed(2)}%` : undefined}
            extraColor={dayTone}
          />
          <View style={s.factDivider} />
          <Fact k="XIRR" v={h.xirr != null ? signedPct(h.xirr) : '—'} vColor={toneColor(c, h.xirr)} />
        </View>
      ) : (
        <View style={s.facts}>
          <Fact k={h.assetClass === 'GOLD' ? 'Grams' : 'Qty'} v={`${fmtQty(h.quantity)}${qtyUnit}`} />
          <View style={s.factDivider} />
          <Fact k="Avg price" v={h.assetClass === 'US_STOCK' && h.nativeAvgCost != null ? usd(h.nativeAvgCost) : money(h.avgCost)} />
          <View style={s.factDivider} />
          <Fact
            k={h.priceSource === 'LIVE' ? 'LTP' : 'Price'}
            v={h.assetClass === 'US_STOCK' && h.nativePrice != null ? usd(h.nativePrice) : money(h.price)}
            extra={live ? `${(h.dayChangePct ?? 0) >= 0 ? '▲' : '▼'}${Math.abs(h.dayChangePct ?? 0).toFixed(2)}%` : h.priceSource === 'MANUAL' ? 'manual' : h.priceSource === 'FACE_VALUE' ? 'face value' : 'last trade'}
            extraColor={live ? dayTone : c.subtle}
          />
        </View>
      )}

      <View style={[s.line, { marginTop: 2 }]}>
        <View style={s.track}>
          <View style={{ width: `${Math.min(100, share)}%`, height: '100%', borderRadius: R.pill, backgroundColor: alpha(c.fg, 0.38) }} />
        </View>
        <Text style={[s.sub, { minWidth: 92, textAlign: 'right' }]}>
          <Text style={{ color: c.fg2, fontFamily: F.uiSemibold }}>{share.toFixed(1)}%</Text> of {CLASS_META[h.assetClass].plural.toLowerCase()}
        </Text>
      </View>
    </Pressable>
  );
}

/** Profit booked by selling, across the whole portfolio — mirrors the web's "Realised profit" card. */
function RealizedProfit({ p }: { p: Portfolio }) {
  const { c } = useTheme();
  const [open, setOpen] = useState(false);
  const r = p.totals.realizedGain;
  const rows = p.holdings.filter((h) => Math.abs(h.realizedGain) >= 0.005).sort((a, b) => b.realizedGain - a.realizedGain);
  if (!rows.length) return null;
  const tone = toneColor(c, r);
  return (
    <Card style={{ gap: S.sm }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <T variant="eyebrow">Realised profit</T>
        <View style={{ backgroundColor: alpha(tone, 0.12), borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 }}>
          <Text style={{ color: tone, fontFamily: F.uiMedium, fontSize: 11 }}>{r >= 0 ? '▲ Gain' : '▼ Loss'}</Text>
        </View>
      </View>
      <Text style={{ color: tone, fontFamily: F.uiSemibold, fontSize: 28, fontVariant: ['tabular-nums'] }}>{r < 0 ? '−' : ''}{money(Math.abs(r))}</Text>
      <Pressable onPress={() => setOpen((o) => !o)} hitSlop={8} accessibilityRole="button" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <T variant="small">Booked from withdrawals till now</T>
        <Text style={{ color: c.fg, fontFamily: F.uiSemibold, fontSize: 12.5 }}>Breakdown {open ? '▴' : '▾'}</Text>
      </Pressable>
      {open && (
        <View style={{ borderWidth: 1, borderColor: c.line, borderRadius: R.md }}>
          {rows.map((h, i) => (
            <View key={h.id} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: S.sm, paddingHorizontal: S.md, paddingVertical: 10, borderTopWidth: i ? StyleSheet.hairlineWidth : 0, borderTopColor: c.line }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={2} style={{ color: c.fg2, fontFamily: F.ui, fontSize: 13, lineHeight: 18 }}>{h.name}</Text>
                <Text style={{ color: c.subtle, fontFamily: F.ui, fontSize: 11, marginTop: 1 }}>
                  {CLASS_META[h.assetClass].label} · {isHeld(h) ? 'partly sold' : 'fully sold'}
                </Text>
              </View>
              <Text style={{ color: toneColor(c, h.realizedGain), fontFamily: F.uiSemibold, fontSize: 13, fontVariant: ['tabular-nums'] }}>
                {h.realizedGain >= 0 ? '+' : '−'}{money(Math.abs(h.realizedGain))}
              </Text>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

/** One labelled figure in the QTY · AVG · LTP strip: tiny caps label above the value, the day move in the top-right corner. */
function Fact({ k, v, vColor, extra, extraColor }: { k: string; v: string; vColor?: string; extra?: string; extraColor?: string }) {
  const { c, mode } = useTheme();
  const label = mode === 'dark' ? c.muted : c.subtle; // subtle is too dim on Forest's dark cards
  return (
    <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
      {/* label on the left, the day move in the top-right corner, so the value below always keeps the full width */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 4 }}>
        <Text style={{ color: label, fontFamily: F.uiMedium, fontSize: 9.5, letterSpacing: 0.8, textTransform: 'uppercase' }} numberOfLines={1}>{k}</Text>
        {extra ? (
          <Text style={{ color: extraColor ?? c.subtle, fontFamily: F.uiMedium, fontSize: 10.5, fontVariant: ['tabular-nums'] }} numberOfLines={1}>
            {extra}
          </Text>
        ) : null}
      </View>
      <Text style={{ color: vColor ?? c.fg, fontFamily: F.uiSemibold, fontSize: 13, fontVariant: ['tabular-nums'] }} numberOfLines={1} adjustsFontSizeToFit>
        {v}
      </Text>
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
  const [tab, setTab] = useState<Tab | 'ALL'>('ALL');
  const [period, setPeriod] = useState<'month' | 'year'>('month');
  const hs = tab === 'ALL' ? p.holdings : p.holdings.filter((h) => cat(h) === tab);

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

  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S.sm }}>
        <Chip label="All" active={tab === 'ALL'} onPress={() => setTab('ALL')} />
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
        <FlowChart data={flows} width={width - S.lg * 2 - S.lg * 2 - 2} />
        <T variant="small">Purchases minus withdrawals in each period.</T>
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
        rows={groupBy(p.holdings.filter(isHeld), (h) => h.horizon ?? 'NONE', (k) => HORIZON_META[k as Horizon | 'NONE'].label).sort(
          (x, y) => HORIZON_ORDER.indexOf(x.key as Horizon | 'NONE') - HORIZON_ORDER.indexOf(y.key as Horizon | 'NONE'),
        )}
        colorOf={(g) => ({ SHORT: c.c6, MEDIUM: c.c3, LONG: c.c1, NONE: c.c8 })[g.key as Horizon | 'NONE']}
      />
      <GroupCard
        title="By goal"
        rows={groupBy(p.holdings.filter(isHeld), (h) => h.goal?.trim() || '', (k) => k || 'No goal set')}
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

const make = (c: Palette, mode: Mode) =>
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
    // the subtle grey is too dim on Forest's dark cards: use the muted tone there
    sub: { color: mode === 'dark' ? c.muted : c.subtle, fontFamily: F.ui, fontSize: 12, fontVariant: ['tabular-nums'] },
    value: { color: c.fg, fontFamily: F.uiSemibold, fontSize: 15, fontVariant: ['tabular-nums'] },
  });
