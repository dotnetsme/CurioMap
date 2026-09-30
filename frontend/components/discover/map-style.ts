/**
 * Shared constants, projection-free palette and radius math for the Leaflet +
 * OpenStreetMap basemap (ADR 0007, superseding ADR 0006's SVG-only engine).
 *
 * Privacy note: nothing here ever receives exact GPS. Every coordinate that
 * reaches this module was already fuzzed to a ~15 km grid by the API
 * (AGENTS.md §2.2 rule 1, `Services/GeoFuzz.cs`); that is why `MAP_MAX_ZOOM`
 * stops at city-area scale.
 */

import type { MapReader, RegionStat } from "@/types";

export interface MapView {
  lat: number;
  lng: number;
  zoom: number;
}

/** Whole-world starting view (Leaflet `setView` order: lat, lng). */
export const MAP_WORLD_CENTER: [number, number] = [20, 0];
export const MAP_MIN_ZOOM = 2;

/**
 * Zoom ceiling. The deepest licensed view is city-area scale: street-level
 * cartography would imply precision the fuzzed ~15 km grid does not have.
 */
export const MAP_MAX_ZOOM = 12;

/** Zoom used when flying to a selected region, and to the visitor's own area. */
export const MAP_SELECTION_ZOOM = 9;
export const MAP_LOCAL_ZOOM = 5;

/**
 * OpenStreetMap raster tiles. The URL is configuration, not a hard-coded
 * constant, because the OSMF tile usage policy asks consumers to be able to
 * switch providers without shipping a new build.
 */
export const OSM_TILE_URL =
  process.env.NEXT_PUBLIC_MAP_TILE_URL ??
  "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

/**
 * Attribution is mandatory and must stay visible (OSMF tile usage policy §2):
 * never hide it behind a toggle, hover, or off-screen container.
 */
export const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors · <a href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noreferrer">report a map issue</a>';

/**
 * Region bloom radii in **screen pixels** (`L.circleMarker`), not metres.
 *
 * Why pixels: a metre-based circle for the ~15 km fuzz grid is sub-pixel at
 * world zoom and only becomes visible zoomed in, which would hide the whole
 * heat layer on first paint. A screen-space marker at a fuzzed point is also
 * the honest claim — it marks where readers are, it does not assert a ground
 * radius. See ADR 0007.
 */
export function heatRadius(intensity: number): number {
  return 18 + clampNum(intensity, 0, 1) * 22;
}

/** Solid core dot drawn on top of the bloom / ring. */
export function heatCoreRadius(intensity: number): number {
  return 4 + clampNum(intensity, 0, 1) * 9;
}

/** Radius of the pulsing halo around a top region (screen pixels). */
export function heatHaloRadius(intensity: number): number {
  return heatRadius(intensity) * 1.6;
}

function clampNum(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/** Heat gradient: cyan aurora → electric violet → supernova rose flame. */
export function heatColor(intensity: number): string {
  const t = clampNum(intensity, 0, 1);
  if (t < 0.5) return mix("#06b6d4", "#8b5cf6", t / 0.5);
  return mix("#8b5cf6", "#f43f5e", (t - 0.5) / 0.5);
}

function mix(a: string, b: string, k: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const out = pa.map((v, i) => Math.round(v + (pb[i] - v) * k));
  return `#${out.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

export function regionPlace(region: RegionStat): string {
  return [region.region, region.country].filter(Boolean).join(", ");
}

export function readerPlace(reader: MapReader): string {
  return [reader.city, reader.region, reader.country].filter(Boolean).join(", ");
}
