// M3b: the first 30 seconds, played like a new player who follows the coach at 1x.
const coach = t => `game.scene.getScene("Jar").coach.pillText.text.startsWith(${JSON.stringify(t)})`;
export default async rec => {
  await rec.wait(1.8);
  await rec.click(295, 664);                       // open lid
  await rec.until(coach("Close it"), 10);
  await rec.wait(0.6);
  await rec.click(295, 664);                       // close lid
  await rec.wait(0.8);
  await rec.click(555, 664);                       // mist
  await rec.wait(1.2);
  await rec.click(1182, 640);                      // firefly card
  await rec.wait(0.5);
  await rec.click(500, 330);                       // into the jar
  await rec.until(coach("Dot hates"), 25);
  await rec.wait(1.2);
  await rec.click(425, 664);                       // lamp off
  await rec.until(`jar.req.i === 1`, 10);
  await rec.wait(3.5);
};
