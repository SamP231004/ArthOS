import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { AppHeader } from '@/components/app-header';
import { MonthPicker } from '@/components/month-picker';
import { Screen } from '@/components/screen';
import { Card, ErrorNote, Loading, T } from '@/components/ui';
import { useAuth } from '@/lib/auth-store';
import { dayLabel, label, money } from '@/lib/format';
import { healthColor } from '@/lib/health';
import { useInsights } from '@/lib/queries';
import type { Insights } from '@/lib/types';
import { useMonth } from '@/lib/ui-store';
import { alpha, F, R, S, useTheme } from '@/theme';

export default function InsightsTab() {
  const month = useMonth();
  const cur = useAuth((s) => s.user?.currency ?? 'INR');
  const fmt = (n: number) => money(Math.round(n), cur);
  const { data, isLoading, error, refetch, isRefetching } = useInsights(month);

  return (
    <Screen refreshing={isRefetching} onRefresh={refetch}>
      <AppHeader />
      <View>
        <T variant="title">Insights</T>
        <T variant="muted">Your month in plain words, with a score that explains itself.</T>
      </View>
      <MonthPicker />
      {isLoading ? <Loading /> : error ? <ErrorNote message={error.message} /> : data ? <Body d={data} fmt={fmt} /> : null}
    </Screen>
  );
}

function Body({ d, fmt }: { d: Insights; fmt: (n: number) => string }) {
  const { c } = useTheme();
  return (
    <>
      {d.alerts.map((a) => {
        const tone = a.level === 'DANGER' ? c.expense : a.level === 'WARN' ? c.warn : c.info;
        return (
          <View key={a.key} style={{ borderWidth: 1, borderColor: alpha(tone, 0.35), backgroundColor: alpha(tone, 0.08), borderRadius: R.md, padding: S.md, gap: 2 }}>
            <Text style={{ color: c.fg, fontFamily: F.uiSemibold, fontSize: 14 }}>{a.title}</Text>
            <T variant="small" style={{ color: c.fg2 }}>{a.body}</T>
          </View>
        );
      })}

      <Health d={d} />

      <Card style={{ gap: S.sm }}>
        <T variant="h2">{d.current ? 'This month so far' : 'The month in a few lines'}</T>
        {d.summary.map((s, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: S.sm }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.brand, marginTop: 8 }} />
            <T style={{ flex: 1, fontSize: 14, lineHeight: 21, color: c.fg2 }}>{s}</T>
          </View>
        ))}
      </Card>

      {d.suggestions.length > 0 && (
        <Card style={{ gap: S.sm }}>
          <T variant="h2">Suggestions</T>
          {d.suggestions.map((s) => (
            <View key={s.title} style={{ borderTopWidth: 1, borderTopColor: c.line, paddingTop: S.sm, gap: 2 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: S.sm }}>
                <Text style={{ flex: 1, color: c.fg, fontFamily: F.uiSemibold, fontSize: 14 }}>💡 {s.title}</Text>
                {s.monthlyImpact != null && s.monthlyImpact > 0 && <Text style={{ color: c.income, fontFamily: F.uiSemibold, fontSize: 12 }}>+{fmt(s.monthlyImpact)}</Text>}
              </View>
              <T variant="small" style={{ lineHeight: 17 }}>{s.body}</T>
            </View>
          ))}
        </Card>
      )}

      <Card style={{ gap: S.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <T variant="h2">By category</T>
          <T variant="small">{d.current ? 'so far vs usual' : 'vs usual'}</T>
        </View>
        {d.trends.length === 0 ? (
          <T variant="muted">No spending to compare yet.</T>
        ) : (
          d.trends.map((t) => {
            const max = Math.max(...d.trends.map((x) => Math.max(x.thisMonth, x.typical)), 1);
            const up = (t.changePct ?? 0) > 0;
            return (
              <View key={t.category} style={{ gap: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: c.fg, fontFamily: F.uiMedium, fontSize: 14 }}>{label(t.category)}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ color: c.fg, fontFamily: F.uiSemibold, fontSize: 13.5, fontVariant: ['tabular-nums'] }}>{fmt(t.thisMonth)}</Text>
                    {t.changePct != null && t.typical > 0 && Math.abs(t.changePct) >= 5 && (
                      <Text style={{ color: up ? c.expense : c.income, backgroundColor: alpha(up ? c.expense : c.income, 0.1), borderRadius: R.pill, overflow: 'hidden', paddingHorizontal: 6, fontSize: 10.5, fontFamily: F.uiSemibold }}>
                        {up ? '▲' : '▼'} {Math.abs(Math.round(t.changePct))}%
                      </Text>
                    )}
                  </View>
                </View>
                <View style={{ height: 7, borderRadius: R.pill, backgroundColor: alpha(c.fg, 0.05), overflow: 'hidden' }}>
                  <View style={{ width: `${(t.thisMonth / max) * 100}%`, height: '100%', borderRadius: R.pill, backgroundColor: c.brand }} />
                </View>
                <View style={{ height: 4, borderRadius: R.pill, backgroundColor: alpha(c.fg, 0.04), overflow: 'hidden' }}>
                  <View style={{ width: `${(t.typical / max) * 100}%`, height: '100%', borderRadius: R.pill, backgroundColor: alpha(c.fg, 0.22) }} />
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
          d.anomalies.map((a) => (
            <View key={a.id} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: S.sm, borderTopWidth: 1, borderTopColor: c.line, paddingTop: S.sm }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.fg, fontFamily: F.uiMedium, fontSize: 14 }} numberOfLines={1}>{a.merchant}</Text>
                <T variant="small">{label(a.category)} · {dayLabel(a.date)} · {a.reason}</T>
              </View>
              <Text style={{ color: c.fg, fontFamily: F.uiSemibold, fontSize: 14 }}>{fmt(a.amount)}</Text>
            </View>
          ))
        )}
      </Card>

      <Card style={{ gap: S.sm }}>
        <T variant="h2">Subscriptions & recurring</T>
        {d.leakage.items.length === 0 ? (
          <T variant="muted">No recurring payments marked yet (rent and EMIs count as fixed costs).</T>
        ) : (
          <>
            <T style={{ color: c.fg2, fontSize: 14 }}>
              <Text style={{ fontFamily: F.uiSemibold, color: c.fg }}>{fmt(d.leakage.monthly)}</Text> a month ·{' '}
              <Text style={{ fontFamily: F.uiSemibold, color: c.fg }}>{fmt(d.leakage.yearly)}</Text> a year
            </T>
            {d.leakage.items.map((i) => {
              const rise = d.leakage.priceRises.find((r) => r.name === i.name);
              return (
                <View key={i.name} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <T style={{ fontSize: 14, flex: 1 }} numberOfLines={1}>
                    {i.name} <Text style={{ color: c.subtle, fontSize: 12 }}>· {label(i.category)}</Text>
                  </T>
                  {rise && <Text style={{ color: c.warn, fontSize: 11, fontFamily: F.uiMedium, marginRight: 6 }}>▲ was {fmt(rise.before)}</Text>}
                  <Text style={{ color: c.fg, fontFamily: F.uiMedium, fontSize: 14 }}>{fmt(i.amount)}</Text>
                </View>
              );
            })}
          </>
        )}
      </Card>
    </>
  );
}

