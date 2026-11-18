import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Switch, View } from 'react-native';

import { DateField, isISODate } from '@/components/date-field';
import { confirm } from '@/components/confirm';
import { Screen } from '@/components/screen';
import { Button, Chip, ErrorNote, FieldLabel, Input, Loading, T } from '@/components/ui';
import { alpha, R, S, useTheme } from '@/theme';
import { ApiError } from '@/lib/api';
import { todayISO } from '@/lib/format';
import { useDeleteIncome, useIncome, useSaveIncome } from '@/lib/queries';
import { parseDraft, type IncomeDraft } from '@/lib/scan';
import { useCategories } from '@/lib/categories';
import { type Income, type IncomeType } from '@/lib/types';

export default function IncomeFormScreen() {
  const { id, draft } = useLocalSearchParams<{ id?: string; draft?: string }>();
  const existing = useIncome(id);
  if (id && existing.isLoading) return <Loading />;
  if (id && existing.error) return <ErrorNote message={existing.error.message} />;
  return <IncomeForm key={id ?? draft ?? 'new'} initial={existing.data} draft={parseDraft<IncomeDraft>(draft)} />;
}

function IncomeForm({ initial, draft }: { initial?: Income; draft?: IncomeDraft }) {
  const types = useCategories('income');
  const { c } = useTheme();
  const save = useSaveIncome();
  const del = useDeleteIncome();
  const [f, setF] = useState({
    amount: (initial?.amount ?? draft?.amount)?.toString() ?? '',
    source: initial?.source ?? draft?.source ?? '',
    type: (initial?.type ?? draft?.type ?? (types.visible.some((x) => x.key === 'SALARY') ? 'SALARY' : types.visible[0]?.key ?? 'OTHER')) as IncomeType,
    date: initial?.date ?? draft?.date ?? todayISO(),
    note: initial?.note ?? draft?.note ?? '',
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
    const id = initial.id;
    confirm({ title: 'Delete income?', body: 'This cannot be undone.', confirmText: 'Delete', tone: 'danger' }).then(
      (ok) => ok && del.mutate(id, { onSuccess: () => router.back() }),
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <Screen edges={['bottom']}>
        {draft && <DraftNote />}
        <Input
          label="Amount"
          required
          autoFocus={!initial}
          keyboardType="decimal-pad"
          value={f.amount}
          onChangeText={(t) => setF({ ...f, amount: t.replace(/[^0-9.]/g, '') })}
          style={{ fontSize: 24, fontFamily: 'Manrope_600SemiBold' }}
          error={fields.amount}
        />
        <View style={{ gap: S.sm }}>
          <FieldLabel text="Type" required />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm }}>
            {types.options(f.type).map((t) => (
              <Chip key={t.key} label={t.emoji ? `${t.emoji} ${t.label}` : t.label} active={f.type === t.key} onPress={() => setF({ ...f, type: t.key })} />
            ))}
          </View>
        </View>
        <Input label="Source" required placeholder="Employer, client, bank…" value={f.source} onChangeText={(source) => setF({ ...f, source })} maxLength={120} error={fields.source} />
        <DateField required value={f.date} onChange={(date) => setF({ ...f, date })} error={fields.date} />
        <Input label="Note" placeholder="Optional" value={f.note} onChangeText={(note) => setF({ ...f, note })} maxLength={500} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <T>Repeats every month</T>
          <Switch value={f.recurring} onValueChange={(recurring) => setF({ ...f, recurring })} trackColor={{ true: alpha(c.brand, 0.45), false: c.lineStrong }} thumbColor={f.recurring ? c.brand : c.subtle} />
        </View>
        <ErrorNote message={err && !(err instanceof ApiError && err.fieldErrors) ? err.message : null} />
        <Button size="lg" title={initial ? 'Save changes' : 'Add income'} onPress={submit} loading={save.isPending} disabled={!valid} />
        {initial && <Button title="Delete" variant="danger" onPress={remove} loading={del.isPending} />}
      </Screen>
    </KeyboardAvoidingView>
  );
}

/** Shown when the form opens pre-filled from a scan: nothing is saved until the user confirms. */
function DraftNote() {
  const { c } = useTheme();
  return (
    <View style={{ borderWidth: 1, borderColor: alpha(c.brand, 0.3), backgroundColor: alpha(c.brand, 0.07), borderRadius: R.md, padding: S.md }}>
      <T variant="small" style={{ color: c.fg2, lineHeight: 18 }}>⌗ Read from your screenshot. Check the details — nothing is saved until you confirm.</T>
    </View>
  );
}
