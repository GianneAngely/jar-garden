// M3c: title -> Play -> Hazel's postcard (a photo of your own jar) -> the ending with all six postcards.
export const http = true;
export const query = "seed=7";
export default async rec => {
  await rec.wait(2.2);
  await rec.click(381, 362);                       // Play
  await rec.until(`window.STATE === "jar"`, 5);
  await rec.wait(0.8);
  // skip to a glowing firefly at night (onboarding is in m3b-onboarding.gif)
  await rec.eval(`(() => { const s = jar; s.lid = false; s.hum = 60; s.air = 60; Req.place(s, "firefly", 0.55, 0.6); s.lamp = false; s.day = 0.8;
    game.scene.getScene("Jar").syncButtons(); })()`);
  await rec.until(`jar.req.i === 1`, 8);
  await rec.wait(5.6);
  // the ending: fill the jar, take a photo for every note, show the collage
  await rec.eval(`(async () => { const sc = game.scene.getScene("Jar"); const s = jar; s.seeds = 99; s.req.shop = Req.SPECIES.slice();
    for (let i = 3; i < 17; i++) s.slots[i].moss = 0.55;
    for (const [k, x] of [["firefly",0.3],["fern",0.15],["mushroom",0.72],["springtail",0.4],["firefly",0.8],["firefly",0.45],["fern",0.88]]) Req.place(s, k, x, 0.6);
    for (const n of Req.NOTES.slice(1)) { s.day = Math.floor(s.day) + 1 + (n.night ? 0.85 : 0.45); await new Promise(r => { sc.snapJar("pc-" + n.id, r); __t += 16; game.step(__t, 16); }); } // the recorder pauses the loop: render one frame for the photo
    s.req.i = 6; s.req.won = true; s.req.days = [1, 2, 3, 4, 5, 6]; s.born = 4; sc.showWin(); })()`);
  await rec.wait(4.5);
};
