import Constants, { ExecutionEnvironment } from 'expo-constants';

import { api, ApiError } from './api';
import type { AuthResponse } from './types';

type Providers = { google?: { clientId: string } | null };

/**
 * Expo Go only ships the native modules bundled with it, and Google sign-in isn't one of them — importing it there
 * crashes the screen. So the library is loaded lazily, and only in real (EAS/dev-client) builds.
 */
export const googleAvailable = Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

type GoogleModule = typeof import('@react-native-google-signin/google-signin');
let mod: GoogleModule | null = null;
function lib(): GoogleModule {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  if (!mod) mod = require('@react-native-google-signin/google-signin') as GoogleModule;
  return mod;
}

let configuredFor: string | null = null;

/**
 * The web OAuth client ID is public (it's in every sign-in request), so builds also carry it as a fallback: if the
 * backend is still waking up when the login screen opens, the Google button shows anyway instead of disappearing.
 */
export const GOOGLE_FALLBACK_ID: string | null = googleAvailable ? (process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? null) : null;

/** The web OAuth client ID the backend accepts (null when Google sign-in isn't available here or on the backend). */
export async function googleClientId(): Promise<string | null> {
  if (!googleAvailable) return null;
  try {
    const p = await api<Providers>('/api/auth/providers', { auth: false });
    return p.google?.clientId ?? null;
  } catch {
    return GOOGLE_FALLBACK_ID; // server unreachable or waking up: trust the build's ID
  }
}

/**
 * Native Google sign-in: Google's account picker returns an ID token issued to our *web* client ID (that's what
 * `webClientId` asks for), which the backend verifies exactly as it does for the website. Returns null if the user
 * backs out of the picker.
 */
export async function signInWithGoogle(webClientId: string): Promise<AuthResponse | null> {
  const { GoogleSignin, isErrorWithCode, statusCodes } = lib();
  if (configuredFor !== webClientId) {
    GoogleSignin.configure({ webClientId });
    configuredFor = webClientId;
  }
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    // always show the account picker rather than silently reusing the last account
    await GoogleSignin.signOut().catch(() => {});
    const res = await GoogleSignin.signIn();
    if (res.type !== 'success') return null;
    const idToken = res.data.idToken;
    if (!idToken) throw new Error("Google didn't return a sign-in token");
    return await api<AuthResponse>('/api/auth/google', { method: 'POST', body: { credential: idToken }, auth: false });
  } catch (e) {
    if (e instanceof ApiError) throw e;
    if (isErrorWithCode(e)) {
      if (e.code === statusCodes.SIGN_IN_CANCELLED) return null;
      if (e.code === statusCodes.IN_PROGRESS) return null;
      if (e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) throw new Error('Google Play services are needed for Google sign-in.');
      // DEVELOPER_ERROR: this build's signing key isn't registered as an Android OAuth client yet
      if (String(e.code) === '10' || String(e.code) === 'DEVELOPER_ERROR') throw new Error("Google sign-in isn't set up for this app build yet.");
    }
    throw new Error("Couldn't sign in with Google. Please try again.");
  }
}
