import { router, useRootNavigationState } from 'expo-router';
import { useShareIntentContext } from 'expo-share-intent';
import { useEffect, useRef } from 'react';

/**
 * "Share → ArthOS" from any payment app, gallery or SMS app: opens the Scan screen with the shared image (read
 * on-device) or text, which then opens the pre-filled form. Waits until the user is signed in and the navigator is
 * mounted (navigating earlier throws and crashed the app), so a share made while signed out isn't lost either.
 */
export function ShareIntentRouter({ ready }: { ready: boolean }) {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();
  const navReady = !!useRootNavigationState()?.key;
  const handling = useRef(false);

  useEffect(() => {
    if (!ready || !navReady || !hasShareIntent || handling.current) return;
    handling.current = true;
    const file = shareIntent.files?.find((f) => !f.mimeType || f.mimeType.startsWith('image/'));
    const text = (shareIntent.text ?? shareIntent.webUrl ?? '').trim();
    // a moment later, so the share link's own navigation to "/" has settled; not cancelled on re-render
    setTimeout(() => {
      try {
        if (file?.path) router.push({ pathname: '/scan', params: { sharedUri: file.path } });
        else if (text) router.push({ pathname: '/scan', params: { sharedText: text.slice(0, 20000) } });
      } catch {
        /* navigation not possible right now: drop the share rather than crash */
      } finally {
        resetShareIntent();
        handling.current = false;
      }
    }, 400);
  }, [ready, navReady, hasShareIntent, shareIntent, resetShareIntent]);

  return null;
}
