import { api } from "./http";
import type { GlobalDiscovery, MapReaders, Nearby, StatsSummary, TopicStat, TopBook } from "@/types";

export function topics(): Promise<TopicStat[]> {
  return api("/discover/topics", { auth: false });
}

export function globalDiscovery(topic?: string): Promise<GlobalDiscovery> {
  const q = new URLSearchParams();
  if (topic) q.set("topic", topic);
  const suffix = q.toString() ? `?${q.toString()}` : "";
  return api(`/discover/global${suffix}`, { auth: false });
}

export function topBooks(country?: string, region?: string, topic?: string): Promise<{ books: TopBook[] }> {
  const q = new URLSearchParams();
  if (country) q.set("country", country);
  if (region) q.set("region", region);
  if (topic) q.set("topic", topic);
  const suffix = q.toString() ? `?${q.toString()}` : "";
  return api(`/discover/top-books${suffix}`, { auth: false });
}

export function nearby(): Promise<Nearby> {
  return api("/discover/nearby", { auth: true });
}

/** Anonymous drill-down layer: individual readers at fuzzed coordinates. Max 50 (API clamp). */
export function mapReaders(country?: string, region?: string, topic?: string, limit = 50): Promise<MapReaders> {
  const q = new URLSearchParams();
  if (country) q.set("country", country);
  if (region) q.set("region", region);
  if (topic) q.set("topic", topic);
  q.set("limit", String(limit));
  return api(`/discover/map-readers?${q.toString()}`, { auth: false });
}

export function stats(): Promise<StatsSummary> {
  return api("/stats/summary", { auth: false });
}
