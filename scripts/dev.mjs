#!/usr/bin/env node
// scripts/dev.mjs — `npm run dev` boots the full CurioMap stack:
//   1. docker compose up -d   (Postgres :5433 + Redis :6380)
//   2. dotnet run (API :8080) + npx next dev (UI :3000), concurrently.
// Works from repo root AND from frontend/ (paths resolve to repo root).
// Zero dependencies — plain node:child_process. Ctrl+C stops everything.
//
// Usage:
//   npm run dev              # full stack (root or frontend/)
//   npm run dev -- --no-docker --no-api   # flags (extra args pass through to `next dev`)
// Env: CURIOMAP_NO_DOCKER=1, CURIOMAP_NO_API=1
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rawArgs = process.argv.slice(2);
if (rawArgs.includes("--help") || rawArgs.includes("-h")) {
  console.log(
    `Usage: npm run dev [-- --no-docker --no-api --only-ui] [-- <next dev args>]`,
  );
  console.log(`  --no-docker   skip 'docker compose up -d'`);
  console.log(`  --no-api      skip the .NET API (UI only)`);
  console.log(`  --only-ui     alias for --no-api --no-docker`);
  console.log(`  other args (e.g. -p 3001) pass through to 'next dev'`);
  process.exit(0);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envFile = path.join(root, ".env");
if (fs.existsSync(envFile)) {
  try {
    const lines = fs.readFileSync(envFile, "utf8").split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq > 0) {
        const key = trimmed.slice(0, eq).trim();
        let val = trimmed.slice(eq + 1).trim();
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        if (process.env[key] === undefined) {
          process.env[key] = val;
        }
      }
    }
  } catch (error) {
    console.warn("[env] failed to load .env:", error.message);
  }
}

const onlyUi = rawArgs.includes("--only-ui");
const NO_DOCKER =
  onlyUi ||
  rawArgs.includes("--no-docker") ||
  process.env.CURIOMAP_NO_DOCKER === "1";
const NO_API =
  onlyUi || rawArgs.includes("--no-api") || process.env.CURIOMAP_NO_API === "1";
const nextArgs = rawArgs.filter(
  (a) => !["--no-docker", "--no-api", "--only-ui"].includes(a),
);

const apiDir = path.join(root, "backend", "src", "CurioMap.Api");
const uiDir = path.join(root, "frontend");
// Invoke Windows command shims directly instead of enabling `shell: true`.
// Besides avoiding DEP0190, this keeps arguments passed to child processes
// separate instead of concatenating them through cmd.exe.
const executable = (command) => {
  if (process.platform !== "win32") return command;
  if (command === "docker") return "docker.exe";
  if (command === "dotnet") return "dotnet.exe";
  return command;
};

const children = new Set();
let shuttingDown = false;
function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const c of children) {
    try {
      c.kill();
    } catch {
      /* noop */
    }
  }
  process.exit(code);
}
process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

function run(label, cmd, cmdArgs, cwd) {
  const childCommand = executable(cmd);
  console.log(`[${label}] ${childCommand} ${cmdArgs.join(" ")}`);
  const child = spawn(childCommand, cmdArgs, {
    cwd,
    stdio: "inherit",
    shell: false,
  });
  children.add(child);
  child.on("error", (error) => {
    if (shuttingDown) return;
    console.error(`[${label}] failed to start: ${error.message}`);
    shutdown(1);
  });
  child.on("exit", (code) => {
    children.delete(child);
    // If a service crashes (non-zero), tear the rest down so `npm run dev` doesn't linger half-alive.
    if (!shuttingDown && code !== 0 && code !== null) {
      console.error(`[${label}] exited with code ${code} — stopping stack.`);
      shutdown(code);
    }
  });
  return child;
}

if (!NO_DOCKER) {
  console.log("[infra] docker compose up -d (Postgres :5433 + Redis :6380)");
  const r = spawnSync("docker", ["compose", "up", "-d"], {
    cwd: root,
    stdio: "inherit",
    shell: false,
    windowsHide: true,
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
} else {
  console.log(
    "[infra] skipped (already running / external Postgres+Redis expected)",
  );
}

if (!NO_API) run("api", "dotnet", ["run", "--launch-profile", "http"], apiDir);
// NOTE: launch Next.js directly (not `npm run dev`) to avoid infinite recursion,
// since frontend's own `dev` script points at this file.
const nextCli = path.join(uiDir, "node_modules", "next", "dist", "bin", "next");
run("ui", process.execPath, [nextCli, "dev", ...nextArgs], uiDir);

// Keep the orchestrator alive while children run; Ctrl+C / child crash ends it.
await new Promise(() => {});
