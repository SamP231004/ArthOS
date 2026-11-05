import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Switch, View } from 'react-native';

import { DateField, isISODate } from '@/components/date-field';
import { Screen } from '@/components/screen';
import { Button, Chip, ErrorNote, Input, Loading, T } from '@/components/ui';
import { S, useTheme } from '@/theme';
import { ApiError } from '@/lib/api';
import { label, todayISO } from '@/lib/format';
import { useDeleteIncome, useIncome, useSaveIncome } from '@/lib/queries';
import { INCOME_TYPES, type Income, type IncomeType } from '@/lib/types';

export default function IncomeFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = useIncome(id);
  if (id && existing.isLoading) return <Loading />;
  if (id && existing.error) return <ErrorNote message={existing.error.message} />;
  return <IncomeForm key={id ?? 'new'} initial={existing.data} />;
}

function IncomeForm({ initial }: { initial?: Income }) {
  const { c } = useTheme();
  const save = useSaveIncome();
  const del = useDeleteIncome();
  const [f, setF] = useState({
    amount: initial?.amount?.toString() ?? '',
    source: initial?.source ?? '',
    type: (initial?.type ?? 'SALARY') as IncomeType,
    date: initial?.date ?? todayISO(),
    note: initial?.note ?? '',
    recurring: initial?.recurring ?? false,
  });
  const err = save.error ?? del.error;
  const fields = err instanceof ApiError ? (err.fieldErrors ?? {}) : {};
  const valid = Number(f.amount) > 0 && f.source.trim() !== '' && isISODate(f.date);

  function submit() {
    save.mutate(
      { id: initial?.id, input: { ...f, amount: Number(f.amount), note: f.note || undefined } },
      { onSuccess: () => router.back() },
    );
  }

  function remove() {
    if (!initial) return;
    Alert.alert('Delete income?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => del.mutate(initial.id, { onSuccess: () => router.back() }) },
    ]);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen edges={['bottom']}>
        <Input
          label="Amount"
          autoFocus={!initial}
          keyboardType="decimal-pad"
          value={f.amount}
          onChangeText={(t) => setF({ ...f, amount: t.replace(/[^0-9.]/g, '') })}
          style={{ fontSize: 24, fontFamily: 'Manrope_600SemiBold' }}
          error={fields.amount}
        />
        <View style={{ gap: S.sm }}>
          <T variant="label">Type</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm }}>
            {INCOME_TYPES.map((t) => (
              <Chip key={t} label={label(t)} active={f.type === t} onPress={() => setF({ ...f, type: t })} />
            ))}
          </View>
        </View>
        <Input label="Source" placeholder="Employer, client, bank…" value={f.source} onChangeText={(source) => setF({ ...f, source })} maxLength={120} error={fields.source} />
        <DateField value={f.date} onChange={(date) => setF({ ...f, date })} error={fields.date} />
        <Input label="Note" placeholder="Optional" value={f.note} onChangeText={(note) => setF({ ...f, note })} maxLength={500} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <T>Repeats every month</T>
          <Switch value={f.recurring} onValueChange={(recurring) => setF({ ...f, recurring })} trackColor={{ true: c.accent2, false: c.lineStrong }} thumbColor={c.surface} />
        </View>
        <ErrorNote message={err && !(err instanceof ApiError && err.fieldErrors) ? err.message : null} />
        <Button size="lg" title={initial ? 'Save changes' : 'Add income'} onPress={submit} loading={save.isPending} disabled={!valid} />
        {initial && <Button title="Delete" variant="danger" onPress={remove} loading={del.isPending} />}
      </Screen>
    </KeyboardAvoidingView>
  );
}
