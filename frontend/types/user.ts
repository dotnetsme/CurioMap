export type DisplayMode = "anonymous" | "pseudonymous" | "real_name";
export type LocationVisibilitySetting = "hidden" | "country" | "region_city";
export type ShelfVisibilitySetting = "public" | "private";

import type { LocationDto } from "./location";

export interface UserStub {
  id: string;
  handle: string;
  avatarId: string;
  displayName: string;
  isAuthor: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  handle: string;
  avatarId: string;
  displayNameMode: DisplayMode;
  displayName: string;
  realName: string | null;
  bio: string | null;
  isAdmin: boolean;
  isAuthor: boolean;
  location: LocationDto | null;
  createdAt: string;
}

export interface PublicProfile {
  id: string;
  handle: string;
  avatarId: string;
  displayNameMode: DisplayMode;
  displayName: string;
  realName: string | null;
  bio: string | null;
  isAuthor: boolean;
  location: LocationDto | null;
  bookshelfSummary: BookshelfSummary;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean | null;
}

export interface BookshelfSummary {
  reading: number;
  finished: number;
  wishlist: number;
  total: number;
}

export interface Settings {
  locationVisibility: LocationVisibilitySetting;
  bookshelfVisibility: ShelfVisibilitySetting;
  location: LocationDto | null;
}

export interface UpdateProfilePayload {
  handle?: string;
  avatarId?: string;
  displayNameMode?: DisplayMode;
  realName?: string | null;
  bio?: string | null;
}
