import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { Logo } from '@/components/logo';
import { SavingsRuleField } from '@/components/savings-rule';
import { Screen } from '@/components/screen';
import { Button, Card, Chip, ErrorNote, Input, T } from '@/components/ui';
import { API_URL } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { useUpdateProfile } from '@/lib/queries';
import type { SavingsMode } from '@/lib/savings';
import { alpha, F, palettes, R, S, THEMES, useTheme } from '@/theme';

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD'];

export default function SettingsScreen() {
  const { c, mode, setMode } = useTheme();
  const { user, signOut } = useAuth();
  const update = useUpdateProfile();
  const [name, setName] = useState(user?.name ?? '');
  const [currency, setCurrency] = useState(user?.currency ?? 'INR');
  const [savingsMode, setSavingsMode] = useState<SavingsMode>(user?.savingsMode ?? 'PERCENT');
  const [savingsValue, setSavingsValue] = useState(String(user?.savingsValue ?? 20));
  const [startingBalance, setStartingBalance] = useState(String(user?.savingsStartingBalance ?? 0));

  if (!user) return null;

  return (
    <Screen edges={['bottom']}>
      {user.demo && (
        <Card style={{ gap: S.sm, borderColor: alpha(c.brand, 0.35), backgroundColor: alpha(c.brand, 0.07) }}>
          <T variant="h2">You&apos;re exploring a demo</T>
          <T variant="muted">This sandbox and its sample data reset after 24 hours. Sign out and create an account to keep your own data.</T>
        </Card>
      )}

      <Card style={{ gap: S.md }}>
        <T variant="label">Theme</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm }} accessibilityRole="radiogroup">
          {THEMES.map((t) => {
            const p = palettes[t.id];
            const on = mode === t.id;
            return (
              <Pressable
                key={t.id}
                onPress={(e) => setMode(t.id, { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY })}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                style={{ width: '48%', flexGrow: 1, borderRadius: R.md, borderWidth: on ? 2 : 1, borderColor: on ? c.brand : c.lineStrong, overflow: 'hidden' }}>
                {/* mini preview: page, panel, accent button, highlight */}
                <View style={{ backgroundColor: p.bg, padding: S.sm }}>
                  <View style={{ backgroundColor: p.surface, borderColor: p.line, borderWidth: 1, borderRadius: 8, padding: 8, gap: 5 }}>
                    <View style={{ width: 34, height: 5, borderRadius: 3, backgroundColor: alpha(p.fg, 0.5) }} />
                    <View style={{ width: 56, height: 8, borderRadius: 4, backgroundColor: p.fg }} />
                    <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center', marginTop: 2 }}>
                      <View style={{ width: 40, height: 14, borderRadius: 5, backgroundColor: p.accent2 }} />
                      <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: p.brand }} />
                    </View>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: S.sm, paddingVertical: 8, backgroundColor: c.surface }}>
                  <View>
                    <T style={{ fontSize: 14, fontFamily: F.uiSemibold }}>{t.name}</T>
                    <T variant="small">{t.scheme === 'light' ? 'Light' : 'Dark'}</T>
                  </View>
                  {on && <T style={{ color: c.brand, fontFamily: F.uiBold }}>✓</T>}
                </View>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card style={{ gap: S.md }}>
        <T variant="label">Profile</T>
        <Input label="Full name" value={name} onChangeText={setName} maxLength={80} />
        <Input label="Email" value={user.email} editable={false} style={{ opacity: 0.6 }} hint={user.demo ? 'Demo accounts use a generated address' : undefined} />
      </Card>

      <Card style={{ gap: S.md }}>
        <T variant="label">Save first</T>
        <T variant="muted">Pay yourself first: this is set aside the moment income arrives. Budgets and “left to spend” come out of what remains.</T>
        <SavingsRuleField
          mode={savingsMode}
          value={savingsValue}
          currency={currency}
          onChange={(m, v) => {
            setSavingsMode(m);
            setSavingsValue(v);
          }}
        />
        <Input
          label="Savings you already had"
          keyboardType="decimal-pad"
          value={startingBalance}
          onChangeText={(t) => setStartingBalance(t.replace(/[^0-9.]/g, ''))}
          hint="Opens your savings account; each month's saved-first amount is added and carried forward."
        />
      </Card>

      <Card style={{ gap: S.md }}>
        <T variant="label">Money</T>
        <View style={{ gap: S.sm }}>
          <T variant="label">Currency</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm }}>
            {CURRENCIES.map((x) => (
              <Chip key={x} label={x} active={currency === x} onPress={() => setCurrency(x)} />
            ))}
          </View>
        </View>
        <T variant="small">Timezone: {user.timezone}</T>
        <ErrorNote message={update.error?.message} />
        <Button
          title={update.isSuccess ? 'Saved ✓' : 'Save changes'}
          loading={update.isPending}
          onPress={() => update.mutate({ name: name.trim() || user.name, currency, savingsMode, savingsValue: Number(savingsValue) || 0, savingsStartingBalance: Number(startingBalance) || 0 })}
        />
      </Card>

      <Button
        title="Sign out"
        variant="danger"
        onPress={() =>
          Alert.alert('Sign out?', 'You can sign back in anytime.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign out', style: 'destructive', onPress: signOut },
          ])
        }
      />
      <View style={{ alignItems: 'center', gap: S.sm, marginTop: S.lg }}>
        <Logo size={26} />
        <T variant="small">Take control of your अर्थ · {API_URL.replace(/^https?:\/\//, '')}</T>
      </View>
    </Screen>
  );
}
