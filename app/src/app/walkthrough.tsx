import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View, useWindowDimensions, type ScrollViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { LogoMark } from '@/components/logo';
import { useAuth } from '@/lib/auth-store';
import { useTour } from '@/lib/tour';
import { F, S } from '@/theme';

/**
 * First-run walkthrough: the same story as the website's landing page, one feature per screen. Always on the deep
 * forest brand background (like the login hero), whatever the theme. Shown before sign-in on first launch, and
 * available any time from the login screen ("Take the tour") and Settings.
 */

// fixed brand colours (this screen doesn't follow the theme)
const K = {
  bg: '#06110c',
  card: '#10231a',
  card2: '#183126',
  line: 'rgba(214,232,222,0.12)',
  fg: '#f2efe8',
  fg2: '#d9d4c9',
  muted: '#a5b0a9',
  subtle: '#7d8b83',
  mark: '#e8706a',
  income: '#4cc38a',
  expense: '#f07167',
  warn: '#e8b45c',
  info: '#84b6d8',
  ink: '#ece7db',
  inkFg: '#0c1a13',
};

type Slide = { eyebrow: string; title: string; body: string; Visual: () => React.JSX.Element };

const SLIDES: Slide[] = [
  { eyebrow: 'Welcome', title: 'Take control of your अर्थ', body: 'Your personal financial operating system — income, spending, budgets, investments and insights in one calm place. One account for the app and the web.', Visual: WelcomeVisual },
  { eyebrow: 'Save first', title: 'Pay yourself first. Automatically.', body: 'A share of every income goes into savings the moment it arrives, and carries forward. What’s left is yours to spend.', Visual: SaveVisual },
  { eyebrow: 'Budget', title: 'One number for today', body: 'Your monthly limit becomes a single daily number that adapts when life happens. Rent and EMIs stay out of it.', Visual: BudgetVisual },
  { eyebrow: 'Investments', title: 'Every rupee that grows', body: 'Stocks, mutual funds, gold and bonds at live prices — with 1-day and total returns, XIRR and allocation.', Visual: PortfolioVisual },
  { eyebrow: 'Scan & Share', title: 'Share a screenshot. That’s the entry.', body: 'From GPay, PhonePe or your bank app, tap Share → ArthOS. Amount, merchant, date and category fill themselves in. Read on your phone — never uploaded.', Visual: ScanVisual },
  { eyebrow: 'Insights', title: 'A score that explains itself', body: 'Your month in plain words, a 100-point health score, unusual spending and subscriptions that add up — no AI, just clear rules.', Visual: InsightsVisual },
  { eyebrow: 'On your phone', title: 'Your money on your home screen', body: 'Widgets you can glance at (tap the eye to hide amounts), a pinned alert when you’re over budget, and bill reminders on the due date.', Visual: PhoneVisual },
];

