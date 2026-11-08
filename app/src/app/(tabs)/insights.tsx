import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { AppHeader } from '@/components/app-header';
import { MonthPicker } from '@/components/month-picker';
import { Screen } from '@/components/screen';
import { Card, ErrorNote, Loading, Segmented, T } from '@/components/ui';
import { useAuth } from '@/lib/auth-store';
import { dayLabel, label, money } from '@/lib/format';
import { healthColor } from '@/lib/health';
import { useInsights } from '@/lib/queries';
import type { Insights } from '@/lib/types';
import { useMonth } from '@/lib/ui-store';
import { alpha, F, R, S, useTheme, type Palette } from '@/theme';

type Fmt = (n: number) => string;
type Section = 'overview' | 'spending' | 'recurring';

export default function InsightsTab() {
  const month = useMonth();
  const cur = useAuth((s) => s.user?.currency ?? 'INR');
  const fmt: Fmt = (n) => money(Math.round(n), cur);
  const { data, isLoading, error, refetch, isRefetching } = useInsights(month);
  const [section, setSection] = useState<Section>('overview');

  return (
    <Screen refreshing={isRefetching} onRefresh={refetch}>
      <AppHeader />
      <View>
        <T variant="title">Insights</T>
        <T variant="muted">Your month in plain words, with a score that explains itself.</T>
      </View>
      <MonthPicker />
      {isLoading ? (
        <Loading />
      ) : error ? (
        <ErrorNote message={error.message} />
      ) : data ? (
        <>
          <Segmented<Section>
            value={section}
            onChange={setSection}
            options={[
              { value: 'overview', label: 'Overview' },
              { value: 'spending', label: 'Spending' },
              { value: 'recurring', label: 'Recurring' },
            ]}
          />
          {section === 'overview' && <Overview d={data} fmt={fmt} />}
          {section === 'spending' && <Spending d={data} fmt={fmt} />}
          {section === 'recurring' && <Recurring d={data} fmt={fmt} />}
        </>
      ) : null}
    </Screen>
  );
}

const partColor = (c: Palette, pct: number) => (pct >= 80 ? c.income : pct >= 50 ? c.warn : c.expense);

/** Amounts and percentages in bold inside a sentence. */
function Highlight({ text, c }: { text: string; c: Palette }) {
  const parts = text.split(/(₹[\d,]+(?:\.\d+)?|\d+(?:\.\d+)?%)/g);
  return (
    <Text style={{ color: c.fg2, fontSize: 14, lineHeight: 21, fontFamily: F.ui, flex: 1 }}>
      {parts.map((p, i) => (i % 2 === 1 ? <Text key={i} style={{ color: c.fg, fontFamily: F.uiSemibold }}>{p}</Text> : p))}
    </Text>
  );
}

// ------------------------------------------------------------------ overview

function Overview({ d, fmt }: { d: Insights; fmt: Fmt }) {
  const { c } = useTheme();
  return (
    <>
      <Health d={d} />

      {d.alerts.length > 0 && (
        <View style={{ gap: S.sm }}>
          {d.alerts.map((a) => {
            const tone = a.level === 'DANGER' ? c.expense : a.level === 'WARN' ? c.warn : c.info;
            return (
              <View key={a.key} style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm, borderWidth: 1, borderColor: alpha(tone, 0.35), backgroundColor: alpha(tone, 0.08), borderRadius: R.pill, paddingVertical: 9, paddingHorizontal: 14 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: tone }} />
                <Text style={{ flex: 1, color: c.fg, fontFamily: F.uiSemibold, fontSize: 13.5 }} numberOfLines={1}>{a.brief ?? a.title}</Text>
              </View>
            );
          })}
        </View>
      )}

      <Card style={{ gap: S.md }}>
        <T variant="eyebrow">{d.current ? 'This month so far' : 'The month in a few lines'}</T>
        {d.summary.map((s, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: S.sm, borderTopWidth: 1, borderTopColor: c.line, paddingTop: S.sm }}>
            <Text style={{ color: c.brand, fontSize: 12, marginTop: 3 }}>✦</Text>
            <Highlight text={s} c={c} />
          </View>
        ))}
      </Card>

      {d.suggestions.length > 0 && (
        <Card style={{ gap: S.sm }}>
          <T variant="h2">What you could do</T>
          {d.suggestions.map((s) => (
            <View key={s.title} style={{ borderWidth: 1, borderColor: c.line, borderRadius: R.md, padding: S.md, gap: 4 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: S.sm }}>
                <Text style={{ flex: 1, color: c.fg, fontFamily: F.uiSemibold, fontSize: 14 }}>{s.title}</Text>
                {s.monthlyImpact != null && s.monthlyImpact > 0 && (
                  <Text style={{ color: c.income, backgroundColor: alpha(c.income, 0.1), borderRadius: R.pill, overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 1, fontFamily: F.uiSemibold, fontSize: 11.5 }}>+{fmt(s.monthlyImpact)}</Text>
                )}
              </View>
              <T variant="small" style={{ lineHeight: 17 }}>{s.body}</T>
            </View>
          ))}
        </Card>
      )}
    </>
  );
}

