// Tests for src/requests.js at the game's sim step (DT 1/240): onboarding glow timing, the whole six-note arc on
// one jar for 20 rng seeds with varied players, per-note wrong/idle baselines that must NOT finish, and the lose rule.
// usage: node tools/reqtest.mjs [-v]
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const Sim = require("../src/sim.js");
const Req = require("../src/requests.js");
const V = process.argv.includes("-v");
const DT = 1 / 240;
const SEEDS = Array.from({ length: 20 }, (_, i) => i + 1);

let fail = 0;
const check = (ok, msg) => { console.log((ok ? "ok   " : "FAIL ") + msg); if (!ok) fail++; };
const cnt = (s, k) => Sim.count(s, k);
const stats = a => {
  const v = a.filter(x => x != null).sort((x, y) => x - y);
  return v.length ? `${v.length}/${a.length} done, median ${v[v.length >> 1].toFixed(2)} d (max ${v.at(-1).toFixed(2)})` : `0/${a.length} done`;
};
const fresh = seed => { const s = Sim.create(seed); Req.create(s); return s; };

// Run the active note with a player until it is done or maxDays pass. Returns in-game days, or null.
function play(s, player, maxDays) {
  const t0 = s.day, i0 = s.req.i, pm = {};
  for (let k = 0, n = Math.round(maxDays / DT); k < n; k++) {
    player?.(s, pm);
    Sim.tick(s, DT);
    Req.gate(s, DT);
    Req.update(s, DT);
    if (s.req.i !== i0) return s.day - t0;
  }
  return null;
}

// Onboarding player: each beat starts when its sim state is true, then reacts after r x base seconds.
function tutor(r = 1, late = 0) {
  const sec = x => (x * r) / 60;
  return (s, pm) => {
    pm.n = (pm.n ?? -1) + 1; const t = pm.n * DT; // real time (the clock gate may hold s.day)
    if (pm.open == null && t >= sec(3)) { Sim.setLid(s, true); pm.open = t; }
    if (pm.open != null && pm.close == null && s.air >= 45) { pm.cp ??= t; if (t >= pm.cp + sec(2) + late / 60) { Sim.setLid(s, false); pm.close = t; } }
    if (pm.close != null && pm.mist == null && t >= pm.close + sec(2)) { Sim.mist(s); pm.mist = t; }
    if (pm.mist != null && pm.ff == null && t >= pm.mist + sec(4)) { Req.place(s, "firefly", 0.55, 0.6); pm.ff = t; pm.hum = s.hum; }
    if (pm.ff != null && s.lamp && Sim.isNight(s)) { pm.np ??= t; if (t >= pm.np + sec(3)) Sim.setLamp(s, false); }
  };
}

