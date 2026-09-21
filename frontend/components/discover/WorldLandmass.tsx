"use client";

import { useMemo } from "react";
import { LANDMASSES } from "./world-landmass";

export function WorldLandmass() {
  const masses = useMemo(() => LANDMASSES, []);
  return (
    <g className="map-landmass" aria-hidden="true">
      {masses.map((m) => (
        <path key={m.id} d={m.d} />
      ))}
      {masses
        .filter((m) => m.label)
        .map((m) => (
          <text
            key={`${m.id}-label`}
            x={m.labelX}
            y={m.labelY}
            textAnchor="middle"
            className="map-landmass-label"
          >
            {m.label}
          </text>
        ))}
    </g>
  );
}
