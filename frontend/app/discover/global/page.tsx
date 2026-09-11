"use client";

import { useEffect, useState } from "react";
import { GlobalMap } from "@/components/discover/GlobalMap";
import { TopReadersStrip } from "@/components/discover/GlobalMap";
import { ErrorState, PageLoading } from "@/components/ui/Feedback";
import { globalDiscovery } from "@/lib/api/discover";
import type { GlobalDiscovery } from "@/types";

export default function GlobalMapPage() {
  const [data, setData] = useState<GlobalDiscovery | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setData(await globalDiscovery());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load the map");
      }
    })();
  }, []);

  if (error) return <ErrorState message={error} />;
  if (!data) return <PageLoading />;

  return (
    <div className="flex flex-col gap-6 py-4">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">The curiosity map</h1>
          <p className="mt-1 text-sm text-slate-400">
            A live heatmap of active readers — aggregated to regions, fuzzed, never pinpointed.
          </p>
        </div>
        <span className="hidden text-xs text-slate-500 md:inline">
          refreshed every 5 min ·{" "}
          <a href="/policy/privacy" className="underline hover:text-slate-300">
            privacy
          </a>
        </span>
      </div>
      <GlobalMap regions={data.regions} />
      <h2 className="text-lg font-semibold text-white">Most active regions</h2>
      <TopReadersStrip regions={data.regions} />
    </div>
  );
}