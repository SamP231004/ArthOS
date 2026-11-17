import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, Text, View, useWindowDimensions, type ScrollViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { LogoMark } from '@/components/logo';
import { useAuth } from '@/lib/auth-store';
import { useTour } from '@/lib/tour';
import { ThemeToggle } from '@/components/theme-toggle';
import { alpha, F, S, useTheme, type Palette } from '@/theme';

/**
 * First-run walkthrough: the same story as the website's landing page, one feature per screen. Always on the deep
 * forest brand background (like the login hero), whatever the theme. Shown before sign-in on first launch, and
 * available any time from the login screen ("Take the tour") and Settings.
 */

// fixed brand colours (this screen doesn't follow the theme)
/** Tour colours, from the active theme (Forest or Ivory) so the tour follows the sun/moon switch. */
function makeK(c: Palette, dark: boolean) {
  return {
    bg: c.bg,
    card: c.surface,
    card2: c.surface2,
    line: c.lineStrong,
    fg: c.fg,
    fg2: c.fg2,
    muted: c.muted,
    subtle: c.subtle,
    mark: c.mark,
    income: c.income,
    expense: c.expense,
    warn: c.warn,
    info: c.info,
    ink: c.brand,
    inkFg: c.inkFg,
    dark,
    /** the foreground colour at an opacity: tracks, dots, dashed borders */
    fgA: (a: number) => alpha(c.fg, a),
    hero: dark ? (['#12301f', '#0a1d14', '#06110c'] as const) : (['#ffffff', '#f8f6f1', '#f6f4ef'] as const),
  };
}

function useK() {
  const { c, mode } = useTheme();
  return useMemo(() => makeK(c, mode === 'dark'), [c, mode]);
}

type Slide = { eyebrow: string; title: string; body: string; Visual: () => React.JSX.Element };

const SLIDES: Slide[] = [
  { eyebrow: 'Welcome', title: 'Take control of your अर्थ', body: 'Your personal financial operating system — income, spending, budgets, investments and insights in one calm place. One account for the app and the web.', Visual: WelcomeVisual },
  { eyebrow: 'Save first', title: 'Pay yourself first. Automatically.', body: 'A share of every income goes into savings the moment it arrives, and carries forward. What’s left is yours to spend.', Visual: SaveVisual },
  { eyebrow: 'Budget', title: 'One number for today', body: 'Your monthly limit becomes a single daily number that adapts when life happens. Rent and EMIs stay out of it.', Visual: BudgetVisual },
  { eyebrow: 'Investments', title: 'Every rupee that grows', body: 'Stocks, mutual funds, gold and bonds at live prices — with 1-day and total returns, XIRR and allocation.', Visual: PortfolioVisual },
  { eyebrow: 'Import', title: 'Years of investing, in one upload', body: 'Download your holdings or tradebook from Zerodha, Groww or any broker — or your CAS for every mutual fund — and import it. The file is read on your phone and never uploaded.', Visual: ImportVisual },
  { eyebrow: 'Scan & Share', title: 'Share a screenshot. That’s the entry.', body: 'From GPay, PhonePe or your bank app, tap Share → ArthOS. Amount, merchant, date and category fill themselves in. The screenshot is read on your phone; only the text is used to fill in the details.', Visual: ScanVisual },
  { eyebrow: 'Insights', title: 'A score that explains itself', body: 'Your month in plain words, a 100-point health score, unusual spending and subscriptions that add up — no AI, just clear rules.', Visual: InsightsVisual },
  { eyebrow: 'On your phone', title: 'Your money on your home screen', body: 'Widgets you can glance at (tap the eye to hide amounts), a pinned alert when you’re over budget, and bill reminders on the due date.', Visual: PhoneVisual },
];