export default function Walkthrough() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const signedIn = useAuth((s) => !!s.token);
  const markSeen = useTour((s) => s.markSeen);
  const ref = useRef<ScrollViewInstance>(null);
  const [i, setI] = useState(0);
  const last = i === SLIDES.length - 1;

  const finish = () => {
    markSeen();
    if (signedIn) router.back();
    else router.replace('/login');
  };
  const go = (n: number) => ref.current?.scrollTo({ x: n * width, animated: true });

  return (
    <View style={{ flex: 1, backgroundColor: K.bg }}>
      <StatusBar style="light" />
      <LinearGradient colors={['#12301f', '#0a1d14', '#06110c']} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '60%' }} />

      <View style={{ paddingTop: insets.top + S.sm, paddingHorizontal: S.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <LogoMark size={26} />
          <Text style={{ color: K.fg, fontFamily: F.display, fontSize: 20 }}>
            Arth<Text style={{ color: K.mark, fontFamily: F.displayMedium }}>OS</Text>
          </Text>
        </View>
        {!last && (
          <Pressable onPress={finish} hitSlop={12} accessibilityRole="button">
            <Text style={{ color: K.muted, fontFamily: F.uiMedium, fontSize: 14 }}>Skip</Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        ref={ref}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setI(Math.round(e.nativeEvent.contentOffset.x / width))}
        style={{ flex: 1 }}
      >
        {SLIDES.map((s) => (
          <View key={s.title} style={{ width, paddingHorizontal: S.lg, justifyContent: 'center', gap: S.xl }}>
            <View style={{ alignItems: 'center' }}>
              <s.Visual />
            </View>
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
      </ScrollView>

      <View style={{ paddingHorizontal: S.lg, paddingBottom: insets.bottom + S.lg, gap: S.lg }}>
        <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center' }}>
          {SLIDES.map((_, n) => (
            <Pressable key={n} onPress={() => go(n)} hitSlop={6} accessibilityLabel={`Screen ${n + 1}`}>
              <View style={{ height: 6, width: n === i ? 22 : 6, borderRadius: 3, backgroundColor: n === i ? K.mark : 'rgba(242,239,232,0.25)' }} />
            </Pressable>
          ))}
        </View>
        <Pressable
          onPress={() => (last ? finish() : go(i + 1))}
          accessibilityRole="button"
          style={({ pressed }) => ({ height: 54, borderRadius: 16, backgroundColor: K.ink, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.85 : 1 })}
        >
          <Text style={{ color: K.inkFg, fontFamily: F.uiSemibold, fontSize: 16 }}>{last ? (signedIn ? 'Done' : 'Get started  →') : 'Next'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ------------------------------------------------------------------ visuals (static mirrors of real screens)

function Card({ children, w = 300 }: { children: React.ReactNode; w?: number }) {
  return <View style={{ width: w, backgroundColor: K.card, borderRadius: 22, borderWidth: 1, borderColor: K.line, padding: 16, gap: 10 }}>{children}</View>;
}

function Row({ k, v, color = K.fg2, bold }: { k: string; v: string; color?: string; bold?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={{ color: bold ? K.fg : K.muted, fontFamily: bold ? F.uiSemibold : F.ui, fontSize: 13 }}>{k}</Text>
      <Text style={{ color, fontFamily: bold ? F.uiSemibold : F.uiMedium, fontSize: 13 }}>{v}</Text>
    </View>
  );
}

function Bar({ pct, color, marker }: { pct: number; color: string; marker?: number }) {
  return (
    <View style={{ height: 14, justifyContent: 'center' }}>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: 'rgba(242,239,232,0.08)', overflow: 'hidden' }}>
        <View style={{ width: `${pct}%`, height: '100%', borderRadius: 3, backgroundColor: color }} />
      </View>
      {marker != null && <View style={{ position: 'absolute', left: `${marker}%`, width: 2, height: 14, borderRadius: 1, backgroundColor: K.fg }} />}
    </View>
  );
}

function WelcomeVisual() {
  return (
    <View style={{ alignItems: 'center', gap: 18 }}>
      <View style={{ borderRadius: 26, shadowColor: '#c43a35', shadowOpacity: 0.6, shadowRadius: 30, elevation: 16 }}>
        <LogoMark size={96} />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, maxWidth: 320 }}>
        {['Save first', 'Daily budget', 'Investments', 'Scan & Share', 'Insights', 'Widgets', 'Alerts'].map((t) => (
          <Text key={t} style={{ color: K.fg2, fontFamily: F.uiMedium, fontSize: 12.5, borderWidth: 1, borderColor: K.line, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>{t}</Text>
        ))}
      </View>
    </View>
  );
}

function SaveVisual() {
  return (
    <Card>
      <Text style={{ color: K.muted, fontFamily: F.ui, fontSize: 12 }}>Left to spend this month</Text>
      <Text style={{ color: K.fg, fontFamily: F.uiSemibold, fontSize: 34, letterSpacing: -0.8 }}>₹32,271</Text>
      <View style={{ flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden' }}>
        <View style={{ flex: 20, backgroundColor: K.income }} />
        <View style={{ flex: 38, backgroundColor: K.expense }} />
        <View style={{ flex: 7, backgroundColor: K.info }} />
        <View style={{ flex: 35, backgroundColor: 'rgba(242,239,232,0.08)' }} />
      </View>
      <Row k="Income" v="₹92,000" />
      <Row k="Saved first · 20%" v="₹18,400" color={K.income} />
      <Row k="Spent" v="₹35,141" />
      <Row k="Left to spend" v="₹32,271" bold />
    </Card>
  );
}

function BudgetVisual() {
  return (
    <Card>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {['Fixed', 'Adaptive', 'Weekly'].map((m) => (
          <Text key={m} style={{ flex: 1, textAlign: 'center', color: m === 'Adaptive' ? K.fg : K.muted, fontFamily: m === 'Adaptive' ? F.uiSemibold : F.ui, fontSize: 12, borderWidth: 1, borderColor: m === 'Adaptive' ? K.mark : K.line, borderRadius: 10, paddingVertical: 6 }}>{m}</Text>
        ))}
      </View>
      <Text style={{ color: K.muted, fontFamily: F.ui, fontSize: 12, marginTop: 4 }}>Safe to spend today</Text>
      <Text style={{ color: K.income, fontFamily: F.display, fontSize: 44, letterSpacing: -1 }}>₹842</Text>
      <Text style={{ color: K.muted, fontFamily: F.ui, fontSize: 12 }}>of ₹1,290 today · 12 days left</Text>
      <Bar pct={58} color={K.income} marker={60} />
      <View style={{ flexDirection: 'row', gap: 4, marginTop: 2 }}>
        {[1, 1, 2, 1, 0, 1, 1, 3, 1, 1, 1, 0, 1, 1].map((v, n) => (
          <View key={n} style={{ flex: 1, height: 18, borderRadius: 4, backgroundColor: v === 2 ? 'rgba(232,180,92,0.3)' : v === 3 ? 'rgba(240,113,103,0.3)' : v === 0 ? 'rgba(242,239,232,0.06)' : 'rgba(76,195,138,0.25)' }} />
        ))}
      </View>
    </Card>
  );
}

function PortfolioVisual() {
  return (
    <Card>
      <Text style={{ color: K.muted, fontFamily: F.ui, fontSize: 12 }}>Portfolio</Text>
      <Text style={{ color: K.fg, fontFamily: F.uiSemibold, fontSize: 30, letterSpacing: -0.8 }}>₹8,34,076</Text>
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
      <View style={{ flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 4 }}>
        <View style={{ flex: 42, backgroundColor: '#84b6d8' }} />
        <View style={{ flex: 35, backgroundColor: '#c94540' }} />
        <View style={{ flex: 18, backgroundColor: '#d9b26f' }} />
        <View style={{ flex: 5, backgroundColor: '#e8946a' }} />
      </View>
      <Text style={{ color: K.muted, fontFamily: F.ui, fontSize: 11.5 }}>Mutual funds · Stocks · Gold · Bonds   ·   XIRR +18.4%</Text>
    </Card>
  );
}

function ScanVisual() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={{ width: 130, backgroundColor: '#121212', borderRadius: 20, padding: 12, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: K.line }}>
        <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#3a6ea5', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#fff', fontFamily: F.uiSemibold }}>A</Text>
        </View>
        <Text style={{ color: '#e8e8e8', fontFamily: F.ui, fontSize: 10 }}>To Annapurna Tiffins</Text>
        <Text style={{ color: '#e8e8e8', fontFamily: F.ui, fontSize: 22 }}>₹159.44</Text>
        <Text style={{ color: '#9fdcb0', fontFamily: F.ui, fontSize: 9.5 }}>✓ Completed</Text>
        <Text style={{ color: '#e8e8e8', fontFamily: F.uiMedium, fontSize: 9.5, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 999, overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 3, marginTop: 4 }}>Share → ArthOS</Text>
      </View>
      <Text style={{ color: K.subtle, fontSize: 18 }}>→</Text>
      <View style={{ width: 150, backgroundColor: K.card, borderRadius: 20, padding: 12, gap: 6, borderWidth: 1, borderColor: K.line }}>
        <Text style={{ color: K.muted, fontFamily: F.ui, fontSize: 10 }}>New expense</Text>
        <Text style={{ color: K.fg, fontFamily: F.uiSemibold, fontSize: 20 }}>₹159.44</Text>
        {[
          ['Merchant', 'Annapurna'],
          ['Category', 'Food'],
          ['Paid with', 'UPI'],
          ['Date', '6 Nov'],
        ].map(([k, v]) => (
          <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: K.subtle, fontFamily: F.ui, fontSize: 10 }}>{k}</Text>
            <Text style={{ color: K.fg2, fontFamily: F.uiMedium, fontSize: 10 }}>{v}</Text>
          </View>
        ))}
        <Text style={{ color: K.inkFg, backgroundColor: K.ink, borderRadius: 10, overflow: 'hidden', textAlign: 'center', fontFamily: F.uiSemibold, fontSize: 11, paddingVertical: 6, marginTop: 2 }}>Save</Text>
      </View>
    </View>
  );
}

function InsightsVisual() {
  const R = 40, C = 2 * Math.PI * R, arc = C * (240 / 360);
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ width: 100, height: 100, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={100} height={100} viewBox="0 0 100 100" style={{ position: 'absolute', transform: [{ rotate: '150deg' }] }}>
            <Circle cx={50} cy={50} r={R} stroke="rgba(242,239,232,0.12)" strokeWidth={9} fill="none" strokeLinecap="round" strokeDasharray={`${arc} ${C}`} />
            <Circle cx={50} cy={50} r={R} stroke={K.income} strokeWidth={9} fill="none" strokeLinecap="round" strokeDasharray={`${0.84 * arc} ${C}`} />
          </Svg>
          <Text style={{ color: K.fg, fontFamily: F.uiSemibold, fontSize: 28 }}>84</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: K.muted, fontFamily: F.ui, fontSize: 12 }}>Financial health</Text>
          <Text style={{ color: K.income, fontFamily: F.uiSemibold, fontSize: 19 }}>Excellent</Text>
        </View>
      </View>
      <Text style={{ color: K.fg, fontFamily: F.uiMedium, fontSize: 12, borderWidth: 1, borderColor: 'rgba(232,180,92,0.35)', backgroundColor: 'rgba(232,180,92,0.08)', borderRadius: 999, overflow: 'hidden', paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start' }}>On pace to overspend by ₹4,531</Text>
      <Text style={{ color: K.fg2, fontFamily: F.ui, fontSize: 13, lineHeight: 19 }}>
        <Text style={{ color: K.mark }}>✦ </Text>
        <Text style={{ fontFamily: F.uiSemibold, color: K.fg }}>Food</Text> is up <Text style={{ fontFamily: F.uiSemibold, color: K.fg }}>32%</Text> — ₹6,840 against a usual ₹5,180.
      </Text>
    </Card>
  );
}

function PhoneVisual() {
  return (
    <View style={{ width: 300, gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#1d2622', borderRadius: 18, paddingHorizontal: 12, paddingVertical: 10 }}>
        <LogoMark size={22} />
        <Text style={{ flex: 1, color: K.fg, fontFamily: F.uiMedium, fontSize: 13 }} numberOfLines={1}>On pace to overspend by ₹4,531</Text>
        <Text style={{ color: K.subtle, fontSize: 11 }}>pinned</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
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
      </View>
      <View style={{ backgroundColor: K.card, borderRadius: 20, padding: 12, gap: 4 }}>
        <Text style={{ color: K.muted, fontFamily: F.ui, fontSize: 10.5 }}>Portfolio · 5:45 pm</Text>
        <Text style={{ color: K.fg, fontFamily: F.uiSemibold, fontSize: 20 }}>₹8,34,076</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color: K.income, fontFamily: F.uiSemibold, fontSize: 11 }}>1D +₹4,883 (0.6%)</Text>
          <Text style={{ color: K.income, fontFamily: F.uiSemibold, fontSize: 11 }}>Total +₹1,40,080</Text>
        </View>
      </View>
    </View>
  );
}
