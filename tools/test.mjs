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

check(await evaluate(`game.scene.getScene("Jar").card.ask.text === "Make my jar glow?"`), "Hazel's first note is on the card");
check(await evaluate(`jar.lamp === true && game.scene.getScene("Jar").lampBtn.list[1].text === "Lamp on"`), "staged jar: lamp on, button says so");
check(await evaluate(`!game.scene.getScene("Jar").speedBtn.visible`), "speed button hidden before note 1");
await click(870 + 156, 556);           // springtail card, locked
check(await evaluate(`game.scene.getScene("Jar").selected === null && game.scene.getScene("Jar").toastText.text.includes("note 2")`), "locked shop card explains when it opens");

await click(295, 664);
check(await evaluate(`jar.lid === true`), "Open lid button");
await click(295, 664);
check(await evaluate(`jar.lid === false`), "Close lid button");
await click(425, 664);
check(await evaluate(`jar.lamp === false`), "Lamp button");

// finish note 1 by hand: a glowing firefly at night with the lamp off -> thank-you, then Mo's note
await evaluate(`(() => { Req.place(jar, "firefly", 0.5, 0.6); jar.slots.forEach(sl => sl.moss = Math.max(sl.moss, 0.3)); jar.hum = 70; jar.lamp = false;
  while (jar.req.i === 0) { Sim.tick(jar, 1/240); Req.gate(jar, 1/240); const ev = Req.update(jar, 1/240); if (ev) game.scene.getScene("Jar").onNote(ev); } })()`);
check(await evaluate(`jar.req.i === 1 && jar.seeds >= 6`), "note 1 done pays its seeds");
await sleep(3400);
check(await evaluate(`game.scene.getScene("Jar").card.ask.text.startsWith("Moss on 40%") && game.scene.getScene("Jar").speedBtn.visible`), "Mo's note arrives, speed unlocked");
await shot("2-note2.png");

await evaluate(`jar.seeds = 40; jar.req.shop = Sim.ANIMALS.concat(["moss", "fern", "mushroom"])`);
await click(870 + 156, 556);           // springtail card
check(await evaluate(`game.scene.getScene("Jar").selected === "springtail"`), "select springtail in shop");
await click(380, 470);
await click(600, 470);
check(await evaluate(`Sim.count(jar, "springtail") === 2`), "tap in jar places springtails");
await click(870 + 312, 556 + 84);      // firefly card
await click(420, 320);
await click(560, 300);
check(await evaluate(`Sim.count(jar, "firefly") === 3`), "fireflies placed");
await click(870 + 312, 556);           // fern card
await click(330, 480);
check(await evaluate(`Sim.count(jar, "fern") === 1`), "fern placed");

for (let i = 6; i < 15; i++) await evaluate(`jar.slots[${i}].moss = Math.max(jar.slots[${i}].moss, 0.6)`);
await ff(3);
await sleep(400);
await shot("3-day.png");
check(await evaluate(`jar.history.length > 10`), "graph history fills");

// to night: fireflies glow
await evaluate(`(() => { while (!(jar.day % 1 > 0.92)) Sim.tick(jar, 1/240); })()`);
await sleep(800);
await shot("4-night.png");
check(await evaluate(`jar.ents.some(e => e.kind === "firefly" && e.glow)`), "fireflies glow at night");

// click a creature to see its tooltip
const sx = await evaluate(`(() => { const e = jar.ents.find(e => e.kind === "snail"); return e && 306 + e.x * 368; })()`);
if (sx) { await click(sx, 490); check(await evaluate(`game.scene.getScene("Jar").tip.visible`), "tap creature shows tooltip"); }
await click(1000, 650);
await click(685, 664);
check(await evaluate(`game.scene.getScene("Jar").speedIdx === 1`), "speed button");

// lose: no animals for a day -> "The jar went quiet" -> Rewind restores the note's start
await evaluate(`(() => { const sc = game.scene.getScene("Jar"); jar.ents = jar.ents.filter(e => !Sim.ANIMALS.includes(e.kind));
  for (let k = 0; k < 260; k++) { Sim.tick(jar, 1/240); const ev = Req.update(jar, 1/240); if (ev) sc.onNote(ev); } })()`);
await sleep(500);
check(await evaluate(`game.scene.getScene("Jar").children.list.some(o => o.depth === 70)`), "lose shows the quiet-jar card");
await shot("5-lose.png");
await click(640, 415);
check(await evaluate(`(() => { const sc = game.scene.getScene("Jar"); return jar !== sc.noteSnap && jar.ents.some(e => Sim.ANIMALS.includes(e.kind)) && jar.req.i === sc.noteSnap.req.i && !jar.req.lost; })()`), "Rewind brings the jar back to the note start");

check(errors.length === 0, "no console errors" + (errors.length ? ": " + errors.join(" | ") : ""));
console.log(fail ? `${fail} FAILED` : "ALL OK", "shots in", outDir);
done(fail ? 1 : 0);