export default function Walkthrough() {
  const K = useK();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const signedIn = useAuth((s) => !!s.token);
  const markSeen = useTour((s) => s.markSeen);
  const ref = useRef<ScrollViewInstance>(null);
  const [i, setI] = useState(0);
  const last = i === SLIDES.length - 1;
  // "Remove animations" or TalkBack on: no auto-advance, no motion — the tour waits for swipes and taps
  const [calm, setCalm] = useState(false);
  useEffect(() => {
    let live = true;
    const check = () =>
      Promise.all([AccessibilityInfo.isReduceMotionEnabled(), AccessibilityInfo.isScreenReaderEnabled()]).then(([a, b]) => live && setCalm(a || b));
    check();
    const subs = [AccessibilityInfo.addEventListener('reduceMotionChanged', check), AccessibilityInfo.addEventListener('screenReaderChanged', check)];
    return () => {
      live = false;
      subs.forEach((x) => x.remove());
    };
  }, []);
  const [scrollX] = useState(() => new Animated.Value(0));

  const finish = () => {
    markSeen();
    if (signedIn) router.back();
    else router.replace('/login');
  };
  const go = (n: number) => ref.current?.scrollTo({ x: n * width, animated: true });

  // story-style: the current segment fills over SLIDE_MS, then the tour moves on; touching or dragging pauses it
  const [fill] = useState(() => new Animated.Value(0));
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    fill.setValue(0);
    if (paused || last || calm) return;
    const a = Animated.timing(fill, { toValue: 1, duration: SLIDE_MS, easing: Easing.linear, useNativeDriver: false });
    a.start(({ finished }) => finished && go(i + 1));
    return () => a.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restart only when the slide or pause state changes
  }, [i, paused, last, calm]);

  return (
    <View style={{ flex: 1, backgroundColor: K.bg }}>
      <StatusBar style={K.dark ? 'light' : 'dark'} />
      <LinearGradient colors={K.hero} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '60%' }} />

      <View style={{ paddingTop: insets.top + S.sm, paddingHorizontal: S.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <LogoMark size={26} />
          <Text style={{ color: K.fg, fontFamily: F.display, fontSize: 20 }}>
            Arth<Text style={{ color: K.mark, fontFamily: F.displayMedium }}>OS</Text>
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
          <ThemeToggle color={K.muted} />
          {!last && (
            <Pressable onPress={() => finish()} hitSlop={12} accessibilityRole="button">
              <Text style={{ color: K.muted, fontFamily: F.uiMedium, fontSize: 14 }}>Skip</Text>
            </Pressable>
          )}
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 5, paddingHorizontal: S.lg, paddingTop: S.md }} accessibilityLabel={`Screen ${i + 1} of ${SLIDES.length}`}>
        {SLIDES.map((_, n) => (
          <Pressable key={n} onPress={() => go(n)} hitSlop={{ top: 10, bottom: 10 }} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: K.fgA(0.18), overflow: 'hidden' }}>
            {n < i || (n === i && last) ? (
              <View style={{ flex: 1, backgroundColor: K.mark }} />
            ) : n === i ? (
              <Animated.View style={{ height: '100%', backgroundColor: K.mark, width: fill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
            ) : null}
          </Pressable>
        ))}
      </View>

      <Animated.ScrollView
        ref={ref}
        horizontal
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: true })}
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
        onScrollBeginDrag={() => setPaused(true)}
        onMomentumScrollEnd={(e) => {
          setI(Math.round(e.nativeEvent.contentOffset.x / width));
          setPaused(false);
        }}
        style={{ flex: 1 }}
      >
        {SLIDES.map((s, n) => (
          <View key={s.title} style={{ width, paddingHorizontal: S.lg, justifyContent: 'center', gap: S.xl }}>
            {/* parallax: the picture trails the text a little as you swipe */}
            <Animated.View
              style={{
                alignItems: 'center',
                transform: calm ? [] : [{ translateX: scrollX.interpolate({ inputRange: [(n - 1) * width, n * width, (n + 1) * width], outputRange: [width * 0.28, 0, -width * 0.28] }) }],
              }}
            >
              <Active.Provider value={{ active: n === i, calm }}>
                <s.Visual />
              </Active.Provider>
            </Animated.View>
            <View style={{ gap: S.sm }}>
              <Text style={{ color: K.mark, fontFamily: F.uiSemibold, fontSize: 13 }}>{s.eyebrow}</Text>
              <Text style={{ color: K.fg, fontFamily: s.title.includes('अर्थ') ? F.display : F.display, fontSize: 30, lineHeight: 36, letterSpacing: -0.6 }}>
                {s.title.includes('अर्थ') ? (
                  <>
                    Take control of your <Text style={{ fontFamily: F.deva, color: K.mark }}>अर्थ</Text>
                  </>
                ) : (
                  s.title
                )}
              </Text>
              <Text style={{ color: K.muted, fontFamily: F.ui, fontSize: 15, lineHeight: 22 }}>{s.body}</Text>
            </View>
          </View>
        ))}
      </Animated.ScrollView>

      <View style={{ paddingHorizontal: S.lg, paddingBottom: insets.bottom + S.lg, minHeight: 54 + insets.bottom + S.lg, justifyContent: 'flex-end' }}>
        {last ? (
          <View style={{ flexDirection: 'row', gap: S.sm }}>
            <RoundButton label="←" a11y="Previous screen" onPress={() => go(i - 1)} K={K} />
            <Pressable
              onPress={() => finish()}
              accessibilityRole="button"
              style={({ pressed }) => ({ flex: 1, height: 54, borderRadius: 16, backgroundColor: K.ink, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.85 : 1 })}
            >
              <Text style={{ color: K.inkFg, fontFamily: F.uiSemibold, fontSize: 16 }}>{signedIn ? 'Done' : 'Get started  →'}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            {i > 0 ? <RoundButton label="←" a11y="Previous screen" onPress={() => go(i - 1)} K={K} /> : <View style={{ width: 54 }} />}
            <Text style={{ color: K.muted, fontFamily: F.ui, fontSize: 13 }}>
              {calm ? 'Swipe or tap →' : paused ? 'Paused' : 'Swipe or wait'} · {i + 1} of {SLIDES.length}
            </Text>
            <RoundButton label="→" a11y="Next screen" onPress={() => go(i + 1)} K={K} filled />
          </View>
        )}
      </View>
    </View>
  );
}

