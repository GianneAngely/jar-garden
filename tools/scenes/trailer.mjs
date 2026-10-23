// Trailer (~27 s, 30 fps): title, the onboarding verbs, the first glow, a postcard, a moss time-lapse with seeds,
// the party and the postcard collage, an end card. Sound marks are mixed offline by tools/mux.mjs; the page stays ?mute.
// node tools/record.mjs tools/scenes/trailer.mjs dist/trailer-raw.mp4 --fps 30 && node tools/mux.mjs dist/trailer-raw.mp4 docs/m5/trailer.mp4
export const http = true;
export const query = "seed=7";
const sc = `game.scene.getScene("Jar")`;
const fade = (rec, out) => rec.eval(`${sc}.cameras.main.${out ? "fadeOut" : "fadeIn"}(250, 243, 230, 211)`);
const ff = n => `(() => { const s = jar, S = ${sc}; for (let k = 0; k < ${n}; k++) { Sim.tick(s, 1/240); Req.gate(s, 1/240); const ev = Req.update(s, 1/240); if (ev) S.onNote(ev); } })()`;
// cut to a new moment: drop any running thank-you/postcard, then set the jar up
const cut = js => `(() => { const s = jar, S = ${sc}; S.time.removeAllEvents(); S.tweens.killAll(); S.children.list.filter(o => o.depth === 31).forEach(o => o.destroy());
  S.thanks.length = 0; S.card.busy = false; S.card.noteId = null; S.card.box.setAlpha(1).setScale(1); S.coach.finish(); S.cameras.main.setZoom(1).centerOn(640, 360); S.dim = 0; ${js}; S.syncButtons(); })()`;
// a photo for each note's postcard: tweak the jar (time of day, which fireflies exist), render one frame, snap
const photo = (id, js) => `(async () => { const s = jar, S = ${sc}; ${js}; for (let k = 0; k < 2; k++) { __t += 16; game.step(__t, 16); }
  await new Promise(r => { S.snapJar("pc-${id}", r); __t += 16; game.step(__t, 16); }); })()`;

