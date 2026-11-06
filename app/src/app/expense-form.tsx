import { router, useLocalSearchParams } from 'expo-router';
import { useDeferredValue, useState } from 'react';
import { Alert, KeyboardAvoidingView, Switch, View } from 'react-native';

import { DateField, isISODate } from '@/components/date-field';
import { Screen } from '@/components/screen';
import { Button, Chip, ErrorNote, Input, Loading, T } from '@/components/ui';
import { alpha, R, S, useTheme } from '@/theme';
import { ApiError } from '@/lib/api';
import { label, todayISO } from '@/lib/format';
import { useCategorySuggestion, useDeleteExpense, useExpense, useSaveExpense } from '@/lib/queries';
import { parseDraft, type ExpenseDraft } from '@/lib/scan';
import { EXPENSE_CATEGORIES, PAYMENT_SOURCES, type Expense, type ExpenseCategory, type PaymentSource } from '@/lib/types';

export default function ExpenseFormScreen() {
  const { id, draft } = useLocalSearchParams<{ id?: string; draft?: string }>();
  const existing = useExpense(id);
  if (id && existing.isLoading) return <Loading />;
  if (id && existing.error) return <ErrorNote message={existing.error.message} />;
  return <ExpenseForm key={id ?? draft ?? 'new'} initial={existing.data} draft={parseDraft<ExpenseDraft>(draft)} />;
}

function ExpenseForm({ initial, draft }: { initial?: Expense; draft?: ExpenseDraft }) {
  const { c } = useTheme();
  const save = useSaveExpense();
  const del = useDeleteExpense();
  const [f, setF] = useState({
    amount: (initial?.amount ?? draft?.amount)?.toString() ?? '',
    category: (initial?.category ?? draft?.category ?? 'FOOD') as ExpenseCategory,
    merchant: initial?.merchant ?? draft?.merchant ?? '',
    paymentSource: (initial?.paymentSource ?? draft?.paymentSource ?? 'UPI') as PaymentSource,
    date: initial?.date ?? draft?.date ?? todayISO(),
    note: initial?.note ?? draft?.note ?? '',
    recurring: initial?.recurring ?? false,
  });
  // Smart category: follow the suggestion for the merchant typed until the user picks a category themselves
  const [picked, setPicked] = useState(!!initial || !!draft?.category);
  const merchantQuery = useDeferredValue(f.merchant);
  const suggestion = useCategorySuggestion(picked ? '' : merchantQuery).data;
  const suggested = !picked && suggestion?.category ? suggestion.category : undefined;
  const category = suggested ?? f.category;
  const err = save.error ?? del.error;
  const fields = err instanceof ApiError ? (err.fieldErrors ?? {}) : {};
  const valid = Number(f.amount) > 0 && isISODate(f.date);

  function submit() {
    save.mutate(
      {
        id: initial?.id,
        input: { ...f, category, amount: Number(f.amount), merchant: f.merchant || undefined, note: f.note || undefined },
      },
      { onSuccess: () => router.back() },
    );
  }

  function remove() {
    if (!initial) return;
    Alert.alert('Delete expense?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => del.mutate(initial.id, { onSuccess: () => router.back() }) },
    ]);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <Screen edges={['bottom']}>
        {draft && <DraftNote />}
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
          <T variant="label">Category</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm }}>
            {EXPENSE_CATEGORIES.map((c) => (
              <Chip
                key={c}
                label={label(c)}
                active={category === c}
                onPress={() => {
                  setPicked(true);
                  setF({ ...f, category: c });
                }}
              />
            ))}
          </View>
        </View>
        <View style={{ gap: S.sm }}>
          <T variant="label">Paid via</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm }}>
            {PAYMENT_SOURCES.map((p) => (
              <Chip key={p} label={label(p)} active={f.paymentSource === p} onPress={() => setF({ ...f, paymentSource: p })} />
            ))}
          </View>
        </View>
        <Input label="Merchant" placeholder="Swiggy, Uber, landlord…" value={f.merchant} onChangeText={(merchant) => setF({ ...f, merchant })} maxLength={120} />
        {suggested && (
          <T variant="small" style={{ marginTop: -S.sm }}>
            ✦ {label(suggested)} picked {suggestion?.source === 'LEARNED' ? 'from how you categorised this merchant before' : 'for this merchant'} — tap a category to change it.
          </T>
        )}
        <DateField value={f.date} onChange={(date) => setF({ ...f, date })} error={fields.date} />
        <Input label="Note" placeholder="Optional" value={f.note} onChangeText={(note) => setF({ ...f, note })} maxLength={500} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <T>Recurring (rent, subscription, EMI…)</T>
          <Switch value={f.recurring} onValueChange={(recurring) => setF({ ...f, recurring })} trackColor={{ true: c.accent2, false: c.lineStrong }} thumbColor={c.surface} />
        </View>
        <ErrorNote message={err && !(err instanceof ApiError && err.fieldErrors) ? err.message : null} />
        <Button size="lg" title={initial ? 'Save changes' : 'Add expense'} onPress={submit} loading={save.isPending} disabled={!valid} />
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