const SLIDE_MS = 4000;

/** Which slide is on screen, so its picture can play; `calm` = reduce motion / screen reader (show the end state). */
const Active = createContext<{ active: boolean; calm: boolean }>({ active: false, calm: true });

/** 0 → 1 over `ms` after `delay` while the slide is on screen; back to 0 when it leaves. */
function useProgress(ms = 900, delay = 0) {
  const { active, calm } = useContext(Active);
  const [v] = useState(() => new Animated.Value(calm ? 1 : 0));
  useEffect(() => {
    if (calm) return v.setValue(1);
    if (!active) return v.setValue(0);
    const a = Animated.timing(v, { toValue: 1, duration: ms, delay, easing: Easing.out(Easing.cubic), useNativeDriver: false });
    a.start();
    return () => a.stop();
  }, [active, calm, ms, delay, v]);
  return v;
}

/** Fades and lifts its children in; `step` staggers siblings. */
function Reveal({ step = 0, children, style }: { step?: number; children: React.ReactNode; style?: object }) {
  const p = useProgress(500, 250 + step * 140);
  return <Animated.View style={[style, { opacity: p, transform: [{ translateY: p.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }]}>{children}</Animated.View>;
}

/** A rupee figure that counts up to `to` (Indian digit grouping). */
function CountUp({ to, prefix = '₹', suffix = '', style }: { to: number; prefix?: string; suffix?: string; style: object }) {
  const p = useProgress(1100, 150);
  const [n, setN] = useState(to);
  useEffect(() => {
    const id = p.addListener(({ value }) => setN(Math.round(to * value)));
    return () => p.removeListener(id);
  }, [p, to]);
  return <Text style={style}>{prefix}{n.toLocaleString('en-IN')}{suffix}</Text>;
}

/** A bar segment whose width grows to `pct`. */
function Grow({ pct, color, height = '100%', delay = 200 }: { pct: number; color: string; height?: number | '100%'; delay?: number }) {
  const p = useProgress(900, delay);
  return <Animated.View style={{ height, borderRadius: 3, backgroundColor: color, width: p.interpolate({ inputRange: [0, 1], outputRange: ['0%', `${pct}%`] }) }} />;
}

/** A soft light sweeping down a card, as if it's being read. */
function ScanLine({ height }: { height: number }) {
  const { active, calm } = useContext(Active);
  const [y] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!active || calm) return;
    const loop = Animated.loop(Animated.timing(y, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [active, calm, y]);
  if (calm) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={{ position: 'absolute', left: 6, right: 6, top: 0, height: 2, borderRadius: 1, backgroundColor: 'rgba(120,220,170,0.9)', shadowColor: '#4cc38a', shadowOpacity: 0.9, shadowRadius: 8, transform: [{ translateY: y.interpolate({ inputRange: [0, 1], outputRange: [8, height - 10] }) }] }}
    />
  );
}

function RoundButton({ label, a11y, onPress, K, filled }: { label: string; a11y: string; onPress: () => void; K: ReturnType<typeof useK>; filled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      hitSlop={6}
      style={({ pressed }) => ({
        width: 54,
        height: 54,
        borderRadius: 27,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: filled ? K.ink : 'transparent',
        borderWidth: filled ? 0 : 1,
        borderColor: K.fgA(0.2),
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Text style={{ color: filled ? K.inkFg : K.fg, fontFamily: F.uiSemibold, fontSize: 20 }}>{label}</Text>
    </Pressable>
  );
}

// ------------------------------------------------------------------ visuals (static mirrors of real screens)

function Card({ children, w = 300 }: { children: React.ReactNode; w?: number }) {
  const K = useK();
  return <View style={{ width: w, backgroundColor: K.card, borderRadius: 22, borderWidth: 1, borderColor: K.line, padding: 16, gap: 10 }}>{children}</View>;
}

function Row({ k, v, color, bold }: { k: string; v: string; color?: string; bold?: boolean }) {
  const K = useK();
  color ??= K.fg2;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={{ color: bold ? K.fg : K.muted, fontFamily: bold ? F.uiSemibold : F.ui, fontSize: 13 }}>{k}</Text>
      <Text style={{ color, fontFamily: bold ? F.uiSemibold : F.uiMedium, fontSize: 13 }}>{v}</Text>
    </View>
  );
}

function Bar({ pct, color, marker }: { pct: number; color: string; marker?: number }) {
  const K = useK();
  return (
    <View style={{ height: 14, justifyContent: 'center' }}>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: K.fgA(0.08), overflow: 'hidden' }}>
        <Grow pct={pct} color={color} />
      </View>
      {marker != null && <View style={{ position: 'absolute', left: `${marker}%`, width: 2, height: 14, borderRadius: 1, backgroundColor: K.fg }} />}
    </View>
  );
}

function WelcomeVisual() {
  const K = useK();
  return (
    <View style={{ alignItems: 'center', gap: 18 }}>
      <Reveal>
        <View style={{ borderRadius: 26, shadowColor: '#c43a35', shadowOpacity: 0.6, shadowRadius: 30, elevation: 16 }}>
          <LogoMark size={96} />
        </View>
      </Reveal>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, maxWidth: 320 }}>
        {['Save first', 'Daily budget', 'Investments', 'Broker import', 'Scan & Share', 'Insights', 'Widgets', 'Alerts'].map((t, n) => (
          <Reveal key={t} step={n * 0.6 + 1}>
            <Text style={{ color: K.fg2, fontFamily: F.uiMedium, fontSize: 12.5, borderWidth: 1, borderColor: K.line, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>{t}</Text>
          </Reveal>
        ))}
      </View>
    </View>
  );
}

function SaveVisual() {
  const K = useK();
  return (
    <Card>
      <Text style={{ color: K.muted, fontFamily: F.ui, fontSize: 12 }}>Left to spend this month</Text>
      <CountUp to={32271} style={{ color: K.fg, fontFamily: F.uiSemibold, fontSize: 34, letterSpacing: -0.8 }} />
      <View style={{ flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: K.fgA(0.08) }}>
        <Grow pct={20} color={K.income} delay={200} />
        <Grow pct={38} color={K.expense} delay={500} />
        <Grow pct={7} color={K.info} delay={800} />
      </View>
      <Reveal step={1}><Row k="Income" v="₹92,000" /></Reveal>
      <Reveal step={2}><Row k="Saved first · 20%" v="₹18,400" color={K.income} /></Reveal>
      <Reveal step={3}><Row k="Spent" v="₹35,141" /></Reveal>
      <Reveal step={4}><Row k="Left to spend" v="₹32,271" bold /></Reveal>
    </Card>
  );
}

function BudgetVisual() {
  const K = useK();
  return (
    <Card>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {['Fixed', 'Adaptive', 'Weekly'].map((m) => (
          <Text key={m} style={{ flex: 1, textAlign: 'center', color: m === 'Adaptive' ? K.fg : K.muted, fontFamily: m === 'Adaptive' ? F.uiSemibold : F.ui, fontSize: 12, borderWidth: 1, borderColor: m === 'Adaptive' ? K.mark : K.line, borderRadius: 10, paddingVertical: 6 }}>{m}</Text>
        ))}
      </View>
      <Text style={{ color: K.muted, fontFamily: F.ui, fontSize: 12, marginTop: 4 }}>Safe to spend today</Text>
      <CountUp to={842} style={{ color: K.income, fontFamily: F.display, fontSize: 44, letterSpacing: -1 }} />
      <Text style={{ color: K.muted, fontFamily: F.ui, fontSize: 12 }}>of ₹1,290 today · 12 days left</Text>
      <Bar pct={58} color={K.income} marker={60} />
      <View style={{ flexDirection: 'row', gap: 4, marginTop: 2 }}>
        {[1, 1, 2, 1, 0, 1, 1, 3, 1, 1, 1, 0, 1, 1].map((v, n) => (
          <Reveal key={n} step={n * 0.35 + 1} style={{ flex: 1 }}>
            <View style={{ height: 18, borderRadius: 4, backgroundColor: v === 2 ? 'rgba(232,180,92,0.3)' : v === 3 ? 'rgba(240,113,103,0.3)' : v === 0 ? K.fgA(0.06) : 'rgba(76,195,138,0.25)' }} />
          </Reveal>
        ))}
      </View>
    </Card>
  );
}

function PortfolioVisual() {
  const K = useK();
  return (
    <Card>
      <Text style={{ color: K.muted, fontFamily: F.ui, fontSize: 12 }}>Portfolio</Text>
      <CountUp to={834076} style={{ color: K.fg, fontFamily: F.uiSemibold, fontSize: 30, letterSpacing: -0.8 }} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <View>
          <Text style={{ color: K.subtle, fontFamily: F.ui, fontSize: 11 }}>1D returns</Text>
          <Text style={{ color: K.income, fontFamily: F.uiSemibold, fontSize: 13 }}>+₹4,883 (0.6%)</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: K.subtle, fontFamily: F.ui, fontSize: 11 }}>Total returns</Text>
          <Text style={{ color: K.income, fontFamily: F.uiSemibold, fontSize: 13 }}>+₹1,40,080 (20.2%)</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 4, backgroundColor: K.fgA(0.08) }}>
        <Grow pct={42} color="#84b6d8" delay={300} />
        <Grow pct={35} color="#c94540" delay={550} />
        <Grow pct={18} color="#d9b26f" delay={800} />
        <Grow pct={5} color="#e8946a" delay={1000} />
      </View>
      <Reveal step={5}>
        <Text style={{ color: K.muted, fontFamily: F.ui, fontSize: 11.5 }}>Mutual funds · Stocks · Gold · Bonds   ·   XIRR +18.4%</Text>
      </Reveal>
    </Card>
  );
}

