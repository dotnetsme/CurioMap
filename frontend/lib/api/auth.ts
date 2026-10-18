import { api, refreshSession, setAccessToken } from "./http";
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
export function refresh(): Promise<AuthResponse | null> {
  return refreshSession();
}

/** Permanently deletes the signed-in account. The server re-checks the password (403 if wrong). */
export function deleteAccount(password: string): Promise<{ success: boolean }> {
  return api("/auth/delete-account", {
    method: "POST",
    body: JSON.stringify({ password }),
  });
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
