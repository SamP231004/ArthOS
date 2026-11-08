import { getWidgetInfo, requestWidgetUpdate, type WidgetTaskHandlerProps } from 'react-native-android-widget';

import { cachedSnapshot, deletePrefs, loadSnapshot, readPrefs, resolveScheme, writePrefs, type WidgetState } from './data';
import { errorWidget, renderWidgetFor, WIDGET_NAMES } from './widgets';

/**
 * Runs headlessly whenever Android asks for a widget update: when it's added, every 30 minutes, when resized, when a
 * button inside it is tapped, or when the app requests it. The last good numbers are drawn first (instant), then
 * replaced by fresh ones.
 */
export async function widgetTaskHandler({ widgetInfo, widgetAction, clickAction, renderWidget }: WidgetTaskHandlerProps) {
  if (widgetAction === 'WIDGET_DELETED') {
    await deletePrefs(widgetInfo.widgetId);
    return;
  }
  const size = { width: widgetInfo.width, height: widgetInfo.height };
  try {
    let prefs = await readPrefs(widgetInfo.widgetId);
    // the eye: flip hidden amounts for this widget, redraw from what we have (no network needed)
    if (widgetAction === 'WIDGET_CLICK' && clickAction === 'TOGGLE_HIDE') {
      prefs = { ...prefs, hideAmounts: !prefs.hideAmounts };
      await writePrefs(widgetInfo.widgetId, prefs);
    }
    const scheme = await resolveScheme(prefs.theme);
    const draw = (state: WidgetState) => safeDraw(renderWidget, () => renderWidgetFor(widgetInfo.widgetName, { state, prefs, scheme, ...size }));

    if (widgetInfo.widgetName === 'QuickAdd') {
      draw({ kind: 'error' }); // no data needed
      return;
    }
    const cached = await cachedSnapshot();
    draw(cached ?? { kind: 'loading' });
    if (widgetAction === 'WIDGET_CLICK' && clickAction === 'TOGGLE_HIDE' && cached?.kind === 'ok') return;
    draw(await loadSnapshot());
  } catch (e) {
    safeDraw(renderWidget, () => errorWidget(e, size));
  }
}

/** Draw, and if building the widget throws, draw the error instead (so problems show up on the widget, not as a blank). */
function safeDraw(renderWidget: WidgetTaskHandlerProps['renderWidget'], build: () => ReturnType<typeof renderWidgetFor>) {
  try {
    renderWidget(build());
  } catch (e) {
    try {
      renderWidget(errorWidget(e, { width: 0, height: 0 }));
    } catch {
      // nothing more we can do
    }
  }
}

let inFlight: Promise<void> | null = null;
let again = false;

/**
 * Redraw every ArthOS widget on the home screen with fresh numbers. Called by the app after anything changes (a new
 * expense, a budget edit, sign-in/out, theme switch) and when it comes to the foreground. Cheap when no widgets exist.
 * A request that arrives mid-refresh runs again afterwards, so a theme switch is never lost behind a slow fetch.
 */
export function refreshWidgets(): Promise<void> {
  if (inFlight) {
    again = true;
    return inFlight;
  }
  inFlight = (async () => {
    do {
      again = false;
      const placed = await Promise.all(WIDGET_NAMES.map(async (name) => ({ name, count: (await getWidgetInfo(name).catch(() => [])).length })));
      const present = placed.filter((w) => w.count > 0).map((w) => w.name);
      if (present.length === 0) return;
      const state: WidgetState = present.some((n) => n !== 'QuickAdd') ? await loadSnapshot() : { kind: 'error' };
      for (const name of present) {
        await requestWidgetUpdate({
          widgetName: name,
          renderWidget: async (info) => {
            try {
              const prefs = await readPrefs(info.widgetId);
              return renderWidgetFor(name, { state, prefs, scheme: await resolveScheme(prefs.theme), width: info.width, height: info.height });
            } catch (e) {
              return errorWidget(e, info);
            }
          },
        }).catch(() => {});
      }
    } while (again);
  })().finally(() => {
    inFlight = null;
  });
  return inFlight;
}