function ImportVisual() {
  const K = useK();
  const rows: [string, string, string][] = [
    ['Reliance Industries', 'Stock · 10 shares', '₹24,105'],
    ['NIFTYBEES · Nifty 50 ETF', 'ETF · 50 units', '₹10,513'],
    ['Parag Parikh Flexi Cap', 'Fund · 55.23 units', '₹3,240'],
  ];
  return (
    <Card>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {['Zerodha', 'Groww', 'Upstox', 'CAS'].map((b) => (
          <Text key={b} style={{ color: K.fg2, fontFamily: F.uiMedium, fontSize: 11, borderWidth: 1, borderColor: K.line, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>{b}</Text>
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderStyle: 'dashed', borderColor: K.fgA(0.2), borderRadius: 12, padding: 10 }}>
        <Text style={{ fontSize: 14 }}>📄</Text>
        <Text style={{ flex: 1, color: K.fg2, fontFamily: F.ui, fontSize: 12 }} numberOfLines={1}>holdings-zerodha.xlsx</Text>
        <Text style={{ color: K.income, fontFamily: F.uiSemibold, fontSize: 10.5 }}>🔒 on this phone</Text>
      </View>
      {rows.map(([n, d, v], idx) => (
        <Reveal key={n} step={idx * 1.5 + 1} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: K.ink, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: K.inkFg, fontSize: 10, fontFamily: F.uiSemibold }}>✓</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: K.fg, fontFamily: F.uiMedium, fontSize: 12.5 }} numberOfLines={1}>{n}</Text>
            <Text style={{ color: K.subtle, fontFamily: F.ui, fontSize: 10.5 }}>{d}</Text>
          </View>
          <Text style={{ color: K.fg2, fontFamily: F.uiSemibold, fontSize: 12.5 }}>{v}</Text>
        </Reveal>
      ))}
      <Reveal step={6}>
        <Text style={{ color: K.inkFg, backgroundColor: K.ink, borderRadius: 12, overflow: 'hidden', textAlign: 'center', fontFamily: F.uiSemibold, fontSize: 13, paddingVertical: 9 }}>Import 3 holdings</Text>
      </Reveal>
    </Card>
  );
}

