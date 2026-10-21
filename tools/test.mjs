// Silent headless browser test (--mute-audio, ?mute): clicks through the jar UI, fast-forwards
// the sim, saves screenshots, fails on console errors. Never opens a visible Chrome.
// usage: node tools/test.mjs [url] [outDir]
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { launch, sleep } from "./cdp.mjs";

const root = resolve(import.meta.dirname, "..");
const url = process.argv[2] || pathToFileURL(join(root, "index.html")).href + "?mute&seed=7";
const outDir = process.argv[3] || join(root, "dist", "shots");
mkdirSync(outDir, { recursive: true });

const cdp = await launch();
const { evaluate, waitFor, click, errors } = cdp;
const shot = name => cdp.shot(join(outDir, name));
const done = code => { cdp.close(); process.exit(code); };
const ff = days => evaluate(`(() => { for (let i = 0; i < ${Math.round(days * 240)}; i++) Sim.tick(jar, 1/240); return jar.day; })()`);

let fail = 0;
const check = (ok, msg) => { console.log((ok ? "ok   " : "FAIL ") + msg); if (!ok) fail++; };

await cdp.open(url);
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
