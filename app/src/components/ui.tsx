import { LinearGradient } from 'expo-linear-gradient';
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
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { alpha, F, R, S, useStyles, useTheme, type Palette } from '@/theme';

/** Typography that mirrors the website: Newsreader for display, Manrope for UI, IBM Plex Mono for eyebrows. */
type Variant = 'display' | 'title' | 'h2' | 'body' | 'medium' | 'muted' | 'small' | 'label' | 'eyebrow' | 'big' | 'num';
export function T({ variant = 'body', style, ...rest }: TextProps & { variant?: Variant }) {
  const s = useStyles(makeText);
  return <Text style={[s.base, s[variant], style]} {...rest} />;
}

export function Button({
  title,
  icon,
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  style,
  ...rest
}: PressableProps & {
  title: string;
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'md' | 'lg';
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  const s = useStyles(makeButton);
  const textColor = variant === 'primary' ? c.accentFg : variant === 'danger' ? c.expense : variant === 'ghost' ? c.muted : c.fg;
  const inner = (
    <View style={[s.inner, size === 'lg' && s.lg]}>
      {loading ? <ActivityIndicator color={textColor} /> : icon}
      {!loading || icon ? <Text style={[s.text, { color: textColor }]}>{title}</Text> : null}
    </View>
  );
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      style={({ pressed }) => [s.base, variant === 'secondary' && s.secondary, (disabled || loading) && { opacity: 0.5 }, pressed && { opacity: 0.85, transform: [{ scale: 0.985 }] }, style]}
      {...rest}>
      {variant === 'primary' ? (
        <LinearGradient colors={[c.accent1, c.accent2, c.accent3]} locations={[0, 0.55, 1]} style={s.gradient}>
          <View style={s.highlight} />
          {inner}
        </LinearGradient>
      ) : (
        inner
      )}
    </Pressable>
  );
}

export function Input({ label, error, hint, style, accessory, ...rest }: TextInputProps & { label: string; error?: string; hint?: string; accessory?: React.ReactNode }) {
  const { c } = useTheme();
  const s = useStyles(makeField);
  return (
    <View style={{ gap: 6 }}>
      <T variant="label">{label}</T>
      <View style={{ justifyContent: 'center' }}>
        <TextInput placeholderTextColor={c.subtle} style={[s.input, error ? { borderColor: c.expense } : null, accessory ? { paddingRight: 64 } : null, style]} {...rest} />
        {accessory ? <View style={{ position: 'absolute', right: 6 }}>{accessory}</View> : null}
      </View>
      {error ? <T variant="small" style={{ color: c.expense }}>{error}</T> : hint ? <T variant="small">{hint}</T> : null}
    </View>
  );
}

export function Chip({ label, active, onPress, tone }: { label: string; active?: boolean; onPress: () => void; tone?: string }) {
  const { c } = useTheme();
  const s = useStyles(makeField);
  const col = tone ?? c.brand;
  return (
    <Pressable
      onPress={onPress}
      style={[s.chip, active && { borderColor: col, backgroundColor: alpha(col, 0.12) }]}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}>
      <Text style={[s.chipText, active && { color: col }]}>{label}</Text>
    </Pressable>
  );
}

