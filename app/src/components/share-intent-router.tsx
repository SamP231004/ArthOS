import { router } from 'expo-router';
import { useShareIntentContext } from 'expo-share-intent';
import { useEffect } from 'react';

/**
 * "Share → ArthOS" from any payment app, gallery or SMS app: opens the Scan screen with the shared image (read
 * on-device) or text. Waits until the user is signed in and onboarded, so a share made while signed out isn't lost.
 */
export function ShareIntentRouter({ ready }: { ready: boolean }) {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();

  useEffect(() => {
    if (!ready || !hasShareIntent) return;
    const file = shareIntent.files?.find((f) => f.mimeType?.startsWith('image/'));
    const text = (shareIntent.text ?? shareIntent.webUrl ?? '').trim();
    if (file) {
      const uri = file.path.includes('://') ? file.path : `file://${file.path}`;
      router.push({ pathname: '/scan', params: { sharedUri: uri } });
    } else if (text) {
      router.push({ pathname: '/scan', params: { sharedText: text.slice(0, 20000) } });
    }
    resetShareIntent();
  }, [ready, hasShareIntent, shareIntent, resetShareIntent]);

  return null;
}
