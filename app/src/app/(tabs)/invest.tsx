import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { Sparkline, ValueChart } from '@/components/charts';
import { Screen } from '@/components/screen';
import { Button, Card, Chip, ErrorNote, Loading, Segmented, T } from '@/components/ui';
import { money } from '@/lib/format';
import { CLASS_META, fmtQty, signedPct, toneColor } from '@/lib/invest-meta';
import { usePortfolio } from '@/lib/queries';
import type { AssetClass, HoldingView, Portfolio, PortfolioRange } from '@/lib/types';
import { alpha, F, R, S, useStyles, useTheme, type Palette } from '@/theme';

type Tab = 'ALL' | AssetClass;

export default function InvestTab() {
  const [range, setRange] = useState<PortfolioRange>('1Y');
  const { data: p, isLoading, error, refetch, isRefetching } = usePortfolio(range);
  const [view, setView] = useState<'holdings' | 'analysis'>('holdings');

  return (
    <Screen refreshing={isRefetching} onRefresh={refetch}>
      <View>
        <T variant="title">Investments</T>
        <T variant="muted">Stocks, mutual funds, gold and bonds — one live portfolio.</T>
      </View>
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

function Holdings({ p }: { p: Portfolio }) {
  const { c } = useTheme();
  const s = useStyles(make);
  const classes = p.allocation.map((a) => a.assetClass);
  const [tab, setTab] = useState<Tab>('ALL');
  const items = p.holdings.filter((h) => tab === 'ALL' || h.assetClass === tab).sort((a, b) => b.currentValue - a.currentValue);
  const invested = items.reduce((x, h) => x + h.invested, 0);
  const current = items.reduce((x, h) => x + h.currentValue, 0);
  const pl = current - invested;
  const day = items.reduce((x, h) => x + h.dayChange, 0);
  const asOf = p.pricesAsOf ? new Date(p.pricesAsOf).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : null;
  const t = p.totals;

  return (
    <>
      <Card glow style={{ gap: 4 }}>
        <T variant="label">Net holdings</T>
        <T variant="big">{money(t.value, 'INR', false).split('.')[0]}</T>
        <T variant="small">
          {money(t.invested, 'INR', true)} invested · <Text style={{ color: toneColor(c, t.gain) }}>{signedPct(t.gainPct)}</Text> all time · XIRR{' '}
          <Text style={{ color: toneColor(c, t.xirr) }}>{t.xirr != null ? signedPct(t.xirr) : '—'}</Text>
        </T>
        <T variant="small" style={{ marginTop: S.xs }}>
          Realised profit <Text style={{ color: toneColor(c, t.realizedGain), fontFamily: F.uiSemibold }}>{t.realizedGain >= 0 ? '+' : '−'}{money(Math.abs(t.realizedGain))}</Text>
        </T>
      </Card>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S.sm }}>
        {(['ALL', ...classes] as Tab[]).map((x) => (
          <Chip key={x} label={x === 'ALL' ? 'All' : CLASS_META[x].plural} active={tab === x} onPress={() => setTab(x)} />
        ))}
      </ScrollView>

      <View style={s.strip}>
        <Cell k="Invested" v={money(invested, 'INR', true)} sub={`${items.length} holdings`} />
        <Cell k="Current" v={money(current, 'INR', true)} sub="At market price" />
        <Cell k="Unrealised P&L" v={`${pl >= 0 ? '+' : '−'}${money(Math.abs(pl), 'INR', true)}`} color={toneColor(c, pl)} sub={signedPct(invested ? (pl / invested) * 100 : 0)} />
        <Cell k="Today" v={`${day >= 0 ? '+' : '−'}${money(Math.abs(day), 'INR', true)}`} color={toneColor(c, day)} sub={signedPct(current - day ? (day / (current - day)) * 100 : 0)} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: asOf ? c.income : c.warn }} />
        <T variant="small">{asOf ? `Live prices · ${asOf} · pull to refresh` : 'Prices pending'}</T>
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

