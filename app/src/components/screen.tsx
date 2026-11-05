import { LinearGradient } from 'expo-linear-gradient';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { S, useTheme } from '@/theme';

/** Scrollable screen with the web's soft top glow, safe-area padding and optional pull-to-refresh. */
export function Screen({
  children,
  refreshing,
  onRefresh,
  edges = ['top'],
}: {
  children: React.ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  edges?: ('top' | 'bottom')[];
}) {
  const { c } = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={edges}>
      <LinearGradient colors={[`${c.glow}0.10)`, `${c.glow}0)`]} style={styles.glow} pointerEvents="none" />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={c.brand} colors={[c.brand]} progressBackgroundColor={c.surface} /> : undefined}>
        <View style={{ gap: S.lg }}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  glow: { position: 'absolute', top: 0, left: 0, right: 0, height: 260 },
  content: { padding: S.lg, paddingBottom: S.xxl * 2 },
});
