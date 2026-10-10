import type { GlobalDiscovery, MapReaders, StatsSummary, TopicStat } from "@/types";

const base = process.env.API_INTERNAL_URL ?? "http://localhost:8080";

async function getJson<T>(url: string, label: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    const res = await fetch(url, { cache: "no-store", signal: controller.signal });
    if (!res.ok) throw new Error(`${label} ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export function stats(): Promise<StatsSummary> {
  return getJson<StatsSummary>(`${base}/stats/summary`, "stats");
}

export function globalDiscovery(topic?: string): Promise<GlobalDiscovery> {
  const suffix = topic ? `?topic=${encodeURIComponent(topic)}` : "";
  return getJson<GlobalDiscovery>(`${base}/discover/global${suffix}`, "global");
}

export function topics(): Promise<TopicStat[]> {
  return getJson<TopicStat[]>(`${base}/discover/topics`, "topics");
}

/**
 * Global persona layer for the map hero (SSR'd so avatars + current books
 * paint on first byte). No country/region filter → readers worldwide.
 * API clamps limit ≤ 50; Redis-cached 2 min.
 */
export function globalMapReaders(limit = 50, topic?: string): Promise<MapReaders> {
  const q = new URLSearchParams();
  q.set("limit", String(limit));
  if (topic) q.set("topic", topic);
  return getJson<MapReaders>(
    `${base}/discover/map-readers?${q.toString()}`,
    "map-readers",
  );
}