export default async rec => {
  rec.sound("music-title", { bed: true, volume: 0.55 });
  await rec.wait(1.8);
  await rec.click(1060, 372, 0.4); rec.sound("click", { volume: 0.5 });
  await rec.until(`window.STATE === "jar"`, 4);
  rec.sound("music-day", { bed: true, volume: 0.5 });
  await rec.caption("A tiny living world in a jar");
  await rec.wait(0.3);
  await rec.click(295, 664, 0.3); rec.sound("lid-open");
  await rec.wait(0.9);
  await rec.eval(`jar.air = Math.max(jar.air, 46)`);      // trailer time: skip the rest of the airing
  await rec.wait(0.3);
  await rec.click(295, 664, 0.25); rec.sound("lid-close");
  await rec.click(555, 664, 0.25); rec.sound("mist", { volume: 0.5 }); rec.sound("drip", { volume: 0.3 });
  await rec.caption("Light, air and damp, all connected");
  await rec.click(1182, 640, 0.3); rec.sound("click", { volume: 0.5 });
  await rec.click(500, 330, 0.3); rec.sound("plop");
  await rec.wait(0.4);
  await rec.eval(`jar.day = Math.max(jar.day, 0.735)`);    // straight to dusk
  rec.sound("music-night", { bed: true, volume: 0.55 });
  await rec.until(`${sc}.coach.pillText.text.startsWith("Dot the firefly hates")`, 6);
  await rec.caption("");
  await rec.wait(0.5);
  await rec.click(425, 664, 0.3); rec.sound("lamp-off");
  await rec.until(`jar.req.i === 1`, 6);
  rec.sound("glow", { volume: 0.7 });
  await rec.caption("Make it glow");
  await rec.wait(2.3);
  rec.sound("note-done");
  await rec.wait(1.2);
  rec.sound("postcard");
  await rec.caption("Neighbours send you postcards");
  await rec.wait(1.3);

  // Mo's moss carpet in a time-lapse, seeds flying out of the creatures at midnight
  await fade(rec, true); await rec.wait(0.3);
  await rec.eval(cut(`s.req.i = 1; s.req.perks = ["speed"]; s.seeds = 12; s.lamp = false; s.hum = 64; s.air = 80; s.day = 1.42;
    for (const x of [0.22, 0.32, 0.62, 0.72, 0.8]) Req.place(s, "moss", x); S.prevMoss = s.slots.map(sl => sl.moss); S.lastPayShown = s.lastPay?.day`));
  rec.sound("music-day", { bed: true, volume: 0.5 });
  await fade(rec, false);
  await rec.caption("Every number has a cause");
  for (let f = 0; f < 52; f++) { await rec.eval(ff(5)); await rec.wait(1 / 30); }
  rec.sound("seed", { volume: 0.4 }); rec.sound("seed", { volume: 0.4, rate: 1.08 }); rec.sound("seed", { volume: 0.4, rate: 1.16 });
  for (let f = 0; f < 16; f++) { await rec.eval(ff(3)); await rec.wait(1 / 30); }
  await rec.caption("");

  // the party: a full jar at night; postcards of the story; the collage
  await fade(rec, true); await rec.wait(0.3);
  await rec.eval(cut(`s.req.i = 5; s.req.shop = Req.SPECIES.slice(); s.seeds = 99; for (let i = 2; i < 18; i++) s.slots[i].moss = 0.6;
    for (const [k, x] of [["fern", 0.14], ["fern", 0.86], ["mushroom", 0.34], ["springtail", 0.45], ["firefly", 0.2], ["firefly", 0.38], ["firefly", 0.66], ["firefly", 0.8]]) Req.place(s, k, x, 0.6);
    s.ents.filter(e => e.kind === "firefly").forEach((e, i) => { e.x = [0.2, 0.38, 0.55, 0.7, 0.84][i] ?? 0.5; e.y = [0.7, 0.5, 0.78, 0.55, 0.72][i] ?? 0.6; e.tx = e.x; e.ty = e.y; });
    for (const e of s.ents) { e.hp = 1; e.food = 0.9; e.size = 1; } s.hum = 68; s.air = 85; s.lamp = false; s.day = 2.86; S.speedIdx = 0`));
  rec.sound("music-night", { bed: true, volume: 0.55 });
  await fade(rec, false);
  await rec.caption("Six notes. One jar. A firefly party.");
  await rec.wait(1.6);
  // photos for the earlier notes' postcards, then back to the party night
  await rec.eval(photo("moss", `s.day = 2.45`));
  await rec.eval(photo("show", `s.day = 2.86`));
  await rec.eval(photo("soggy", `s.day = 2.55; for (const i of [4, 13]) s.slots[i].det = 0.5`));
  await rec.eval(photo("full", `s.day = 2.6; for (const i of [4, 13]) s.slots[i].det = 0`));
  // the real finale: the party hold completes, the jar glows, the party postcard, then the collage
  await rec.eval(`(() => { const s = jar; s.day = 2.87; s.req.days = [1, 2, 3, 4, 5]; s.req.hold = 0.249; s.born = 3; })()`);
  await rec.until(`jar.req.won`, 4);
  rec.sound("glow", { volume: 0.7 });
  await rec.wait(2.8);
  // trailer time: straight from the finale glow to the collage
  await rec.caption("");
  await rec.eval(`(() => { const S = ${sc}; S.time.removeAllEvents(); S.children.list.filter(o => o.depth === 31).forEach(o => o.destroy());
    S.thanks.length = 0; S.card.busy = false; S.cameras.main.setZoom(1).centerOn(640, 360); S.dim = 0; S.showWin(); })()`);
  rec.sound("win", { volume: 0.6 });
  await rec.wait(2.6);

  // end card
  await fade(rec, true); await rec.wait(0.3);
  await rec.eval(`${sc}.scene.start("Title")`);
  rec.sound("music-title", { bed: true, volume: 0.55 });
  await rec.wait(0.3);
  await rec.caption("Play free in your browser · Game Gauntlet: SIM Jam");
  await rec.wait(2.8);
};
