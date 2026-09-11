// Shared helpers for the real map experience.
import type { RegionStat } from "@/types";

export interface HeatPoint {
  lat: number;
  lng: number;
  intensity: number;
}

export function regionHeatPoints(regions: RegionStat[]): { points: HeatPoint[]; max: number } {
  const usable = regions.filter(
    (r): r is RegionStat & { lat: number; lng: number } => r.lat !== null && r.lng !== null,
  );
  const max = Math.max(1, ...usable.map((r) => r.activeReaders));
  return {
    max,
    points: usable.map((r) => ({ lat: r.lat, lng: r.lng, intensity: r.activeReaders / max })),
  };
}

export const TILES = {
  // Free, keyless, privacy-friendly basemaps. Attribution is rendered by Leaflet.
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  light: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
} as const;
