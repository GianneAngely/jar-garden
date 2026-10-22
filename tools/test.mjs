// Silent headless browser test (--mute-audio, ?mute): clicks through the jar UI, fast-forwards
// the sim, saves screenshots, fails on console errors. Never opens a visible Chrome.
// usage: node tools/test.mjs [url] [outDir]
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { launch, serve, sleep } from "./cdp.mjs";

// --http: serve the folder over http (WebGL + jar snapshots, like itch); default file:// (Canvas)
// --audio (with --http): also run every sound through a muted sound manager (?mute&audiotest), never audible
const AUDIOTEST = process.argv.includes("--audio");
const root = resolve(import.meta.dirname, "..");
const server = process.argv.includes("--http") ? await serve(root) : null;
const url = process.argv.filter(a => !a.startsWith("-"))[2] || (server ? server.url + "index.html" : pathToFileURL(join(root, "index.html")).href) + "?mute&seed=7" + (AUDIOTEST ? "&audiotest" : "");
const outDir = process.argv.filter(a => !a.startsWith("-"))[3] || join(root, "dist", "shots");
mkdirSync(outDir, { recursive: true });

const cdp = await launch({ gpu: !!server });
const { evaluate, waitFor, click, errors } = cdp;
const shot = name => cdp.shot(join(outDir, name));
const done = code => { cdp.close(); server?.close(); process.exit(code); };
const ff = days => evaluate(`(() => { for (let i = 0; i < ${Math.round(days * 240)}; i++) Sim.tick(jar, 1/240); return jar.day; })()`);

const V = process.argv.includes("-v");
let fail = 0;
const check = (ok, msg) => { console.log((ok ? "ok   " : "FAIL ") + msg); if (!ok) fail++; };

await cdp.open(url);
check(await waitFor(`window.STATE === "title"`), "title screen loads");
await sleep(400);
await shot("0-title.png");
await click(381, 362);                 // Play
check(await waitFor(`window.STATE === "jar"`), "Play opens the jar");
if (AUDIOTEST) check(await evaluate(`game.sound.mute === true && game.sound.volume === 0 && !!game.sound.context`), "audio test: sound runs but is muted at volume 0");
else check(await evaluate(`!game.sound.context`), "silent (?mute)");
await sleep(500);
await shot("1-start.png");

check(await evaluate(`game.scene.getScene("Jar").card.ask.text === "Make my jar glow?"`), "Hazel's first note is on the card");
check(await evaluate(`jar.lamp === true && game.scene.getScene("Jar").lampBtn.list[1].text === "Lamp off"`), "staged jar: lamp on, its button offers Lamp off");
check(await evaluate(`!game.scene.getScene("Jar").speedBtn.visible`), "speed button hidden before note 1");
await click(870 + 156, 556);           // springtail card: locked, and the coach owns the screen
check(await evaluate(`game.scene.getScene("Jar").selected === null`), "locked shop card does nothing during the onboarding");

// onboarding, played for real at 1x: each beat's prompt, only the pointed control works, glow within ~35 s
const coach = `game.scene.getScene("Jar").coach.pillText.text`;
const t0 = Date.now();
check((await evaluate(coach)).startsWith("Pip the snail can't breathe"), "coach beat 1: open the lid");
await click(555, 664);                 // Mist is locked for now
check(await evaluate(`jar.hum < 50`), "locked control (Mist) does nothing during beat 1");
await click(295, 664);
check(await evaluate(`jar.lid === true`), "Open lid button");
check(await waitFor(`${coach}.startsWith("Close it")`, 8000), "coach: close it once the air is fresh");
await click(295, 664);
check(await evaluate(`jar.lid === false`), "Close lid button");
await click(555, 664);
check(await evaluate(`jar.hum >= 54`), "Mist raises humidity");
check((await evaluate(coach)).startsWith("Add a firefly"), "coach: add a firefly");
await click(870 + 312, 556 + 84);      // firefly card, tapped twice (used to drop the pick and soft-lock the coach)
await click(870 + 312, 556 + 84);
await click(284, 400);                 // a near miss on the glass rim
check(await evaluate(`game.scene.getScene("Jar").selected === "firefly"`), "double tap / near miss keeps the firefly picked during the coach");
await click(490, 330);
check(await evaluate(`Sim.count(jar, "firefly") === 1 && jar.ents.some(e => e.name === "Dot")`), "Dot the firefly is in");
check(await waitFor(`${coach}.startsWith("Dot the firefly hates the lamp")`, 25000), "coach: lamp off at dusk");
await shot("2-onboarding-dusk.png");
await click(425, 664);
check(await evaluate(`jar.lamp === false`), "Lamp button");
check(await waitFor(`jar.req.i === 1`, 15000), "Dot glows: note 1 done");
const secs = (Date.now() - t0) / 1000;
check(secs < 40, `onboarding took ${secs.toFixed(1)} s with test clicks (< 40)`);
check(await evaluate(`jar.req.i === 1 && jar.seeds >= 6`), "note 1 done pays its seeds");
await sleep(2000);
await shot("3-postcard.png");
if (server) check(await evaluate(`game.renderer.type === Phaser.WEBGL && game.textures.exists("pc-glow")`), "WebGL over http: jar photo taken for the postcard");
check(await waitFor(`game.scene.getScene("Jar").card.ask.text.startsWith("Moss on 35%") && game.scene.getScene("Jar").speedBtn.visible`, 9000), "postcard, then Mo's note arrives, speed unlocked");
await shot("3b-note2.png");
await click(870 + 312, 556);           // fern card, still locked
check(await evaluate(`game.scene.getScene("Jar").selected === null && game.scene.getScene("Jar").toastText.text.includes("note 4")`), "locked shop card explains when it opens");