/** 240° gauge + the five parts as tiles; tap one to see how it was scored and how to improve it. */
function Health({ d }: { d: Insights }) {
  const { c } = useTheme();
  const h = d.health;
  const weakest = [...h.components].sort((a, b) => a.points / a.max - b.points / b.max)[0];
  const [open, setOpen] = useState<string>(weakest?.key ?? '');
  const sel = h.components.find((x) => x.key === open);
  const color = healthColor(c, h.score);
  const Rr = 46;
  const C = 2 * Math.PI * Rr;
  const arc = C * (240 / 360);
  return (
    <Card glow style={{ gap: S.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.lg }}>
        <View style={{ width: 116, height: 116, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={116} height={116} viewBox="0 0 116 116" style={{ position: 'absolute', transform: [{ rotate: '150deg' }] }}>
            <Circle cx={58} cy={58} r={Rr} stroke={c.lineStrong} strokeWidth={10} fill="none" strokeLinecap="round" strokeDasharray={`${arc} ${C}`} />
            <Circle cx={58} cy={58} r={Rr} stroke={color} strokeWidth={10} fill="none" strokeLinecap="round" strokeDasharray={`${(h.score / 100) * arc} ${C}`} />
          </Svg>
          <Text style={{ color: c.fg, fontFamily: F.uiSemibold, fontSize: 34, fontVariant: ['tabular-nums'] }}>{h.score}</Text>
          <Text style={{ color: c.subtle, fontFamily: F.uiMedium, fontSize: 10, letterSpacing: 1.2, marginTop: -4 }}>OF 100</Text>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <T variant="small">Financial health</T>
          <Text style={{ color, fontFamily: F.uiSemibold, fontSize: 20 }}>{h.grade}</Text>
          <T style={{ fontSize: 13, lineHeight: 18, color: c.fg2 }}>{h.headline}</T>
        </View>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {h.components.map((cp) => {
          const pct = (cp.points / cp.max) * 100;
          const on = cp.key === open;
          return (
            <Pressable
              key={cp.key}
              onPress={() => setOpen(cp.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={{ width: '31.5%', flexGrow: 1, borderWidth: 1, borderColor: on ? c.brand : c.line, backgroundColor: on ? alpha(c.brand, 0.06) : 'transparent', borderRadius: R.md, padding: 10, gap: 4 }}
            >
              <Text style={{ color: c.muted, fontFamily: F.ui, fontSize: 11 }} numberOfLines={1}>{cp.label}</Text>
              <Text style={{ color: c.fg, fontFamily: F.uiSemibold, fontSize: 16 }}>
                {cp.points}
                <Text style={{ color: c.subtle, fontSize: 11, fontFamily: F.ui }}>/{cp.max}</Text>
              </Text>
              <View style={{ height: 4, borderRadius: R.pill, backgroundColor: alpha(c.fg, 0.07), overflow: 'hidden' }}>
                <View style={{ width: `${pct}%`, height: '100%', borderRadius: R.pill, backgroundColor: partColor(c, pct) }} />
              </View>
            </Pressable>
          );
        })}
      </View>
      {sel && (
        <View style={{ backgroundColor: alpha(c.fg, 0.03), borderRadius: R.md, padding: S.md, gap: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: c.fg, fontFamily: F.uiSemibold, fontSize: 14 }}>{sel.label}</Text>
            <T variant="small">{sel.value}</T>
          </View>
          <T variant="small" style={{ color: c.fg2, lineHeight: 18 }}>{sel.explanation}</T>
          <T variant="small" style={{ color: c.brand, lineHeight: 18 }}>→ {sel.tip}</T>
        </View>
      )}
    </Card>
  );
}

// ------------------------------------------------------------------ spending

function Spending({ d, fmt }: { d: Insights; fmt: Fmt }) {
  const { c } = useTheme();
  const max = Math.max(...d.trends.map((t) => Math.max(t.thisMonth, t.typical)), 1);
  return (
    <>
      <Card style={{ gap: S.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <T variant="h2">By category</T>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 10, height: 6, borderRadius: 2, backgroundColor: c.brand }} />
              <T variant="small">{d.current ? 'So far' : 'Month'}</T>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 2, height: 10, borderRadius: 1, backgroundColor: c.fg }} />
              <T variant="small">Usual</T>
            </View>
          </View>
        </View>
        {d.trends.length === 0 ? (
          <T variant="muted">No spending to compare yet.</T>
        ) : (
          d.trends.map((t) => {
            const change = t.changePct ?? 0;
            const up = change > 0;
            const notable = t.typical > 0 && Math.abs(change) >= 5;
            return (
              <View key={t.category} style={{ gap: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: c.fg, fontFamily: F.uiMedium, fontSize: 14 }}>{label(t.category)}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ color: c.fg, fontFamily: F.uiSemibold, fontSize: 13.5, fontVariant: ['tabular-nums'] }}>{fmt(t.thisMonth)}</Text>
                    <Text style={{ width: 44, textAlign: 'right', color: notable ? (up ? c.expense : c.income) : c.subtle, fontFamily: F.uiSemibold, fontSize: 11.5 }}>
                      {notable ? `${up ? '▲' : '▼'}${Math.abs(Math.round(change))}%` : t.typical > 0 ? 'usual' : 'new'}
                    </Text>
                  </View>
                </View>
                <View style={{ height: 16, justifyContent: 'center' }}>
                  <View style={{ height: 8, borderRadius: R.pill, backgroundColor: alpha(c.fg, 0.05), overflow: 'hidden' }}>
                    <View style={{ width: `${(t.thisMonth / max) * 100}%`, height: '100%', borderRadius: R.pill, backgroundColor: up && notable ? alpha(c.expense, 0.8) : c.brand }} />
                  </View>
                  {t.typical > 0 && <View style={{ position: 'absolute', left: `${(t.typical / max) * 100}%`, width: 2, height: 16, marginLeft: -1, borderRadius: 1, backgroundColor: c.fg }} />}
                </View>
                {t.typical > 0 && <T variant="small">usually {fmt(t.typical)} {d.current ? 'by now' : 'a month'}</T>}
              </View>
            );
          })
        )}
      </Card>

      <Card style={{ gap: S.sm }}>
        <T variant="h2">Unusual spending</T>
        {d.anomalies.length === 0 ? (
          <T variant="muted">Nothing out of the ordinary — every purchase is in line with your usual spending.</T>
        ) : (
          d.anomalies.map((a) => {
            const times = a.reason.match(/^([\d.]+×)/)?.[1];
            return (
              <View key={a.id} style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm, borderTopWidth: 1, borderTopColor: c.line, paddingTop: S.sm }}>
                {times ? (
                  <View style={{ width: 46, height: 38, borderRadius: R.sm, backgroundColor: alpha(c.warn, 0.12), alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: c.warn, fontFamily: F.uiSemibold, fontSize: 12 }}>{times}</Text>
                  </View>
                ) : null}
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.fg, fontFamily: F.uiMedium, fontSize: 14 }} numberOfLines={1}>{a.merchant}</Text>
                  <T variant="small" numberOfLines={1}>{label(a.category)} · {dayLabel(a.date)}</T>
                </View>
                <Text style={{ color: c.fg, fontFamily: F.uiSemibold, fontSize: 14 }}>{fmt(a.amount)}</Text>
              </View>
            );
          })
        )}
      </Card>
    </>
  );
}

