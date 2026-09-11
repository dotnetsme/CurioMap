import type { TopBook } from "./book";
import type { BookStub } from "./book";
import type { LocationDto } from "./location";
import type { UserStub } from "./user";

export interface RegionStat {
  country: string;
  region: string;
  activeReaders: number;
  lat: number | null;
  lng: number | null;
  topBooks: BookStub[];
}

export interface GlobalDiscovery {
  regions: RegionStat[];
  totalRegions: number;
  generatedAt: string;
}

export interface NearbyReader {
  user: UserStub;
  location: LocationDto;
  books: BookStub[];
}

export interface Nearby {
  scope: "city" | "region" | "country";
  readers: NearbyReader[];
}

export interface StatsSummary {
  readers: number;
  books: number;
  conversations: number;
  messages: number;
  activeRegions: number;
  topBooks: TopBook[];
}
