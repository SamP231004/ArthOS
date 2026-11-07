import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Alert, Switch, View } from 'react-native';

import { Logo } from '@/components/logo';
import { SavingsRuleField } from '@/components/savings-rule';
import { Screen } from '@/components/screen';
import { Button, Card, Chip, ErrorNote, Input, Segmented, T } from '@/components/ui';
import { API_URL } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { currentMonth } from '@/lib/format';
import { pinAlertsEnabled, setPinAlerts, syncAlertNotifications } from '@/lib/notify';
import { useUpdateProfile } from '@/lib/queries';
import type { SavingsMode } from '@/lib/savings';
import type { Insights } from '@/lib/types';
import { alpha, S, useTheme, type Mode } from '@/theme';

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
  const [pinned, setPinned] = useState(true);
  const qc = useQueryClient();
  useEffect(() => {
    pinAlertsEnabled().then(setPinned);
  }, []);

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
        <T variant="label">Appearance</T>
        <Segmented<Mode>
          value={mode}
          onChange={setMode}
          options={[
            { value: 'dark', label: 'Forest (dark)' },
            { value: 'light', label: 'Ivory (light)' },
          ]}
        />
      </Card>

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
            trackColor={{ true: c.brand, false: c.lineStrong }}
            thumbColor={c.fg}
            accessibilityLabel="Pin money alerts"
          />
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
