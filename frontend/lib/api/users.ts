import { api } from "./http";
import type {
  AuthUser,
  PublicProfile,
  Settings,
  UpdateProfilePayload,
  UpdateLocationPayload,
  UserStub,
  LocationDto,
} from "@/types";

export function getProfile(id: string): Promise<PublicProfile> {
  return api(`/users/${id}`);
}

export function updateMe(payload: UpdateProfilePayload): Promise<AuthUser> {
  return api("/users/me", { method: "PATCH", body: JSON.stringify(payload) });
}

export interface IpGeo {
  country: string | null;
  source: string;
}

export function ipCountry(): Promise<IpGeo> {
  return api("/geo/ip", { auth: false });
}

export function getSettings(): Promise<Settings> {
  return api("/users/me/settings");
}

export function updateSettings(payload: {
  locationVisibility?: string;
  bookshelfVisibility?: string;
}): Promise<Settings> {
  return api("/users/me/settings", { method: "PATCH", body: JSON.stringify(payload) });
}

export function getMyLocation(): Promise<LocationDto | null> {
  return api("/geo/me");
}

export function updateLocation(payload: UpdateLocationPayload): Promise<LocationDto | null> {
  return api("/geo/me", { method: "PATCH", body: JSON.stringify(payload) });
}

export function getFollowers(id: string): Promise<{ items: UserStub[]; total: number }> {
  return api(`/users/${id}/followers`);
}

export function getFollowing(id: string): Promise<{ items: UserStub[]; total: number }> {
  return api(`/users/${id}/following`);
}
