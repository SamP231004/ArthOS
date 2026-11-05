import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Pressable, Text, View } from 'react-native';

import { Sparkline } from '@/components/charts';
import { DateField, isISODate } from '@/components/date-field';
import { FundingPicker } from '@/components/funding-picker';
import { Screen } from '@/components/screen';
import { Badge, Button, Card, Chip, ErrorNote, Input, Loading, Segmented, T } from '@/components/ui';
import { dateLabel, money, todayISO } from '@/lib/format';
import { CLASS_META, fmtQty, holdingSubtitle, HORIZON_META, signedPct, SOURCE_LABEL, toneColor } from '@/lib/invest-meta';
import { useAddLot, useDeleteHolding, useDeleteLot, useHolding, useSaveHolding } from '@/lib/queries';
import { HORIZONS, type FundingSource, type HoldingView, type Horizon, type LotType } from '@/lib/types';
import { alpha, F, R, S, useTheme } from '@/theme';

type Tab = 'overview' | 'trade' | 'settings';

export default function HoldingScreen() {
  const { id, tab } = useLocalSearchParams<{ id: string; tab?: Tab }>();
  const { data: h, isLoading } = useHolding(id);
  const [t, setT] = useState<Tab>(tab ?? 'overview');
  if (isLoading) return <Loading />;
  if (!h) return <ErrorNote message="This holding no longer exists." />;
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <Stack.Screen options={{ title: h.name.length > 26 ? h.name.slice(0, 24) + '…' : h.name }} />
      <Screen edges={['bottom']}>
        <T variant="small">{holdingSubtitle(h)}</T>
        <Segmented value={t} onChange={setT} options={[{ value: 'overview', label: 'Overview' }, { value: 'trade', label: 'Buy / sell' }, { value: 'settings', label: 'Settings' }]} />
        {t === 'overview' && <Overview h={h} />}
        {t === 'trade' && <Trade h={h} onDone={() => setT('overview')} />}
        {t === 'settings' && <Settings h={h} onSaved={() => setT('overview')} />}
      </Screen>
    </KeyboardAvoidingView>
  );
}

