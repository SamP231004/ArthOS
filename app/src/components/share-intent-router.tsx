import { router, useRootNavigationState } from 'expo-router';
import { useIncomingShare } from 'expo-sharing';
import { useEffect, useRef } from 'react';

/**
 * "Share → ArthOS" (via Expo's own expo-sharing): when a screenshot or text is shared to the app — cold start or while
 * it's open — go straight to the Scan screen, which reads it on-device and opens the pre-filled form. expo-sharing
 * copies a shared file into the app's cache first, so the OCR always gets a readable local file. Waits until the user
 * is signed in and the navigator is mounted, so a share made while signed out is handled right after sign-in.
 */
export function ShareIntentRouter({ ready }: { ready: boolean }) {
  const { resolvedSharedPayloads, isResolving, clearSharedPayloads } = useIncomingShare();
  const navReady = !!useRootNavigationState()?.key;
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (!ready || !navReady || isResolving || resolvedSharedPayloads.length === 0) return;
    const image = resolvedSharedPayloads.find((p) => p.contentType === 'image' && p.contentUri);
    const text = resolvedSharedPayloads.find((p) => (p.contentType === 'text' || p.shareType === 'text' || p.shareType === 'url') && p.value);
    const key = image?.contentUri ?? text?.value ?? null;
    if (!key || handled.current === key) return;
    handled.current = key;
    // a moment later, so the share link's own navigation to "/" has settled; not cancelled on re-render
    setTimeout(() => {
      try {
        if (image?.contentUri) router.push({ pathname: '/scan', params: { sharedUri: image.contentUri } });
        else if (text?.value) router.push({ pathname: '/scan', params: { sharedText: text.value.slice(0, 20000) } });
      } catch {
        /* navigation not possible right now: drop the share rather than crash */
      } finally {
        clearSharedPayloads();
      }
    }, 300);
  }, [ready, navReady, isResolving, resolvedSharedPayloads, clearSharedPayloads]);

  return null;
}
