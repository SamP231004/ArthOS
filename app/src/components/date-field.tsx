import { View } from 'react-native';

import { Chip, Input } from './ui';
import { S } from '@/constants/theme';
import { todayISO } from '@/lib/format';

function yesterdayISO() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const isISODate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(new Date(v).getTime());

/** Date entry without a native picker dependency: quick chips + YYYY-MM-DD text. */
export function DateField({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string }) {
  const today = todayISO();
  const yesterday = yesterdayISO();
  return (
    <View style={{ gap: S.sm }}>
      <Input
        label="Date"
        value={value}
        onChangeText={onChange}
        placeholder="YYYY-MM-DD"
        keyboardType="numbers-and-punctuation"
        maxLength={10}
        error={error ?? (value && !isISODate(value) ? 'Use YYYY-MM-DD' : undefined)}
      />
      <View style={{ flexDirection: 'row', gap: S.sm }}>
        <Chip label="Today" active={value === today} onPress={() => onChange(today)} />
        <Chip label="Yesterday" active={value === yesterday} onPress={() => onChange(yesterday)} />
      </View>
    </View>
  );
}
