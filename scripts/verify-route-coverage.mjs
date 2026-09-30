#!/usr/bin/env node
/*
 * Route coverage auditor (AGENTS.md §4 bundle path 2 — controllers are the source
 * of truth).
 *
 * Every public HTTP action in backend/src/CurioMap.Api/Controllers/*.cs MUST be
 * exercised by the integration suite (recursive .cs files under backend/tests/CurioMap.Api.Tests)
 * or asserted by the smoke runner (scripts/smoke.ps1). Anything else is drift,
 * and paths are never maintained as a second hand-maintained route list.
 *
 * Matching is verb-aware. Path parameters like {id} in the controller and
 * interpolated values like $bid in a test are both normalised to *. Query
 * strings are ignored. Leading slashes are stripped so controller routes
 * ("books/search") and test paths ("/books/search") compare equal.
 *
 *   node scripts/verify-route-coverage.mjs              # report, exit 0
 *   node scripts/verify-route-coverage.mjs --strict    # report + exit 1 on drift
 *
 * Root package scripts: npm run audit:routes / npm run audit:routes:strict
 * (CI runs the strict form — see .github/workflows/ci.yml).
 * Zero dependencies — plain node:fs.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CTRL = path.join(ROOT, "backend", "src", "CurioMap.Api", "Controllers");
const TESTS = path.join(ROOT, "backend", "tests", "CurioMap.Api.Tests");
const SMOKE = path.join(ROOT, "scripts", "smoke.ps1");
const STRICT = process.argv.includes("--strict");

function norm(p) {
  let s = p.split("?")[0];
  s = s.replace(/^\/+/, "");
  s = s.replace(/\{[^}]*\}/g, "*");
  s = s.replace(/\$[A-Za-z_][A-Za-z0-9_.]*/g, "*");
  s = s.replace(/\/+/g, "/");
  return s;
}

function routeKey(verb, p) {
  return `${verb.toLowerCase()} ${norm(p)}`;
}

function readText(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function walkCs(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkCs(full));
    } else if (entry.name.endsWith(".cs")) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Extract routes from a controller file.
 * Handles both class-level [Route("...")] + method-level [HttpX("...")] and
 * fully-qualified method-level routes like [HttpGet("search")].
 */
function extractControllerRoutes(file) {
  const src = readText(file);
  const routes = [];

  // Class-level route prefix
  const classRouteMatch = src.match(/\[Route\("([^"]*)"\)\]/);
  const prefix = classRouteMatch ? classRouteMatch[1] : "";

  // Method-level attributes: [HttpGet("...")], [HttpPost("...")], etc.
  // Also handles [HttpGet] with no template (inherits class route).
  const methodRegex =
    /\[(HttpGet|HttpPost|HttpPut|HttpPatch|HttpDelete)\s*(?:\(\s*"([^"]*)"\s*\))?\]/g;

  let m;
  while ((m = methodRegex.exec(src)) !== null) {
    const verb = m[1].replace("Http", "").toLowerCase();
    const template = m[2]; // may be undefined for [HttpGet]
    let route;
    if (template !== undefined && template.startsWith("/")) {
      // Absolute route: ignores the class-level prefix entirely (ASP.NET Core convention).
      route = template;
    } else if (template !== undefined) {
      route = prefix ? `${prefix}/${template}` : template;
    } else {
      // No method template: uses class route + method name (default ASP.NET routing)
      route = prefix;
    }
    routes.push({
      verb,
      raw: route,
      path: norm(route),
      key: routeKey(verb, route),
    });
  }

  return routes;
}

/**
 * Extract route references from test files and smoke script.
 * C# calls carry the verb in the method name. PowerShell calls carry it in
 * `-Method`, defaulting to GET when omitted. Keeping the verb in the key is
 * important: a GET assertion must not hide an uncovered POST action.
 */
function extractTestCoverage(files) {
  const hits = new Set();

  for (const file of files) {
    const src = readText(file);
    const csharpRegex =
      /\.(GetAsync|PostAsync|PostAsJsonAsync|PutAsJsonAsync|PatchAsJsonAsync|DeleteAsync)\s*\(\s*\$?(["'`])(\/[A-Za-z][^"'`]*)\2/g;
    let match;
    while ((match = csharpRegex.exec(src)) !== null) {
      const method = match[1]
        .replace("AsJsonAsync", "")
        .replace("Async", "")
        .toLowerCase();
      const raw = match[3];
      if (
        raw.startsWith("/favicon") ||
        raw.startsWith("/robots") ||
        raw.startsWith("/sitemap")
      )
        continue;
      hits.add(routeKey(method, raw));
    }

    const requestMessageRegex =
      /new\s+HttpRequestMessage\s*\(\s*HttpMethod\.(Get|Post|Put|Patch|Delete)\s*,\s*\$?(["'`])(\/[A-Za-z][^"'`]*)\2/g;
    while ((match = requestMessageRegex.exec(src)) !== null) {
      hits.add(routeKey(match[1], match[3]));
    }

    const powershellRegex =
      /Invoke-Http\s+-Uri\s+"(?:\$[A-Za-z_][A-Za-z0-9_]*)(\/[A-Za-z][^"`]*)"([^\r\n]*)/g;
    while ((match = powershellRegex.exec(src)) !== null) {
      const raw = match[1];
      const options = match[2];
      const methodMatch = options.match(/-Method\s+(\w+)/i);
      const method = methodMatch ? methodMatch[1].toLowerCase() : "get";
      hits.add(routeKey(method, raw));
    }
  }
  return hits;
}

// ── Collect ──────────────────────────────────────────────────────────────────

const allControllers = walkCs(CTRL);
const allRoutes = [];
for (const file of allControllers) {
  const routes = extractControllerRoutes(file);
  for (const r of routes) {
    allRoutes.push({ ...r, file: path.relative(ROOT, file) });
  }
}

// Test coverage: all .cs files under tests/ + smoke.ps1
const testFiles = walkCs(TESTS);
if (fs.existsSync(SMOKE)) testFiles.push(SMOKE);
const testHits = extractTestCoverage(testFiles);

// ── Compare ──────────────────────────────────────────────────────────────────

const uncovered = allRoutes.filter((r) => !testHits.has(r.key));
uncovered.sort(
  (a, b) => a.verb.localeCompare(b.verb) || a.path.localeCompare(b.path),
);

// ── Report ───────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

for (const r of allRoutes) {
  const covered = testHits.has(r.key);
  if (covered) {
    passed++;
  } else {
    failed++;
    console.log(
      `FAIL  ${r.verb.toUpperCase()} ${r.path}  (${r.file})` +
        ` (route "${r.raw}" has no integration test or smoke assertion)`,
    );
  }
}

console.log(
  `\nRoute coverage: ${passed}/${allRoutes.length} routes covered by tests or smoke.`,
);

if (STRICT && failed > 0) {
  console.log(`\n${failed} uncovered route(s) — failing in strict mode.`);
  process.exit(1);
}

if (!STRICT) {
  process.exit(0);
}

process.exit(failed > 0 ? 1 : 0);
