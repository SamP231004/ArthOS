import { useState } from 'react';
import { View } from 'react-native';

import { Screen } from '@/components/screen';
import { Button, Chip, ErrorNote, Input, T } from '@/components/ui';
import { C, S } from '@/constants/theme';
import { useAuth } from '@/lib/auth-store';
import { useUpdateProfile } from '@/lib/queries';

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD'];

export default function Onboarding() {
  const user = useAuth((s) => s.user)!;
  const update = useUpdateProfile();
  const [target, setTarget] = useState(user.monthlyIncomeTarget?.toString() ?? '');
  const [currency, setCurrency] = useState(user.currency ?? 'INR');
  const timezone = user.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';

  function finish() {
    // On success the profile store updates and Stack.Protected moves us to the tabs.
    update.mutate({
      currency,
      timezone,
      monthlyIncomeTarget: target ? Number(target) : undefined,
      onboardingCompleted: true,
    });
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={{ gap: S.xs, marginTop: S.xl }}>
        <T variant="small" style={{ color: C.brandText }}>Step 1 of 1</T>
        <T variant="title">Hi {user.name.split(' ')[0]}, let&apos;s set up your month</T>
        <T variant="muted">A monthly earning target lets ArthOS show how close you are each month. You can change it anytime.</T>
      </View>
      <Input
        label="Monthly income target"
        placeholder="e.g. 80000"
        keyboardType="decimal-pad"
        value={target}
        onChangeText={(t) => setTarget(t.replace(/[^0-9.]/g, ''))}
        hint="Optional"
      />
      <View style={{ gap: S.sm }}>
        <T variant="label">Currency</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm }}>
          {CURRENCIES.map((c) => (
            <Chip key={c} label={c} active={currency === c} onPress={() => setCurrency(c)} />
          ))}
        </View>
      </View>
      <T variant="small">Timezone: {timezone}</T>
      <ErrorNote message={update.error?.message} />
      <Button title="Go to my dashboard" onPress={finish} loading={update.isPending} />
    </Screen>
  );
}
