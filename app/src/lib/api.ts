import { Platform } from 'react-native';

import { useAuth } from './auth-store';
import type { ApiErrorBody } from './types';

// EXPO_PUBLIC_API_URL is set per build profile in eas.json and by .env locally. Without it, dev builds talk to a
// local backend (Android emulators reach the host at 10.0.2.2) and release builds to the deployed one — a release
// build must never point at an emulator-only address.
const PRODUCTION_API = 'https://arthos-9tro.onrender.com';
const fallback = !__DEV__ ? PRODUCTION_API : Platform.OS === 'android' ? 'http://10.0.2.2:8080' : 'http://localhost:8080';
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? fallback).replace(/\/$/, '');

export class ApiError extends Error {
  status: number;
  fieldErrors?: Record<string, string>;
  constructor(body: ApiErrorBody) {
    super(body.message);
    this.status = body.status;
    this.fieldErrors = body.fieldErrors;
  }
}

type Options = { method?: string; body?: unknown; auth?: boolean };

export async function api<T>(path: string, { method = 'GET', body, auth = true }: Options = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = useAuth.getState().token;
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError({ status: 0, message: "Can't reach ArthOS servers. Check your connection." });
  }

  if (res.status === 401 && auth) useAuth.getState().signOut();
  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(data ?? { status: res.status, message: `Request failed (${res.status})` });
  return data as T;
}
