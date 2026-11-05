import type { ApiErrorBody } from "./types";
import { useAuth } from "./auth-store";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080").replace(/\/$/, "");

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

export async function api<T>(path: string, { method = "GET", body, auth = true }: Options = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
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
  if (!res.ok) {
    throw new ApiError(data ?? { status: res.status, message: `Request failed (${res.status})` });
  }
  return data as T;
}