/** Segmented control, like the web range/view pickers. */
export function Segmented<V extends string>({ options, value, onChange }: { options: { value: V; label: string }[]; value: V; onChange: (v: V) => void }) {
  const s = useStyles(makeField);
  return (
    <View style={s.seg}>
      {options.map((o) => (
        <Pressable key={o.value} onPress={() => onChange(o.value)} style={[s.segItem, o.value === value && s.segActive]}>
          <Text style={[s.segText, o.value === value && s.segTextActive]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/** The web's `.panel`: hairline border, subtle top highlight. `glow` = the `.panel-glow` hero variant. */
export function Card({ style, children, glow }: { style?: StyleProp<ViewStyle>; children: React.ReactNode; glow?: boolean }) {
  const { c } = useTheme();
  const s = useStyles(makeCard);
  if (glow) {
    return (
      <View style={[s.card, s.glowBorder, style]}>
        <LinearGradient colors={[`${c.glow}0.16)`, `${c.glow}0)`]} style={StyleSheet.absoluteFill} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 0.7 }} />
        {children}
      </View>
    );
  }
  return <View style={[s.card, style]}>{children}</View>;
}

export function Badge({ label, color }: { label: string; color?: string }) {
  const { c } = useTheme();
  const col = color ?? c.muted;
  return (
    <Text style={{ color: col, borderColor: alpha(col, 0.35), backgroundColor: alpha(col, 0.1), borderWidth: 1, borderRadius: R.pill, paddingHorizontal: 8, paddingVertical: 2, fontSize: 11, fontFamily: F.uiMedium, overflow: 'hidden' }}>
      {label}
    </Text>
  );
}

export function ErrorNote({ message }: { message?: string | null }) {
  const { c } = useTheme();
  if (!message) return null;
  return (
    <View style={{ borderWidth: 1, borderColor: alpha(c.expense, 0.3), backgroundColor: alpha(c.expense, 0.08), borderRadius: R.md, padding: S.md }}>
      <Text style={{ color: c.expense, fontSize: 14, fontFamily: F.ui }}>{message}</Text>
    </View>
  );
}

export function Loading() {
  const { c } = useTheme();
  return <ActivityIndicator color={c.brand} style={{ marginVertical: S.xxl }} />;
}

// ------------------------------------------------------------------ styles

const makeText = (c: Palette) =>
  StyleSheet.create<Record<'base' | Variant, TextStyle>>({
    base: { color: c.fg, fontFamily: F.ui },
    display: { fontFamily: F.display, fontSize: 40, letterSpacing: -0.8, lineHeight: 44 },
    title: { fontFamily: F.display, fontSize: 32, letterSpacing: -0.6, lineHeight: 38 },
    h2: { fontFamily: F.uiSemibold, fontSize: 16 },
    body: { fontSize: 15 },
    medium: { fontFamily: F.uiMedium, fontSize: 15 },
    muted: { fontSize: 14, color: c.muted },
    small: { fontSize: 12, color: c.subtle },
    label: { fontFamily: F.uiMedium, fontSize: 11, color: c.subtle, textTransform: 'uppercase', letterSpacing: 1.2 },
    eyebrow: { fontFamily: F.mono, fontSize: 11, color: c.brand, textTransform: 'uppercase', letterSpacing: 2 },
    big: { fontFamily: F.uiSemibold, fontSize: 40, letterSpacing: -1.2, fontVariant: ['tabular-nums'] },
    num: { fontFamily: F.uiSemibold, fontSize: 18, letterSpacing: -0.3, fontVariant: ['tabular-nums'] },
  });

const makeButton = (c: Palette) =>
  StyleSheet.create({
    base: { borderRadius: R.md, overflow: 'hidden' },
    gradient: { borderRadius: R.md },
    highlight: { position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.28)' },
    secondary: { borderWidth: 1, borderColor: c.lineStrong, backgroundColor: c.surface },
    inner: { minHeight: 46, paddingHorizontal: S.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: S.sm },
    lg: { minHeight: 52 },
    text: { fontFamily: F.uiSemibold, fontSize: 15 },
  });

const makeField = (c: Palette) =>
  StyleSheet.create({
    input: { borderWidth: 1, borderColor: c.lineStrong, backgroundColor: c.field, color: c.fg, borderRadius: R.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, fontFamily: F.ui },
    chip: { borderWidth: 1, borderColor: c.lineStrong, borderRadius: R.pill, paddingHorizontal: 12, paddingVertical: 7 },
    chipText: { color: c.muted, fontSize: 13, fontFamily: F.uiMedium },
    seg: { flexDirection: 'row', backgroundColor: alpha(c.fg, 0.05), borderRadius: R.sm + 2, padding: 3, alignSelf: 'flex-start' },
    segItem: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: R.sm },
    segActive: { backgroundColor: c.surface },
    segText: { color: c.muted, fontSize: 12, fontFamily: F.uiMedium },
    segTextActive: { color: c.fg },
  });

const makeCard = (c: Palette) =>
  StyleSheet.create({
    card: { backgroundColor: c.surface, borderColor: c.line, borderWidth: 1, borderRadius: R.xl, padding: S.lg, overflow: 'hidden' },
    glowBorder: { borderColor: `${c.glow}0.35)`, borderRadius: R.xxl, padding: S.xl },
  });
