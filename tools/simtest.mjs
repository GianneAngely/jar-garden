// Balance tests for src/sim.js. Each scenario runs the sim headless and checks the jar behaves
// the way the game teaches it. usage: node tools/simtest.mjs [-v]
import { createRequire } from "node:module";
const Sim = createRequire(import.meta.url)("../src/sim.js");
const V = process.argv.includes("-v");
const DT = 1 / 120;

function run(s, days, each) {
  const steps = Math.round(days / DT);
  for (let k = 0; k < steps; k++) { each?.(s, k); Sim.tick(s, DT); }
  return s;
}
const summary = s => {
  const c = {};
  for (const e of s.ents) c[e.kind] = (c[e.kind] || 0) + 1;
  return `day ${s.day.toFixed(1)} hum ${s.hum.toFixed(0)} air ${s.air.toFixed(0)} moss ${Sim.mossTotal(s).toFixed(1)} mould ${Sim.mouldTotal(s).toFixed(2)} seeds ${s.seeds} ${JSON.stringify(c)}`;
};
const give = (s, kind, xs) => { for (const x of xs) { s.seeds += Sim.KINDS[kind].cost; Sim.place(s, kind, x); } };
const atNoon = (s, k) => Math.abs((s.day % 1) - 0.5) < DT / 2;

let fail = 0;
function check(name, ok, s) {
  console.log((ok ? "ok   " : "FAIL ") + name + (V || !ok ? "\n     " + summary(s) : ""));
  if (!ok) fail++;
}

// 1. Starter jar left alone: snail lives, moss spreads, seeds come in.
{
  const s = run(Sim.create(1), 15);
  check("starter jar survives 15 days alone", Sim.count(s, "snail") >= 1 && Sim.mossTotal(s) > 2 && s.seeds > 15, s);
}

// 2. Lid open for good: jar dries out, snail dies of dryness.
{
  const s = Sim.create(2); Sim.setLid(s, true);
  run(s, 10);
  check("open lid dries the jar and the snail", s.hum < 45 && Sim.count(s, "snail") === 0 && s.log.some(l => l.text.includes("too dry")), s);
}

// 3. Over-misting a closed jar with leftovers grows mould.
{
  const s = Sim.create(3);
  for (const sl of s.slots) sl.det = 0.3;
  run(s, 8, (s, k) => { if (k % 30 === 0) Sim.mist(s); });
  check("wet closed jar grows mould", Sim.mouldTotal(s) > 2, s);
}

// 4. Same, but springtails + mushrooms keep mould lower.
{
  const base = Sim.create(4), helped = Sim.create(4);
  for (const s of [base, helped]) for (const sl of s.slots) sl.det = 0.3;
  give(helped, "springtail", [0.2, 0.4, 0.6, 0.8]);
  give(helped, "mushroom", [0.25, 0.75]);
  const wet = (s, k) => { if (k % 30 === 0) Sim.mist(s); };
  run(base, 8, wet); run(helped, 8, wet);
  check(`cleaners cut mould (${Sim.mouldTotal(base).toFixed(1)} vs ${Sim.mouldTotal(helped).toFixed(1)})`, Sim.mouldTotal(helped) < Sim.mouldTotal(base) * 0.5, helped);
}

// 5. Opening the lid kills mould.
{
  const s = Sim.create(5);
  for (const sl of s.slots) { sl.det = 0.3; sl.mould = 0.4; }
  Sim.setLid(s, true);
  run(s, 2);
  check("fresh air clears mould", Sim.mouldTotal(s) < 0.5, s);
}

// 6. Fireflies glow at night with the lamp off, and sulk with the lamp on.
{
  const s = Sim.create(6);
  for (let i = 4; i < 16; i++) s.slots[i].moss = 0.7;
  give(s, "firefly", [0.3, 0.6]);
  run(s, 0.55); // to night (day 0.85)
  const glowing = s.ents.filter(e => e.kind === "firefly" && e.glow).length;
  Sim.setLamp(s, true);
  run(s, 0.05);
  const sulky = s.ents.filter(e => e.kind === "firefly" && e.why === "lamp too bright").length;
  check(`fireflies glow in the dark (${glowing}) and dislike the lamp (${sulky})`, glowing === 2 && sulky === 2, s);
}

// 7. Too many snails in a small jar run out of air when the lid stays shut.
{
  const s = Sim.create(7);
  give(s, "snail", [0.1, 0.3, 0.7, 0.9, 0.2]);
  run(s, 6);
  check("crowded snails make the air stuffy", s.log.some(l => /stuffy|hungry|breathe/.test(l.text)) || s.history.some(h => h.air < 35), s);
}

// 8. A balanced jar (moss, fern, snail, springtails, mushroom, fireflies) stays alive 20 days,
//    with the player opening the lid at noon for a bit each day.
{
  const s = Sim.create(8);
  for (let i = 3; i < 17; i++) s.slots[i].moss = 0.5;
  give(s, "fern", [0.15, 0.85]);
  give(s, "springtail", [0.3, 0.7]);
  give(s, "mushroom", [0.5]);
  give(s, "firefly", [0.4, 0.6]);
  run(s, 20, (s, k) => { const f = s.day % 1; Sim.setLid(s, f > 0.45 && f < 0.55); });
  const kinds = new Set(s.ents.map(e => e.kind));
  check(`balanced jar keeps 5+ kinds for 20 days (${[...kinds]})`, kinds.size >= 5 && s.air > 40, s);
}

// 9. Deterministic from the seed.
{
  const a = run(Sim.create(9), 5), b = run(Sim.create(9), 5);
  check("same seed, same jar", summary(a) === summary(b), a);
}

console.log(fail ? `${fail} FAILED` : "ALL OK");
process.exit(fail ? 1 : 0);
