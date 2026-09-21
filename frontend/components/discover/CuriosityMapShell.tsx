"use client";

import dynamic from "next/dynamic";
import type { MapReader, RegionStat, TopBook } from "@/types";
import { cn } from "@/lib/utils";
import type { MapMode } from "./ObservatoryMap";
import type { ViewBox } from "./observatory-viewport";
import { GlobalMap } from "./GlobalMap";

const LiveMap = dynamic(
  () => import("./ObservatoryMap").then((m) => m.ObservatoryMap),
  { ssr: false },
);

/**
 * Observatory shell: dependency-free SVG curiosity map (no Leaflet).
 * Equirectangular projection of fuzzed regions + global persona avatars.
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
  initialView?: ViewBox | null;
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
  const { focusOnVisitor: _focusOnVisitor, navigateOnSelect: _navigateOnSelect, ...mapProps } = props;
  void _focusOnVisitor;
  void _navigateOnSelect;
  return <LiveMap {...mapProps} />;
}
