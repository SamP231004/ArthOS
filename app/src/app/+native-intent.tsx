/**
 * When something is shared to ArthOS, expo-sharing opens the app with `arthos://expo-sharing`, which isn't a screen.
 * Send it to the home route; ShareIntentRouter (root layout) then picks up the shared content and opens Scan.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try {
    if (path.includes('expo-sharing') || path.includes('dataUrl=')) return '/';
    return path;
  } catch {
    return '/';
  }
}