// Players for notes 2-6 (they only buy what the shop sells: Req.place)
const mistTo = (s, target, pm) => { if (s.hum < target && s.day - (pm.lm ?? -9) > 0.1) { Sim.mist(s); pm.lm = s.day; } };
const lampNight = s => Sim.setLamp(s, Sim.isNight(s));
const lampOff = s => Sim.setLamp(s, false);
const buyUpTo = (s, kind, n, xs) => { while (cnt(s, kind) < n && s.seeds >= Sim.KINDS[kind].cost) if (!Req.place(s, kind, xs[cnt(s, kind) % xs.length], 0.6).ok) break; };
const buyMissing = (s, list) => { for (const [k, x] of list) if (!cnt(s, k) && s.seeds >= Sim.KINDS[k].cost) Req.place(s, k, x, 0.6); };
const mossSpots = (s, n) => {
  const mossy = s.slots.map((sl, i) => (sl.moss > 0.05 ? i : -1)).filter(i => i >= 0);
  const d = i => (mossy.length ? Math.min(...mossy.map(j => Math.abs(i - j))) : 0);
  return s.slots.map((sl, i) => (sl.moss < 0.05 ? i : -1)).filter(i => i >= 0)
    .sort((a, b) => d(a) - d(b) || Math.abs(a - 9.5) - Math.abs(b - 9.5)).slice(0, n).map(i => Sim.slotX(i));
};
const fiveMoss = (s, pm) => { if (!pm.b) { for (const x of mossSpots(s, Math.min(5, s.seeds))) Req.place(s, "moss", x); pm.b = 1; } };
const KINDS3 = [["fern", 0.15], ["mushroom", 0.5], ["springtail", 0.4]];
const P = {
  moss: { engaged: (s, pm) => { fiveMoss(s, pm); mistTo(s, 60, pm); lampNight(s); }, idle: null },
  show: {
    engaged: (s, pm) => { buyUpTo(s, "firefly", 3, [0.3, 0.5, 0.7]); mistTo(s, 60, pm); lampOff(s); },
    lampOn: (s, pm) => { buyUpTo(s, "firefly", 3, [0.3, 0.5, 0.7]); mistTo(s, 60, pm); lampNight(s); },
    idle: s => lampOff(s),
  },
  soggy: {
    airOut: s => { Sim.setLid(s, s.slots.some(sl => sl.mould > 0)); lampOff(s); },
    mush2: s => { buyUpTo(s, "mushroom", 2, [0.225, 0.675]); lampOff(s); },
    springOnly: s => { buyUpTo(s, "springtail", 2, [0.25, 0.7]); lampOff(s); },
    keepMisting: (s, pm) => { mistTo(s, 90, pm); lampOff(s); },
    idle: s => lampOff(s),
  },
  full: {
    engaged: (s, pm) => { buyMissing(s, [...KINDS3, ["firefly", 0.6]]); Sim.setLid(s, false); mistTo(s, 65, pm); lampOff(s); },
    lampNight: (s, pm) => { buyMissing(s, KINDS3); Sim.setLid(s, false); mistTo(s, 65, pm); lampNight(s); },
    idle: s => lampOff(s),
  },
  party: {
    engaged: (s, pm) => { buyUpTo(s, "firefly", 5, [0.2, 0.4, 0.6, 0.8, 0.5]); buyMissing(s, KINDS3); Sim.setLid(s, false); mistTo(s, 65, pm); lampOff(s); },
    lampOn: (s, pm) => { buyUpTo(s, "firefly", 5, [0.2, 0.4, 0.6, 0.8, 0.5]); Sim.setLid(s, false); mistTo(s, 65, pm); Sim.setLamp(s, true); },
    idle: s => lampOff(s),
  },
};
const looker = fn => (s, pm) => { if (s.day - (pm.look ?? -9) >= 0.05) { pm.look = s.day; fn(s, pm); } }; // looks every 3 s at 1x
const delayed = (fn, d) => (s, pm) => { pm.d0 ??= s.day; if (s.day - pm.d0 >= d) fn(s, pm); };
const mistake = (bad, d, fn) => (s, pm) => { pm.m0 ??= s.day; if (s.day - pm.m0 < d) bad(s, pm); else fn(s, pm); }; // bad for d days, then fn

