// M3d: where seeds come from. Midnight: a seed rises from each happy kind and flies to the counter ("+N at
// midnight" shows the next payday live, a sulking firefly gets "no seed"). Then Fen's leaves tumble in and the
// Mould bar zooms to 0-20%.
export const http = true;
export default async rec => {
  await rec.eval(`(() => { const sc = game.scene.getScene("Jar"), s = jar; sc.coach.finish();
    s.req.i = 2; s.req.perks = ["speed"]; s.req.shop = ["moss", "snail", "firefly", "springtail"]; s.lamp = false; s.hum = 66; s.air = 80; s.seeds = 3;
    for (let i = 4; i < 16; i++) s.slots[i].moss = 0.62;
    s.seeds += 20; for (const x of [0.35, 0.7]) Sim.place(s, "firefly", x, 0.6); Sim.place(s, "springtail", 0.4); s.seeds = 3;
    for (const e of s.ents) { e.hp = 1; e.food = 0.9; }
    s.day = 1.93; sc.lastPayShown = s.lastPay?.day; sc.syncButtons(); })()`);
  await rec.wait(1.2);
  await rec.click(425, 664);                       // lamp on at night: one firefly will sulk -> "no seed"
  await rec.click(685, 664); await rec.click(685, 664); // 4x
  await rec.until(`jar.day % 1 < 0.5 && jar.day > 2`, 12);
  await rec.wait(2.6);
  // Fen arrives: leaves tumble in, the Mould bar zooms
  await rec.eval(`(() => { const s = jar; s.req.i = 3; s.req.hold = 0; Req.NOTES[3].setup(s); s.lamp = false; game.scene.getScene("Jar").syncButtons(); game.scene.getScene("Jar").speedIdx = 0; })()`);
  await rec.wait(4.5);
};
