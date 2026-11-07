import { getWidgetInfo, requestWidgetUpdate, type WidgetTaskHandlerProps } from 'react-native-android-widget';

import { cachedSnapshot, deletePrefs, loadSnapshot, readPrefs, resolveScheme, type WidgetState } from './data';
import { renderWidgetFor, WIDGET_NAMES } from './widgets';

/**
 * Runs headlessly whenever Android asks for a widget update: when it's added, every 30 minutes, when resized, or when
 * the app requests it. The last good numbers are drawn first (instant), then replaced by fresh ones.
 */
export async function widgetTaskHandler({ widgetInfo, widgetAction, renderWidget }: WidgetTaskHandlerProps) {
  if (widgetAction === 'WIDGET_DELETED') {
    await deletePrefs(widgetInfo.widgetId);
    return;
  }
  const prefs = await readPrefs(widgetInfo.widgetId);
  const scheme = await resolveScheme(prefs.theme);
  const draw = (state: WidgetState) =>
    renderWidget(renderWidgetFor(widgetInfo.widgetName, { state, prefs, scheme, width: widgetInfo.width, height: widgetInfo.height }));

  if (widgetInfo.widgetName === 'QuickAdd') {
    draw({ kind: 'error' }); // no data needed
    return;
  }
  const cached = await cachedSnapshot();
  if (cached) draw(cached);
  draw(await loadSnapshot());
}

let inFlight: Promise<void> | null = null;

/**
 * Redraw every ArthOS widget on the home screen with fresh numbers. Called by the app after anything changes (a new
 * expense, a budget edit, sign-in/out, theme switch) and when it comes to the foreground. Cheap when no widgets exist.
 */
export function refreshWidgets(): Promise<void> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const placed = await Promise.all(WIDGET_NAMES.map(async (name) => ({ name, count: (await getWidgetInfo(name).catch(() => [])).length })));
    const present = placed.filter((w) => w.count > 0).map((w) => w.name);
    if (present.length === 0) return;
    const state: WidgetState = present.some((n) => n !== 'QuickAdd') ? await loadSnapshot() : { kind: 'error' };
    for (const name of present) {
      await requestWidgetUpdate({
        widgetName: name,
        renderWidget: async (info) => {
          const prefs = await readPrefs(info.widgetId);
          return renderWidgetFor(name, { state, prefs, scheme: await resolveScheme(prefs.theme), width: info.width, height: info.height });
        },
      }).catch(() => {});
    }
  })().finally(() => {
    inFlight = null;
  });
  return inFlight;
}
