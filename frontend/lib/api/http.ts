import type { AuthUser } from "@/types";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

async function extractError(res: Response): Promise<string> {
  const fallback = res.statusText || "Request failed";
  try {
    const text = await res.clone().text();
    if (!text) return fallback;
    const data = JSON.parse(text) as unknown;
    if (typeof data === "string") return data;
    if (data && typeof data === "object") {
      const obj = data as Record<string, unknown>;
      if (typeof obj.detail === "string") return obj.detail;
      if (typeof obj.title === "string") return obj.title;
      if (obj.errors && typeof obj.errors === "object") {
        const first = Object.values(obj.errors as Record<string, string[]>)[0];
        if (Array.isArray(first) && first.length > 0) return String(first[0]);
      }
    }
  } catch {
    // not JSON
  }
  return fallback;
}

export interface RefreshResult {
  user: AuthUser;
  accessToken: string;
  expiresIn: number;
}

let refreshPromise: Promise<RefreshResult | null> | null = null;

/**
 * Silent re-authentication via the httpOnly refresh cookie. Single-flight for the whole app:
 * refresh tokens are single-use, so two concurrent calls (StrictMode double-mount, a 401 retry
 * racing the mount refresh) would present the same token and trip reuse detection, which
 * revokes the session.
 */
export function refreshSession(): Promise<RefreshResult | null> {
  refreshPromise ??= (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    try {
      const res = await fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "include",
        signal: controller.signal,
      });
      if (!res.ok) return null;
      const data = (await res.json()) as RefreshResult;
      if (!data?.accessToken || !data?.user) return null;
      accessToken = data.accessToken;
      return data;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  })().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

async function tryRefresh(): Promise<boolean> {
  return (await refreshSession()) !== null;
}

export async function api<T>(
  path: string,
  init: RequestInit & { auth?: boolean; timeoutMs?: number } = {},
): Promise<T> {
  const { auth = true, timeoutMs = 15_000, ...rest } = init;
  const headers: Record<string, string> = {};
  const hasBody = rest.body !== undefined && rest.body !== null;
  if (hasBody) headers["Content-Type"] = "application/json";
  Object.assign(headers, rest.headers);

  if (auth && accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const request = async (signal: AbortSignal) =>
    fetch(`/api${path}`, { ...rest, headers, credentials: "include", signal });

  const withTimeout = async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await request(controller.signal);
    } finally {
      clearTimeout(timer);
    }
  };

  let res = await withTimeout();

  // Access token expired → try the httpOnly refresh cookie once, then retry.
  if (res.status === 401 && auth) {
    if (await tryRefresh()) {
      if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
      res = await withTimeout();
    }
  }

  if (!res.ok) {
    throw new ApiError(await extractError(res), res.status);
  }

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!text) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError("Unexpected response from server.", res.status);
  }
}
