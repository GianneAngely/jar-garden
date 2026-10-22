// M4: cause and effect you can see. Open lid: stale air wisps out. Mist: drops and a blue haze. Too wet: dew on
// the glass. Moss spreading: little green sparkles. Night with the lamp off: firefly halos light the jar.
export const http = true;
export default async rec => {
  await rec.eval(`(() => { const sc = game.scene.getScene("Jar"), s = jar; sc.coach.finish(); s.req.i = 1; s.req.perks = ["speed"]; s.lamp = false; s.lid = false;
    s.hum = 62; s.air = 40; s.day = 1.45; for (let i = 7; i < 13; i++) s.slots[i].moss = 0.75; s.seeds = 30; sc.syncButtons(); sc.prevMoss = s.slots.map(sl => sl.moss); })()`);
  await rec.wait(0.8);
  await rec.click(295, 664);                 // open lid: wisps
  await rec.wait(2.4);
  await rec.click(295, 664);                 // close
  await rec.click(555, 664); await rec.click(555, 664); await rec.click(555, 664); // mist x3: haze, then dew
  await rec.wait(2.2);
  await rec.click(685, 664); await rec.click(685, 664); // 4x: moss spreads, dusk falls
  await rec.eval(`(() => { const s = jar; s.seeds = 30; for (const x of [0.3, 0.6, 0.75]) Sim.place(s, "firefly", x, 0.6); })()`);
  await rec.until(`Sim.isNight(jar) && jar.day % 1 > 0.8`, 15);
  await rec.wait(3);
};
