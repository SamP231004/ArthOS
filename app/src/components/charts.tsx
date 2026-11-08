import { useState } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { money, shortMoney } from '@/lib/format';

import { F, useTheme } from '@/theme';

function smooth(pts: [number, number][]) {
  if (pts.length < 2) return '';
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2;
    d += ` C${p1[0] + (p2[0] - p0[0]) / 6},${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6},${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]},${p2[1]}`;
  }
  return d;
}

export function Sparkline({ values, color, width = 84, height = 30 }: { values: number[]; color: string; width?: number; height?: number }) {
  if (values.length < 2) return <View style={{ width, height }} />;
  const max = Math.max(...values), min = Math.min(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * width, height - 2 - ((v - min) / span) * (height - 4)] as [number, number]);
  const line = smooth(pts);
  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="sp" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity={0.3} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Path d={`${line} L${width},${height} L0,${height} Z`} fill="url(#sp)" />
      <Path d={line} fill="none" stroke={color} strokeWidth={1.6} />
    </Svg>
  );
}

const AXIS = 46; // width of the y-axis label gutter

/** Value (area) vs invested (dashed) over time, with axes and a legend; press and drag to read any day. */
export function ValueChart({ data, width }: { data: { date: string; value: number; invested: number }[]; format?: (n: number) => string; width: number }) {
  const { c } = useTheme();
  const [hover, setHover] = useState<number | null>(null);
  const H = 180;
  const W = width - AXIS;
  if (data.length < 2 || W <= 0) return <View style={{ height: H }} />;
  const vals = data.flatMap((d) => [d.value, d.invested]);
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const pad = (hi - lo) * 0.12 || hi * 0.05 || 1;
  const min = Math.max(0, lo - pad), max = hi + pad;
  const x = (i: number) => (i / (data.length - 1)) * (W - 2) + 1;
  const y = (v: number) => 6 + (1 - (v - min) / (max - min)) * (H - 12);
  const vp = data.map((d, i) => [x(i), y(d.value)] as [number, number]);
  const ip = data.map((d, i) => [x(i), y(d.invested)] as [number, number]);
  const last = data[data.length - 1];
  const up = last.value >= last.invested;
  const col = up ? c.income : c.expense;
  const pick = (px: number) => setHover(Math.max(0, Math.min(data.length - 1, Math.round((px / W) * (data.length - 1)))));
  const h = hover != null ? data[hover] : null;
  const ticks = [0, 1, 2, 3].map((k) => min + ((max - min) * k) / 3);
  const shown = h ?? last;
  const date = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });

  return (
    <View style={{ gap: 8 }}>
      {/* legend / readout: today's numbers, or the day under your finger */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 14, rowGap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 16, height: 3, borderRadius: 2, backgroundColor: col }} />
          <Text style={{ color: c.muted, fontSize: 12, fontFamily: F.ui }}>Value</Text>
          <Text style={{ color: c.fg, fontSize: 13, fontFamily: F.uiSemibold }}>{money(Math.round(shown.value))}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 16, borderTopWidth: 2, borderStyle: 'dashed', borderColor: c.muted }} />
          <Text style={{ color: c.muted, fontSize: 12, fontFamily: F.ui }}>Invested</Text>
          <Text style={{ color: c.fg, fontSize: 13, fontFamily: F.uiSemibold }}>{money(Math.round(shown.invested))}</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row' }}>
        <View style={{ width: AXIS, height: H }}>
          {ticks.map((t) => (
            <Text key={t} style={{ position: 'absolute', right: 6, top: y(t) - 7, color: c.subtle, fontSize: 9.5, fontFamily: F.ui }}>{shortMoney(t)}</Text>
          ))}
        </View>
        <View
          onStartShouldSetResponder={() => true}
          onResponderTerminationRequest={() => false}
          onResponderGrant={(e) => pick(e.nativeEvent.locationX)}
          onResponderMove={(e) => pick(e.nativeEvent.locationX)}
          onResponderRelease={() => setHover(null)}
        >
          <Svg width={W} height={H}>
            <Defs>
              <LinearGradient id="vc" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={col} stopOpacity={0.22} />
                <Stop offset="1" stopColor={col} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            {ticks.map((t) => (
              <Line key={t} x1={0} x2={W} y1={y(t)} y2={y(t)} stroke={c.line} strokeDasharray="2 4" />
            ))}
            <Line x1={0.5} x2={0.5} y1={0} y2={H} stroke={c.lineStrong} />
            <Line x1={0} x2={W} y1={H - 0.5} y2={H - 0.5} stroke={c.lineStrong} />
            <Path d={`${smooth(vp)} L${W},${H} L0,${H} Z`} fill="url(#vc)" />
            <Path d={smooth(ip)} fill="none" stroke={c.muted} strokeOpacity={0.7} strokeWidth={1.4} strokeDasharray="5 5" />
            <Path d={smooth(vp)} fill="none" stroke={col} strokeWidth={2.2} />
            {hover != null && (
              <>
                <Line x1={vp[hover][0]} x2={vp[hover][0]} y1={0} y2={H} stroke={c.lineStrong} />
                <Circle cx={vp[hover][0]} cy={vp[hover][1]} r={4.5} fill={col} stroke={c.bg} strokeWidth={2} />
                <Circle cx={ip[hover][0]} cy={ip[hover][1]} r={3} fill={c.muted} />
              </>
            )}
          </Svg>
        </View>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingLeft: AXIS }}>
        {[0, Math.floor((data.length - 1) / 2), data.length - 1].map((i) => (
          <Text key={i} style={{ color: c.subtle, fontSize: 10, fontFamily: F.ui }}>{date(data[i].date)}</Text>
        ))}
      </View>
      <Text style={{ color: c.subtle, fontSize: 11, fontFamily: F.ui }}>{h ? date(h.date) : 'Press and drag on the chart to read any day'}</Text>
    </View>
  );
}

