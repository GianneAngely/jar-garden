// Silent GIF recorder. Stops Phaser's own loop and steps the game frame by frame, so the GIF is smooth
// and the same every run no matter how slow headless Chrome is. A drawn cursor shows every click.
// usage: node tools/record.mjs <scenario.mjs> <out.gif|out.mp4> [--fps 20] [--width 800] [--query "seed=7"] [--http]
// --http serves the folder and renders with the GPU in WebGL, like itch (needed for postcard photos).
// out.mp4: H.264 at full size plus <out>.events.json (rec.sound marks) for tools/mux.mjs, which builds the
// soundtrack offline. The page itself always stays ?mute.
// A scenario exports `default async function (rec)` using rec.wait(sec), rec.until(js), rec.click(gx, gy), rec.eval(js),
// rec.sound(key, opts) (marks a sound at the current frame for the soundtrack) and rec.caption(text) (DOM caption).
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { launch, serve, sleep } from "./cdp.mjs";

const root = resolve(import.meta.dirname, "..");
const [scenarioPath, outPath] = process.argv.slice(2);
const opt = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const FPS = Number(opt("fps", 20)), WIDTH = Number(opt("width", 800));
if (!scenarioPath || !outPath) { console.log("usage: node tools/record.mjs <scenario.mjs> <out.gif>"); process.exit(1); }
const mod = await import(pathToFileURL(resolve(scenarioPath)).href);
const scenario = Object.assign(mod.default, { http: mod.http, query: mod.query }); // optional named exports
const server = process.argv.includes("--http") || scenario.http ? await serve(root) : null;
const url = (server ? server.url + "index.html" : pathToFileURL(join(root, "index.html")).href) + "?mute&" + opt("query", scenario.query || "seed=7&play");

const frames = mkdtempSync(join(tmpdir(), "jg-frames-"));
const cdp = await launch({ gpu: !!server });
let n = 0;
const events = [];
const D = 1000 / FPS;
const snap = async () => writeFileSync(join(frames, `f${String(n++).padStart(5, "0")}.png`), await cdp.png());
const step = async () => { await cdp.evaluate(`(() => { __t += ${D}; game.step(__t, ${D}); })()`); await snap(); };

const rec = {
  eval: js => cdp.evaluate(js),
  async wait(sec) { for (let i = 0; i < Math.round(sec * FPS); i++) await step(); },
  // step frames until a page condition holds (or maxSec passes)
  async until(js, maxSec = 30) { for (let i = 0; i < maxSec * FPS && !(await cdp.evaluate(js)); i++) await step(); },
  sound(key, opts = {}) { events.push({ t: n / FPS, key, ...opts }); },
  // a soft caption pill at the bottom of the frame ("" hides it)
  caption(text) { return cdp.evaluate(`__caption(${JSON.stringify(text)})`); },
  // glide the drawn cursor to (gx, gy) in game coordinates, then press
  async click(gx, gy, glide = 0.4) {
    const from = (await cdp.evaluate(`[__cur.gx, __cur.gy]`)) || [gx, gy];
    const k = Math.max(1, Math.round(glide * FPS));
    for (let i = 1; i <= k; i++) {
      const t = i / k, e = t * t * (3 - 2 * t);
      await cdp.evaluate(`__moveCur(${from[0] + (gx - from[0]) * e}, ${from[1] + (gy - from[1]) * e}, false)`);
      await step();
    }
    await cdp.evaluate(`__moveCur(${gx}, ${gy}, true)`);
    await cdp.click(gx, gy, 0);
    await rec.wait(0.25);
    await cdp.evaluate(`__moveCur(${gx}, ${gy}, false)`);
  },
};

try {
  await cdp.open(url);
  if (!(await cdp.waitFor(`window.STATE === (location.search.includes("play") ? "jar" : "title")`))) throw new Error("game did not load");
  await sleep(400);
  await cdp.evaluate(`(() => {
    game.loop.sleep(); window.__t = performance.now();
    const c = document.createElement("div");
    c.style.cssText = "position:fixed;z-index:9;width:26px;height:26px;margin:-13px 0 0 -13px;border-radius:50%;background:rgba(255,253,248,.85);border:3px solid #6b4a3a;pointer-events:none;transition:none;left:-50px;top:-50px";
    document.body.appendChild(c);
    window.__cur = { el: c, gx: 640, gy: 400 };
    const cap = document.createElement("div");
    cap.style.cssText = "position:fixed;z-index:9;left:50%;bottom:34px;transform:translateX(-50%);font:600 30px Fredoka,sans-serif;color:#6b4a3a;background:rgba(255,248,239,.92);border:3px solid #6b4a3a;border-radius:26px;padding:8px 26px;opacity:0;transition:none;white-space:nowrap";
    document.body.appendChild(cap);
    window.__caption = text => { cap.textContent = text; cap.style.opacity = text ? 1 : 0; };
    window.__moveCur = (gx, gy, down) => {
      const r = game.canvas.getBoundingClientRect();
      __cur.gx = gx; __cur.gy = gy;
      c.style.left = r.left + gx * r.width / 1280 + "px"; c.style.top = r.top + gy * r.height / 720 + "px";
      c.style.transform = down ? "scale(.7)" : "scale(1)"; c.style.background = down ? "rgba(255,230,168,.95)" : "rgba(255,253,248,.85)";
    };
  })()`);
  await scenario(rec);
  if (cdp.errors.length) console.log("console errors:", cdp.errors.join(" | "));
  mkdirSync(dirname(resolve(outPath)), { recursive: true });
  if (outPath.endsWith(".mp4")) {
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(FPS), "-i", join(frames, "f%05d.png"),
      "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "slow", "-movflags", "+faststart", resolve(outPath)]);
    writeFileSync(resolve(outPath) + ".events.json", JSON.stringify({ fps: FPS, frames: n, events }, null, 1));
  } else execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(FPS), "-i", join(frames, "f%05d.png"),
    "-vf", `scale=${WIDTH}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=200:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle`,
    resolve(outPath)]);
  if (process.argv.includes("--keep")) execFileSync("cp", ["-R", frames, resolve(outPath) + ".frames"]);
  console.log(`${outPath}: ${n} frames, ${(n / FPS).toFixed(1)} s`);
} finally {
  cdp.close();
  server?.close();
  rmSync(frames, { recursive: true, force: true });
}
