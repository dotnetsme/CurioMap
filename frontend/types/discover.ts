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

/** An individual reader on the global map, at their fuzzed ~15 km grid coordinate. */
export interface MapReader {
  user: UserStub;
  country: string | null;
  region: string | null;
  city: string | null;
  lat: number;
  lng: number;
  books: BookStub[];
}

export interface MapReaders {
  country: string | null;
  region: string | null;
  total: number;
  readers: MapReader[];
}

export interface StatsSummary {
  readers: number;
  books: number;
  conversations: number;
  messages: number;
  activeRegions: number;
  topBooks: TopBook[];
}
