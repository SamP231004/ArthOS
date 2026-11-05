import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Text, View } from 'react-native';

import { Logo } from './logo';
import { Screen } from './screen';
import { ThemeToggle } from './theme-toggle';
import { Button, ErrorNote, Input, T } from './ui';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import type { AuthResponse } from '@/lib/types';
import { F, S, useTheme } from '@/theme';

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const { c } = useTheme();
  const setSession = useAuth((s) => s.setSession);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setError(null);
    setFields({});
    try {
      const body = mode === 'register' ? form : { email: form.email, password: form.password };
      const res = await api<AuthResponse>(`/api/auth/${mode}`, { method: 'POST', body, auth: false });
      setSession(res.token, res.user); // Stack.Protected routes onward automatically
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.fieldErrors ? null : e.message);
        setFields(e.fieldErrors ?? {});
      } else setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function startDemo() {
    setDemoLoading(true);
    setError(null);
    try {
      const res = await api<AuthResponse>('/api/auth/demo', { method: 'POST', auth: false });
      setSession(res.token, res.user);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't start the demo");
    } finally {
      setDemoLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <Screen edges={['top', 'bottom']}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Logo size={34} />
          <ThemeToggle />
        </View>

        <View style={{ gap: S.sm, marginTop: S.xl }}>
          <T variant="eyebrow">Personal financial OS</T>
          <T variant="display">
            {mode === 'login' ? 'Welcome back' : 'Every rupee, '}
            {mode === 'register' && <Text style={{ fontFamily: F.displayItalic, color: c.brand }}>in motion.</Text>}
          </T>
          <T variant="muted">{mode === 'login' ? 'Sign in to your financial control center.' : 'Free during early access. One account for the app and the web.'}</T>
        </View>

        <View style={{ gap: S.md }}>
          {mode === 'register' && <Input label="Full name" value={form.name} onChangeText={(name) => setForm({ ...form, name })} autoComplete="name" error={fields.name} maxLength={80} placeholder="Samarth Patel" />}
          <Input label="Email" value={form.email} onChangeText={(email) => setForm({ ...form, email })} autoCapitalize="none" autoComplete="email" keyboardType="email-address" error={fields.email} placeholder="you@example.com" />
          <Input
            label="Password"
            value={form.password}
            onChangeText={(password) => setForm({ ...form, password })}
            secureTextEntry
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            error={fields.password}
            hint={mode === 'register' ? 'At least 8 characters' : undefined}
            onSubmitEditing={submit}
            placeholder="••••••••"
          />
          <ErrorNote message={error} />
          <Button title={mode === 'login' ? 'Sign in  →' : 'Create account  →'} size="lg" onPress={submit} loading={loading} />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
          <View style={{ flex: 1, height: 1, backgroundColor: c.line }} />
          <T variant="label">or</T>
          <View style={{ flex: 1, height: 1, backgroundColor: c.line }} />
        </View>
        <View style={{ gap: S.sm }}>
          <Button title="▶  Explore with demo data" variant="secondary" size="lg" onPress={startDemo} loading={demoLoading} />
          <T variant="small" style={{ textAlign: 'center' }}>A private sandbox with 6 months of sample data. No sign-up.</T>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: S.md }}>
          <T variant="muted">{mode === 'login' ? 'New to ArthOS?' : 'Already have an account?'}</T>
          <Link href={mode === 'login' ? '/register' : '/login'} replace>
            <Text style={{ color: c.brand, fontSize: 14, fontFamily: F.uiSemibold }}>{mode === 'login' ? 'Create an account' : 'Sign in'}</Text>
          </Link>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
