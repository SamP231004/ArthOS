import { useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Alert, Pressable, Switch, Text, View } from 'react-native';

import { Logo } from '@/components/logo';
import { SavingsRuleField } from '@/components/savings-rule';
import { Screen } from '@/components/screen';
import { Button, Card, Chip, ErrorNote, Input, T } from '@/components/ui';
import { API_URL } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { currentMonth, money } from '@/lib/format';
import { pinAlertsEnabled, setPinAlerts, syncAlertNotifications } from '@/lib/notify';
import { useSummary, useUpdateProfile } from '@/lib/queries';
import type { SavingsMode } from '@/lib/savings';
import type { Insights } from '@/lib/types';
import { alpha, F, palettes, R, S, useTheme, type Mode } from '@/theme';

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD'];

function initials(name: string) {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

export default function SettingsScreen() {
  const { c, mode, setMode } = useTheme();
  const { user, signOut } = useAuth();
  const update = useUpdateProfile();
  const qc = useQueryClient();
  const [name, setName] = useState(user?.name ?? '');
  const [currency, setCurrency] = useState(user?.currency ?? 'INR');
  const [savingsMode, setSavingsMode] = useState<SavingsMode>(user?.savingsMode ?? 'PERCENT');
  const [savingsValue, setSavingsValue] = useState(String(user?.savingsValue ?? 20));
  const [startingBalance, setStartingBalance] = useState(String(user?.savingsStartingBalance ?? 0));
  const [pinned, setPinned] = useState(true);
  useEffect(() => {
    pinAlertsEnabled().then(setPinned);
  }, []);

  if (!user) return null;
  const dirty =
    name !== user.name ||
    currency !== user.currency ||
    savingsMode !== (user.savingsMode ?? 'PERCENT') ||
    savingsValue !== String(user.savingsValue ?? 20) ||
    startingBalance !== String(user.savingsStartingBalance ?? 0);

  return (
    <Screen edges={['bottom']}>
      {/* profile */}
      <Card glow style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
        <LinearGradient colors={['#c43a35', '#a31c1b']} style={{ width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#fff7f3', fontFamily: F.uiSemibold, fontSize: 20 }}>{initials(user.name)}</Text>
        </LinearGradient>
        <View style={{ flex: 1, gap: 2 }}>
          <T variant="h2" numberOfLines={1}>{user.name}</T>
          <T variant="small" numberOfLines={1}>{user.email}</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
            {user.demo && <Badge text="Demo · resets in 24h" color={c.brand} />}
            <Badge text={`${user.currency} · ${user.timezone}`} color={c.muted} />
          </View>
        </View>
      </Card>

      {/* appearance */}
      <Card style={{ gap: S.md }}>
        <T variant="label">Appearance</T>
        <View style={{ flexDirection: 'row', gap: S.sm }}>
          {(['dark', 'light'] as Mode[]).map((m) => {
            const p = palettes[m];
            const on = mode === m;
            return (
              <Pressable
                key={m}
                onPress={() => setMode(m)}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                style={{ flex: 1, borderRadius: R.md, borderWidth: on ? 2 : 1, borderColor: on ? c.brand : c.line, overflow: 'hidden' }}
              >
                <View style={{ height: 56, backgroundColor: p.bg, padding: 10, gap: 6 }}>
                  <View style={{ width: 44, height: 6, borderRadius: 3, backgroundColor: p.fg, opacity: 0.85 }} />
                  <View style={{ width: 28, height: 6, borderRadius: 3, backgroundColor: m === 'dark' ? '#a31c1b' : p.brand }} />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 8 }}>
                  <Text style={{ color: c.fg, fontFamily: F.uiSemibold, fontSize: 13.5 }}>{m === 'dark' ? 'Forest' : 'Ivory'}</Text>
                  <T variant="small">{m === 'dark' ? 'Dark' : 'Light'}</T>
                </View>
              </Pressable>
            );
          })}
        </View>
      </Card>

      {/* notifications */}
      <Card style={{ gap: S.md }}>
        <T variant="label">Notifications</T>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
          <View style={{ flex: 1, gap: 2 }}>
            <T style={{ fontSize: 15 }}>Pin money alerts</T>
            <T variant="small">Keeps your most urgent alert (like being over budget) in the notification shade until it&apos;s resolved. &quot;Clear all&quot; won&apos;t remove it.</T>
          </View>
          <Switch
            value={pinned}
            onValueChange={(v) => {
              setPinned(v);
              setPinAlerts(v).then(() => {
                const data = qc.getQueryData<Insights>(['insights', currentMonth()]);
                if (data) syncAlertNotifications(data).catch(() => {});
              });
            }}
            trackColor={{ true: alpha(c.brand, 0.45), false: c.lineStrong }}
            thumbColor={pinned ? c.brand : c.subtle}
            accessibilityLabel="Pin money alerts"
          />
        </View>
      </Card>

      {/* save first */}
      <Card style={{ gap: S.md }}>
        <T variant="label">Save first</T>
        <T variant="muted">Set aside the moment income arrives. Budgets and “left to spend” use what remains.</T>
        <SavingsRuleField
          mode={savingsMode}
          value={savingsValue}
          currency={currency}
          onChange={(m, v) => {
            setSavingsMode(m);
            setSavingsValue(v);
          }}
        />
        <SaveFirstPreview mode={savingsMode} value={Number(savingsValue) || 0} currency={currency} />
        <Input
          label="Savings you already had"
          keyboardType="decimal-pad"
          value={startingBalance}
          onChangeText={(t) => setStartingBalance(t.replace(/[^0-9.]/g, ''))}
          hint="Opens your savings account; each month's saved-first amount is added and carried forward."
        />
      </Card>

      {/* profile + money */}
      <Card style={{ gap: S.md }}>
        <T variant="label">Profile & money</T>
        <Input label="Full name" value={name} onChangeText={setName} maxLength={80} />
        <Input label="Email" value={user.email} editable={false} style={{ opacity: 0.6 }} hint={user.demo ? 'Demo accounts use a generated address' : undefined} />
        <View style={{ gap: S.sm }}>
          <T variant="label">Currency</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm }}>
            {CURRENCIES.map((x) => (
              <Chip key={x} label={x} active={currency === x} onPress={() => setCurrency(x)} />
            ))}
          </View>
        </View>
        <T variant="small">Timezone: {user.timezone} (change it on the website)</T>
      </Card>

      {/* widgets */}
      <Card style={{ gap: S.sm }}>
        <T variant="label">Home-screen widgets</T>
        <T variant="muted">Long-press your home screen → Widgets → ArthOS. Tap the eye on a widget to hide amounts; long-press it → Settings for its theme.</T>
      </Card>

      {(dirty || update.isSuccess || update.error) && (
        <View style={{ gap: S.sm }}>
          <ErrorNote message={update.error?.message} />
          <Button
            title={dirty ? 'Save changes' : 'Saved ✓'}
            loading={update.isPending}
            disabled={!dirty}
            onPress={() => update.mutate({ name: name.trim() || user.name, currency, savingsMode, savingsValue: Number(savingsValue) || 0, savingsStartingBalance: Number(startingBalance) || 0 })}
          />
        </View>
      )}

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

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <Text style={{ color, backgroundColor: alpha(color, 0.1), borderRadius: R.pill, overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 2, fontSize: 11, fontFamily: F.uiMedium }}>{text}</Text>
  );
}

