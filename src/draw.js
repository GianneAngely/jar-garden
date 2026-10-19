// Placeholder creature art drawn with Graphics (M1). M2 swaps these for Flow sprites.
const INK = 0x6b4a3a;

function face(g, x, y, s = 1, mood = "ok") {
  g.fillStyle(INK);
  g.fillCircle(x - 4 * s, y, 1.6 * s);
  g.fillCircle(x + 4 * s, y, 1.6 * s);
  g.lineStyle(1.4 * s, INK);
  g.beginPath();
  if (mood === "sad") g.arc(x, y + 5 * s, 2.5 * s, Math.PI * 1.15, Math.PI * 1.85);
  else g.arc(x, y + 1.5 * s, 2.5 * s, Math.PI * 0.15, Math.PI * 0.85);
  g.strokePath();
}

const DRAW = {
  snail(g, mood) {
    g.fillStyle(0xf4dcb8).lineStyle(2.5, INK);
    g.fillRoundedRect(-22, -10, 40, 12, 6).strokeRoundedRect(-22, -10, 40, 12, 6);
    g.lineBetween(12, -10, 16, -22).lineBetween(17, -10, 22, -21);
    g.fillStyle(INK).fillCircle(16, -23, 2).fillCircle(22, -22, 2);
    g.fillStyle(0xf7a8b8).fillCircle(-6, -18, 13).strokeCircle(-6, -18, 13);
    g.lineStyle(2, INK).beginPath();
    g.arc(-6, -18, 7, 0, Math.PI * 1.6).strokePath();
    face(g, 13, -4, 0.8, mood);
  },
  springtail(g) {
    g.fillStyle(0xcdb8f0).lineStyle(1.5, INK);
    g.fillEllipse(0, -4, 12, 7).strokeEllipse(0, -4, 12, 7);
    g.fillStyle(INK).fillCircle(4, -5, 1);
  },
  firefly(g, mood) {
    g.fillStyle(0xfff3b0, 0.85).lineStyle(1.5, INK);
    g.fillEllipse(-5, -7, 10, 7).strokeEllipse(-5, -7, 10, 7);
    g.fillEllipse(5, -7, 10, 7).strokeEllipse(5, -7, 10, 7);
    g.fillStyle(0x8a6448).fillEllipse(0, 0, 9, 13).strokeEllipse(0, 0, 9, 13);
    g.fillStyle(0xffd94a).fillCircle(0, 6, 4);
  },
  fern(g, mood) {
    g.lineStyle(3, 0x4f8a4b);
    for (const [a, l] of [[-0.9, 60], [-0.45, 74], [0, 82], [0.45, 74], [0.9, 60]]) {
      const ex = Math.sin(a) * l, ey = -Math.cos(a) * l;
      g.lineBetween(0, 0, ex, ey);
      g.fillStyle(0x7fb069);
      for (let t = 0.3; t < 1; t += 0.14) {
        const px = ex * t, py = ey * t, w = 9 * (1.1 - t);
        g.fillEllipse(px - w * Math.cos(a), py - w * Math.sin(a) * 0.3, w * 1.6, 5);
        g.fillEllipse(px + w * Math.cos(a), py + w * Math.sin(a) * 0.3, w * 1.6, 5);
      }
    }
  },
  mushroom(g, mood) {
    g.fillStyle(0xfff8ef).lineStyle(2.5, INK);
    g.fillRoundedRect(-6, -20, 12, 20, 4).strokeRoundedRect(-6, -20, 12, 20, 4);
    g.fillStyle(0xe88a7a).beginPath();
    g.arc(0, -18, 17, Math.PI, 0).closePath().fillPath().strokePath();
    g.fillStyle(0xfff8ef).fillCircle(-7, -26, 3).fillCircle(5, -29, 2.5).fillCircle(9, -22, 2);
    face(g, 0, -11, 0.7, mood);
  },
};

const MOOD_ICON = {
  "too dry": "💧", "stuffy air": "💨", "hungry": "🍂", "can't breathe": "💨",
  "too dim": "☀️", "nothing to eat": "🍂", "needs more moss": "🌱", "lamp too bright": "💡",
};

// Small stable pseudo-random from ints, so mould/leftover dots don't jitter each frame.
const hash = (a, b) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