function Overview({ h }: { h: HoldingView }) {
  const { c } = useTheme();
  const del = useDeleteLot(h.id);
  const unit = CLASS_META[h.assetClass].unit;
  return (
    <>
      <Card glow style={{ gap: 4 }}>
        <T variant="small">Current value</T>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <T variant="big">{money(h.currentValue)}</T>
          {h.spark.length > 1 && <Sparkline values={h.spark} color={h.spark[h.spark.length - 1] >= h.spark[0] ? c.income : c.expense} width={90} height={34} />}
        </View>
        <T style={{ color: toneColor(c, h.gain), fontSize: 14 }}>
          {h.gain >= 0 ? '+' : '−'}{money(Math.abs(h.gain))} ({signedPct(h.gainPct)}) all time
        </T>
      </Card>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.md }}>
        <Stat k={h.assetClass === 'GOLD' ? 'Price / gram' : h.assetClass === 'MUTUAL_FUND' ? 'NAV' : 'Price'} v={money(h.price)} sub={SOURCE_LABEL[h.priceSource]} />
        <Stat k="Today" v={h.priceSource === 'LIVE' ? `${h.dayChange >= 0 ? '+' : '−'}${money(Math.abs(h.dayChange))}` : '—'} sub={signedPct(h.dayChangePct)} color={toneColor(c, h.dayChange)} />
        <Stat k="Invested" v={money(h.invested)} sub={`avg ${money(h.avgCost)}`} />
        <Stat k="XIRR" v={h.xirr != null ? signedPct(h.xirr) : '—'} sub={h.xirr != null ? 'annualised' : 'needs 30+ days'} color={toneColor(c, h.xirr)} />
        <Stat k="Holding" v={`${fmtQty(h.quantity)} ${unit}`} sub={h.firstBought ? `since ${dateLabel(h.firstBought)}` : ''} />
        {h.realizedGain !== 0 && <Stat k="Realised" v={`${h.realizedGain >= 0 ? '+' : '−'}${money(Math.abs(h.realizedGain))}`} sub="from sales" color={toneColor(c, h.realizedGain)} />}
        {h.bond && <Stat k="Coupon" v={`${h.bond.couponRate}%`} sub={`${money(h.bond.annualCoupon)}/yr · matures ${dateLabel(h.bond.maturityDate)}`} />}
        {h.gold && <Stat k="24K spot" v={`${money(h.gold.pricePerGram24k)}/g`} sub={h.gold.purity === 'K22' ? 'valued at 91.6%' : 'international spot'} />}
      </View>
      {(h.horizon || h.goal) && (
        <View style={{ flexDirection: 'row', gap: S.sm, flexWrap: 'wrap' }}>
          {h.horizon && <Badge label={HORIZON_META[h.horizon].label} color={c.info} />}
          {h.goal && <Badge label={`Goal: ${h.goal}`} color={c.warn} />}
        </View>
      )}
      <T variant="label">Transactions</T>
      <Card style={{ padding: 0 }}>
        {[...h.lots].reverse().map((l, i) => (
          <View key={l.id} style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm, padding: S.md, paddingHorizontal: S.lg, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
            <Badge label={l.type === 'BUY' ? 'Buy' : 'Sell'} color={l.type === 'BUY' ? c.income : c.expense} />
            <T variant="small" style={{ flex: 1 }}>{dateLabel(l.date)}</T>
            <View style={{ alignItems: 'flex-end' }}>
              <T style={{ fontSize: 13, fontVariant: ['tabular-nums'] }}>{fmtQty(l.quantity)} × {money(l.price)}</T>
              <T variant="small">
                {money(l.amount)}
                {l.type === 'BUY' ? (l.fundedFrom === 'SPENDING' ? ' · from spending' : ' · from savings') : ' · to savings'}
                {l.note && l.note !== 'Paid from spending money' ? ` · ${l.note}` : ''}
              </T>
            </View>
            {h.lots.length > 1 && (
              <Pressable
                hitSlop={8}
                onPress={() => Alert.alert('Delete transaction?', '', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => del.mutate(l.id) }])}>
                <Text style={{ color: c.subtle, fontSize: 16 }}>✕</Text>
              </Pressable>
            )}
          </View>
        ))}
      </Card>
      <ErrorNote message={del.error?.message} />
    </>
  );
}

function Trade({ h, onDone }: { h: HoldingView; onDone: () => void }) {
  const { c } = useTheme();
  const add = useAddLot(h.id);
  const [type, setType] = useState<LotType>('BUY');
  const [qty, setQty] = useState('');
  const [price, setPrice] = useState(String(h.price));
  const [date, setDate] = useState(todayISO());
  const [fundedFrom, setFundedFrom] = useState<FundingSource>('SAVINGS');
  const num = (t: string) => t.replace(/[^0-9.]/g, '');
  return (
    <Card style={{ gap: S.md }}>
      <View style={{ flexDirection: 'row', gap: S.sm }}>
        <Chip label="Buy more" active={type === 'BUY'} tone={c.income} onPress={() => setType('BUY')} />
        <Chip label="Sell / withdraw" active={type === 'SELL'} tone={c.expense} onPress={() => setType('SELL')} />
      </View>
      <View style={{ flexDirection: 'row', gap: S.md }}>
        <View style={{ flex: 1 }}><Input label={CLASS_META[h.assetClass].unit} keyboardType="decimal-pad" value={qty} onChangeText={(t) => setQty(num(t))} hint={type === 'SELL' ? `You hold ${fmtQty(h.quantity)}` : undefined} /></View>
        <View style={{ flex: 1 }}><Input label="Price / unit" keyboardType="decimal-pad" value={price} onChangeText={(t) => setPrice(num(t))} /></View>
      </View>
      <DateField value={date} onChange={setDate} />
      {Number(qty) > 0 && Number(price) > 0 && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', backgroundColor: alpha(c.fg, 0.04), borderRadius: R.md, padding: S.md }}>
          <T variant="muted">{type === 'BUY' ? 'Total cost' : 'Proceeds → savings'}</T>
          <Text style={{ color: c.fg, fontFamily: F.uiSemibold }}>{money(Number(qty) * Number(price))}</Text>
        </View>
      )}
      {type === 'BUY' && <FundingPicker value={fundedFrom} onChange={setFundedFrom} amount={Number(qty) * Number(price) || 0} date={date} />}
      <ErrorNote message={add.error?.message} />
      <Button
        title={type === 'BUY' ? 'Add purchase' : 'Record sale'}
        loading={add.isPending}
        disabled={!(Number(qty) > 0) || price === '' || !isISODate(date)}
        onPress={() =>
          add.mutate(
            { type, date, quantity: Number(qty), price: Number(price), note: h.assetClass === 'MUTUAL_FUND' && type === 'BUY' ? 'SIP' : undefined, fundedFrom: type === 'BUY' ? fundedFrom : undefined },
            { onSuccess: onDone },
          )
        }
      />
    </Card>
  );
}

