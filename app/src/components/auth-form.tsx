import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';

import { Screen } from './screen';
import { Button, ErrorNote, Input, T } from './ui';
import { C, R, S } from '@/constants/theme';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import type { AuthResponse } from '@/lib/types';

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const setSession = useAuth((s) => s.setSession);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

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

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen edges={['top', 'bottom']}>
        <View style={styles.brand}>
          <View style={styles.mark}>
            <Text style={styles.markText}>अ</Text>
          </View>
          <Text style={styles.wordmark}>
            Arth<Text style={{ color: C.brand }}>OS</Text>
          </Text>
          <T variant="muted">Take control of your अर्थ</T>
        </View>

        <View style={{ gap: S.xs }}>
          <T variant="title">{mode === 'login' ? 'Welcome back' : 'Create your account'}</T>
          <T variant="muted">{mode === 'login' ? 'Sign in to your financial control center.' : 'One account for the app and the web.'}</T>
        </View>

        <View style={{ gap: S.md }}>
          {mode === 'register' && (
            <Input label="Name" value={form.name} onChangeText={(name) => setForm({ ...form, name })} autoComplete="name" error={fields.name} maxLength={80} />
          )}
          <Input
            label="Email"
            value={form.email}
            onChangeText={(email) => setForm({ ...form, email })}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            error={fields.email}
          />
          <Input
            label="Password"
            value={form.password}
            onChangeText={(password) => setForm({ ...form, password })}
            secureTextEntry
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            error={fields.password}
            hint={mode === 'register' ? 'At least 8 characters' : undefined}
            onSubmitEditing={submit}
          />
          <ErrorNote message={error} />
          <Button title={mode === 'login' ? 'Sign in' : 'Create account'} onPress={submit} loading={loading} />
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
          <T variant="muted">{mode === 'login' ? 'New to ArthOS?' : 'Already have an account?'}</T>
          <Link href={mode === 'login' ? '/register' : '/login'} replace>
            <Text style={{ color: C.brand, fontSize: 14 }}>{mode === 'login' ? 'Create an account' : 'Sign in'}</Text>
          </Link>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  brand: { alignItems: 'center', gap: S.sm, marginTop: S.xxl, marginBottom: S.lg },
  mark: { width: 56, height: 56, borderRadius: R.lg, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center' },
  markText: { color: C.brandFg, fontSize: 28, fontWeight: '700' },
  wordmark: { color: C.fg, fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
});
