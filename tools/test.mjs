// Silent headless browser test (--mute-audio, ?mute): clicks through the jar UI, fast-forwards
// the sim, saves screenshots, fails on console errors. Never opens a visible Chrome.
// usage: node tools/test.mjs [url] [outDir]
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(import.meta.dirname, "..");
const url = process.argv[2] || pathToFileURL(join(root, "index.html")).href + "?mute&seed=7";
const outDir = process.argv[3] || join(root, "dist", "shots");
mkdirSync(outDir, { recursive: true });

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ud = mkdtempSync(join(tmpdir(), "jargarden-"));
const port = 9300 + Math.floor(Math.random() * 500);
const proc = spawn(CHROME, ["--headless=new", "--mute-audio", `--user-data-dir=${ud}`, `--remote-debugging-port=${port}`,
  "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--hide-scrollbars", "about:blank"], { stdio: "ignore" });
const done = code => { proc.kill("SIGKILL"); rmSync(ud, { recursive: true, force: true }); process.exit(code); };

let ws;
for (let i = 0; i < 75 && !ws; i++) {
  try { ws = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t => t.type === "page")?.webSocketDebuggerUrl; } catch {}
  if (!ws) await sleep(200);
}
if (!ws) { console.log("FAIL no devtools"); done(1); }
const sock = new WebSocket(ws);
await new Promise(r => sock.addEventListener("open", r, { once: true }));
let id = 0; const pending = new Map(); const errors = [];
sock.addEventListener("message", e => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
  if (m.method === "Runtime.exceptionThrown") errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") errors.push(m.params.args.map(a => a.value ?? a.description).join(" "));
});
const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); sock.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async expr => (await send("Runtime.evaluate", { expression: expr, returnByValue: true })).result?.result?.value;
const waitFor = async (expr, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await evaluate(expr)) return true; await sleep(150); } return false; };
const shot = async name => writeFileSync(join(outDir, name), Buffer.from((await send("Page.captureScreenshot", { format: "png" })).result.data, "base64"));
const toPage = async (gx, gy) => evaluate(`(() => { const r = game.canvas.getBoundingClientRect(); return [r.left + ${gx} * r.width / 1280, r.top + ${gy} * r.height / 720]; })()`);
const click = async (gx, gy) => {
  const [x, y] = await toPage(gx, gy);
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
  await sleep(50);
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
  await sleep(200);
};
const ff = days => evaluate(`(() => { for (let i = 0; i < ${Math.round(days * 240)}; i++) Sim.tick(jar, 1/240); return jar.day; })()`);

let fail = 0;
const check = (ok, msg) => { console.log((ok ? "ok   " : "FAIL ") + msg); if (!ok) fail++; };

await send("Runtime.enable");
await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
await send("Page.navigate", { url });
check(await waitFor(`window.STATE === "jar"`), "jar scene loads");
check(await evaluate(`!game.sound.context`), "silent (?mute)");
await sleep(500);
await shot("1-start.png");

await click(295, 664);
check(await evaluate(`jar.lid === true`), "Open lid button");
await click(295, 664);
check(await evaluate(`jar.lid === false`), "Close lid button");
await click(425, 664);
check(await evaluate(`jar.lamp === true`), "Lamp button");
await click(425, 664);

await evaluate(`jar.seeds = 40`);
await click(870 + 156, 556);           // springtail card
check(await evaluate(`game.scene.getScene("Jar").selected === "springtail"`), "select springtail in shop");
await click(380, 470);
await click(600, 470);
check(await evaluate(`Sim.count(jar, "springtail") === 2`), "tap in jar places springtails");
await click(870 + 312, 556 + 84);      // firefly card
await click(420, 320);
await click(560, 300);
check(await evaluate(`Sim.count(jar, "firefly") === 2`), "fireflies placed");
await click(870 + 312, 556);           // fern card
await click(330, 480);
check(await evaluate(`Sim.count(jar, "fern") === 1`), "fern placed");

for (let i = 6; i < 15; i++) await evaluate(`jar.slots[${i}].moss = Math.max(jar.slots[${i}].moss, 0.6)`);
await ff(3);
await sleep(400);
await shot("2-day.png");
check(await evaluate(`jar.history.length > 10`), "graph history fills");

// to night: fireflies glow
await evaluate(`(() => { while (!(jar.day % 1 > 0.92)) Sim.tick(jar, 1/240); })()`);
await sleep(800);
await shot("3-night.png");
check(await evaluate(`jar.ents.some(e => e.kind === "firefly" && e.glow)`), "fireflies glow at night");

// click a creature to see its tooltip
const sx = await evaluate(`(() => { const e = jar.ents.find(e => e.kind === "snail"); return e && 306 + e.x * 368; })()`);
if (sx) { await click(sx, 490); check(await evaluate(`game.scene.getScene("Jar").tip.visible`), "tap creature shows tooltip"); }
await click(1000, 650);
await click(685, 664);
check(await evaluate(`game.scene.getScene("Jar").speedIdx === 1`), "speed button");

check(errors.length === 0, "no console errors" + (errors.length ? ": " + errors.join(" | ") : ""));
console.log(fail ? `${fail} FAILED` : "ALL OK", "shots in", outDir);
done(fail ? 1 : 0);
