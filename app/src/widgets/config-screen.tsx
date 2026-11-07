import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import type { WidgetConfigurationScreenProps } from 'react-native-android-widget';

import { DEFAULT_PREFS, loadSnapshot, readPrefs, resolveScheme, writePrefs, type WidgetPrefs, type WidgetState, type WidgetTheme } from './data';
import { refreshWidgets } from './task-handler';
import { renderWidgetFor } from './widgets';

/**
 * Widget settings (long-press a widget → Settings, or shown when adding one): theme and a privacy switch that hides
 * amounts on the home screen. Runs in its own Android activity, outside the app's navigation and theme provider,
 * so it uses plain views and its own colours.
 */
const C = { bg: '#06110c', surface: '#0c1a13', line: '#1f3329', fg: '#f2efe8', muted: '#a5b0a9', brand: '#ec7a74', accent: '#a31c1b' };

const THEMES: { v: WidgetTheme; label: string; hint: string }[] = [
  { v: 'app', label: 'Match the app', hint: 'Follows the sun/moon switch in ArthOS' },
  { v: 'dark', label: 'Forest', hint: 'Dark' },
  { v: 'light', label: 'Ivory', hint: 'Light' },
];

const TITLES: Record<string, string> = {
  SafeToSpend: 'Safe to spend today',
  MonthSnapshot: 'Month snapshot',
  Portfolio: 'Portfolio',
  QuickAdd: 'Quick add',
};

export function WidgetConfigScreen({ widgetInfo, renderWidget, setResult }: WidgetConfigurationScreenProps) {
  const [prefs, setPrefs] = useState<WidgetPrefs>(DEFAULT_PREFS);
  const [state, setState] = useState<WidgetState | null>(null);

  useEffect(() => {
    readPrefs(widgetInfo.widgetId).then(setPrefs);
    loadSnapshot().then(setState);
  }, [widgetInfo.widgetId]);

  // live preview on the home screen as options change
  useEffect(() => {
    if (!state) return;
    let live = true;
    resolveScheme(prefs.theme).then((scheme) => {
      if (live) renderWidget(renderWidgetFor(widgetInfo.widgetName, { state, prefs, scheme, width: widgetInfo.width, height: widgetInfo.height }));
    });
    return () => {
      live = false;
    };
  }, [prefs, state, renderWidget, widgetInfo]);

  async function save() {
    await writePrefs(widgetInfo.widgetId, prefs);
    setResult('ok');
    refreshWidgets().catch(() => {});
  }

  const hasAmounts = widgetInfo.widgetName !== 'QuickAdd';
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 48, gap: 18 }}>
        <View style={{ gap: 4 }}>
          <Text style={{ color: C.brand, fontSize: 12, letterSpacing: 1.2, fontWeight: '700' }}>ARTHOS WIDGET</Text>
          <Text style={{ color: C.fg, fontSize: 24, fontWeight: '600' }}>{TITLES[widgetInfo.widgetName] ?? 'Widget'}</Text>
        </View>

        <View style={{ gap: 8 }}>
          <Text style={{ color: C.muted, fontSize: 13 }}>Theme</Text>
          {THEMES.map((t) => {
            const on = prefs.theme === t.v;
            return (
              <Pressable
                key={t.v}
                onPress={() => setPrefs({ ...prefs, theme: t.v })}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: on ? C.brand : C.line, backgroundColor: C.surface }}
              >
                <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: on ? C.brand : C.muted, alignItems: 'center', justifyContent: 'center' }}>
                  {on && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.brand }} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.fg, fontSize: 15, fontWeight: '600' }}>{t.label}</Text>
                  <Text style={{ color: C.muted, fontSize: 12 }}>{t.hint}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {hasAmounts && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: C.line, backgroundColor: C.surface }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: C.fg, fontSize: 15, fontWeight: '600' }}>Hide amounts</Text>
              <Text style={{ color: C.muted, fontSize: 12 }}>Shows ₹ •••• on the home screen; open the app to see numbers.</Text>
            </View>
            <Switch value={prefs.hideAmounts} onValueChange={(v) => setPrefs({ ...prefs, hideAmounts: v })} trackColor={{ true: C.accent, false: C.line }} thumbColor={C.fg} />
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
          <Pressable onPress={() => setResult('cancel')} style={{ flex: 1, padding: 15, borderRadius: 14, borderWidth: 1, borderColor: C.line, alignItems: 'center' }}>
            <Text style={{ color: C.fg, fontSize: 15, fontWeight: '600' }}>Cancel</Text>
          </Pressable>
          <Pressable onPress={save} style={{ flex: 1, padding: 15, borderRadius: 14, backgroundColor: C.accent, alignItems: 'center' }}>
            <Text style={{ color: '#fff7f3', fontSize: 15, fontWeight: '700' }}>Save</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
