// M3a: Mo's moss note. Plant moss, time-lapse the carpet spreading (the 20 dots fill), Mo's thank-you, Olive arrives.
export default async rec => {
  await rec.eval(`(() => { const s = jar; Req.place(s, "firefly", 0.6, 0.6); s.lamp = false; s.req.i = 1; s.req.perks = ["speed"]; s.seeds = 9; s.hum = 62; s.air = 80; s.day = 1.30;
    game.scene.getScene("Jar").syncButtons(); })()`);
  await rec.wait(1.6);
  await rec.click(870, 556);                 // Moss card
  for (const x of [330, 380, 600, 650, 430]) await rec.click(x, 500, 0.25);
  await rec.click(1000, 470, 0.3);           // deselect by tapping the panel
  // time-lapse: 0.012 day per frame
  for (let f = 0; f < 110; f++) {
    await rec.eval(`(() => { const sc = game.scene.getScene("Jar"); for (let k = 0; k < 3; k++) { Sim.tick(jar, 1/240); Req.gate(jar, 1/240);
      if (jar.hum < 58) Sim.mist(jar); Sim.setLamp(jar, Sim.isNight(jar)); sc.syncButtons(); const ev = Req.update(jar, 1/240); if (ev) sc.onNote(ev); } })()`);
    await rec.wait(0.05);
    if (await rec.eval(`jar.req.i > 1`)) break;
  }
  await rec.wait(4.2);
};
