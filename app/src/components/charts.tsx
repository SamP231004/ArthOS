import { useState } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

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

/** Value (area) vs invested (dashed) over time; tap-and-drag reads out a point. */
export function ValueChart({ data, format, width }: { data: { date: string; value: number; invested: number }[]; format: (n: number) => string; width: number }) {
  const { c } = useTheme();
  const [hover, setHover] = useState<number | null>(null);
  const H = 180;
  if (data.length < 2 || width <= 0) return <View style={{ height: H }} />;
  const vals = data.flatMap((d) => [d.value, d.invested]);
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const pad = (hi - lo) * 0.12 || hi * 0.05 || 1;
  const min = Math.max(0, lo - pad), max = hi + pad;
  const x = (i: number) => (i / (data.length - 1)) * width;
  const y = (v: number) => 8 + (1 - (v - min) / (max - min)) * (H - 16);
  const vp = data.map((d, i) => [x(i), y(d.value)] as [number, number]);
  const ip = data.map((d, i) => [x(i), y(d.invested)] as [number, number]);
  const up = data[data.length - 1].value >= data[data.length - 1].invested;
  const col = up ? c.income : c.expense;
  const pick = (px: number) => setHover(Math.max(0, Math.min(data.length - 1, Math.round((px / width) * (data.length - 1)))));
  const h = hover != null ? data[hover] : null;

  return (
    <View onStartShouldSetResponder={() => true} onResponderGrant={(e) => pick(e.nativeEvent.locationX)} onResponderMove={(e) => pick(e.nativeEvent.locationX)} onResponderRelease={() => setHover(null)}>
      <Svg width={width} height={H}>
        <Defs>
          <LinearGradient id="vc" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={col} stopOpacity={0.22} />
            <Stop offset="1" stopColor={col} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Path d={`${smooth(vp)} L${width},${H} L0,${H} Z`} fill="url(#vc)" />
        <Path d={smooth(ip)} fill="none" stroke={c.muted} strokeOpacity={0.7} strokeWidth={1.4} strokeDasharray="5 5" />
        <Path d={smooth(vp)} fill="none" stroke={col} strokeWidth={2.2} />
        {hover != null && <Circle cx={vp[hover][0]} cy={vp[hover][1]} r={4.5} fill={col} stroke={c.bg} strokeWidth={2} />}
      </Svg>
      <Text style={{ color: c.subtle, fontSize: 11, fontFamily: F.ui, marginTop: 4 }}>
        {h
          ? `${new Date(h.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })} · ${format(h.value)} · invested ${format(h.invested)}`
          : 'Press and drag on the chart to read values'}
      </Text>
    </View>
  );
}
