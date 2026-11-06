import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, Easing, KeyboardAvoidingView, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { LogoMark } from './logo';
import { ThemeToggle } from './theme-toggle';
import { Button, ErrorNote, Input, T } from './ui';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { googleClientId, signInWithGoogle } from '@/lib/google';
import type { AuthResponse } from '@/lib/types';
import { alpha, F, R, S, useTheme } from '@/theme';

const POINTS = [
  { title: 'Save first, then spend', body: 'Savings are set aside the moment income lands.' },
  { title: 'One number for today', body: 'Know exactly how much is safe to spend — every day.' },
  { title: 'Your whole portfolio', body: 'Stocks, mutual funds, gold and bonds, priced live.' },
];

/**
 * Sign in / create account, laid out like modern fintech apps: a deep-forest brand hero runs under the status bar
 * (rotating value lines), and the form sits on a sheet that slides up over it — Google first, then email, then the
 * mode switch and the demo.
 */
export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const setSession = useAuth((s) => s.setSession);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<'form' | 'google' | 'demo' | null>(null);
  const [googleId, setGoogleId] = useState<string | null | undefined>(undefined);
  const [point, setPoint] = useState(0);
  const [enter] = useState(() => new Animated.Value(0));
  const [fade] = useState(() => new Animated.Value(1));
  const login = mode === 'login';
  // sized so the whole screen fits without scrolling; create account has one more field, so its hero is shorter
  const heroBody = login ? Math.round(Math.min(270, Math.max(220, height * 0.3))) : Math.round(Math.min(200, Math.max(165, height * 0.22)));
  const heroH = heroBody + insets.top;
  const centreY = insets.top + 38 + (heroBody - 38 - 24) / 2; // middle of the logo block (below the toggle row)

  useEffect(() => {
    let live = true;
    googleClientId().then((id) => live && setGoogleId(id));
    Animated.timing(enter, { toValue: 1, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    return () => {
      live = false;
    };
  }, [enter]);

  // rotate the value lines with a soft cross-fade
  useEffect(() => {
    const t = setInterval(() => {
      Animated.timing(fade, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => {
        setPoint((p) => (p + 1) % POINTS.length);
        Animated.timing(fade, { toValue: 1, duration: 260, useNativeDriver: true }).start();
      });
    }, 3200);
    return () => clearInterval(t);
  }, [fade]);

  async function run(kind: 'form' | 'google' | 'demo', fn: () => Promise<AuthResponse | null>) {
    setBusy(kind);
    setError(null);
    setFields({});
    try {
      const res = await fn();
      if (res) setSession(res.token, res.user); // Stack.Protected routes onward automatically
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.fieldErrors ? null : e.message);
        setFields(e.fieldErrors ?? {});
      } else setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(null);
    }
  }

  const submit = () =>
    run('form', () => api<AuthResponse>(`/api/auth/${mode}`, { method: 'POST', body: login ? { email: form.email, password: form.password } : form, auth: false }));
  const google = () => googleId && run('google', () => signInWithGoogle(googleId));
  const demo = () => run('demo', () => api<AuthResponse>('/api/auth/demo', { method: 'POST', auth: false }));
  const valid = form.email.includes('@') && form.password.length >= (login ? 1 : 8) && (login || form.name.trim() !== '');
  const other = busy !== null;

  return (
    <View style={{ flex: 1, backgroundColor: '#06110c' }}>
      {/* light status-bar icons over the dark hero, whatever the theme */}
      <StatusBar style="light" />
      {/* brand hero — the same deep forest in both themes, like the website's auth panel */}
      <LinearGradient colors={['#12301f', '#0a1d14', '#06110c']} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: heroH + 40 }}>
        <View style={{ position: 'absolute', width: 300, height: 300, borderRadius: 150, top: centreY - 150, alignSelf: 'center', backgroundColor: 'rgba(196,58,53,0.11)' }} />
        <Text
          style={{ position: 'absolute', left: 0, right: 0, top: centreY - 100, height: 200, lineHeight: 200, textAlign: 'center', fontFamily: F.deva, fontSize: 160, color: 'rgba(242,239,232,0.045)' }}>
          अर्थ
        </Text>
      </LinearGradient>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
          <View style={{ height: heroH, paddingTop: insets.top + S.sm, paddingHorizontal: S.lg }}>
            <View style={{ alignItems: 'flex-end' }}>
              <View style={{ borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.08)' }}>
                <ThemeToggle color="#d9d4c9" />
              </View>
            </View>
            <Animated.View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 24, opacity: enter }}>
              <View style={{ borderRadius: 18, shadowColor: '#c43a35', shadowOpacity: 0.6, shadowRadius: 22, elevation: 12 }}>
                <LogoMark size={login ? 58 : 50} />
              </View>
              <Text style={{ marginTop: S.sm, fontFamily: F.display, fontSize: login ? 30 : 27, color: '#f2efe8', letterSpacing: -0.6 }}>
                Arth<Text style={{ fontFamily: F.displayMedium, color: '#ec7a74' }}>OS</Text>
              </Text>
              <Text style={{ fontFamily: F.ui, fontSize: 13.5, color: '#a5b0a9', marginTop: 2 }}>
                Take control of your <Text style={{ fontFamily: F.deva, color: '#ec7a74' }}>अर्थ</Text>
              </Text>
              {login && (
                <>
                  <Animated.View style={{ marginTop: S.md, alignItems: 'center', opacity: fade, minHeight: 40 }}>
                    <Text style={{ fontFamily: F.uiSemibold, fontSize: 14.5, color: '#f2efe8' }}>{POINTS[point].title}</Text>
                    <Text style={{ fontFamily: F.ui, fontSize: 12.5, color: '#a5b0a9', marginTop: 2, textAlign: 'center' }}>{POINTS[point].body}</Text>
                  </Animated.View>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: S.sm }}>
                    {POINTS.map((_, i) => (
                      <View key={i} style={{ height: 5, width: i === point ? 16 : 5, borderRadius: 3, backgroundColor: i === point ? '#ec7a74' : 'rgba(242,239,232,0.25)' }} />
                    ))}
                  </View>
                </>
              )}
            </Animated.View>
          </View>

          {/* the sheet */}
          <Animated.View
            style={{
              flexGrow: 1,
              marginTop: -28,
              backgroundColor: c.bg,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              paddingHorizontal: S.lg,
              paddingTop: S.lg,
              paddingBottom: insets.bottom + S.md,
              gap: 10,
              opacity: enter,
              transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) }],
            }}>
            <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: c.lineStrong, marginTop: -6 }} />
            <View style={{ gap: 2 }}>
              <T variant="title" style={{ fontSize: 26 }}>{login ? 'Welcome back' : 'Create your account'}</T>
              <T variant="muted">{login ? 'Sign in to your money, all in one place.' : 'Free during early access · one account for app and web.'}</T>
            </View>

            {googleId !== null && (
              <Pressable
                onPress={google}
                disabled={!googleId || other}
                accessibilityRole="button"
                accessibilityLabel="Continue with Google"
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  paddingVertical: 12,
                  borderRadius: R.lg,
                  borderWidth: 1,
                  borderColor: c.lineStrong,
                  backgroundColor: c.surface,
                  opacity: !googleId || (other && busy !== 'google') ? 0.55 : pressed ? 0.85 : 1,
                })}>
                {busy === 'google' ? <ActivityIndicator color={c.fg} /> : <GoogleG />}
                <Text style={{ color: c.fg, fontFamily: F.uiSemibold, fontSize: 15 }}>Continue with Google</Text>
              </Pressable>
            )}

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, marginVertical: 2 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: c.line }} />
              <T variant="small">or use email</T>
              <View style={{ flex: 1, height: 1, backgroundColor: c.line }} />
            </View>

            {!login && <Input label="Full name" value={form.name} onChangeText={(name) => setForm({ ...form, name })} autoComplete="name" error={fields.name} maxLength={80} />}
            <Input label="Email" value={form.email} onChangeText={(email) => setForm({ ...form, email })} autoCapitalize="none" autoComplete="email" keyboardType="email-address" error={fields.email} />
            <Input
              label="Password"
              value={form.password}
              onChangeText={(password) => setForm({ ...form, password })}
              secureTextEntry={!show}
              autoCapitalize="none"
              autoComplete={login ? 'current-password' : 'new-password'}
              error={fields.password}
              hint={!login ? 'At least 8 characters' : undefined}
              onSubmitEditing={() => valid && submit()}
              accessory={
                <Pressable onPress={() => setShow((x) => !x)} hitSlop={10} style={{ padding: 10 }} accessibilityRole="button" accessibilityLabel={show ? 'Hide password' : 'Show password'}>
                  <Eye open={show} color={c.muted} />
                </Pressable>
              }
            />
            <ErrorNote message={error} />
            <Button title={login ? 'Sign in  →' : 'Create account  →'} size="lg" onPress={submit} loading={busy === 'form'} disabled={!valid || (other && busy !== 'form')} />

            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
              <T variant="muted">{login ? 'New to ArthOS?' : 'Already have an account?'}</T>
              <Pressable onPress={() => router.replace(login ? '/register' : '/login')} hitSlop={8}>
                <Text style={{ color: c.brand, fontSize: 14, fontFamily: F.uiSemibold }}>{login ? 'Create an account' : 'Sign in'}</Text>
              </Pressable>
            </View>

            <Pressable
              onPress={demo}
              disabled={other}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: S.md,
                paddingVertical: 10,
                paddingHorizontal: S.md,
                borderRadius: R.lg,
                borderWidth: 1,
                borderStyle: 'dashed',
                borderColor: alpha(c.brand, 0.35),
                backgroundColor: alpha(c.brand, pressed ? 0.1 : 0.05),
                opacity: other && busy !== 'demo' ? 0.55 : 1,
              })}>
              <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: alpha(c.brand, 0.14), alignItems: 'center', justifyContent: 'center' }}>
                {busy === 'demo' ? <ActivityIndicator color={c.brand} size="small" /> : <Text style={{ color: c.brand, fontSize: 13 }}>▶</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.fg, fontFamily: F.uiSemibold, fontSize: 14 }}>Just looking? Explore the demo</Text>
                <Text style={{ color: c.subtle, fontFamily: F.ui, fontSize: 12, marginTop: 1 }}>6 months of sample data · no sign-up</Text>
              </View>
              <Text style={{ color: c.brand, fontSize: 18, fontFamily: F.ui }}>›</Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/** Eye / eye-off (lucide outlines) for the password field. */
function Eye({ open, color }: { open: boolean; color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      {open ? (
        <>
          <Path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
          <Path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
          <Path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
          <Path d="m2 2 20 20" />
        </>
      ) : (
        <>
          <Path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
          <Circle cx={12} cy={12} r={3} />
        </>
      )}
    </Svg>
  );
}

function GoogleG() {
  return (
    <Svg width={18} height={18} viewBox="0 0 48 48">
      <Path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <Path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <Path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <Path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </Svg>
  );
}
