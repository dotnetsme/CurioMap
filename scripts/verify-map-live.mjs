#!/usr/bin/env node
/*
 * Live map interaction probe (ADR 0007, AGENTS.md gap 11).
 *
 * Headless-Chrome end-to-end exercise of the Leaflet path that unit tests and
 * build output cannot see: tile loading, attribution rendering, region blooms,
 * marker animation hooks, the zoom ceiling, click-to-select, reader popovers,
 * and keyboard/touch affordances.
 *
 * Zero dependencies — plain node:http against a local Chrome DevTools endpoint.
 * Requires a running stack (`npm run dev`: API :8080 + UI :3000). Local only:
 * exits non-zero in CI (no browser guarantee there) with a plain explanation.
 *
 *   node scripts/verify-map-live.mjs [--api URL] [--ui URL] [--chrome path]
 *
 * Exit code: 0 when every check passes, 1 otherwise.
 *
 * Also wired as an opt-in CI job: `.github/workflows/map-e2e.yml`
 * (workflow_dispatch ONLY — it has never run; promote it to pull_request
 * triggers only after one green manual run, see AGENTS.md §8.11).
 */
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const API = opt("--api", "http://localhost:8080");
const UI = opt("--ui", "http://localhost:3000");
const CHROME = opt(
  "--chrome",
  process.platform === "win32"
    ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    : "/usr/bin/google-chrome",
);

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail: detail ?? "" });
  process.stdout.write(`${ok ? "PASS" : "FAIL"}  ${name}${ok || !detail ? "" : ` — ${detail}`}\n`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (msg) => process.stderr.write(`[map-live] ${msg}\n`);

// Hard watchdog: never let the probe hang silently again. Sized for slow CI
// runners (Chrome boot + 30s readiness loop + zoom-plateau clicking).
setTimeout(() => {
  log("WATCHDOG: still running after 240s — aborting");
  process.exit(1);
}, 240000).unref?.();

function getJson(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let body = "";
        res.on("data", (c) => {
          body += c;
        });
        res.on("end", () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(new Error(`non-JSON from ${url}: ${e.message}`));
          }
        });
      })
      .on("error", reject);
  });
}

