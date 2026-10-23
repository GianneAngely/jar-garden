// Little visual responses (juice) and sim tells. Cozy tiers: small = taps and seeds, medium = placing, lid,
// mist, moss spreading, births; large = the first glow, a finished note, the win. No screen shake anywhere.
// Every effect is short-lived and cleans itself up; none of them touch the simulation.
const FX = {
  // soft soil puff where a creature lands
  dust(sc, x, y) {
    for (let k = 0; k < 5; k++) {
      const d = sc.add.circle(x + (k - 2) * 7, y - 2, 4 + (k % 2) * 2, 0x8a6448, 0.55).setDepth(24);
      sc.tweens.add({ targets: d, x: d.x + (k - 2) * 9, y: y - 10 - (k % 3) * 5, alpha: 0, scale: 1.6, duration: 420, ease: "Cubic.Out", onComplete: () => d.destroy() });
    }
  },

  // tiny warm stars around a point (glow tells, moss spreading, unlocks)
  sparkle(sc, x, y, n = 6, tint = 0xffe680, spread = 40) {
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + Math.random() * 0.5, r = spread * (0.5 + Math.random() * 0.6);
      const g = sc.add.image(x, y, "glow").setScale(0.12 + Math.random() * 0.1).setTint(tint).setBlendMode(Phaser.BlendModes.ADD).setDepth(26);
      sc.tweens.add({ targets: g, x: x + Math.cos(a) * r, y: y + Math.sin(a) * r - 10, alpha: 0, scale: 0.04, duration: 700 + Math.random() * 400, ease: "Cubic.Out", onComplete: () => g.destroy() });
    }
  },

  hearts(sc, x, y, n = 6, depth = 31) {
    for (let k = 0; k < n; k++) {
      const a = -Math.PI / 2 + (k - (n - 1) / 2) * 0.45, h = sc.add.image(x, y, "icon-heart").setScale(1).setDepth(depth);
      sc.tweens.add({ targets: h, x: x + Math.cos(a) * 90, y: y + Math.sin(a) * 90, scale: fitPx(sc, "icon-heart", 18), alpha: { from: 1, to: 0 }, duration: 1100, delay: k * 50, ease: "Cubic.Out", onComplete: () => h.destroy() });
    }
  },

  // stale air leaving the open jar: the visible cause of "Fresh air" rising
  airWisp(sc) {
    const x = JAR.x + 90 + Math.random() * (JAR.w - 180);
    const w = sc.add.image(x, JAR.y + 70, "icon-air").setScale(fitPx(sc, "icon-air", 16)).setAlpha(0).setDepth(24).setTint(0xf4f8f6);
    sc.tweens.add({ targets: w, y: JAR.y - 40 - Math.random() * 40, x: x + (Math.random() - 0.5) * 80, alpha: { from: 0.75, to: 0 }, duration: 1600, ease: "Sine.Out", onComplete: () => w.destroy() });
  },

  // mist settles as a soft blue haze
  fog(sc) {
    for (let k = 0; k < 5; k++) {
      const f = sc.add.image(JAR.x + 80 + k * 65, JAR.y + 120 + (k % 2) * 40, "glow").setScale(2.6).setTint(0xcfe8f4).setAlpha(0).setDepth(23);
      sc.tweens.add({ targets: f, alpha: { from: 0.4, to: 0 }, y: f.y + 120, scale: 3.4, duration: 1700, delay: k * 60, ease: "Sine.Out", onComplete: () => f.destroy() });
    }
  },

  // a mould spore drifting up from a patch
  spore(sc, x) {
    const d = sc.add.circle(x + (Math.random() - 0.5) * 16, JAR.soil - 4, 2 + Math.random() * 1.5, 0xb8b4a2, 0.9).setDepth(24);
    sc.tweens.add({ targets: d, y: d.y - 40 - Math.random() * 40, x: d.x + (Math.random() - 0.5) * 20, alpha: 0, duration: 1800, ease: "Sine.Out", onComplete: () => d.destroy() });
  },

  // a seed or button tap: quick squash and overshoot back to rest
  pop(sc, obj, k = 1.25) {
    sc.tweens.killTweensOf(obj);
    const sx = obj.scaleX, sy = obj.scaleY;
    obj.setScale(sx * k, sy / k);
    sc.tweens.add({ targets: obj, scaleX: sx, scaleY: sy, duration: 260, ease: "Back.Out" });
  },
};