// ------------------------------------------------------------------ recurring

function Recurring({ d, fmt }: { d: Insights; fmt: Fmt }) {
  const { c } = useTheme();
  const l = d.leakage;
  if (l.items.length === 0) {
    return (
      <Card>
        <T variant="muted">No recurring payments marked yet (rent and EMIs count as fixed costs, not here).</T>
      </Card>
    );
  }
  return (
    <Card style={{ gap: S.md }}>
      <T variant="h2">Subscriptions & recurring</T>
      <View style={{ flexDirection: 'row', gap: S.sm }}>
        {[
          ['Every month', l.monthly],
          ['Every year', l.yearly],
        ].map(([k, v]) => (
          <View key={k as string} style={{ flex: 1, backgroundColor: alpha(c.fg, 0.03), borderRadius: R.md, padding: S.md }}>
            <T variant="small">{k as string}</T>
            <Text style={{ color: c.fg, fontFamily: F.uiSemibold, fontSize: 18, marginTop: 2, fontVariant: ['tabular-nums'] }}>{fmt(v as number)}</Text>
          </View>
        ))}
      </View>
      {l.items.map((i) => {
        const rise = l.priceRises.find((r) => r.name === i.name);
        return (
          <View key={i.name} style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
            <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: alpha(c.info, 0.12), alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: c.info, fontFamily: F.uiSemibold, fontSize: 13 }}>{i.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.fg, fontFamily: F.uiMedium, fontSize: 14 }} numberOfLines={1}>{i.name}</Text>
              <T variant="small">{label(i.category)}{rise ? ` · was ${fmt(rise.before)}` : ''}</T>
            </View>
            <Text style={{ color: rise ? c.warn : c.fg, fontFamily: F.uiSemibold, fontSize: 14 }}>{fmt(i.amount)}</Text>
          </View>
        );
      })}
    </Card>
  );
}
