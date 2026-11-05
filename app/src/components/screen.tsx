import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { C, S } from '@/constants/theme';

/** Standard scrollable screen with safe-area padding and optional pull-to-refresh. */
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
  return (
    <SafeAreaView style={styles.root} edges={edges}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={C.brand} colors={[C.brand]} /> : undefined}>
        <View style={{ gap: S.lg }}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  content: { padding: S.lg, paddingBottom: S.xxl * 2 },
});
