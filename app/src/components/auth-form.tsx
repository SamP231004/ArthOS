import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Logo } from './logo';
import { Screen } from './screen';
import { ThemeToggle } from './theme-toggle';
import { Button, ErrorNote, Input, T } from './ui';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { googleClientId, signInWithGoogle } from '@/lib/google';
import type { AuthResponse } from '@/lib/types';
import { alpha, F, R, S, useTheme } from '@/theme';

const POINTS = ['Save first, then spend what’s left', 'One daily number that keeps you on budget', 'Stocks, funds, gold & bonds — priced live'];

/**
 * Sign in / create account. A deep-forest hero (same in both themes, like the website's auth panel) sells the app in
 * three lines; below it a Sign in / Create account switch, the form, Google, and the demo.
 */
export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const { c } = useTheme();
  const setSession = useAuth((s) => s.setSession);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<'form' | 'google' | 'demo' | null>(null);
  const [googleId, setGoogleId] = useState<string | null | undefined>(undefined);
  const login = mode === 'login';

  useEffect(() => {
    let live = true;
    googleClientId().then((id) => live && setGoogleId(id));
    return () => {
      live = false;
    };
  }, []);

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

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <Screen edges={['top', 'bottom']}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Logo size={32} />
          <ThemeToggle />
        </View>

        {/* hero */}
        <LinearGradient colors={['#0f2419', '#06110c']} style={{ borderRadius: R.xxl, padding: S.xl, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(214,232,222,0.1)' }}>
          <View style={{ position: 'absolute', right: -60, bottom: -80, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(196,58,53,0.28)' }} />
          <Text style={{ position: 'absolute', right: 14, top: 4, fontFamily: F.deva, fontSize: 96, color: 'rgba(242,239,232,0.06)' }}>अर्थ</Text>
          <Text style={{ fontFamily: F.mono, fontSize: 10.5, letterSpacing: 2.2, color: '#ec7a74' }}>PERSONAL FINANCIAL OS</Text>
          <Text style={{ fontFamily: F.display, fontSize: 32, lineHeight: 36, color: '#f2efe8', marginTop: S.sm, letterSpacing: -0.6 }}>
            {login ? 'Welcome back' : 'Every rupee, '}
            {!login && <Text style={{ fontFamily: F.displayItalic, color: '#ec7a74' }}>in motion.</Text>}
          </Text>
          <View style={{ gap: 7, marginTop: S.md }}>
            {POINTS.map((p) => (
              <View key={p} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: 'rgba(76,195,138,0.16)', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#4cc38a', fontSize: 10, fontFamily: F.uiBold }}>✓</Text>
                </View>
                <Text style={{ color: '#d9d4c9', fontSize: 13, fontFamily: F.ui }}>{p}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* sign in / create account switch */}
        <View style={{ flexDirection: 'row', padding: 4, borderRadius: R.md, borderWidth: 1, borderColor: c.line, backgroundColor: alpha(c.fg, 0.03) }}>
          {(['login', 'register'] as const).map((m) => {
            const on = m === mode;
            return (
              <Pressable
                key={m}
                onPress={() => !on && router.replace(m === 'login' ? '/login' : '/register')}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                style={{ flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: R.sm, backgroundColor: on ? c.surface : 'transparent', borderWidth: on ? 1 : 0, borderColor: c.lineStrong }}>
                <Text style={{ color: on ? c.fg : c.muted, fontFamily: on ? F.uiSemibold : F.uiMedium, fontSize: 14 }}>{m === 'login' ? 'Sign in' : 'Create account'}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ gap: S.md }}>
          {!login && <Input label="Full name" value={form.name} onChangeText={(name) => setForm({ ...form, name })} autoComplete="name" error={fields.name} maxLength={80} placeholder="Samarth Patel" />}
          <Input label="Email" value={form.email} onChangeText={(email) => setForm({ ...form, email })} autoCapitalize="none" autoComplete="email" keyboardType="email-address" error={fields.email} placeholder="you@example.com" />
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
            placeholder={login ? 'Your password' : 'Create a password'}
            accessory={
              <Pressable onPress={() => setShow((x) => !x)} hitSlop={8} style={{ paddingHorizontal: 10, paddingVertical: 8 }} accessibilityLabel={show ? 'Hide password' : 'Show password'}>
                <Text style={{ color: c.brand, fontFamily: F.uiSemibold, fontSize: 13 }}>{show ? 'Hide' : 'Show'}</Text>
              </Pressable>
            }
          />
          <ErrorNote message={error} />
          <Button title={login ? 'Sign in' : 'Create account'} size="lg" onPress={submit} loading={busy === 'form'} disabled={!valid || (busy !== null && busy !== 'form')} />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
          <View style={{ flex: 1, height: 1, backgroundColor: c.line }} />
          <T variant="label">or</T>
          <View style={{ flex: 1, height: 1, backgroundColor: c.line }} />
        </View>

        <View style={{ gap: S.sm }}>
          {googleId !== null && (
            <Pressable
              onPress={google}
              disabled={!googleId || busy !== null}
              accessibilityRole="button"
              accessibilityLabel="Continue with Google"
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                paddingVertical: 14,
                borderRadius: R.md,
                borderWidth: 1,
                borderColor: c.lineStrong,
                backgroundColor: c.surface,
                opacity: !googleId || (busy !== null && busy !== 'google') ? 0.55 : pressed ? 0.85 : 1,
              })}>
              {busy === 'google' ? <ActivityIndicator color={c.fg} /> : <GoogleG />}
              <Text style={{ color: c.fg, fontFamily: F.uiSemibold, fontSize: 15 }}>Continue with Google</Text>
            </Pressable>
          )}
          <Button title="Explore with demo data" variant="ghost" onPress={demo} loading={busy === 'demo'} disabled={busy !== null && busy !== 'demo'} />
          <T variant="small" style={{ textAlign: 'center', marginTop: -4 }}>A private sandbox with 6 months of sample data — no sign-up.</T>
        </View>
      </Screen>
    </KeyboardAvoidingView>
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
