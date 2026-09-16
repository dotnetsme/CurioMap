"use client";

import dynamic from "next/dynamic";
import type { RegionStat, TopBook } from "@/types";
import { cn } from "@/lib/utils";
import type { MapMode } from "./CuriosityMap";
import { GlobalMap } from "./GlobalMap";

const LiveMap = dynamic(() => import("./CuriosityMap").then((m) => m.CuriosityMap), { ssr: false });

/** Dependency-free SVG curiosity map (no Leaflet): equirectangular projection of fuzzed regions. */
export function CuriosityMapShell(props: {
  regions: RegionStat[];
  mode?: MapMode;
  height?: number;
  interactive?: boolean;
  selected?: RegionStat | null;
  onSelect?: (region: RegionStat | null) => void;
  topBooks?: TopBook[];
  /** Fly to the current visitor's / logged-in user's area to show local activity. */
  focusOnVisitor?: boolean;
}) {
  // No fuzzed coordinates anywhere → nothing to project. Fall back to the
  // dependency-free static constellation so the page never renders empty.
  if (!props.regions.some((r) => r.lat !== null && r.lng !== null)) {
    return (
      <div
        className={cn("map-dark-frame flex items-center justify-center", (props.height ?? 0) <= 0 && "map-fullbleed")}
      >
        <div className="w-full max-w-4xl p-6">
          <GlobalMap regions={props.regions} />
          <p className="mt-3 text-center text-xs text-amber-200/70">
            No fuzzed region coordinates yet — the constellation fills in as readers set their location.
          </p>
        </div>
      </div>
    );
  }
  return <LiveMap {...props} />;
}