// 1. Onboarding: first glow early, the firefly never sad, humidity >= 55 when it goes in
for (const [label, r, late, maxSec] of [["quick 1x", 1, 0, 35], ["slow 2x", 2, 0, 45], ["very slow 3x", 3, 0, 60], ["closes lid 12 s late", 1, 12, 45]]) {
  const s = fresh(1), pl = tutor(r, late), pm = {};
  let t = 0, glow = null, sad = 0;
  for (let k = 0; k < 2 / DT && s.req.i === 0; k++) {
    pl(s, pm); Sim.tick(s, DT); Req.gate(s, DT); Req.update(s, DT); t += DT * 60;
    pm.ffHum ??= s.ents.some(e => e.kind === "firefly") ? s.hum : undefined;
    const ff = s.ents.find(e => e.kind === "firefly");
    if (ff?.glow && !s.lamp) { glow ??= t; if (ff.mood === "sad") sad++; }
  }
  check(s.req.i === 1 && glow != null && glow <= maxSec && sad === 0 && pm.ffHum >= 55,
    `onboarding ${label}: first glow ${glow?.toFixed(1)} s (<= ${maxSec}), firefly placed at hum ${pm.ffHum?.toFixed(1)}, sad while glowing ${sad}`);
}
{ // a player who waits a long time at "Lamp off!" (the clock is held, the sim runs on): Dot must survive
  const s = fresh(5), pl = tutor(1), pm = {};
  for (let k = 0; k < 3 / DT && !(s.lamp && Sim.isNight(s) && Sim.count(s, "firefly")); k++) { pl(s, pm); Sim.tick(s, DT); Req.gate(s, DT); Req.update(s, DT); }
  for (let k = 0; k < 2.5 / DT; k++) { Sim.tick(s, DT); Req.gate(s, DT); Req.update(s, DT); } // 150 s of waiting with the lamp on
  const alive = Sim.count(s, "firefly");
  Sim.setLamp(s, false);
  for (let k = 0; k < 1 / DT && s.req.i === 0; k++) { Sim.tick(s, DT); Req.gate(s, DT); Req.update(s, DT); }
  check(alive === 1 && s.req.i === 1, `note 1 survives a long wait at "Lamp off!" (Dot alive ${alive}, note done ${s.req.i === 1})`);
}
check(play(fresh(2), null, 2) == null, "note 1 idle never finishes");
check(play(fresh(3), (s, pm) => { pm.f ??= Req.place(s, "firefly", 0.5, 0.6); }, 2) == null, "note 1 with the lamp never off never finishes");
check(!Req.place(fresh(4), "fern", 0.5).ok, "fern is not in the shop at the start");

// 2. The whole arc on one jar, 20 players (odd seeds clear mould with mushrooms, even with the lid)
const ORDER = ["glow", "moss", "show", "soggy", "full", "party"];
const snaps = Object.fromEntries(ORDER.map(id => [id, []]));
const days = Object.fromEntries(ORDER.map(id => [id, []]));
const arc = [];
for (const seed of SEEDS) {
  const s = fresh(seed);
  let tot = 0, j = (seed * 2654435761) >>> 0;
  const jitter = () => ((j = (j * 1103515245 + 12345) >>> 0) / 4294967296) * 0.2;
  for (const id of ORDER) {
    snaps[id].push(structuredClone(s));
    const how = { moss: "engaged", show: "engaged", soggy: seed % 2 ? "mush2" : "airOut", full: "engaged", party: "engaged" }[id];
    const d = play(s, id === "glow" ? tutor(seed >= 15 ? 2 : 1) : delayed(P[id][how], jitter()), 6);
    days[id].push(d);
    if (d == null) { if (V) console.log(`     seed ${seed} stuck on ${id}`); break; }
    tot += d;
  }
  if (s.req.won) arc.push({ tot, s });
}
for (const id of ORDER) check(days[id].every(d => d != null), `note ${id.padEnd(5)} engaged players: ${stats(days[id])}`);
const tots = arc.map(a => a.tot).sort((a, b) => a - b);
check(arc.length === SEEDS.length && tots[tots.length >> 1] < 8,
  `whole arc ${arc.length}/${SEEDS.length} won, median ${tots[tots.length >> 1]?.toFixed(2)} d, deaths max ${Math.max(...arc.map(a => a.s.died))}, seeds left median ${arc.map(a => a.s.seeds).sort((a, b) => a - b)[arc.length >> 1]}`);
// M3d: the 3.9 d party outlier was a hungry springtail / starving baby mushroom blocking "nobody sad"
check(Math.max(...days.party) <= 1.2, `note party arc tail: max ${Math.max(...days.party).toFixed(2)} d (<= 1.2, was 3.92)`);