function ScanVisual() {
  const K = useK();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={{ width: 130, backgroundColor: '#121212', borderRadius: 20, padding: 12, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: K.line }}>
        <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#3a6ea5', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#fff', fontFamily: F.uiSemibold }}>Z</Text>
        </View>
        <Text style={{ color: '#e8e8e8', fontFamily: F.ui, fontSize: 10 }}>To Zomato</Text>
        <Text style={{ color: '#e8e8e8', fontFamily: F.ui, fontSize: 22 }}>₹159.44</Text>
        <Text style={{ color: '#9fdcb0', fontFamily: F.ui, fontSize: 9.5 }}>✓ Completed</Text>
        <Text style={{ color: '#e8e8e8', fontFamily: F.uiMedium, fontSize: 9.5, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 999, overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 3, marginTop: 4 }}>Share → ArthOS</Text>
        <ScanLine height={150} />
      </View>
      <Text style={{ color: K.subtle, fontSize: 18 }}>→</Text>
      <View style={{ width: 150, backgroundColor: K.card, borderRadius: 20, padding: 12, gap: 6, borderWidth: 1, borderColor: K.line }}>
        <Text style={{ color: K.muted, fontFamily: F.ui, fontSize: 10 }}>New expense</Text>
        <Reveal step={2}>
          <Text style={{ color: K.fg, fontFamily: F.uiSemibold, fontSize: 20 }}>₹159.44</Text>
        </Reveal>
        {[
          ['Merchant', 'Zomato'],
          ['Category', 'Food'],
          ['Paid with', 'UPI'],
          ['Date', '6 Nov'],
        ].map(([k, v], idx) => (
          <Reveal key={k} step={idx + 3} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: K.subtle, fontFamily: F.ui, fontSize: 10 }}>{k}</Text>
            <Text style={{ color: K.fg2, fontFamily: F.uiMedium, fontSize: 10 }}>{v}</Text>
          </Reveal>
        ))}
        <Reveal step={7}>
          <Text style={{ color: K.inkFg, backgroundColor: K.ink, borderRadius: 10, overflow: 'hidden', textAlign: 'center', fontFamily: F.uiSemibold, fontSize: 11, paddingVertical: 6, marginTop: 2 }}>Save</Text>
        </Reveal>
      </View>
    </View>
  );
}