/** Net money put in per period, with axes; press and drag across the bars to read each one. */
export function FlowChart({ data, width }: { data: { label: string; amount: number }[]; width: number }) {
  const { c } = useTheme();
  const [hover, setHover] = useState<number | null>(null);
  const H = 150;
  const W = width - AXIS;
  if (data.length === 0 || W <= 0) return <Text style={{ color: c.subtle, fontSize: 13, fontFamily: F.ui }}>No transactions in this view</Text>;
  const max = Math.max(...data.map((d) => Math.abs(d.amount)), 1);
  const slot = W / data.length;
  const pick = (px: number) => setHover(Math.max(0, Math.min(data.length - 1, Math.floor(px / slot))));
  const total = data.reduce((x, d) => x + d.amount, 0);
  const h = hover != null ? data[hover] : null;
  const step = Math.max(1, Math.ceil(data.length / 6));

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ color: c.subtle, fontSize: 12, fontFamily: F.ui }}>{h ? h.label : `${data.length} periods`}</Text>
        <Text style={{ color: h && h.amount < 0 ? c.expense : c.fg, fontSize: 13, fontFamily: F.uiSemibold }}>{h ? money(Math.round(h.amount)) : `Net ${money(Math.round(total))}`}</Text>
      </View>
      <View style={{ flexDirection: 'row' }}>
        <View style={{ width: AXIS, height: H }}>
          {[1, 0.5, 0].map((f) => (
            <Text key={f} style={{ position: 'absolute', right: 6, top: (1 - f) * (H - 1) - 7, color: c.subtle, fontSize: 9.5, fontFamily: F.ui }}>{shortMoney(max * f)}</Text>
          ))}
        </View>
        <View
          onStartShouldSetResponder={() => true}
          onResponderTerminationRequest={() => false}
          onResponderGrant={(e) => pick(e.nativeEvent.locationX)}
          onResponderMove={(e) => pick(e.nativeEvent.locationX)}
          onResponderRelease={() => setHover(null)}
        >
          <Svg width={W} height={H}>
            <Line x1={0} x2={W} y1={H / 2} y2={H / 2} stroke={c.line} strokeDasharray="2 4" />
            <Line x1={0} x2={W} y1={0.5} y2={0.5} stroke={c.line} strokeDasharray="2 4" />
            {data.map((d, i) => {
              const bh = Math.max(d.amount === 0 ? 0 : 3, (Math.abs(d.amount) / max) * (H - 2));
              return (
                <Rect
                  key={i}
                  x={i * slot + 1.5}
                  y={H - bh}
                  width={Math.max(1, slot - 3)}
                  height={bh}
                  rx={3}
                  fill={d.amount < 0 ? c.expense : c.income}
                  opacity={hover == null || hover === i ? (d.amount < 0 ? 1 : 0.8) : 0.35}
                />
              );
            })}
            <Line x1={0.5} x2={0.5} y1={0} y2={H} stroke={c.lineStrong} />
            <Line x1={0} x2={W} y1={H - 0.5} y2={H - 0.5} stroke={c.lineStrong} />
          </Svg>
        </View>
      </View>
      <View style={{ flexDirection: 'row', paddingLeft: AXIS }}>
        {data.map((d, i) => (
          <Text key={i} numberOfLines={1} style={{ width: slot, textAlign: 'center', color: c.subtle, fontSize: 9, fontFamily: F.ui }}>{i % step === 0 ? d.label : ''}</Text>
        ))}
      </View>
    </View>
  );
}
