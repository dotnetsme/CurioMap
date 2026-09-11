"use client";

import { useEffect, useRef } from "react";
import type { RegionStat } from "@/types";
import { TILES, regionHeatPoints } from "./map-utils";

import "leaflet/dist/leaflet.css";
import "leaflet.heat";

export type MapMode = "heat" | "bubbles" | "dark";

export function CuriosityMap({
  regions,
  mode = "heat",
  height = 460,
  interactive = true,
  selected,
  onSelect,
}: {
  regions: RegionStat[];
  mode?: MapMode;
  height?: number;
  interactive?: boolean;
  selected?: RegionStat | null;
  onSelect?: (region: RegionStat | null) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<L.LayerGroup | null>(null);
  const selectRef = useRef(onSelect);

  useEffect(() => {
    selectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !hostRef.current || mapRef.current) return;

      const map = L.map(hostRef.current, {
        center: [28, 8],
        zoom: 2,
        minZoom: 2,
        maxZoom: 10,
        worldCopyJump: true,
        zoomControl: interactive,
        scrollWheelZoom: false,
        attributionControl: true,
      });
      map.attributionControl.setPrefix(false);
      if (interactive) {
        map.on("focus", () => map.scrollWheelZoom.enable());
        map.on("blur", () => map.scrollWheelZoom.disable());
      }
      L.tileLayer(TILES.dark, { attribution: TILES.attribution, maxZoom: 19 }).addTo(map);
      layersRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
    })();
    return () => {
      cancelled = true;
    };
  }, [interactive]);

  // Render data layers whenever input changes.
  useEffect(() => {
    (async () => {
      const L = (await import("leaflet")).default;
      const map = mapRef.current;
      const group = layersRef.current;
      if (!map || !group) return;
      group.clearLayers();

      const { points, max } = regionHeatPoints(regions);
      if (points.length === 0) return;

      const isHeat = mode !== "bubbles";
      if (isHeat) {
        const heat = L.heatLayer(
          points.map((p) => [p.lat, p.lng, 0.25 + p.intensity * 0.9] as [number, number, number]),
          {
            radius: 34,
            blur: 28,
            maxZoom: 8,
            max: 1,
            minOpacity: 0.35,
            gradient: { 0.15: "#92400e", 0.4: "#d97706", 0.65: "#f59e0b", 0.85: "#fde68a", 1: "#fffbeb" },
          },
        );
        group.addLayer(heat);
      }

      points.forEach((p, i) => {
        const region = regions.filter((r) => r.lat !== null && r.lng !== null)[i];
        const isSelected =
          !!selected && selected.country === region?.country && selected.region === region?.region;
        const marker = L.circleMarker([p.lat, p.lng], {
          radius: isHeat ? 4 + p.intensity * 8 : 7 + p.intensity * 20,
          color: isSelected ? "#fffbeb" : "#fbbf24",
          weight: isSelected ? 2.5 : 1.2,
          opacity: 0.95,
          fillColor: "#f59e0b",
          fillOpacity: isHeat ? 0.55 + p.intensity * 0.4 : 0.28 + p.intensity * 0.5,
        });
        const label = `${region?.country ?? "Unknown"}${region?.region ? ` / ${region.region}` : ""}`;
        marker.bindTooltip(
          `<strong>${label}</strong><br/>${region?.activeReaders ?? 0} readers · fuzzed ~15 km`,
          { direction: "top", offset: [0, -6], opacity: 0.95 },
        );
        marker.on("click", () => selectRef.current?.(region ?? null));
        group.addLayer(marker);
      });

      // Keep the strongest glow in view when data first arrives.
      if (map.getZoom() === 2 && points.length > 0) {
        const top = [...points].sort((a, b) => b.intensity - a.intensity).slice(0, 12);
        map.fitBounds(
          L.latLngBounds(top.map((p) => [p.lat, p.lng] as [number, number])).pad(0.6),
          { animate: false },
        );
        if ((map.getZoom() ?? 2) < 2) map.setZoom(2);
      }
      void max;
    })();
  }, [regions, mode, selected]);

  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      layersRef.current = null;
    };
  }, []);

  return (
    <div className="map-dark-frame relative">
      <div ref={hostRef} style={{ height }} className="z-0 w-full" role="img" aria-label="Global curiosity heatmap" />
      <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-full border border-amber-300/20 bg-night/80 py-1 pl-2 pr-3 text-[11px] text-amber-200/90 backdrop-blur">
        <span className="relative flex h-2 w-2">
          <span className="absolute h-full w-full rounded-full bg-amber-400 anim-pulse-ring" />
          <span className="h-2 w-2 rounded-full bg-amber-300" />
        </span>
        live · aggregated to regions · never pinpointed
      </div>
      <div className="pointer-events-none absolute bottom-3 left-3 hidden items-center gap-1.5 rounded-full border border-amber-300/20 bg-night/80 px-3 py-1.5 text-[10px] text-amber-200/70 backdrop-blur sm:flex">
        <span className="h-2 w-2 rounded-full bg-amber-950" /> quiet
        <span className="ml-1 h-2 w-2 rounded-full bg-amber-600" /> active
        <span className="ml-1 h-2 w-2 rounded-full bg-amber-300" /> buzzing
      </div>
    </div>
  );
}
