import { api, setAccessToken } from "./http";
import type { AuthUser } from "@/types";

interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  expiresIn: number;
}

interface TermsStatus {
  currentVersion: string;
  acceptedVersion: string | null;
  acceptedAt: string | null;
  isCurrent: boolean;
}

export async function register(email: string, password: string, acceptTerms: boolean): Promise<AuthResponse> {
  return api("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, acceptTerms }),
    auth: false,
  });
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  return api("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
    auth: false,
  });
}

/** Silent re-authentication via the httpOnly refresh cookie. */
export async function refresh(): Promise<AuthResponse | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as AuthResponse;
    if (!data?.accessToken || !data?.user) return null;
    setAccessToken(data.accessToken);
    return data;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function logout(): Promise<void> {
  try {
    await api("/auth/logout", { method: "POST", auth: false });
  } finally {
    setAccessToken(null);
  }
}

export async function me(): Promise<{ user: AuthUser }> {
  return api("/auth/me");
}

/** Terms-of-Use consent status for the signed-in reader. */
export function termsStatus(): Promise<TermsStatus> {
  return api("/auth/me/terms");
}

/** Records acceptance of the current Terms of Use. */
export function acceptTerms(): Promise<TermsStatus> {
  return api("/auth/me/terms/accept", {
    method: "POST",
    body: JSON.stringify({ accept: true }),
  });
}
