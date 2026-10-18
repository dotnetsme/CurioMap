"use client";

import dynamic from "next/dynamic";
import type { MapReader, RegionStat, TopBook } from "@/types";
import { cn } from "@/lib/utils";
import type { MapMode } from "./ObservatoryMap";
import type { MapView } from "./map-style";
import { GlobalMap } from "./GlobalMap";

const LiveMap = dynamic(
  () => import("./ObservatoryMap").then((m) => m.ObservatoryMap),
  { ssr: false },
);

/**
 * Map shell: thin client boundary around the Leaflet + OpenStreetMap engine.
 * The engine is browser-only, so it loads through `next/dynamic` with SSR
 * disabled (AGENTS.md §3) and never widens a route's first-load JS.
 */
export function CuriosityMapShell(props: {
  regions: RegionStat[];
  readers?: MapReader[];
  mode?: MapMode;
  height?: number;
  interactive?: boolean;
  selected?: RegionStat | null;
  onSelect?: (region: RegionStat | null) => void;
  topBooks?: TopBook[];
  initialView?: MapView | null;
  overlayStats?: { readers: number; regions: number } | null;
  /** Fly to the current visitor's / logged-in user's area to show local activity. */
  focusOnVisitor?: boolean;
  /** On embedded maps, send region clicks to the full map workflow. */
  navigateOnSelect?: boolean;
}) {
  // No fuzzed coordinates anywhere → nothing to project. Fall back to the
  // dependency-free static constellation so the page never renders empty.
  if (!props.regions.some((r) => r.lat !== null && r.lng !== null)) {
    return (
      <div
        data-theme="dark"
        className={cn(
          "map-dark-frame flex items-center justify-center",
          (props.height ?? 0) <= 0 && "map-fullbleed",
        )}
      >
        <div className="w-full max-w-4xl p-6">
          <GlobalMap regions={props.regions} />
          <p className="mt-3 text-center text-xs text-ink-faint">
            No fuzzed region coordinates yet — the constellation fills in as
            readers set their location.
          </p>
        </div>
      </div>
    );
  }
  // `focusOnVisitor` and `navigateOnSelect` are forwarded to the engine: the
  // Leaflet map can fly to the visitor's fuzzed area and hand region clicks to
  // the full `/discover/global` workflow.
  return <LiveMap {...props} />;
}
