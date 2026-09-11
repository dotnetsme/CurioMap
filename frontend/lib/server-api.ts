// Server-side data helpers (landing page). Calls the API directly, not via the browser proxy.
import type { GlobalDiscovery, StatsSummary } from "@/types";

const base = process.env.API_INTERNAL_URL ?? "http://localhost:8080";

export async function stats(): Promise<StatsSummary> {
  const res = await fetch(`${base}/stats/summary`, { cache: "no-store" });
  if (!res.ok) throw new Error(`stats ${res.status}`);
  return res.json();
}

export async function globalDiscovery(): Promise<GlobalDiscovery> {
  const res = await fetch(`${base}/discover/global`, { cache: "no-store" });
  if (!res.ok) throw new Error(`global ${res.status}`);
  return res.json();
}