function Settings({ h, onSaved }: { h: HoldingView; onSaved: () => void }) {
  const save = useSaveHolding();
  const del = useDeleteHolding();
  const [name, setName] = useState(h.name);
  const [horizon, setHorizon] = useState<Horizon | undefined>(h.horizon);
  const [goal, setGoal] = useState(h.goal ?? '');
  const [manual, setManual] = useState(h.manualPrice != null ? String(h.manualPrice) : '');
  return (
    <Card style={{ gap: S.md }}>
      <Input label="Name" value={name} onChangeText={setName} maxLength={140} />
      <View style={{ gap: S.sm }}>
        <T variant="label">Time horizon</T>
        <View style={{ flexDirection: 'row', gap: S.sm, flexWrap: 'wrap' }}>
          {HORIZONS.map((x) => (
            <Chip key={x} label={HORIZON_META[x].label} active={horizon === x} onPress={() => setHorizon(horizon === x ? undefined : x)} />
          ))}
        </View>
      </View>
      <Input label="Goal" value={goal} onChangeText={setGoal} maxLength={60} placeholder="Optional" />
      <Input label="Manual price per unit" keyboardType="decimal-pad" value={manual} onChangeText={(t) => setManual(t.replace(/[^0-9.]/g, ''))} hint={h.assetClass === 'BOND' ? 'Bonds have no live feed — set the latest traded price' : 'Overrides live pricing; leave empty to use live data'} />
      <ErrorNote message={(save.error ?? del.error)?.message} />
      <Button
        title="Save"
        loading={save.isPending}
        onPress={() =>
          save.mutate(
            {
              id: h.id,
              input: {
                assetClass: h.assetClass, name, symbol: h.symbol, exchange: h.exchange, horizon, goal: goal || undefined,
                goldForm: h.gold?.form, purity: h.gold?.purity, faceValue: h.bond?.faceValue, couponRate: h.bond?.couponRate,
                maturityDate: h.bond?.maturityDate, bondType: h.bond?.bondType, manualPrice: manual ? Number(manual) : undefined, notes: h.notes,
              },
            },
            { onSuccess: onSaved },
          )
        }
      />
      <Button
        title="Remove holding"
        variant="danger"
        loading={del.isPending}
        onPress={() => Alert.alert(`Remove ${h.name}?`, 'All its transactions are deleted too.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => del.mutate(h.id, { onSuccess: () => router.back() }) }])}
      />
    </Card>
  );
}

function Stat({ k, v, sub, color }: { k: string; v: string; sub?: string; color?: string }) {
  return (
    <Card style={{ flexBasis: '47%', flexGrow: 1, padding: S.md, gap: 2 }}>
      <T variant="small">{k}</T>
      <T variant="num" style={[{ fontSize: 16 }, color ? { color } : null]}>{v}</T>
      {sub ? <T variant="small">{sub}</T> : null}
    </Card>
  );
}
