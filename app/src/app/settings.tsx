import { useState } from 'react';
import { Alert, View } from 'react-native';

import { Logo } from '@/components/logo';
import { Screen } from '@/components/screen';
import { Button, Card, Chip, ErrorNote, Input, Segmented, T } from '@/components/ui';
import { API_URL } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import { useUpdateProfile } from '@/lib/queries';
import { alpha, S, useTheme, type Mode } from '@/theme';

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD'];

export default function SettingsScreen() {
  const { c, mode, toggle } = useTheme();
  const { user, signOut } = useAuth();
  const update = useUpdateProfile();
  const [name, setName] = useState(user?.name ?? '');
  const [target, setTarget] = useState(user?.monthlyIncomeTarget?.toString() ?? '');
  const [currency, setCurrency] = useState(user?.currency ?? 'INR');

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
          onChange={(m) => m !== mode && toggle()}
          options={[
            { value: 'dark', label: 'Forest (dark)' },
            { value: 'light', label: 'Ivory (light)' },
          ]}
        />
      </Card>

      <Card style={{ gap: S.md }}>
        <T variant="label">Profile</T>
        <Input label="Full name" value={name} onChangeText={setName} maxLength={80} />
        <Input label="Email" value={user.email} editable={false} style={{ opacity: 0.6 }} hint={user.demo ? 'Demo accounts use a generated address' : undefined} />
      </Card>

      <Card style={{ gap: S.md }}>
        <T variant="label">Money</T>
        <Input label="Monthly income target" value={target} keyboardType="decimal-pad" onChangeText={(t) => setTarget(t.replace(/[^0-9.]/g, ''))} />
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
          onPress={() => update.mutate({ name: name.trim() || user.name, currency, monthlyIncomeTarget: target === '' ? undefined : Number(target) })}
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
