/**
 * When another app shares a screenshot or text to ArthOS, Android opens us with a share link
 * (arthos://dataUrl=arthosShareKey…) that isn't a screen. Send it to the home route; ShareIntentRouter in the root
 * layout then picks up the shared content and opens the Scan screen.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try {
    if (path.includes('dataUrl=')) return '/';
    return path;
  } catch {
    return '/';
  }
}
