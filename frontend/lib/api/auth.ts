import { api, setAccessToken } from "./http";
import type { AuthUser } from "@/types";

interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  expiresIn: number;
}

export async function register(email: string, password: string): Promise<AuthResponse> {
  return api("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
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
  try {
    const res = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as AuthResponse;
    setAccessToken(data.accessToken);
    return data;
  } catch {
    return null;
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
