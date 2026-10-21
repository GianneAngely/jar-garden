// Silent GIF recorder. Stops Phaser's own loop and steps the game frame by frame, so the GIF is smooth
// and the same every run no matter how slow headless Chrome is. A drawn cursor shows every click.
// usage: node tools/record.mjs <scenario.mjs> <out.gif> [--fps 20] [--width 800] [--query "seed=7"]
// A scenario exports `default async function (rec)` using rec.wait(sec), rec.click(gx, gy), rec.eval(js).
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { launch, sleep } from "./cdp.mjs";

const root = resolve(import.meta.dirname, "..");
const [scenarioPath, outPath] = process.argv.slice(2);
const opt = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const FPS = Number(opt("fps", 20)), WIDTH = Number(opt("width", 800));
if (!scenarioPath || !outPath) { console.log("usage: node tools/record.mjs <scenario.mjs> <out.gif>"); process.exit(1); }
const scenario = (await import(pathToFileURL(resolve(scenarioPath)).href)).default;
const url = pathToFileURL(join(root, "index.html")).href + "?mute&" + opt("query", scenario.query || "seed=7");

const frames = mkdtempSync(join(tmpdir(), "jg-frames-"));
const cdp = await launch();
let n = 0;
const D = 1000 / FPS;
const snap = async () => writeFileSync(join(frames, `f${String(n++).padStart(5, "0")}.png`), await cdp.png());
const step = async () => { await cdp.evaluate(`(() => { __t += ${D}; game.step(__t, ${D}); })()`); await snap(); };

const rec = {
  eval: js => cdp.evaluate(js),
  async wait(sec) { for (let i = 0; i < Math.round(sec * FPS); i++) await step(); },
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
  if (!(await cdp.waitFor(`window.STATE`))) throw new Error("game did not load");
  await sleep(400);
  await cdp.evaluate(`(() => {
    game.loop.sleep(); window.__t = performance.now();
    const c = document.createElement("div");
    c.style.cssText = "position:fixed;z-index:9;width:26px;height:26px;margin:-13px 0 0 -13px;border-radius:50%;background:rgba(255,253,248,.85);border:3px solid #6b4a3a;pointer-events:none;transition:none;left:-50px;top:-50px";
    document.body.appendChild(c);
    window.__cur = { el: c, gx: 640, gy: 400 };
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
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(FPS), "-i", join(frames, "f%05d.png"),
    "-vf", `scale=${WIDTH}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=200:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle`,
    resolve(outPath)]);
  if (process.argv.includes("--keep")) execFileSync("cp", ["-R", frames, resolve(outPath) + ".frames"]);
  console.log(`${outPath}: ${n} frames, ${(n / FPS).toFixed(1)} s`);
} finally {
  cdp.close();
  rmSync(frames, { recursive: true, force: true });
}