/** Score ring + the five components; tap one to see how it was scored and how to improve it. */
function Health({ d }: { d: Insights }) {
  const { c } = useTheme();
  const [open, setOpen] = useState<string | null>(null);
  const h = d.health;
  const color = healthColor(c, h.score);
  const Rr = 44;
  const C = 2 * Math.PI * Rr;
  return (
    <Card glow style={{ gap: S.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.lg }}>
        <View style={{ width: 108, height: 108, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={108} height={108} viewBox="0 0 108 108" style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
            <Circle cx={54} cy={54} r={Rr} stroke={c.lineStrong} strokeWidth={9} fill="none" />
            <Circle cx={54} cy={54} r={Rr} stroke={color} strokeWidth={9} fill="none" strokeLinecap="round" strokeDasharray={`${(h.score / 100) * C} ${C}`} />
          </Svg>
          <Text style={{ color: c.fg, fontFamily: F.uiSemibold, fontSize: 30, fontVariant: ['tabular-nums'] }}>{h.score}</Text>
          <Text style={{ color, fontFamily: F.uiSemibold, fontSize: 11, marginTop: -2 }}>{h.grade}</Text>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <T variant="small">Financial health</T>
          <T style={{ fontSize: 13.5, lineHeight: 19, color: c.fg2 }}>{h.headline}</T>
        </View>
      </View>
      {h.components.map((cp) => {
        const pct = (cp.points / cp.max) * 100;
        const isOpen = open === cp.key;
        return (
          <Pressable key={cp.key} onPress={() => setOpen(isOpen ? null : cp.key)} style={{ gap: 6, borderTopWidth: 1, borderTopColor: c.line, paddingTop: S.sm }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Text style={{ color: c.fg, fontFamily: F.uiMedium, fontSize: 14 }}>{cp.label}</Text>
              <T variant="small">
                {cp.value} · <Text style={{ color: c.fg, fontFamily: F.uiSemibold }}>{cp.points}</Text>/{cp.max}
              </T>
            </View>
            <View style={{ height: 5, borderRadius: R.pill, backgroundColor: alpha(c.fg, 0.06), overflow: 'hidden' }}>
              <View style={{ width: `${pct}%`, height: '100%', borderRadius: R.pill, backgroundColor: pct >= 80 ? c.income : pct >= 50 ? c.warn : c.expense }} />
            </View>
            {isOpen && (
              <View style={{ gap: 2 }}>
                <T variant="small" style={{ color: c.fg2, lineHeight: 17 }}>{cp.explanation}</T>
                <T variant="small" style={{ color: c.brand }}>→ {cp.tip}</T>
              </View>
            )}
          </Pressable>
        );
      })}
      <T variant="small">Tap a line to see how it was scored.</T>
    </Card>
  );
}
