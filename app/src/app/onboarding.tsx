import { useState } from 'react';
import { View } from 'react-native';

import { Logo } from '@/components/logo';
import { SavingsRuleField } from '@/components/savings-rule';
import { Screen } from '@/components/screen';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button, Card, Chip, ErrorNote, T } from '@/components/ui';
import { useAuth } from '@/lib/auth-store';
import { useUpdateProfile } from '@/lib/queries';
import type { SavingsMode } from '@/lib/savings';
import { S } from '@/theme';

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD'];

export default function Onboarding() {
  const user = useAuth((s) => s.user)!;
  const update = useUpdateProfile();
  const [currency, setCurrency] = useState(user.currency ?? 'INR');
  const [savingsMode, setSavingsMode] = useState<SavingsMode>(user.savingsMode ?? 'PERCENT');
  const [savingsValue, setSavingsValue] = useState(String(user.savingsValue ?? 20));
  const timezone = user.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Logo size={32} />
        <ThemeToggle />
      </View>
      <Card glow style={{ gap: S.lg, marginTop: S.lg }}>
        <View style={{ gap: S.sm }}>
          <T variant="eyebrow">Step 1 of 1 · Setup</T>
          <T variant="title">Hi {user.name.split(' ')[0]}, let&apos;s get you set up</T>
          <T variant="muted">Pick your currency, then decide how much of every income you save before spending.</T>
        </View>
        <View style={{ gap: S.sm }}>
          <T variant="label">Currency</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm }}>
            {CURRENCIES.map((c) => (
              <Chip key={c} label={c} active={currency === c} onPress={() => setCurrency(c)} />
            ))}
          </View>
        </View>
        <T variant="small">Timezone: {timezone}</T>
        <View style={{ gap: S.xs }}>
          <T variant="h2">Save first, then spend</T>
          <T variant="muted">Set aside part of every income the moment it arrives. Change it any time in Settings.</T>
        </View>
        <SavingsRuleField
          mode={savingsMode}
          value={savingsValue}
          currency={currency}
          onChange={(m, v) => {
            setSavingsMode(m);
            setSavingsValue(v);
          }}
        />
        <ErrorNote message={update.error?.message} />
        <Button
          title="Go to my dashboard"
          size="lg"
          loading={update.isPending}
          onPress={() => update.mutate({ currency, timezone, savingsMode, savingsValue: Number(savingsValue) || 0, onboardingCompleted: true })}
        />
      </Card>
    </Screen>
  );
}
