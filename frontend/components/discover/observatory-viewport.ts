/**
 * Projection + viewport helpers for the dependency-free Observatory SVG map
 * (ADR 0006). No mapping library is used here: the equirectangular projection
 * below places fuzzed lat/lng into world coordinates on a 2:1 (1000×500) plane
 * and all pan/zoom math is plain viewBox state.
 */

export const OBS_MAP_W = 1000;
export const OBS_MAP_H = 500;

/** Equirectangular projection — fuzzed coordinates only, never exact GPS. */
export function project(lat: number, lng: number): { x: number; y: number } {
  return { x: ((lng + 180) / 360) * OBS_MAP_W, y: ((90 - lat) / 180) * OBS_MAP_H };
}

export function unproject(x: number, y: number): { lat: number; lng: number } {
  return { lat: 90 - (y / OBS_MAP_H) * 180, lng: (x / OBS_MAP_W) * 360 - 180 };
}

const clampNum = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Leaflet-style bounds tuple: [[south, west], [north, east]]. */
export type LatLngBoundsTuple = [[number, number], [number, number]];

/** Bounding box around a fuzzed point, used for "fly to region" targets. */
export function boundsAround(lat: number, lng: number, spanDeg: number): LatLngBoundsTuple {
  const halfLat = spanDeg / 2;
  return [
    [clampNum(lat - halfLat, -85, 85), lng - spanDeg],
    [clampNum(lat + halfLat, -85, 85), lng + spanDeg],
  ];
}

/** Bloom radius (CSS px) for a region glow, scaled by relative activity. */
export function heatRadius(intensity: number): number {
  return 46 + clampNum(intensity, 0, 1) * 74;
}

export function heatColor(intensity: number): string {
  const t = clampNum(intensity, 0, 1);
  if (t < 0.5) return mix("#22d3ee", "#7c3aed", t / 0.5);
  return mix("#7c3aed", "#ec4899", (t - 0.5) / 0.5);
}

function mix(a: string, b: string, k: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const out = pa.map((v, i) => Math.round(v + (pb[i] - v) * k));
  return `#${out.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * SVG viewBox expressed in world coordinates (0..OBS_MAP_W × 0..OBS_MAP_H).
 * Used to serialize the on-screen region so links/bookmarks are restorable.
 */
export interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Whole-world starting view: lon ∈ [-180, 180], lat ∈ [-90, 85]. */
export const WORLD_VIEWBOX: ViewBox = {
  x: 0,
  y: -37.5,
  w: OBS_MAP_W,
  h: OBS_MAP_H,
};

/** World-coordinate width at the zoom ceiling (~region-to-metro scale, honest to the 15 km fuzz grid). */
export const MIN_ZOOM_W = 96;
export const MIN_ZOOM_H = MIN_ZOOM_W * (OBS_MAP_H / OBS_MAP_W);

/** Clamp a world view so it never escapes the equirectangular domain.  */
export function clampViewbox(vb: ViewBox): ViewBox {
  const maxLat = 85; // OBS_MAP_H maps 180° lat (y=0 at +90, y=500 at -90); cap near the poles.
  const minX = 0;
  const maxX = OBS_MAP_W;
  const minY = ((90 - maxLat) / 180) * OBS_MAP_H; // top latitude line
  const maxY = OBS_MAP_H;
  const w = Math.max(MIN_ZOOM_W, Math.min(vb.w, OBS_MAP_W));
  const h = Math.max(MIN_ZOOM_H, Math.min(vb.h, OBS_MAP_H));
  const x = Math.max(minX, Math.min(vb.x, maxX - w));
  const y = Math.max(minY, Math.min(vb.y, maxY - h));
  return { x, y, w, h };
}

/** Fly-to target centered on a fuzzed point, with a world-coordinate span. */
export function viewboxAround(lat: number, lng: number, spanWorld: number): ViewBox {
  const { x, y } = project(lat, lng);
  const w = Math.max(MIN_ZOOM_W, Math.min(OBS_MAP_W, spanWorld));
  const h = w * (OBS_MAP_H / OBS_MAP_W);
  return clampViewbox({ x: x - w / 2, y: y - h / 2, w, h });
}

