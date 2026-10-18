import { MapPin } from "lucide-react";
import { AvatarMark } from "@/components/profile/AvatarMark";
import { HEAT_GRADIENT } from "@/components/discover/map-style";

/**
 * Legend for the curiosity map. Kept free of mapping-library imports so
 * server/static pages (`/`, `/discover/global`) can render it without pulling
 * Leaflet into their first-load JS (ADR 0007, AGENTS.md §3).
 */
export function ObservatoryLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-muted">
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-10 rounded-full" style={{ background: HEAT_GRADIENT }} />
        Heat = reading activity
      </span>
      <span className="flex items-center gap-1.5">
        <AvatarMark mark="orbit" size={14} className="text-signal" />
        Avatars = readers active now
      </span>
      <span className="flex items-center gap-1.5">
        <MapPin size={11} className="text-signal" />
        Coordinates fuzzed ~15 km · anonymous by default
      </span>
    </div>
  );
}
