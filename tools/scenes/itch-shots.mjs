// Screenshots for the itch page (1280x720, WebGL over http, ?mute). Each shot sets a jar state, lets it settle, snaps.
// usage: node tools/scenes/itch-shots.mjs [outDir]
import { join, resolve } from "node:path";
import { mkdirSync } from "node:fs";
import { launch, serve, sleep } from "../cdp.mjs";
const root = resolve(import.meta.dirname, "../..");
const out = process.argv[2] || join(root, "docs/m5/shots");
mkdirSync(out, { recursive: true });
const srv = await serve(root);
const cdp = await launch({ gpu: true });
await cdp.open(srv.url + "index.html?mute&seed=7&play");
await cdp.waitFor("window.STATE === 'jar'");
await sleep(800);
const sc = `game.scene.getScene("Jar")`;
const setup = js => cdp.evaluate(`(() => { const s = jar, S = ${sc}; S.coach.finish(); S.thanks.length = 0; S.card.busy = false; S.card.noteId = null; ${js}; for (const e of s.ents) { e.hp = 1; e.food = 0.9; } S.syncButtons(); if (s.req.i > 0) { S.speedIdx = 1; S.showSpeed(); } })()`);
// a few days of a looked-after jar first, so the 15-day graph tells a story in shots 2-5
const history = days => cdp.evaluate(`(() => { const s = jar; for (let k = 0; k < ${Math.round(days * 240)}; k++) { if (s.hum < 58) Sim.mist(s); Sim.setLamp(s, false); Sim.setLid(s, (s.day % 1) > 0.45 && (s.day % 1) < 0.5); Sim.tick(s, 1/240); } Sim.setLid(s, false); })()`);
const run = (days) => cdp.evaluate(`(() => { const s = jar; for (let k = 0; k < ${Math.round(days * 240)}; k++) { Sim.tick(s, 1/240); Req.update(s, 1/240); } })()`);
const spread = `s.ents.filter(e => e.kind === "firefly").forEach((e, i) => { e.x = [0.22, 0.4, 0.58, 0.74, 0.86][i] ?? 0.5; e.y = [0.62, 0.45, 0.72, 0.5, 0.68][i] ?? 0.6; e.tx = e.x; e.ty = e.y; })`;

// 1. the first glow: Dot lights up, Hazel's note
await setup(`Req.place(s, "firefly", 0.55, 0.62); s.lamp = false; s.hum = 60; s.air = 55; s.day = 0.82; ${spread}`);
await sleep(1500); await cdp.shot(join(out, "1-first-glow.png"));
// 2. Mo's moss carpet by day, seeds and cause lines
await history(3.6);
await setup(`s.req.i = 1; s.req.perks = ["speed"]; s.seeds = 6; s.slots.forEach((sl, i) => sl.moss = i > 5 && i < 13 ? 0.5 + (i % 3) * 0.1 : sl.moss * 0.4); s.lamp = false; s.hum = 66; s.air = 78; s.day = Math.floor(s.day) + 0.45`);
await run(0.05); await sleep(1500); await cdp.shot(join(out, "2-moss-carpet.png"));
// 3. Olive's light show at night
await setup(`s.req.i = 2; s.req.shop = ["moss", "snail", "firefly", "springtail"]; s.seeds = 30; for (let i = 3; i < 17; i++) s.slots[i].moss = 0.6;
  for (const x of [0.3, 0.7]) Req.place(s, "firefly", x, 0.6); Req.place(s, "springtail", 0.42); s.seeds = 4; s.lamp = false; s.hum = 66; s.air = 80; s.day = Math.floor(s.day) + 0.88; ${spread}`);
await run(0.04); await cdp.evaluate(`(() => { const s = jar; ${spread}; })()`); await sleep(1500); await cdp.shot(join(out, "3-light-show.png"));
// 4. Fen's soggy leaves and mould
await setup(`s.req.i = 3; s.req.hold = 0; s.req.shop = ["moss", "snail", "firefly", "springtail", "mushroom"]; Req.NOTES[3].setup(s); for (const i of [3, 4, 5, 12, 13, 14]) s.slots[i].mould = 0.35; s.day = Math.floor(s.day) + 1.45; s.lamp = false`);
await run(0.05); await sleep(2200); await cdp.shot(join(out, "4-mould.png"));
// 5. the party
await setup(`s.req.i = 5; s.req.shop = Req.SPECIES.slice(); s.seeds = 30; for (let i = 2; i < 18; i++) s.slots[i].moss = 0.6; for (const i of [3, 4, 5, 12, 13, 14]) { s.slots[i].mould = 0; s.slots[i].det = 0; }
  for (const [k, x] of [["fern", 0.14], ["fern", 0.86], ["mushroom", 0.34], ["firefly", 0.2], ["firefly", 0.5]]) Req.place(s, k, x, 0.6);
  s.lamp = false; s.hum = 68; s.air = 85; s.day = Math.floor(s.day) + 1.86; ${spread}`);
await run(0.03); await cdp.evaluate(`(() => { const s = jar; ${spread}; })()`); await sleep(1500); await cdp.shot(join(out, "5-party.png"));
if (cdp.errors.length) console.log("errors:", cdp.errors.join(" | "));
cdp.close(); srv.close();
console.log("shots in", out);
