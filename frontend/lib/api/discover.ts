import { api } from "./http";
import type { GlobalDiscovery, Nearby, StatsSummary, TopBook } from "@/types";

export function globalDiscovery(): Promise<GlobalDiscovery> {
  return api("/discover/global", { auth: false });
}

export function topBooks(country?: string, region?: string): Promise<{ books: TopBook[] }> {
  const q = new URLSearchParams();
  if (country) q.set("country", country);
  if (region) q.set("region", region);
  const suffix = q.toString() ? `?${q.toString()}` : "";
  return api(`/discover/top-books${suffix}`, { auth: false });
}

export function nearby(): Promise<Nearby> {
  return api("/discover/nearby");
}

export function stats(): Promise<StatsSummary> {
  return api("/stats/summary", { auth: false });
}