function InsightsVisual() {
  const K = useK();
  const R = 40, C = 2 * Math.PI * R, arc = C * (240 / 360);
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ width: 100, height: 100, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={100} height={100} viewBox="0 0 100 100" style={{ position: 'absolute', transform: [{ rotate: '150deg' }] }}>
            <Circle cx={50} cy={50} r={R} stroke={K.fgA(0.12)} strokeWidth={9} fill="none" strokeLinecap="round" strokeDasharray={`${arc} ${C}`} />
            <ScoreArc R={R} C={C} arc={arc} score={0.84} color={K.income} />
          </Svg>
          <CountUp to={84} prefix="" style={{ color: K.fg, fontFamily: F.uiSemibold, fontSize: 28 }} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: K.muted, fontFamily: F.ui, fontSize: 12 }}>Financial health</Text>
          <Text style={{ color: K.income, fontFamily: F.uiSemibold, fontSize: 19 }}>Excellent</Text>
        </View>
      </View>
      <Reveal step={4} style={{ alignSelf: 'flex-start' }}>
        <Text style={{ color: K.fg, fontFamily: F.uiMedium, fontSize: 12, borderWidth: 1, borderColor: 'rgba(232,180,92,0.35)', backgroundColor: 'rgba(232,180,92,0.08)', borderRadius: 999, overflow: 'hidden', paddingHorizontal: 12, paddingVertical: 6 }}>On pace to overspend by ₹4,531</Text>
      </Reveal>
      <Reveal step={6}>
      <Text style={{ color: K.fg2, fontFamily: F.ui, fontSize: 13, lineHeight: 19 }}>
        <Text style={{ color: K.mark }}>✦ </Text>
        <Text style={{ fontFamily: F.uiSemibold, color: K.fg }}>Food</Text> is up <Text style={{ fontFamily: F.uiSemibold, color: K.fg }}>32%</Text> — ₹6,840 against a usual ₹5,180.
      </Text>
      </Reveal>
    </Card>
  );
}