/** Minimal CDP client over a raw WebSocket (no `ws` dependency). */
function cdpConnect(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url.replace(/^ws/, "http"));
    log(`connecting CDP ${u.origin}${u.pathname}`);
    const key = crypto.randomBytes(16).toString("base64");
    const req = http.request(
      {
        host: u.hostname,
        port: u.port,
        path: `${u.pathname}${u.search}`,
        headers: {
          Connection: "Upgrade",
          Upgrade: "websocket",
          "Sec-WebSocket-Version": "13",
          "Sec-WebSocket-Key": key,
        },
      },
      (res) => reject(new Error(`CDP upgrade failed: HTTP ${res.statusCode}`)),
    );
    req.on("error", reject);
    req.on("upgrade", (res, socket, head) => {
      if (res.statusCode !== 101) {
        socket.destroy();
        reject(new Error(`CDP upgrade status ${res.statusCode}`));
        return;
      }
      log("CDP websocket upgraded 101");
      let id = 0;
      const pending = new Map();
      let buf = Buffer.alloc(0);
      if (head && head.length > 0) buf = Buffer.from(head);
      const frame = { opcode: 0, len: 0, mask: null, masked: false, stage: 0 };
      const listeners = new Map();
      const on = (event, fn) => {
        if (!listeners.has(event)) listeners.set(event, []);
        listeners.get(event).push(fn);
      };
      const emit = (msg) => {
        if (msg.id && pending.has(msg.id)) {
          const p = pending.get(msg.id);
          pending.delete(msg.id);
          if (msg.error) p.rej(new Error(JSON.stringify(msg.error)));
          else p.res(msg.result);
        } else if (msg.method && listeners.has(msg.method)) {
          for (const fn of listeners.get(msg.method)) fn(msg.params);
        }
      };
      const pump = (chunk) => {
        buf = Buffer.concat([buf, chunk]);
        for (;;) {
          if (frame.stage === 0) {
            if (buf.length < 2) return;
            frame.opcode = buf[0] & 0x0f;
            frame.masked = (buf[1] & 0x80) !== 0;
            frame.len = buf[1] & 0x7f;
            frame.mask = null;
            buf = buf.slice(2);
            if (frame.len === 126) frame.stage = 1;
            else if (frame.len === 127) frame.stage = 2;
            else frame.stage = frame.masked ? 3 : 4;
            if (frame.stage !== 4) continue;
          } else if (frame.stage === 1) {
            if (buf.length < 2) return;
            frame.len = buf.readUInt16BE(0);
            buf = buf.slice(2);
            frame.stage = frame.masked ? 3 : 4;
          } else if (frame.stage === 2) {
            if (buf.length < 8) return;
            frame.len = Number(buf.readBigUInt64BE(0));
            buf = buf.slice(8);
            frame.stage = frame.masked ? 3 : 4;
          } else if (frame.stage === 3) {
            if (buf.length < 4) return;
            frame.mask = buf.slice(0, 4);
            buf = buf.slice(4);
            frame.stage = 4;
          } else {
            if (buf.length < frame.len) return;
            let payload = buf.slice(0, frame.len);
            buf = buf.slice(frame.len);
            const opcode = frame.opcode;
            frame.stage = 0;
            if (frame.mask) {
              for (let i = 0; i < payload.length; i += 1) payload[i] ^= frame.mask[i % 4];
            }
            if (opcode === 0x8) {
              socket.destroy();
              return;
            }
            if (opcode === 0x1) {
              try {
                emit(JSON.parse(payload.toString("utf8")));
              } catch {
                // Ignore non-JSON control frames.
              }
            }
          }
        }
      };
      const send = (method, params) =>
        new Promise((res2, rej2) => {
          id += 1;
          const callId = id;
          const timer = setTimeout(() => {
            pending.delete(callId);
            rej2(new Error(`CDP timeout: ${method}`));
          }, 15000);
          pending.set(callId, {
            res: (v) => {
              clearTimeout(timer);
              res2(v);
            },
            rej: (e) => {
              clearTimeout(timer);
              rej2(e);
            },
          });
          const body = Buffer.from(JSON.stringify({ id: callId, method, params: params ?? {} }));
          const head = Buffer.alloc(10);
          head[0] = 0x81;
          let headerLen = 2;
          if (body.length > 65535) {
            head[1] = 0x7f | 0x80;
            head.writeBigUInt64BE(BigInt(body.length), 2);
            headerLen = 10;
          } else if (body.length > 125) {
            head[1] = 0x7e | 0x80;
            head.writeUInt16BE(body.length, 2);
            headerLen = 4;
          } else {
            head[1] = body.length | 0x80;
          }
          const mask = Buffer.from([7, 7, 7, 7]);
          const masked = Buffer.from(body);
          for (let i = 0; i < masked.length; i += 1) masked[i] ^= mask[i % 4];
          socket.write(Buffer.concat([head.slice(0, headerLen), mask, masked]));
        });
      socket.on("data", pump);
      socket.on("error", (e) => {
        for (const p of pending.values()) p.rej(e);
      });
      resolve({ send, on, close: () => socket.destroy() });
    });
    req.end();
  });
}