/** The rule applied to this month's real income, so the effect of a change is visible before saving. */
function SaveFirstPreview({ mode, value, currency }: { mode: SavingsMode; value: number; currency: string }) {
  const { c } = useTheme();
  const { data: s } = useSummary(currentMonth());
  const income = s?.totalIncome ?? 0;
  if (income <= 0) return null;
  const saved = mode === 'FIXED' ? Math.min(value, income) : (income * Math.min(value, 100)) / 100;
  const fmt = (n: number) => money(Math.round(n), currency);
  return (
    <View style={{ backgroundColor: alpha(c.fg, 0.03), borderRadius: R.md, padding: S.md, gap: 8 }}>
      <View style={{ height: 8, borderRadius: R.pill, backgroundColor: alpha(c.fg, 0.06), overflow: 'hidden' }}>
        <View style={{ width: `${(saved / income) * 100}%`, height: '100%', backgroundColor: c.income }} />
      </View>
      <Text style={{ color: c.muted, fontSize: 12.5, lineHeight: 18, fontFamily: F.ui }}>
        Of this month&apos;s <Text style={{ color: c.fg, fontFamily: F.uiSemibold }}>{fmt(income)}</Text> income:{' '}
        <Text style={{ color: c.income, fontFamily: F.uiSemibold }}>{fmt(saved)}</Text> saved first,{' '}
        <Text style={{ color: c.fg, fontFamily: F.uiSemibold }}>{fmt(income - saved)}</Text> to spend.
      </Text>
    </View>
  );
}
