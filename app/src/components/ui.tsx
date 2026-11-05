import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type ViewStyle,
} from 'react-native';

import { C, R, S } from '@/constants/theme';

export function T({ variant = 'body', style, ...rest }: TextProps & { variant?: 'title' | 'h2' | 'body' | 'muted' | 'small' | 'label' | 'big' }) {
  return <Text style={[styles.text, textVariants[variant], style]} {...rest} />;
}

export function Button({
  title,
  variant = 'primary',
  loading,
  disabled,
  style,
  ...rest
}: PressableProps & { title: string; variant?: 'primary' | 'outline' | 'danger' | 'ghost'; loading?: boolean; style?: StyleProp<ViewStyle> }) {
  const v = buttonVariants[variant];
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      style={({ pressed }) => [styles.button, v.box, (disabled || loading) && { opacity: 0.5 }, pressed && { opacity: 0.8 }, style]}
      {...rest}>
      {loading ? <ActivityIndicator color={v.text.color} /> : <Text style={[styles.buttonText, v.text]}>{title}</Text>}
    </Pressable>
  );
}

export function Input({ label, error, hint, style, ...rest }: TextInputProps & { label: string; error?: string; hint?: string }) {
  return (
    <View style={{ gap: 6 }}>
      <T variant="label">{label}</T>
      <TextInput
        placeholderTextColor={C.muted + '99'}
        style={[styles.input, error ? { borderColor: C.expense } : null, style]}
        {...rest}
      />
      {error ? <T variant="small" style={{ color: C.expense }}>{error}</T> : hint ? <T variant="small">{hint}</T> : null}
    </View>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && { borderColor: C.brand, backgroundColor: C.brand + '26' }]}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}>
      <Text style={[styles.chipText, active && { color: C.brand }]}>{label}</Text>
    </Pressable>
  );
}

export function Card({ style, children }: { style?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function ErrorNote({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <View style={styles.error}>
      <Text style={{ color: C.expense, fontSize: 14 }}>{message}</Text>
    </View>
  );
}

export function Loading() {
  return <ActivityIndicator color={C.brand} style={{ marginVertical: S.xxl }} />;
}

const styles = StyleSheet.create({
  text: { color: C.fg },
  button: { minHeight: 48, borderRadius: R.md, paddingHorizontal: S.lg, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 15, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bg,
    color: C.fg,
    borderRadius: R.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  chip: { borderWidth: 1, borderColor: C.border, borderRadius: R.pill, paddingHorizontal: 12, paddingVertical: 7 },
  chipText: { color: C.muted, fontSize: 13 },
  card: { backgroundColor: C.surface, borderColor: C.border, borderWidth: 1, borderRadius: R.lg, padding: S.lg },
  error: { borderWidth: 1, borderColor: C.expense + '55', backgroundColor: C.expense + '1a', borderRadius: R.md, padding: S.md },
});

const textVariants = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },
  h2: { fontSize: 17, fontWeight: '600' },
  body: { fontSize: 15 },
  muted: { fontSize: 14, color: C.muted },
  small: { fontSize: 12, color: C.muted },
  label: { fontSize: 11, fontWeight: '600', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.6 },
  big: { fontSize: 38, fontWeight: '700', letterSpacing: -1, fontVariant: ['tabular-nums'] },
});

const buttonVariants = {
  primary: { box: { backgroundColor: C.brand }, text: { color: C.brandFg } },
  outline: { box: { borderWidth: 1, borderColor: C.border }, text: { color: C.fg } },
  danger: { box: {}, text: { color: C.expense } },
  ghost: { box: {}, text: { color: C.muted } },
} as const;