async function main() {
  // CI has no browser guarantee: explain instead of hanging.
  if (process.env.CI && !fs.existsSync(CHROME)) {
    process.stderr.write("SKIP map-live: no browser in CI (run locally via npm run verify:map)\n");
    process.exit(2);
  }
  if (!fs.existsSync(CHROME)) {
    process.stderr.write(`map-live: Chrome not found at ${CHROME} (override with --chrome)\n`);
    process.exit(1);
  }

  // The stack must already be up — this probe never starts it.
  try {
    const res = await fetch(`${API}/health`);
    if (!res.ok) throw new Error(`status ${res.status}`);
  } catch (e) {
    process.stderr.write(`map-live: API not reachable at ${API}: ${e.message}\n`);
    process.exit(1);
  }
  log("API healthy");

  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "curio-map-probe-"));
  const debugPort = 9333 + Math.floor(Math.random() * 500);
  const chrome = spawn(
    CHROME,
    [
      `--remote-debugging-port=${debugPort}`,
      "--headless=new",
      "--no-first-run",
      "--no-default-browser-check",
      `--user-data-dir=${profile}`,
      "about:blank",
    ],
    { stdio: "ignore" },
  );
  const killChrome = () => {
    try {
      chrome.kill();
    } catch {
      // Already gone.
    }
  };
  /** Chrome briefly holds its profile files after kill; retry, never throw. */
  const removeProfile = async () => {
    for (let i = 0; i < 6; i += 1) {
      try {
        fs.rmSync(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 300 });
        return;
      } catch (e) {
        log(`profile cleanup attempt ${i + 1}: ${e.code ?? e.message}`);
        await sleep(400);
      }
    }
  };
  process.on("exit", () => {
    // Exit handlers must never throw (an EPERM here masked real results once).
    killChrome();
    try {
      fs.rmSync(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
    } catch {
      log("profile cleanup skipped (Chrome still holding files)");
    }
  });

  const deadline = Date.now() + 30000;
  let targets = [];
  for (;;) {
    try {
      targets = await getJson(`http://127.0.0.1:${debugPort}/json/list`);
      break;
    } catch {
      if (Date.now() > deadline) {
        killChrome();
        process.stderr.write("map-live: Chrome DevTools endpoint never came up\n");
        process.exit(1);
      }
      await sleep(250);
    }
  }
  const page = targets.find((t) => t.type === "page");
  if (!page?.webSocketDebuggerUrl) {
    killChrome();
    process.stderr.write("map-live: no page target with a debugger socket\n");
    process.exit(1);
  }
  log(`target: ${page.url}`);
  const cdp = await cdpConnect(page.webSocketDebuggerUrl);
  log("CDP client ready");
  const evalJs = async (expression) => {
    const res = await cdp.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error(`page eval threw: ${JSON.stringify(res.exceptionDetails).slice(0, 400)}`);
    }
    return res.result?.value;
  };

  try {
    await cdp.send("Page.enable");
    await cdp.send("Network.enable");
    const tileRequests = [];
    cdp.on("Network.requestWillBeSent", (p) => {
      if (p.request?.url?.includes("tile.openstreetmap.org")) {
        tileRequests.push({ url: p.request.url, headers: p.request.headers ?? {} });
      }
    });

    // 1) Load the full-bleed map.
    log(`navigating to ${UI}/discover/global`);
    await cdp.send("Page.navigate", { url: `${UI}/discover/global` });
    let hooked = false;
    for (let i = 0; i < 60; i += 1) {
      const v = await evalJs("!!(window.__curioMap && window.__curioMap.ready)").catch(() => false);
      if (v) {
        hooked = true;
        break;
      }
      await sleep(500);
    }
    check("map engine becomes ready", hooked, "window.__curioMap.ready never true");

    const zoom = await evalJs("window.__curioMap ? window.__curioMap.getZoom() : null").catch(() => null);
    check("map initialised at a sane zoom", typeof zoom === "number" && zoom >= 2 && zoom <= 12, `zoom=${zoom}`);
    await sleep(2500);

    // 2) Tiles actually load over the network.
    check("raster tiles requested from OSM", tileRequests.length > 0, "no tile.openstreetmap.org requests observed");
    check(
      "tile requests carry no Cache-Control override",
      tileRequests.every((t) => !("Cache-Control" in (t.headers ?? {}))),
      "a Cache-Control header on tile fetches violates OSMF policy section 3.2",
    );

    // 3) Attribution rendered and inside the map frame.
    const attr = await evalJs(
      `(() => { const el = document.querySelector(".leaflet-control-attribution"); if (!el) return null; const r = el.getBoundingClientRect(); const f = document.querySelector(".map-dark-frame"); const fr = f ? f.getBoundingClientRect() : null; const cs = getComputedStyle(el); return { text: el.textContent, w: r.width, h: r.height, hidden: cs.display === "none" || cs.visibility === "hidden" || r.width < 2 || r.height < 2, inFrame: fr ? (r.left >= fr.left - 1 && r.right <= fr.right + 1 && r.top >= fr.top - 1 && r.bottom <= fr.bottom + 1) : null }; })()`,
    ).catch(() => null);
    check("attribution control present", attr !== null, ".leaflet-control-attribution missing from the DOM");
    check("attribution visible, not hidden", !!attr && !attr.hidden, JSON.stringify(attr));
    check(
      "attribution names OpenStreetMap",
      !!attr && typeof attr.text === "string" && attr.text.includes("OpenStreetMap"),
      String(attr?.text ?? "").slice(0, 120),
    );
    check("attribution inside the map frame", !!attr && attr.inFrame === true, JSON.stringify(attr));

    // 4) Region blooms rendered and animated.
    const blooms = await evalJs("window.__curioMap.countBlooms()").catch(() => 0);
    check("region blooms painted", blooms > 0, `countBlooms()=${blooms}`);
    const animating = await evalJs(
      `(() => { const el = document.querySelector(".leaflet-overlay-pane .curio-heat-pulse"); if (!el) return false; const cs = getComputedStyle(el); return cs.animationName !== "none" && cs.animationDuration !== "0s"; })()`,
    ).catch(() => false);
    check("bloom heartbeat animation running", animating === true, "curio-heat-pulse has no running animation");

    // 5) Click-to-select a region: flies to the selection zoom.
    const clickedBloom = await evalJs("window.__curioMap.clickFirstBloom()").catch(() => false);
    check("region bloom clickable", clickedBloom === true, "no .curio-heat-pulse element to click");
    await sleep(1500);
    const afterZoom = await evalJs("window.__curioMap.getZoom()").catch(() => null);
    check("region click flies to selection zoom", afterZoom === 9, `zoom after click=${afterZoom}, want 9`);

    // 6) Reader persona popover opens with privacy-safe content.
    const markers = await evalJs("window.__curioMap.countMarkers()").catch(() => 0);
    check("persona markers painted", markers > 0, `countMarkers()=${markers}`);
    if (markers > 0) {
      const clickedMarker = await evalJs("window.__curioMap.clickFirstMarker()").catch(() => false);
      check("persona marker clickable", clickedMarker === true, "no .map-reader-marker element to click");
      await sleep(1200);
      const dialog = await evalJs(
        `(() => { const el = document.querySelector('[role="dialog"]'); if (!el) return null; return { shelf: !!el.querySelector('a[href^="/users/"]'), email: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}/i.test(el.textContent || "") }; })()`,
      ).catch(() => null);
      check("reader popover opens on marker click", dialog !== null, "no [role=dialog] after marker click");
      check("popover links to the public shelf", !!dialog && dialog.shelf === true, JSON.stringify(dialog));
      check("popover leaks no email address", !!dialog && dialog.email === false, "PII in popover text");
      const dismissed = await evalJs(
        `(() => { const btn = document.querySelector('[aria-label="Close reader popover"]'); if (!btn) return false; btn.click(); return true; })()`,
      ).catch(() => false);
      await sleep(600);
      const gone = await evalJs(`!document.querySelector('[role="dialog"]')`).catch(() => false);
      check("popover dismisses on close", dismissed === true && gone === true, "dialog still in DOM");
    }

    // 7) Zoom ceiling: climb until the zoom stops rising, then press PAST it.
    //    A fixed click count proved flaky (Leaflet drops clicks mid-animation);
    //    the plateau test asserts both "reaches 12" and "cannot exceed 12".
    const zoomProbe = await evalJs(
      `(async () => { const plus = document.querySelector('[aria-label="Zoom in"]'); if (!plus) return { ok: false, why: "no Zoom in button" }; let z = window.__curioMap.getZoom(); for (let i = 0; i < 30 && z < 12; i++) { plus.click(); await new Promise((r) => setTimeout(r, 400)); z = window.__curioMap.getZoom(); } for (let i = 0; i < 3; i++) { plus.click(); await new Promise((r) => setTimeout(r, 400)); z = window.__curioMap.getZoom(); } return { ok: true, zoom: z }; })()`,
    ).catch(() => ({ ok: false }));
    check("zoom-in control exists", zoomProbe?.ok === true, JSON.stringify(zoomProbe));
    check("zoom ceiling holds at 12", zoomProbe?.zoom === 12, `plateau zoom=${zoomProbe?.zoom}, want 12`);

    // 8) Keyboard + touch affordances present.
    const keys = await evalJs(
      `(() => { const c = document.querySelector(".leaflet-container"); const bar = document.querySelector('[aria-label="Zoom in"]'); return { tabbable: c ? c.tabIndex >= 0 : null, ring: !!bar && getComputedStyle(bar).cursor === "pointer" }; })()`,
    ).catch(() => null);
    check("map container keyboard-focusable", !!keys && keys.tabbable === true, JSON.stringify(keys));
    const touch = await evalJs(
      `(() => Array.from(document.querySelectorAll(".leaflet-marker-icon.map-reader-marker")).slice(0, 5).map((el) => { const r = el.getBoundingClientRect(); return Math.round(Math.min(r.width, r.height)); }))()`,
    ).catch(() => []);
    check(
      "persona touch targets >= 40px",
      Array.isArray(touch) && touch.length > 0 && touch.every((s) => s >= 40),
      `sizes=${JSON.stringify(touch)}`,
    );
  } finally {
    cdp.close();
    killChrome();
    await removeProfile();
  }

  let failed = 0;
  for (const r of results) {
    if (!r.ok) failed += 1;
  }
  log(`summary: ${results.length - failed}/${results.length} pass`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  process.stderr.write(`map-live: fatal ${e.message}\n`);
  process.exit(1);
});
