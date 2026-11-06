import { GoogleSignin, isErrorWithCode, statusCodes } from '@react-native-google-signin/google-signin';

import { api, ApiError } from './api';
import type { AuthResponse } from './types';

type Providers = { google?: { clientId: string } | null };

let configuredFor: string | null = null;

/** The web OAuth client ID the backend accepts (null when Google sign-in isn't set up there). */
export async function googleClientId(): Promise<string | null> {
  try {
    const p = await api<Providers>('/api/auth/providers', { auth: false });
    return p.google?.clientId ?? null;
  } catch {
    return null;
  }
}

/**
 * Native Google sign-in: Google's account picker returns an ID token issued to our *web* client ID (that's what
 * `webClientId` asks for), which the backend verifies exactly as it does for the website. Returns null if the user
 * backs out of the picker.
 */
export async function signInWithGoogle(webClientId: string): Promise<AuthResponse | null> {
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