function Row({ h, last, share }: { h: HoldingView; last: boolean; share: number }) {
  const { c } = useTheme();
  const s = useStyles(make);
  const col = CLASS_META[h.assetClass].color(c);
  const up = h.spark.length > 1 && h.spark[h.spark.length - 1] >= h.spark[0];
  return (
    <Pressable onPress={() => router.push(`/holding?id=${h.id}`)} style={({ pressed }) => [s.row, !last && s.rowBorder, pressed && { backgroundColor: alpha(c.fg, 0.03) }]}>
      <View style={[s.avatar, { backgroundColor: alpha(col, 0.14) }]}>
        <Text style={{ color: col, fontFamily: F.uiBold, fontSize: 12 }}>{initials(h.name)}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text style={s.name} numberOfLines={1}>{h.name}</Text>
        <Text style={s.sub} numberOfLines={1}>
          {fmtQty(h.quantity)}{h.assetClass === 'GOLD' ? ' g' : ''} · avg {money(h.avgCost)} · {share.toFixed(1)}%
        </Text>
        <Text style={[s.sub, { color: h.priceSource === 'LIVE' ? toneColor(c, h.dayChangePct) : c.subtle }]}>
          {money(h.price)} {h.priceSource === 'LIVE' ? signedPct(h.dayChangePct) : h.priceSource === 'MANUAL' ? 'manual' : h.priceSource === 'FACE_VALUE' ? 'face value' : 'last trade'}
        </Text>
      </View>
      {h.spark.length > 1 && <Sparkline values={h.spark} color={up ? c.income : c.expense} width={54} height={26} />}
      <View style={{ alignItems: 'flex-end', gap: 2, minWidth: 92 }}>
        <Text style={s.value}>{money(h.currentValue)}</Text>
        <Text style={[s.sub, { color: toneColor(c, h.gain), fontFamily: F.uiSemibold }]}>{h.gain >= 0 ? '+' : '−'}{money(Math.abs(h.gain), 'INR', true)}</Text>
        <Text style={[s.sub, { color: toneColor(c, h.gainPct) }]}>{signedPct(h.gainPct)}</Text>
      </View>
    </Pressable>
  );
}

function Analysis({ p, range, setRange }: { p: Portfolio; range: PortfolioRange; setRange: (r: PortfolioRange) => void }) {
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  const classes = p.allocation.map((a) => a.assetClass);
  const [tab, setTab] = useState<Tab>('ALL');
  const [period, setPeriod] = useState<'month' | 'year'>('month');
  const hs = p.holdings.filter((h) => tab === 'ALL' || h.assetClass === tab);

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
        {(['ALL', ...classes] as Tab[]).map((x) => (
          <Chip key={x} label={x === 'ALL' ? 'All' : CLASS_META[x].plural} active={tab === x} onPress={() => setTab(x)} />
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
    </>
  );
}

function Cell({ k, v, sub, color }: { k: string; v: string; sub: string; color?: string }) {
  const s = useStyles(make);
  return (
    <View style={s.cell}>
      <T variant="label" style={{ fontSize: 10 }}>{k}</T>
      <T variant="num" style={[{ fontSize: 17 }, color ? { color } : null]}>{v}</T>
      <T variant="small" style={color ? { color } : null}>{sub}</T>
    </View>
  );
}

function initials(name: string) {
  const w = name.replace(/[^A-Za-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
  return ((w[0]?.[0] ?? '') + (w[1]?.[0] ?? w[0]?.[1] ?? '')).toUpperCase();
}

const make = (c: Palette) =>
  StyleSheet.create({
    strip: { flexDirection: 'row', flexWrap: 'wrap', borderWidth: 1, borderColor: c.line, borderRadius: R.xl, overflow: 'hidden', backgroundColor: c.surface },
    cell: { width: '50%', padding: S.md, gap: 2, borderColor: c.line, borderRightWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth },
    row: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingHorizontal: S.lg, paddingVertical: S.md },
    rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line },
    avatar: { width: 40, height: 40, borderRadius: R.md, alignItems: 'center', justifyContent: 'center' },
    name: { color: c.fg, fontFamily: F.uiSemibold, fontSize: 14 },
    sub: { color: c.subtle, fontFamily: F.ui, fontSize: 11.5 },
    value: { color: c.fg, fontFamily: F.uiSemibold, fontSize: 14, fontVariant: ['tabular-nums'] },
  });
