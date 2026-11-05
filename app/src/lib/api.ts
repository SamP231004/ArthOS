import { Platform } from 'react-native';

import { useAuth } from './auth-store';
import type { ApiErrorBody } from './types';

// Android emulators reach the host machine at 10.0.2.2. On a physical device set EXPO_PUBLIC_API_URL
// to your computer's LAN IP (e.g. http://192.168.1.20:8080) or the deployed backend URL.
const fallback = Platform.OS === 'android' ? 'http://10.0.2.2:8080' : 'http://localhost:8080';
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
