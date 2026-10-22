// Jar Garden simulation. Pure data + rules, no Phaser, so node can test it (tools/simtest.mjs).
// Time unit: 1 = one in-game day. Positions: x 0..1 across the jar floor, y 0..1 up from the soil.
(function (root) {
  const N = 20; // soil slots

  const KINDS = {
    moss:       { cost: 1, name: "Moss",       blurb: "Makes fresh air. Loves light and damp." },
    springtail: { cost: 2, name: "Springtail", blurb: "Tiny cleaner. Eats mould." },
    fern:       { cost: 3, name: "Fern",       blurb: "Big leafy air maker. Needs light." },
    mushroom:   { cost: 3, name: "Mushroom",   blurb: "Eats leftovers. Keeps mould away." },
    snail:      { cost: 4, name: "Snail",      blurb: "Eats leftovers, then moss." },
    firefly:    { cost: 6, name: "Firefly",    blurb: "Glows in the dark. Needs moss." },
  };
  const ANIMALS = ["snail", "springtail", "firefly"];
  const FIREFLY_BREED = 0; // fireflies are bought, never born (rand draw kept for the RNG stream)
  const MOSS_PAY = 5;      // moss pays a seed at >= 25% floor cover
  const PLURAL = { moss: "moss", springtail: "springtails", fern: "ferns", mushroom: "mushrooms", snail: "snails", firefly: "fireflies" };
  const CAP = { snail: 6, springtail: 24, firefly: 6, mushroom: 6, fern: 4 };

  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const slotOf = x => Math.min(N - 1, Math.max(0, Math.floor(x * N)));
  const slotX = i => (i + 0.5) / N;

  // mulberry32, state kept in s.rng so a run is reproducible from its seed
  function rand(s) {
    let t = (s.rng = (s.rng + 0x6d2b79f5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function create(seed = 1) {
    const s = {
      rng: seed, day: 0.3, lid: false, lamp: false,
      hum: 65, air: 85, seeds: 8, nextId: 1,
      slots: Array.from({ length: N }, () => ({ moss: 0, mould: 0, det: 0 })),
      ents: [], history: [], log: [], born: 0, died: 0,
    };
    for (let i = 8; i <= 11; i++) s.slots[i].moss = 0.5;
    spawn(s, "snail", 0.5);
    return s;
  }

  function spawn(s, kind, x, y) {
    const e = {
      id: s.nextId++, kind, x: clamp(x, 0.03, 0.97), y: y ?? (kind === "firefly" ? 0.4 + rand(s) * 0.4 : 0),
      hp: 1, food: 0.6, age: 0, size: kind === "fern" ? 0.4 : 1, dir: rand(s) < 0.5 ? -1 : 1,
      mood: "ok", why: "", glow: false, tx: rand(s), ty: 0.5,
    };
    s.ents.push(e);
    return e;
  }

  const count = (s, kind) => s.ents.reduce((n, e) => n + (e.kind === kind), 0);
  const mossTotal = s => s.slots.reduce((n, sl) => n + sl.moss, 0);
  const mouldTotal = s => s.slots.reduce((n, sl) => n + sl.mould, 0);

  // Sun 0.25..0.75 of each day; the lamp gives 0.7 any time.
  function light(s) {
    const f = s.day % 1;
    const sun = f > 0.25 && f < 0.75 ? Math.sin(Math.PI * (f - 0.25) / 0.5) : 0;
    return Math.max(sun, s.lamp ? 0.7 : 0);
  }
  const isNight = s => { const f = s.day % 1; return f < 0.25 || f > 0.75; };

  function note(s, text) {
    s.log.unshift({ day: Math.floor(s.day) + 1, text });
    if (s.log.length > 8) s.log.pop();
  }

  // Player actions ---------------------------------------------------------
  function place(s, kind, x, y) {
    const k = KINDS[kind];
    if (!k || s.seeds < k.cost) return { ok: false, why: "not enough seeds" };
    if (CAP[kind] && count(s, kind) >= CAP[kind]) return { ok: false, why: "the jar is full of " + PLURAL[kind] };
    s.seeds -= k.cost;
    if (kind === "moss") {
      // a tap on an existing tuft plants on the nearest bare soil instead (never pays for nothing)
      let i = slotOf(x);
      if (s.slots[i].moss >= 0.45) {
        const bare = s.slots.map((sl, j) => j).filter(j => s.slots[j].moss < 0.45).sort((a, b) => Math.abs(a - i) - Math.abs(b - i))[0];
        if (bare === undefined) { s.seeds += k.cost; return { ok: false, why: "the floor is already all moss" }; }
        i = bare;
      }
      s.slots[i].moss = Math.max(s.slots[i].moss, 0.5);
      s.slots[i].mould *= 0.5;
      return { ok: true, slot: i };
    } else {
      spawn(s, kind, kind === "fern" ? clamp(x, 0.12, 0.88) : x, y); // fern fronds would poke through the curved walls
    }
    return { ok: true };
  }
  const setLid = (s, open) => { s.lid = open; };
  const setLamp = (s, on) => { s.lamp = on; };
  const mist = s => { s.hum = Math.min(100, s.hum + 10); };

  // One step of dt days (the game uses ~1/120) -----------------------------
  function tick(s, dt) {
    const prevDay = Math.floor(s.day);
    const f = { air: { lid: 0, plants: 0, animals: 0, mould: 0 }, hum: { lid: 0, plants: 0, glass: 0 } };
    s.day += dt;
    const L = light(s);
    const dark = L < 0.15;

    // Air exchange through the lid
    if (s.lid) {
      f.hum.lid += (40 - s.hum) * 1.2 * dt; f.air.lid += (100 - s.air) * 3 * dt;
      s.hum += (40 - s.hum) * 1.2 * dt;
      s.air += (100 - s.air) * 3 * dt;
    } else {
      f.hum.glass -= 0.5 * dt + (s.hum > 88 ? (s.hum - 88) * 2 * dt : 0);
      s.hum -= 0.5 * dt;
      if (s.hum > 88) s.hum -= (s.hum - 88) * 2 * dt; // condenses on the glass
    }

    // Soil: moss, mould, detritus
    const wetOk = s.hum >= 45 && s.hum <= 95;
    let moss = 0, mould = 0;
    for (let i = 0; i < N; i++) {
      const sl = s.slots[i];
      if (sl.moss > 0) {
        if (wetOk && L > 0.15) sl.moss += sl.moss * (1.05 - sl.moss) * 1.4 * L * dt;
        let loss = 0;
        if (s.hum < 30) loss += sl.moss * 0.4 * dt;
        loss += sl.mould * sl.moss * 0.9 * dt;
        sl.moss -= loss;
        sl.det += loss * 0.6 + sl.moss * 0.03 * dt; // dead bits + old leaves
        if (sl.moss < 0.01) sl.moss = 0;
        if (sl.moss > 0.6 && wetOk && rand(s) < 0.7 * dt) {
          const j = i + (rand(s) < 0.5 ? -1 : 1);
          if (j >= 0 && j < N && s.slots[j].moss < 0.05 && s.slots[j].mould < 0.3) s.slots[j].moss = 0.1;
        }
      }
      // Mould: wet, still air and leftovers
      const still = !s.lid && s.hum > 80;
      if (sl.mould === 0 && still && sl.det > 0.15 && rand(s) < 0.4 * dt) sl.mould = 0.06;
      if (sl.mould > 0) {
        const grow = s.lid ? -1 : clamp((s.hum - 75) / 15, -1, 1);
        if (s.lid) sl.mould -= 0.6 * dt; // fresh air dries it fast
        else sl.mould += sl.mould * (1 - sl.mould) * 0.9 * grow * dt + (still ? sl.det * 0.1 * dt : 0);
        sl.det -= sl.mould * 0.15 * dt;
        if (sl.mould > 0.5 && grow > 0 && rand(s) < 0.6 * dt) {
          const j = i + (rand(s) < 0.5 ? -1 : 1);
          if (j >= 0 && j < N && s.slots[j].mould < 0.05) s.slots[j].mould = 0.06;
        }
        if (sl.mould < 0.02) sl.mould = 0;
      }
      sl.det -= sl.det * 0.04 * dt; // slowly becomes soil
      sl.moss = clamp(sl.moss); sl.mould = clamp(sl.mould); sl.det = clamp(sl.det);
      moss += sl.moss; mould += sl.mould;
    }
    f.air.plants += moss * 2.0 * L * dt; f.air.mould -= mould * 1.2 * dt; f.hum.plants += moss * 0.3 * dt;
    s.air += moss * 2.0 * L * dt - mould * 1.2 * dt;
    s.hum += moss * 0.3 * dt;

    // Creatures
    const born = [];
    const counts = {};
    for (const e of s.ents) counts[e.kind] = (counts[e.kind] || 0) + 1;
    for (const e of s.ents) {
      e.age += dt;
      const i = slotOf(e.x);
      const sl = s.slots[i];
      const why = [];
      let breed = false;

      if (e.kind === "fern") {
        e.food += (1.2 * L - 0.3) * dt; // food = stored sunlight
        if (s.hum < 50) why.push("too dry");
        if (e.food < 0.2) why.push("too dim");
        if (!why.length) e.size = Math.min(1, e.size + 0.25 * L * dt);
        f.air.plants += 1.6 * L * e.size * dt; f.hum.plants += 0.3 * e.size * dt;
        s.air += 1.6 * L * e.size * dt;
        s.hum += 0.3 * e.size * dt;
        sl.det += 0.04 * dt;
      } else if (e.kind === "mushroom") {
        for (let j = Math.max(0, i - 1); j <= Math.min(N - 1, i + 1); j++) {
          const take = Math.min(s.slots[j].det, 0.25 * dt);
          s.slots[j].det -= take;
          e.food += take * 2;
          s.slots[j].mould = Math.max(0, s.slots[j].mould - 0.8 * dt);
        }
        e.food -= 0.15 * dt;
        s.air -= 0.4 * dt; f.air.animals -= 0.4 * dt;
        if (s.hum < 55) why.push("too dry");
        if (e.food < 0.15) why.push("nothing to eat");
        breed = e.food > 0.8 && rand(s) < 0.3 * dt;
      } else if (e.kind === "snail") {
        // head for leftovers first, else moss
        let best = -1, bestD = 9;
        for (let j = 0; j < N; j++) {
          const v = s.slots[j].det > 0.08 ? 2 : s.slots[j].moss > 0.2 ? 1 : 0;
          const d = Math.abs(slotX(j) - e.x) - v * 0.3;
          if (v && d < bestD) { bestD = d; best = j; }
        }
        if (best >= 0 && best !== i) {
          e.dir = slotX(best) > e.x ? 1 : -1;
          e.x = clamp(e.x + e.dir * 0.35 * dt, 0.03, 0.97);
        }
        if (sl.det > 0.02) { const t = Math.min(sl.det, 0.5 * dt); sl.det -= t; e.food += t * 1.5; }
        else if (sl.moss > 0.1) { const t = Math.min(sl.moss - 0.05, 0.25 * dt); sl.moss -= t; e.food += t; sl.det += t * 0.2; }
        e.food -= 0.3 * dt;
        s.air -= 2.5 * dt; f.air.animals -= 2.5 * dt;
        if (s.hum < 45) why.push("too dry");
        if (s.air < 35) why.push("stuffy air");
        if (e.food < 0.15) why.push("hungry");
        breed = e.food > 0.75 && e.hp > 0.8 && e.age > 1.5 && rand(s) < 0.35 * dt && s.air > 50; // no babies in stale air
      } else if (e.kind === "springtail") {
        if (rand(s) < 3 * dt) e.dir = rand(s) < 0.5 ? -1 : 1;
        e.x = clamp(e.x + e.dir * 0.8 * dt, 0.03, 0.97);
        if (sl.mould > 0) { const t = Math.min(sl.mould, 0.45 * dt); sl.mould -= t; e.food += t * 1.6; }
        else if (sl.det > 0) { const t = Math.min(sl.det, 0.25 * dt); sl.det -= t; e.food += t * 1.6; }
        e.food += sl.moss * 0.3 * dt - 0.3 * dt; // nibbles the film on old moss
        s.air -= 0.15 * dt; f.air.animals -= 0.15 * dt;
        if (s.hum < 55) why.push("too dry");
        if (e.food < 0.15) why.push("hungry");
        breed = e.food > 0.7 && rand(s) < 0.8 * dt;
      } else if (e.kind === "firefly") {
        // rest low on the plants by day, wander the whole jar at night
        if (rand(s) < 2 * dt || (!isNight(s) && e.ty > 0.2) || (isNight(s) && e.ty < 0.2)) {
          e.tx = 0.08 + rand(s) * 0.84;
          e.ty = isNight(s) ? 0.25 + rand(s) * 0.65 : 0.06 + rand(s) * 0.1;
        }
        e.x += (e.tx - e.x) * 6 * dt;
        e.y += (e.ty - e.y) * 6 * dt;
        e.food += moss > 3 ? 0.3 * dt : -0.3 * dt;
        s.air -= 0.4 * dt; f.air.animals -= 0.4 * dt;
        e.glow = dark;
        if (s.hum < 50) why.push("too dry");
        if (moss <= 3) why.push("needs more moss");
        if (isNight(s) && s.lamp) why.push("lamp too bright");
        breed = e.glow && e.hp > 0.8 && e.food > 0.7 && rand(s) < FIREFLY_BREED * dt;
      }

      if (s.air < 20 && e.kind !== "fern") why.push("can't breathe");
      e.food = clamp(e.food);
      e.hp = clamp(e.hp + (why.length ? -0.45 : 0.3) * dt);
      e.why = why[0] || "";
      // a cleaner whose only trouble is hunger is "ok", not "sad": it still loses hp and earns no seed, but no verb
      // fixes its food, so it must not block a "nobody sad" note (M3d)
      const peckish = why.length === 1 && (why[0] === "nothing to eat" || (why[0] === "hungry" && e.kind === "springtail"));
      e.mood = why.length && !peckish ? "sad" : !why.length && e.hp > 0.7 ? "happy" : "ok";
      if (breed && (counts[e.kind] || 0) + born.filter(b => b.kind === e.kind).length < CAP[e.kind]) {
        born.push({ kind: e.kind, x: e.x + (rand(s) - 0.5) * 0.1, y: e.y });
        e.food -= 0.35;
      }
    }

    // deaths
    for (const e of s.ents) {
      if (e.hp > 0) continue;
      const i = slotOf(e.x);
      s.slots[i].det = clamp(s.slots[i].det + (e.kind === "springtail" ? 0.05 : 0.4));
      s.died++;
      if (e.kind !== "springtail" || !s.ents.some(o => o.kind === "springtail" && o.hp > 0)) note(s, `A ${KINDS[e.kind].name.toLowerCase()} died (${e.why || "old age"}).`);
    }
    s.ents = s.ents.filter(e => e.hp > 0);
    for (const b of born) {
      const e = spawn(s, b.kind, b.x, b.kind === "firefly" ? b.y : undefined);
      e.baby = true; // the view grows it up over its first day
      if (b.kind === "mushroom") e.x = slotX(slotOf(rand(s)));
      e.food = 0.4;
      s.born++;
      if (b.kind !== "springtail") note(s, `A baby ${KINDS[b.kind].name.toLowerCase()} appeared!`);
    }

    s.hum = clamp(s.hum, 0, 100);
    s.air = clamp(s.air, 0, 100);
    const k = Math.min(1, dt * 20);
    s.flux ||= { air: {}, hum: {} };
    for (const key of ["air", "hum"]) for (const src in f[key]) s.flux[key][src] = (s.flux[key][src] || 0) + (f[key][src] / dt - (s.flux[key][src] || 0)) * k;

    // history every 0.1 day, payday at each new morning
    if (Math.floor(s.day * 10) !== Math.floor((s.day - dt) * 10)) {
      s.history.push({ hum: s.hum, air: s.air, moss: (moss / N) * 100, mould: (mould / N) * 100, life: s.ents.length });
      if (s.history.length > 150) s.history.shift();
    }
    if (Math.floor(s.day) !== prevDay) payday(s);
  }

  function payday(s) {
    const kinds = new Set(s.ents.filter(e => e.mood === "happy").map(e => e.kind));
    if (mossTotal(s) >= MOSS_PAY) kinds.add("moss");
    s.lastPay = { day: Math.floor(s.day) + 1, kinds: [...kinds] };
    s.seeds += kinds.size;
    note(s, `Day ${Math.floor(s.day) + 1}: +${kinds.size} seed${kinds.size === 1 ? "" : "s"}.`);
  }

  const api = { MOSS_PAY, N, KINDS, ANIMALS, CAP, create, tick, place, setLid, setLamp, mist, light, isNight, count, mossTotal, mouldTotal, slotOf, slotX };
  if (typeof module !== "undefined") module.exports = api;
  else root.Sim = api;
})(this);
