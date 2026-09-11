"use client";

import dynamic from "next/dynamic";
import type { RegionStat } from "@/types";
import type { MapMode } from "./CuriosityMap";
import { GlobalMap } from "./GlobalMap";

const LiveMap = dynamic(() => import("./CuriosityMap").then((m) => m.CuriosityMap), {
  ssr: false,
  loading: () => (
    <div className="map-dark-frame flex h-[420px] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-amber-300/20 border-t-amber-300" />
        <p className="text-xs text-amber-200/60">lighting up the map…</p>
      </div>
    </div>
  ),
});

/** Real Leaflet heat map with dependency-free SVG fallback if tiles/data fail. */
export function CuriosityMapShell(props: {
  regions: RegionStat[];
  mode?: MapMode;
  height?: number;
  interactive?: boolean;
  selected?: RegionStat | null;
  onSelect?: (region: RegionStat | null) => void;
}) {
  if (!props.regions.some((r) => r.lat !== null && r.lng !== null)) {
    return <GlobalMap regions={props.regions} />;
  }
  return <LiveMap {...props} />;
}
