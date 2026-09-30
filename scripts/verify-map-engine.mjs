#!/usr/bin/env node
/*
 * Map engine guardrails (ADR 0007, AGENTS.md gap 11).
 *
 * Static, dependency-free CI checks over the SOURCE TREE (not build output)
 * so a map-policy regression fails the same build that introduces it.
 * `tsc` + `next build` cannot see these; this script is what makes them
 * "enforced" instead of aspirational.
 *
 *   1. OSM attribution stays enabled and visible in the Leaflet engine.
 *   2. The zoom ceiling stays capped at city scale (fuzzed ~15 km data).
 *   3. Tile requests are never cache-busted or prefetched (OSMF §3.2/§4).
 *   4. The tile URL comes from configuration, never a hard-coded constant.
 *   5. `react-leaflet` (Hippocratic-2.1) never returns to the dependency set.
 *   6. Region tooltips stay `textContent`-built (API strings are not markup).
 *
 * Exit code: 0 when every check passes, 1 otherwise.
 * Run: `node scripts/verify-map-engine.mjs` (wired into `npm run lint`).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPTS = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPTS, "..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

const MAP = read("frontend/components/discover/ObservatoryMap.tsx");
const STYLE = read("frontend/components/discover/map-style.ts");
const CSS = read("frontend/app/globals.css");

/** Source with line comments stripped (policy tokens in comments are fine). */
function codeOnly(text) {
  return text
    .split("\n")
    .map((line) => {
      const cut = line.indexOf("//");
      return cut < 0 ? line : line.slice(0, cut);
    })
    .join("\n");
}
const MAP_CODE = codeOnly(MAP);

/** Collect [name, ok, detail] tuples; print at the end, exit non-zero on fail. */
const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail: detail ?? "" });
}

/** Fail unless `text` contains a /.../s regex somewhere. */
function mustMatch(name, text, re, detail) {
  check(name, re.test(text), detail);
}

/** Fail if `text` contains a /.../ regex anywhere. */
function mustNotMatch(name, text, re, detail) {
  check(name, !re.test(text), detail);
}