await evaluate(`jar.seeds = 40; jar.req.shop = Sim.ANIMALS.concat(["moss", "fern", "mushroom"])`);
await click(870 + 156, 556);           // springtail card
check(await evaluate(`game.scene.getScene("Jar").selected === "springtail"`), "select springtail in shop");
await click(380, 470);
await click(600, 470);
check(await evaluate(`Sim.count(jar, "springtail") === 2`), "tap in jar places springtails");
await click(870 + 312, 556 + 84);      // firefly card
await click(420, 320);
await click(560, 300);                 // a tap that lands on a flying firefly opens its tooltip instead
check(await evaluate(`Sim.count(jar, "firefly") >= 2`), "fireflies placed" + (V ? " " + await evaluate(`Sim.count(jar, "firefly") + " seeds " + jar.seeds + " sel " + game.scene.getScene("Jar").selected`) : ""));
await click(870 + 312, 556);           // fern card
await click(330, 480);
check(await evaluate(`Sim.count(jar, "fern") === 1`), "fern placed");

for (let i = 6; i < 15; i++) await evaluate(`jar.slots[${i}].moss = Math.max(jar.slots[${i}].moss, 0.6)`);
await ff(3);
await sleep(400);
await shot("4-day.png");
check(await evaluate(`jar.history.length > 10`), "graph history fills");

// to night: fireflies glow
await evaluate(`(() => { while (!(jar.day % 1 > 0.92)) Sim.tick(jar, 1/240); })()`);
await sleep(800);
await shot("5-night.png");
check(await evaluate(`jar.ents.some(e => e.kind === "firefly" && e.glow)`), "fireflies glow at night");

// click a creature to see its tooltip (nothing picked in the shop, else the tap would place)
await evaluate(`game.scene.getScene("Jar").select(null)`);
const sx = await evaluate(`(() => { const e = jar.ents.find(e => e.kind === "snail"); return e && 306 + e.x * 368; })()`);
if (sx) { await click(sx, 490); check(await evaluate(`game.scene.getScene("Jar").tip.visible`), "tap creature shows tooltip"); }
await click(1000, 650);
await click(685, 664);
check(await evaluate(`game.scene.getScene("Jar").speedIdx === 1`), "speed button");

// lose: no animals for a day -> "The jar went quiet" -> Rewind restores the note's start
await evaluate(`(() => { const sc = game.scene.getScene("Jar"); jar.ents = jar.ents.filter(e => !Sim.ANIMALS.includes(e.kind)); jar.slots.forEach(sl => sl.moss = 0); // no note can finish (and bring a gift) meanwhile
  const evs = []; for (let k = 0; k < 260; k++) { Sim.tick(jar, 1/240); const ev = Req.update(jar, 1/240); if (ev) { evs.push(ev.type); sc.onNote(ev); } } return evs.join(",") + " i=" + jar.req.i + " ents=" + jar.ents.map(e => e.kind).join("/"); })()`).then(r => V && console.log("     lose events:", r));
await sleep(500);
check(await evaluate(`game.scene.getScene("Jar").children.list.some(o => o.depth === 70)`), "lose shows the quiet-jar card");
await shot("6-lose.png");
await click(640, 415);
check(await evaluate(`(() => { const sc = game.scene.getScene("Jar"); return jar !== sc.noteSnap && jar.ents.some(e => Sim.ANIMALS.includes(e.kind)) && jar.req.i === sc.noteSnap.req.i && !jar.req.lost; })()`), "Rewind brings the jar back to the note start" + (V ? " " + await evaluate(`(() => { const sc = game.scene.getScene("Jar"); return [jar === sc.noteSnap, jar.ents.length, jar.req.i, sc.noteSnap.req.i, jar.req.lost, sc.children.list.filter(o => o.depth === 70).length].join(","); })()`) : ""));

if (AUDIOTEST) check(await evaluate(`["music-day", "music-night"].includes(Audio.beds.music?.key) && Audio.beds.music.snd.isPlaying && game.sound.mute`), "audio test: music bed follows day/night, muted");
// audio files decode (OfflineAudioContext renders nothing out loud; the page itself stays ?mute)
if (server) {
  const res = await evaluate(`(async () => { const ctx = new OfflineAudioContext(1, 44100, 44100), out = [];
    for (const k of [...SFX, ...LOOPS]) for (const ext of ["ogg", "mp3"]) {
      try { const a = await ctx.decodeAudioData(await (await fetch("assets/audio/" + k + "." + ext)).arrayBuffer()); if (!(a.duration > 0.05)) out.push(k + "." + ext + " empty"); }
      catch (e) { out.push(k + "." + ext + " " + e.message); } }
    return out; })()`);
  check(Array.isArray(res) && res.length === 0, "all audio files decode (ogg + mp3)" + (res?.length ? ": " + res.join(", ") : ""));
}

check(errors.length === 0, "no console errors" + (errors.length ? ": " + errors.join(" | ") : ""));
console.log(fail ? `${fail} FAILED` : "ALL OK", "shots in", outDir);
done(fail ? 1 : 0);
