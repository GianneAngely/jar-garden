// Neighbour notes: six goals on one persistent jar (docs/ONE-PAGER.md). Pure data + rules on top of Sim,
// no Phaser, so node can test it (tools/reqtest.mjs). All note state lives in s.req, so a jar snapshot is one object.
(function (root) {
  const Sim = root.Sim || require("./sim.js");
  const SPECIES = ["moss", "springtail", "fern", "mushroom", "snail", "firefly"];
  const START_SHOP = ["moss", "snail", "firefly"];
  const PILES = [3, 4, 5, 12, 13, 14]; // where Fen drops the soggy leaves

  const night = s => Sim.isNight(s);
  const glowing = s => s.ents.filter(e => e.kind === "firefly" && e.glow && e.mood !== "sad").length;
  const mouldPct = s => (Sim.mouldTotal(s) / Sim.N) * 100;
  const sadOne = s => s.ents.find(e => e.mood === "sad");
  const nameOf = e => e.name || Sim.KINDS[e.kind].name;

  // who is here, and is anyone sad; moss counts as a kind once it pays seeds (25% cover)
  function species(s) {
    const st = Object.fromEntries(SPECIES.map(k => [k, { n: 0, sad: 0 }]));
    if (Sim.mossTotal(s) >= Sim.MOSS_PAY) st.moss.n = 1;
    for (const e of s.ents) { st[e.kind].n++; if (e.mood === "sad") st[e.kind].sad++; }
    return st;
  }
  const kindIcons = st => SPECIES.map(k => ({ key: k, on: st[k].n > 0, sad: st[k].sad > 0 }));
  const why = s => { const e = sadOne(s); return e ? `${nameOf(e)}: ${e.why}` : ""; };

  // goal(s) -> { ok, p (0..1, notes without a hold), text, icons?, why? }
  const NOTES = [
    {
      id: "glow", who: "hazel", name: "Hazel", ask: "Make my jar glow?", line: "I've never seen a firefly shine up close.",
      reward: 4, unlock: "speed", hold: 0.05,
      setup(s) { // onboarding stage: stuffy, a bit dry, lamp on, a small moss carpet, 8:38 AM
        s.day = 0.36; s.hum = 47; s.air = 30; s.lamp = true;
        for (let i = 8; i <= 12; i++) s.slots[i].moss = 0.62;
      },
      goal(s) {
        const ff = s.ents.find(e => e.kind === "firefly");
        const ok = !!ff && ff.glow && ff.mood !== "sad" && !s.lamp;
        const text = ok ? "Glowing!" : !ff ? "Add a firefly" : !night(s) ? "Wait for the dark" : s.lamp ? "Turn the lamp off" : "Almost...";
        return { ok, p: ok ? 1 : ff ? 0.5 : 0, text, why: ff && ff.mood === "sad" ? `${nameOf(ff)}: ${ff.why}` : "" };
      },
    },
    {
      id: "moss", who: "mole", name: "Mo", ask: "Moss on 40% of the floor!", line: "So soft! I dream of a moss carpet.",
      reward: 4, unlock: "springtail",
      goal(s) {
        const c = Sim.mossTotal(s) / Sim.N;
        return { ok: c >= 0.4, p: Math.min(1, c / 0.4), text: `Moss ${Math.round(c * 100)}% / 40%`, dots: s.slots.map(sl => sl.moss) };
      },
    },
    {
      id: "show", who: "owl", name: "Olive", ask: "3 fireflies glowing for 6 hours!", line: "A little night show for my owlets?",
      reward: 6, unlock: "mushroom", hold: 0.25, night: true,
      goal(s) {
        const n = glowing(s), have = Sim.count(s, "firefly");
        return { ok: n >= 3, text: night(s) ? `${Math.min(n, 3)}/3 glowing` : `${Math.min(have, 3)}/3 fireflies`, pips: { n: night(s) ? n : have, of: 3 }, why: why(s) };
      },
    },
    {
      id: "soggy", who: "frog", name: "Fen", ask: "Mould under 1%, please!", line: "Oops, I dropped soggy leaves in. Sorry!",
      reward: 4, unlock: "fern", hold: 0.5,
      setup(s) {
        for (const i of PILES) s.slots[i].det = Math.min(1, s.slots[i].det + 0.5);
        for (const i of [4, 13]) s.slots[i].mould = Math.max(s.slots[i].mould, 0.2);
        s.hum = Math.min(95, s.hum + 15);
      },
      goal(s) {
        const m = mouldPct(s);
        return { ok: m < 1, text: `Mould ${m < 10 ? m.toFixed(1) : Math.round(m)}% (under 1%)`, hint: "Open the lid, or mushrooms on the leaves" };
      },
    },
    {
      id: "full", who: "hazel", name: "Hazel", ask: "Every kind, nobody sad, lid shut, a whole day!", line: "Can your jar look after itself?",
      reward: 4, hold: 1,
      goal(s) {
        const st = species(s), kinds = SPECIES.filter(k => st[k].n > 0).length;
        const ok = kinds === 6 && !sadOne(s) && !s.lid && mouldPct(s) < 5;
        return { ok, text: `${kinds}/6 kinds`, icons: kindIcons(st), why: s.lid ? "Close the lid" : mouldPct(s) >= 5 ? "Too much mould" : why(s) };
      },
    },
    {
      id: "party", who: "all", name: "Everyone", ask: "Party! 5 fireflies glowing, every kind here.", line: "We're all coming over at dusk!",
      reward: 0, hold: 0.25, night: true,
      goal(s) {
        const st = species(s), n = glowing(s), kinds = SPECIES.filter(k => st[k].n > 0).length;
        const have = night(s) ? n : Sim.count(s, "firefly");
        return { ok: n >= 5 && kinds === 6 && !sadOne(s), text: `${Math.min(have, 5)}/5 ${night(s) ? "glowing" : "fireflies"} · ${kinds}/6 kinds`, pips: { n: have, of: 5 }, icons: kindIcons(st), why: why(s) };
      },
    },
  ];

  // Death tips for the "jar went quiet" card, keyed by the sim's why strings
  const TIPS = {
    "too dry": "Mist when you see the drop bubble.",
    "stuffy air": "Open the lid now and then for fresh air.",
    "can't breathe": "Too many animals use up the air. Open the lid, add moss.",
    "hungry": "Animals need leftovers or moss to eat.",
    "nothing to eat": "Mushrooms eat fallen leaves.",
    "needs more moss": "Fireflies need a moss carpet.",
    "lamp too bright": "Fireflies hate the lamp at night.",
    "old age": "Keep a few of each kind so the jar goes on.",
  };

  function create(s) {
    s.req = { i: 0, hold: 0, was: false, quiet: 0, shop: START_SHOP.slice(), perks: [], won: false };
    s.ents[0].name = "Pip";
    NOTES[0].setup(s);
    return s.req;
  }
  const current = s => (s.req && !s.req.won ? NOTES[s.req.i] : null);

  // Clock gates during note 1 (onboarding): hold 4:48 PM until a firefly is in, hold 9:36 PM until the lamp is off,
  // so a slow reader still gets the first glow. Call right after Sim.tick.
  function gate(s, dt) {
    if (current(s)?.id !== "glow") return;
    const ff = Sim.count(s, "firefly") > 0, f = s.day % 1;
    if ((!ff && f > 0.70) || (ff && s.lamp && f > 0.90)) s.day -= dt;
  }

  // Advance the active note after a sim step. Returns an event or null:
  // { type: "done", note } · { type: "broke", why } · { type: "warn" } · { type: "lose", tip }
  function update(s, dt) {
    const r = s.req;
    if (!r || r.lost) return null;
    const dot = s.ents.find(e => e.kind === "firefly" && !e.name);
    if (dot && !s.ents.some(e => e.name === "Dot")) dot.name = "Dot";

    // lose: no animal alive for a whole day
    const animals = s.ents.some(e => Sim.ANIMALS.includes(e.kind));
    if (animals) r.quiet = 0;
    else {
      const was = r.quiet;
      r.quiet += dt;
      if (was === 0) return { type: "warn" };
      if (r.quiet >= 1) {
        r.lost = true;
        const m = s.log.map(l => l.text.match(/died \((.+)\)/)).find(Boolean);
        return { type: "lose", tip: TIPS[m?.[1]] || TIPS["old age"] };
      }
    }

    const n = current(s);
    if (!n) return null;
    const g = n.goal(s);
    let ev = null;
    if (n.hold) {
      if (g.ok) r.hold += dt;
      else if (!(n.night && !night(s))) {
        if (r.was && r.hold > 0) ev = { type: "broke", why: g.why || "" };
        r.hold = Math.max(0, r.hold - 2 * dt);
      }
      r.was = g.ok;
      if (r.hold < n.hold) return ev;
    } else if (!g.ok) return null;

    // note done: reward, unlock, next note
    s.seeds += n.reward;
    if (n.unlock === "speed") r.perks.push("speed");
    else if (n.unlock) r.shop.push(n.unlock);
    r.i++; r.hold = 0; r.was = false;
    if (r.i >= NOTES.length) r.won = true;
    else NOTES[r.i].setup?.(s);
    return { type: "done", note: n };
  }

  // the shop only sells what the notes have unlocked so far
  const canBuy = (s, kind) => !s.req || s.req.shop.includes(kind);
  const place = (s, kind, x, y) => (canBuy(s, kind) ? Sim.place(s, kind, x, y) : { ok: false, why: "not in the shop yet" });

  // progress of the active note for the card: 0..1 plus its live goal
  function progress(s) {
    const n = current(s);
    if (!n) return null;
    const g = n.goal(s);
    return { note: n, goal: g, p: n.hold ? Math.min(1, s.req.hold / n.hold) : g.p, paused: !!n.night && !night(s) };
  }

  const api = { NOTES, SPECIES, START_SHOP, TIPS, create, current, gate, update, progress, species, glowing, canBuy, place };
  if (typeof module !== "undefined") module.exports = api;
  else root.Req = api;
})(this);