function PhoneVisual() {
  const K = useK();
  return (
    <View style={{ width: 300, gap: 10 }}>
      <Reveal>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: K.card2, borderWidth: 1, borderColor: K.line, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 10 }}>
        <LogoMark size={22} />
        <Text style={{ flex: 1, color: K.fg, fontFamily: F.uiMedium, fontSize: 13 }} numberOfLines={1}>On pace to overspend by ₹4,531</Text>
        <Text style={{ color: K.subtle, fontSize: 11 }}>pinned</Text>
      </View>
      </Reveal>
      <Reveal step={2} style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1, backgroundColor: K.card, borderRadius: 20, padding: 12, gap: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: K.muted, fontFamily: F.ui, fontSize: 10.5 }}>Safe today</Text>
            <Text style={{ color: K.muted, fontSize: 11 }}>◉</Text>
          </View>
          <Text style={{ color: K.income, fontFamily: F.display, fontSize: 26 }}>₹842</Text>
          <Bar pct={58} color={K.income} />
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={{ color: K.inkFg, backgroundColor: K.ink, borderRadius: 12, overflow: 'hidden', textAlign: 'center', fontFamily: F.uiSemibold, fontSize: 12, paddingVertical: 9 }}>+ Expense</Text>
          <Text style={{ color: K.fg, backgroundColor: K.card2, borderRadius: 12, overflow: 'hidden', textAlign: 'center', fontFamily: F.uiSemibold, fontSize: 12, paddingVertical: 9 }}>Scan</Text>
          <Text style={{ color: K.fg, backgroundColor: K.card2, borderRadius: 12, overflow: 'hidden', textAlign: 'center', fontFamily: F.uiSemibold, fontSize: 12, paddingVertical: 9 }}>+ Income</Text>
        </View>
      </Reveal>
      <Reveal step={4} style={{ backgroundColor: K.card, borderRadius: 20, padding: 12, gap: 4 }}>
        <Text style={{ color: K.muted, fontFamily: F.ui, fontSize: 10.5 }}>Portfolio · 5:45 pm</Text>
        <Text style={{ color: K.fg, fontFamily: F.uiSemibold, fontSize: 20 }}>₹8,34,076</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color: K.income, fontFamily: F.uiSemibold, fontSize: 11 }}>1D +₹4,883 (0.6%)</Text>
          <Text style={{ color: K.income, fontFamily: F.uiSemibold, fontSize: 11 }}>Total +₹1,40,080</Text>
        </View>
      </Reveal>
    </View>
  );
}

/** The health-score arc, filling to `score` (0–1) while the slide plays. */
function ScoreArc({ R, C, arc, score, color }: { R: number; C: number; arc: number; score: number; color: string }) {
  const p = useProgress(1100, 150);
  const [f, setF] = useState(score);
  useEffect(() => {
    const id = p.addListener(({ value }) => setF(score * value));
    return () => p.removeListener(id);
  }, [p, score]);
  return <Circle cx={50} cy={50} r={R} stroke={color} strokeWidth={9} fill="none" strokeLinecap="round" strokeDasharray={`${Math.max(0.001, f * arc)} ${C}`} />;
}
