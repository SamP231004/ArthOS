import { View } from 'react-native';

import { Chip, Input, Segmented, T } from '@/components/ui';
import { money } from '@/lib/format';
import { setAside, type SavingsMode } from '@/lib/savings';
import { S, useTheme } from '@/theme';

const PRESETS = [10, 20, 30, 50];

/** Pay-yourself-first control: a share of every income, or a fixed amount a month, saved the moment income lands. */
export function SavingsRuleField({
  mode,
  value,
  onChange,
  currency,
  exampleIncome = 50_000,
}: {
  mode: SavingsMode;
  value: string;
  onChange: (mode: SavingsMode, value: string) => void;
  currency: string;
  exampleIncome?: number;
}) {
  const { c } = useTheme();
  const n = Number(value) || 0;
  const invalid = mode === 'PERCENT' && n > 100;
  const saved = setAside({ mode, value: n }, exampleIncome);

  return (
    <View style={{ gap: S.sm }}>
      <Segmented<SavingsMode>
        value={mode}
        onChange={(m) => onChange(m, m === mode ? value : m === 'PERCENT' ? '20' : '10000')}
        options={[
          { value: 'PERCENT', label: '% of income' },
          { value: 'FIXED', label: 'Fixed a month' },
        ]}
      />
      <Input
        label={mode === 'PERCENT' ? 'Percent to save first' : `Amount to save each month (${currency})`}
        keyboardType="decimal-pad"
        value={value}
        onChangeText={(t) => onChange(mode, t.replace(/[^0-9.]/g, ''))}
      />
      {mode === 'PERCENT' && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm }}>
          {PRESETS.map((p) => (
            <Chip key={p} label={`${p}%`} active={n === p} onPress={() => onChange('PERCENT', String(p))} />
          ))}
        </View>
      )}
      <T variant="small" style={invalid ? { color: c.expense } : null}>
        {invalid
          ? "A percentage can't be more than 100."
          : `When ${money(exampleIncome, currency)} lands, ${money(saved, currency)} is saved straight away — you spend from the remaining ${money(exampleIncome - saved, currency)}.`}
      </T>
    </View>
  );
}
