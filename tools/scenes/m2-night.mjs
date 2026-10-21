// M2 wow moment: lamp off, dusk falls, fireflies light up.
export default async rec => {
  await rec.eval(`(() => { jar.seeds = 40; for (let i = 4; i < 16; i++) jar.slots[i].moss = 0.7;
    for (const x of [0.3, 0.5, 0.7]) Sim.place(jar, "firefly", x, 0.6); Sim.place(jar, "fern", 0.15);
    while (jar.day % 1 < 0.68) Sim.tick(jar, 1/240); })()`);
  await rec.wait(0.5);
  await rec.click(685, 664);   // 2x
  await rec.click(685, 664);   // 4x
  await rec.wait(4);
};
