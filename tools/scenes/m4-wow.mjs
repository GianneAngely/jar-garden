// M4: the wow moment. Dusk with Dot in the jar and the lamp on; the player turns the lamp off, Dot lights up,
// the room dims, the camera leans in, sparkles and hearts, then Hazel's postcard.
export const http = true;
const coach = t => `game.scene.getScene("Jar").coach.pillText.text.startsWith(${JSON.stringify(t)})`;
export default async rec => {
  await rec.eval(`(() => { const s = jar; s.lid = false; s.hum = 60; s.air = 55; Req.place(s, "firefly", 0.55, 0.6); s.day = 0.66; const sc = game.scene.getScene("Jar"); sc.coach.i = 6; sc.syncButtons(); })()`); // coach at "Dusk is coming..."
  await rec.until(coach("Dot the firefly hates"), 20);
  await rec.wait(1.5);
  await rec.click(425, 664);                       // lamp off
  await rec.until(`jar.req.i === 1`, 10);
  await rec.wait(5.5);
};
