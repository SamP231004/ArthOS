import { router } from 'expo-router';
import { useDeferredValue, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';

import { DateField, isISODate } from '@/components/date-field';
import { Screen } from '@/components/screen';
import { Button, Card, Chip, ErrorNote, Input, T } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { money, todayISO } from '@/lib/format';
import { CLASS_META, HORIZON_META } from '@/lib/invest-meta';
import { useMarketSearch, useQuote, useSaveHolding } from '@/lib/queries';
import { ASSET_CLASSES, HORIZONS, type AssetClass, type BondType, type GoldForm, type GoldPurity, type Horizon, type SymbolMatch } from '@/lib/types';
import { alpha, F, R, S, useTheme } from '@/theme';

export default function AddHolding() {
  const { c } = useTheme();
  const [cls, setCls] = useState<AssetClass | null>(null);
  if (!cls) {
    return (
      <Screen edges={['bottom']}>
        <T variant="muted">What would you like to track?</T>
        {ASSET_CLASSES.map((k) => {
          const M = CLASS_META[k];
          const col = M.color(c);
          return (
            <Pressable key={k} onPress={() => setCls(k)}>
              <Card style={{ flexDirection: 'row', gap: S.md, alignItems: 'center' }}>
                <View style={{ width: 44, height: 44, borderRadius: R.md, backgroundColor: alpha(col, 0.14), alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: col, fontSize: 18 }}>{M.glyph}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <T variant="h2">{M.plural}</T>
                  <T variant="small">{M.blurb}</T>
                </View>
                <T variant="muted">›</T>
              </Card>
            </Pressable>
          );
        })}
      </Screen>
    );
  }
  return <Form key={cls} cls={cls} onBack={() => setCls(null)} />;
}

function Form({ cls, onBack }: { cls: AssetClass; onBack: () => void }) {
  const { c } = useTheme();
  const save = useSaveHolding();
  const [picked, setPicked] = useState<SymbolMatch | null>(null);
  const [query, setQuery] = useState('');
  const dq = useDeferredValue(query);
  const search = useMarketSearch(cls, dq);
  const [name, setName] = useState('');
  const [qty, setQty] = useState('');
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [date, setDate] = useState(todayISO());
  const [horizon, setHorizon] = useState<Horizon | undefined>();
  const [goal, setGoal] = useState('');
  const [goldForm, setGoldForm] = useState<GoldForm>('DIGITAL');
  const [purity, setPurity] = useState<GoldPurity>('K24');
  const [faceValue, setFaceValue] = useState('1000');
  const [coupon, setCoupon] = useState('');
  const [maturity, setMaturity] = useState('');
  const [bondType, setBondType] = useState<BondType>('GOVERNMENT');
  const [manual, setManual] = useState('');

  const quote = useQuote(cls, picked?.symbol);
  const factor = cls === 'GOLD' && purity === 'K22' && goldForm !== 'SGB' ? 0.916 : 1;
  const live = quote.data?.price != null ? Math.round(quote.data.price * factor * 100) / 100 : null;
  const effPrice = price !== '' ? price : date === todayISO() && live != null ? String(live) : '';
  const units = cls === 'MUTUAL_FUND' && amount && effPrice ? Number(amount) / Number(effPrice) : null;
  const quantity = units != null && !qty ? Math.floor(units * 1000) / 1000 : Number(qty);
  const needsPick = (cls === 'STOCK' || cls === 'MUTUAL_FUND') && !picked;
  const err = save.error instanceof ApiError ? save.error : null;
  const num = (t: string) => t.replace(/[^0-9.]/g, '');

  function submit() {
    save.mutate(
      {
        input: {
          assetClass: cls,
          name: cls === 'GOLD' && !name ? (goldForm === 'SGB' ? 'Sovereign Gold Bond' : goldForm === 'PHYSICAL' ? 'Physical gold' : 'Digital gold') : picked?.name ?? name,
          symbol: picked?.symbol,
          exchange: picked?.exchange,
          horizon,
          goal: goal || undefined,
          goldForm: cls === 'GOLD' ? goldForm : undefined,
          purity: cls === 'GOLD' ? (goldForm === 'SGB' ? 'K24' : purity) : undefined,
          faceValue: cls === 'BOND' ? Number(faceValue) : undefined,
          couponRate: cls === 'BOND' ? Number(coupon) : undefined,
          maturityDate: cls === 'BOND' ? maturity : undefined,
          bondType: cls === 'BOND' ? bondType : undefined,
          manualPrice: manual ? Number(manual) : undefined,
          firstLot: { type: 'BUY', date, quantity, price: Number(effPrice) },
        },
      },
      { onSuccess: () => router.back() },
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen edges={['bottom']}>
        <Pressable onPress={onBack}>
          <T variant="small" style={{ color: c.brand }}>‹ Change type</T>
        </Pressable>
        <T variant="title" style={{ fontSize: 26 }}>{CLASS_META[cls].addTitle}</T>

        {(cls === 'STOCK' || cls === 'MUTUAL_FUND') &&
          (picked ? (
            <Card style={{ borderColor: alpha(c.brand, 0.35), gap: 2 }}>
              <T variant="h2">{picked.name}</T>
              <T variant="small">
                {picked.symbol} · {picked.exchange}
                {quote.data ? ` · ${cls === 'MUTUAL_FUND' ? 'NAV' : 'Last'} ${money(quote.data.price)}` : quote.isLoading ? ' · fetching price…' : ''}
              </T>
              <Pressable onPress={() => { setPicked(null); setPrice(''); }}>
                <T variant="small" style={{ color: c.brand, marginTop: S.xs }}>Change</T>
              </Pressable>
            </Card>
          ) : (
            <View style={{ gap: S.sm }}>
              <TextInput
                autoFocus
                value={query}
                onChangeText={setQuery}
                placeholder={cls === 'STOCK' ? '⌕  Search NSE / BSE — e.g. Reliance' : '⌕  Search funds — e.g. Parag Parikh'}
                placeholderTextColor={c.subtle}
                style={{ borderWidth: 1, borderColor: c.lineStrong, backgroundColor: c.field, color: c.fg, borderRadius: R.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: F.ui }}
              />
              <Card style={{ padding: 0 }}>
                {query.trim().length < 2 ? (
                  <T variant="small" style={{ padding: S.lg, textAlign: 'center' }}>Type at least 2 letters</T>
                ) : !search.data?.length ? (
                  <T variant="small" style={{ padding: S.lg, textAlign: 'center' }}>{search.isFetching ? 'Searching…' : 'No matches'}</T>
                ) : (
                  search.data.map((m, i) => (
                    <Pressable key={`${m.symbol}-${m.exchange}`} onPress={() => setPicked(m)} style={{ padding: S.md, paddingHorizontal: S.lg, borderTopWidth: i ? 1 : 0, borderTopColor: c.line, flexDirection: 'row', justifyContent: 'space-between', gap: S.sm }}>
                      <View style={{ flex: 1 }}>
                        <T numberOfLines={1} style={{ fontSize: 14 }}>{m.name}</T>
                        <T variant="small">{m.symbol}</T>
                      </View>
                      <T variant="small">{m.exchange}</T>
                    </Pressable>
                  ))
                )}
              </Card>
            </View>
          ))}

        {cls === 'GOLD' && (
          <View style={{ gap: S.md }}>
            <View style={{ flexDirection: 'row', gap: S.sm, flexWrap: 'wrap' }}>
              {(['DIGITAL', 'PHYSICAL', 'SGB'] as GoldForm[]).map((g) => (
                <Chip key={g} label={g === 'SGB' ? 'Gold bond (SGB)' : g === 'DIGITAL' ? 'Digital' : 'Physical'} active={goldForm === g} onPress={() => setGoldForm(g)} />
              ))}
            </View>
            {goldForm !== 'SGB' && (
              <View style={{ flexDirection: 'row', gap: S.sm }}>
                <Chip label="24K" active={purity === 'K24'} onPress={() => setPurity('K24')} />
                <Chip label="22K" active={purity === 'K22'} onPress={() => setPurity('K22')} />
              </View>
            )}
            <Input label="Name (optional)" value={name} onChangeText={setName} placeholder={goldForm === 'SGB' ? 'SGB 2024-25 Series II' : 'e.g. Coins'} />
            {live != null && <T variant="small">Today&apos;s spot {money(live)}/g (excludes duty &amp; GST)</T>}
          </View>
        )}

        {cls === 'BOND' && (
          <View style={{ gap: S.md }}>
            <Input label="Bond name" value={name} onChangeText={setName} placeholder="GOI 7.18% 2033" />
            <View style={{ flexDirection: 'row', gap: S.sm }}>
              <Chip label="Government" active={bondType === 'GOVERNMENT'} onPress={() => setBondType('GOVERNMENT')} />
              <Chip label="Corporate" active={bondType === 'CORPORATE'} onPress={() => setBondType('CORPORATE')} />
            </View>
            <View style={{ flexDirection: 'row', gap: S.md }}>
              <View style={{ flex: 1 }}><Input label="Face value" keyboardType="decimal-pad" value={faceValue} onChangeText={(t) => setFaceValue(num(t))} /></View>
              <View style={{ flex: 1 }}><Input label="Coupon %" keyboardType="decimal-pad" value={coupon} onChangeText={(t) => setCoupon(num(t))} placeholder="7.18" /></View>
            </View>
            <DateField label="Maturity date" value={maturity} onChange={setMaturity} />
          </View>
        )}

        {!needsPick && (
          <View style={{ gap: S.md }}>
            <View style={{ flexDirection: 'row', gap: S.md }}>
              <View style={{ flex: 1 }}>
                {cls === 'MUTUAL_FUND' ? (
                  <Input label="Amount invested" keyboardType="decimal-pad" value={amount} onChangeText={(t) => setAmount(num(t))} hint={units != null && !qty ? `≈ ${units.toFixed(3)} units` : undefined} />
                ) : (
                  <Input label={cls === 'GOLD' ? 'Grams' : cls === 'BOND' ? 'No. of bonds' : 'Shares'} keyboardType="decimal-pad" value={qty} onChangeText={(t) => setQty(num(t))} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Input label={cls === 'GOLD' ? 'Price / gram' : cls === 'MUTUAL_FUND' ? 'NAV paid' : 'Price paid'} keyboardType="decimal-pad" value={effPrice} onChangeText={(t) => setPrice(num(t))} />
              </View>
            </View>
            {cls === 'MUTUAL_FUND' && <Input label="…or units (optional)" keyboardType="decimal-pad" value={qty} onChangeText={(t) => setQty(num(t))} />}
            <DateField label="Purchase date" value={date} onChange={(d) => { setDate(d); if (d !== todayISO()) setPrice(''); }} />
            {cls === 'BOND' && <Input label="Current price per bond (optional)" keyboardType="decimal-pad" value={manual} onChangeText={(t) => setManual(num(t))} hint="Bonds have no live feed — else valued at face value" />}
            <View style={{ gap: S.sm }}>
              <T variant="label">Time horizon</T>
              <View style={{ flexDirection: 'row', gap: S.sm, flexWrap: 'wrap' }}>
                {HORIZONS.map((h) => (
                  <Chip key={h} label={HORIZON_META[h].label} active={horizon === h} onPress={() => setHorizon(horizon === h ? undefined : h)} />
                ))}
              </View>
            </View>
            <Input label="Goal (optional)" value={goal} onChangeText={setGoal} placeholder="Retirement, house…" maxLength={60} />
            {quantity > 0 && Number(effPrice) > 0 && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', backgroundColor: alpha(c.fg, 0.04), borderRadius: R.md, padding: S.md }}>
                <T variant="muted">Total invested</T>
                <T variant="num" style={{ fontSize: 15 }}>{money(quantity * Number(effPrice))}</T>
              </View>
            )}
          </View>
        )}

        <ErrorNote message={err ? (err.fieldErrors ? Object.entries(err.fieldErrors).map(([k, v]) => `${k} ${v}`).join(', ') : err.message) : save.error?.message} />
        <Button title="Add to portfolio" size="lg" loading={save.isPending} disabled={needsPick || !(quantity > 0) || effPrice === '' || !isISODate(date)} onPress={submit} />
      </Screen>
    </KeyboardAvoidingView>
  );
}
