import { useState } from 'react';
import { Alert, View } from 'react-native';

import { Screen } from '@/components/screen';
import { Button, Card, Chip, ErrorNote, Input, T } from '@/components/ui';
import { C, S } from '@/constants/theme';
import { API_URL } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { useUpdateProfile } from '@/lib/queries';

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD'];

export default function SettingsTab() {
  const { user, signOut } = useAuth();
  const update = useUpdateProfile();
  const [name, setName] = useState(user?.name ?? '');
  const [target, setTarget] = useState(user?.monthlyIncomeTarget?.toString() ?? '');
  const [currency, setCurrency] = useState(user?.currency ?? 'INR');

  if (!user) return null;

  return (
    <Screen>
      <T variant="title">Settings</T>
      {user.demo && (
        <Card style={{ gap: S.sm, borderColor: C.brand + '55', backgroundColor: C.brand + '14' }}>
          <T style={{ fontWeight: '600' }}>You&apos;re exploring a demo</T>
          <T variant="muted">This sandbox and its sample data reset after 24 hours. Sign out and create an account to keep your own data.</T>
        </Card>
      )}
      <Card style={{ gap: S.md }}>
        <Input label="Name" value={name} onChangeText={setName} maxLength={80} />
        <Input label="Email" value={user.email} editable={false} style={{ opacity: 0.6 }} />
        <Input label="Monthly income target" value={target} keyboardType="decimal-pad" onChangeText={(t) => setTarget(t.replace(/[^0-9.]/g, ''))} />
        <View style={{ gap: S.sm }}>
          <T variant="label">Currency</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm }}>
            {CURRENCIES.map((c) => (
              <Chip key={c} label={c} active={currency === c} onPress={() => setCurrency(c)} />
            ))}
          </View>
        </View>
        <ErrorNote message={update.error?.message} />
        <Button
          title={update.isSuccess ? 'Saved ✓' : 'Save'}
          loading={update.isPending}
          onPress={() => update.mutate({ name: name.trim() || user.name, currency, monthlyIncomeTarget: target === '' ? undefined : Number(target) })}
        />
      </Card>

      <Card style={{ gap: S.xs }}>
        <T variant="label">About</T>
        <T variant="small">Timezone: {user.timezone}</T>
        <T variant="small">Server: {API_URL}</T>
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
      <T variant="small" style={{ textAlign: 'center', color: C.muted }}>ArthOS · Take control of your अर्थ</T>
    </Screen>
  );
}