// ── 1. OSM attribution stays enabled and visible ────────────────────────────
mustMatch(
  "leaflet attributionControl enabled",
  MAP_CODE,
  /attributionControl:\s*true/,
  "ObservatoryMap must pass attributionControl: true to L.map",
);
mustMatch(
  "tile layer carries the OSM attribution string",
  MAP_CODE,
  /L\.tileLayer\(\s*OSM_TILE_URL\s*,\s*\{[^}]*attribution:\s*OSM_ATTRIBUTION/s,
  "L.tileLayer options must set attribution: OSM_ATTRIBUTION",
);
mustMatch(
  "attribution links the OSM copyright page",
  STYLE,
  /openstreetmap\.org\/copyright/,
  "OSM_ATTRIBUTION must link the OSM copyright page (policy section 2)",
);
mustMatch(
  "attribution links the OSM issue reporter",
  STYLE,
  /openstreetmap\.org\/fixthemap/,
  "OSM_ATTRIBUTION must link the OSM issue reporter (policy recommendation)",
);
mustNotMatch(
  "attribution control never hidden by CSS",
  CSS,
  /\.leaflet-control-attribution\s*\{[^}]*(display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0(?![\d.]))/,
  "globals.css hides .leaflet-control-attribution",
);
mustNotMatch(
  "attribution text never shrunk to zero",
  CSS,
  /\.leaflet-control-attribution[^{]*\{[^}]*font-size\s*:\s*0/,
  "globals.css shrinks .leaflet-control-attribution to font-size 0",
);

// ── 2. Zoom ceiling stays at city scale ─────────────────────────────────────
{
  const ceiling = STYLE.match(/export const MAP_MAX_ZOOM\s*=\s*(\d+)/);
  check(
    "MAP_MAX_ZOOM defined and capped at city scale",
    ceiling !== null && Number(ceiling[1]) <= 12,
    `expected MAP_MAX_ZOOM <= 12, got ${ceiling ? ceiling[1] : "undefined"}`,
  );
}
mustMatch(
  "map maxZoom wired to the ceiling constant",
  MAP_CODE,
  /maxZoom:\s*MAP_MAX_ZOOM/,
  "L.map options must use maxZoom: MAP_MAX_ZOOM, not a literal",
);
mustNotMatch(
  "no raw zoom literals in map/tile options",
  MAP_CODE,
  /(?<![A-Z_])(minZoom|maxZoom):\s*\d/,
  "zoom bounds must reference named constants, not literals",
);

// ── 3. No cache-busting or prefetch of tiles ────────────────────────────────
mustNotMatch(
  "no Cache-Control headers set on tile requests",
  MAP_CODE,
  /headers\s*:\s*\{[^}]*[Cc]ache-[Cc]ontrol|setRequestHeader\s*\([^)]*[Cc]ache/,
  "setting request cache headers on tile fetches violates OSMF tile policy section 3.2",
);
mustNotMatch(
  "no offline/prefetch tile machinery",
  MAP_CODE,
  /\bprefetch\b|\boffline\b|downloadTile|bulkDownload/,
  "tile prefetch/bulk download violates OSMF tile policy section 4",
);
mustMatch(
  "tile URL read from configuration",
  STYLE,
  /process\.env\.NEXT_PUBLIC_MAP_TILE_URL/,
  "OSM_TILE_URL must read process.env.NEXT_PUBLIC_MAP_TILE_URL",
);
mustMatch(
  "tile layer uses the configured URL constant",
  MAP_CODE,
  /L\.tileLayer\(\s*OSM_TILE_URL/,
  "L.tileLayer must be constructed from OSM_TILE_URL",
);
mustNotMatch(
  "no hard-coded tile.openstreetmap.org URL in the engine",
  MAP_CODE,
  /tile\.openstreetmap\.org/,
  "the raster host must come from configuration, never a literal",
);

// ── 4. react-leaflet stays out ─────────────────────────────────────────────
{
  const pkg = JSON.parse(read("frontend/package.json"));
  const declared = { ...pkg.dependencies, ...pkg.devDependencies };
  check("react-leaflet not declared", !("react-leaflet" in declared), "`react-leaflet` is Hippocratic-2.1; remove it");
  check("@react-leaflet/core not declared", !("@react-leaflet/core" in declared), "`@react-leaflet/core` is Hippocratic-2.1; remove it");
  const offenders = [];
  for (const dir of ["frontend/components/discover", "frontend/app", "frontend/lib"]) {
    const startDir = path.join(ROOT, dir);
    if (!fs.existsSync(startDir)) continue;
    const stack = [startDir];
    while (stack.length > 0) {
      const cur = stack.pop();
      for (const entry of fs.readdirSync(cur, { withFileTypes: true })) {
        if (entry.name === "node_modules") continue;
        const full = path.join(cur, entry.name);
        if (entry.isDirectory()) stack.push(full);
        else if (/\.(ts|tsx|js|mjs)$/.test(entry.name)) {
          const text = fs.readFileSync(full, "utf8");
          if (/from\s+["']react-leaflet["']|require\(\s*["']react-leaflet["']\s*\)/.test(text)) {
            offenders.push(path.relative(ROOT, full));
          }
        }
      }
    }
  }
  check("no react-leaflet imports in first-party code", offenders.length === 0, offenders.join(", "));
}

// ── 5. Region tooltips stay textContent-built ───────────────────────────────
mustMatch(
  "tooltips built from textContent",
  MAP,
  /\.textContent\s*=/,
  "region titles are API strings; interpolated HTML would be markup injection",
);
mustNotMatch(
  "no innerHTML in tooltip construction",
  MAP,
  /regionTooltip[\s\S]{0,2000}innerHTML/,
  "tooltip markup must be DOM nodes with textContent, never innerHTML",
);

// ── Report ─────────────────────────────────────────────────────────────────
let failed = 0;
for (const r of results) {
  process.stdout.write(`${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.ok || !r.detail ? "" : ` — ${r.detail}`}\n`);
  if (!r.ok) failed += 1;
}
process.stdout.write(`\nmap-engine guardrails: ${results.length - failed}/${results.length} pass\n`);
process.exit(failed === 0 ? 0 : 1);

