export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
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
  try {
    const data = await res.clone().json();
    if (typeof data === "string") return data;
    if (data?.detail) return String(data.detail);
    if (data?.title) return String(data.title);
    if (data?.errors) {
      const first = Object.values(data.errors as Record<string, string[]>)[0];
      if (Array.isArray(first) && first.length > 0) return String(first[0]);
    }
  } catch {
    // not JSON
  }
  return res.statusText || "Request failed";
}

let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  refreshPromise ??= (async () => {
    try {
      const res = await fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) return false;
      const data = await res.json();
      accessToken = data.accessToken ?? null;
      return accessToken !== null;
    } catch {
      return false;
    }
  })();
  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

export async function api<T>(
  path: string,
  init: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const { auth = true, ...rest } = init;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  Object.assign(headers, rest.headers);

  if (auth && accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  let res = await fetch(`/api${path}`, { ...rest, headers, credentials: "include" });

  // Access token expired → try the httpOnly refresh cookie once, then retry.
  if (res.status === 401 && auth) {
    if (await tryRefresh()) {
      if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
      res = await fetch(`/api${path}`, { ...rest, headers, credentials: "include" });
    }
  }

  if (!res.ok) {
    throw new ApiError(await extractError(res), res.status);
  }

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}