// 3. Per note, from each player's real start jar: careful players finish, wrong or idle ones don't
const from = (id, fn, d) => snaps[id].map(sn => play(structuredClone(sn), fn, d));
for (const [id, name, fn, d, expect] of [
  ["moss", "engaged, looks every 3 s", looker(P.moss.engaged), 6, true],
  ["moss", "idle", null, 6, false],
  ["show", "engaged, looks every 3 s", looker(P.show.engaged), 5, true],
  ["show", "lamp on at night", P.show.lampOn, 4, false],
  ["show", "idle (lamp off)", P.show.idle, 4, false],
  ["soggy", "lid open till clean, looks every 3 s", looker(P.soggy.airOut), 5, true],
  ["soggy", "2 mushrooms on the leaves", P.soggy.mush2, 5, true],
  ["soggy", "2 springtails only", P.soggy.springOnly, 4, false],
  ["soggy", "keeps misting", P.soggy.keepMisting, 4, false],
  ["soggy", "idle", P.soggy.idle, 4, false],
  ["full", "engaged, looks every 3 s", looker(P.full.engaged), 5, true],
  ["full", "lamp on at night", P.full.lampNight, 4, false],
  ["full", "idle", P.full.idle, 4, false],
  ["full", "lid left open 1 d, then engaged", mistake(s => Sim.setLid(s, true), 1, P.full.engaged), 3, true], // M3d: was 18/20 in 3 d (max 6.41 d)
  ["party", "engaged, looks every 3 s", looker(P.party.engaged), 5, true],
  ["party", "lamp on", P.party.lampOn, 4, false],
  ["party", "idle (lamp off)", P.party.idle, 4, false],
  ["party", "lid left open 1 d, then engaged", mistake(s => Sim.setLid(s, true), 1, P.party.engaged), 3, true], // M3d: was 13/20 in 3 d (max 6.96 d)
  ["party", "2nd springtail first, then engaged", (s, pm) => { pm.sp ??= cnt(s, "springtail") < 2 && Req.place(s, "springtail", 0.7); P.party.engaged(s, pm); }, 3, true], // M3d: was 15/20 in 3 d (19/20 in 20 d)
]) {
  const r = from(id, fn, d), n = r.filter(x => x != null).length;
  check(expect ? n === r.length : n === 0, `note ${id.padEnd(5)} ${name.padEnd(36)} ${stats(r)}${expect ? "" : ` in ${d} d`}`);
}

// 4. Lose: no animal for a day. Idle never loses; lid left open does, with a tip
{
  const after = seed => { const s = snaps.moss[seed - 1]; return structuredClone(s); };
  const run = (p, d) => SEEDS.map(seed => {
    const s = after(seed), pm = {};
    for (let k = 0; k < d / DT; k++) { p(s, pm); Sim.tick(s, DT); const ev = Req.update(s, DT); if (ev?.type === "lose") return ev.tip; }
    return null;
  });
  const idle = run(() => {}, 10), open = run(s => Sim.setLid(s, true), 10);
  check(idle.every(x => x == null), `lose: idle jar never loses in 10 d (${idle.filter(Boolean).length}/20)`);
  check(open.every(x => x != null), `lose: lid left open loses within 10 d (${open.filter(Boolean).length}/20), tip "${open.find(Boolean)}"`);
}

// 5. M3d: a springtail or mushroom whose only trouble is hunger is never "sad", but it still starves and earns no seed
{
  const s = Sim.create(5);
  s.ents = []; s.seeds = 5; s.hum = 70;
  for (const sl of s.slots) Object.assign(sl, { moss: 0, mould: 0, det: 0 });
  Sim.place(s, "springtail", 0.5); Sim.place(s, "mushroom", 0.3);
  for (const e of s.ents) e.food = 0.1;
  let sad = 0, paid = 0;
  for (let k = 0; k < 3 / DT; k++) {
    const day = Math.floor(s.day);
    Sim.tick(s, DT);
    sad += s.ents.filter(e => e.mood === "sad").length;
    if (Math.floor(s.day) !== day) paid += s.lastPay.kinds.length;
  }
  check(sad === 0 && paid === 0 && s.ents.length === 0 && s.log.some(l => l.text.includes("nothing to eat")),
    `hungry cleaners: sad ticks ${sad}, seeds paid ${paid}, alive after 3 d ${s.ents.length} (starved, never sad, no seed)`);
}

console.log(fail ? `${fail} FAILED` : "ALL OK");
process.exit(fail ? 1 : 0);
