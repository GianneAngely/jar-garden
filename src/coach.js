// 30-second onboarding during Hazel's first note: one short prompt at a time, a bobbing arrow on the one control
// that works right now, and a glow on the panel bar that the action moves. Each beat ends when its sim state is
// true (not when a tap lands), so tapping ahead never breaks it.
class Coach {
  constructor(scene) {
    const sc = (this.scene = scene);
    const btn = b => () => ({ x: b.x, y: b.y - 32 });
    this.steps = [
      { text: "Pip the snail can't breathe! Open the lid.", at: btn(sc.lidBtn), allow: ["lid"], bar: "air", done: s => s.lid },
      { text: "Fresh air is coming in...", bar: "air", allow: [], done: s => s.air >= 45 },
      { text: "Close it. Keeps it damp.", at: btn(sc.lidBtn), allow: ["lid"], bar: "air", done: s => !s.lid },
      { text: "Fireflies love damp. Mist!", at: btn(sc.mistBtn), allow: ["mist"], bar: "hum", done: s => s.hum >= 54 },
      { text: "Add a firefly!", at: () => ({ x: sc.cards[SHOP.indexOf("firefly")].x, y: sc.cards[SHOP.indexOf("firefly")].y - 44 }), allow: ["shop:firefly"], done: s => sc.selected === "firefly" || Sim.count(s, "firefly") > 0 },
      { text: "Tap inside the jar.", at: () => ({ x: JAR.x + JAR.w / 2, y: 330 }), allow: ["shop:firefly", "jar"], done: s => Sim.count(s, "firefly") > 0,
        back: s => !sc.selected && Sim.count(s, "firefly") === 0 }, // the pick got dropped: point at the card again
      { text: "Dusk is coming...", allow: [], bar: "light", fast: 4, done: s => Sim.isNight(s) || !s.lamp }, // time-lapse the wait
      { text: "Dot the firefly hates the lamp. Lamp off!", at: btn(sc.lampBtn), allow: ["lamp"], bar: "light", done: s => !s.lamp },
      { text: "Watch Dot...", allow: [], done: () => false },
    ];
    this.i = 0;
    this.active = Req.current(sc.s)?.id === "glow";
    this.ui = sc.add.container(0, 0).setDepth(45).setAlpha(0);
    this.glow = sc.barGlow; // drawn under the panel bars
    this.pillBg = sc.add.graphics();
    this.pillText = label(sc, 0, 0, "", 19, COL.ink, 0.5);
    this.arrow = sc.add.graphics();
    this.ui.add([this.pillBg, this.pillText, this.arrow]);
    // chunky down arrow, drawn once around (0, 0) = its tip
    this.arrow.fillStyle(0xffe6a8).lineStyle(3, COL.inkHex)
      .beginPath().moveTo(0, 0).lineTo(-18, -20).lineTo(-8, -20).lineTo(-8, -40).lineTo(8, -40).lineTo(8, -20).lineTo(18, -20).closePath().fillPath().strokePath();
    if (this.active) sc.tweens.add({ targets: this.ui, alpha: 1, delay: 500, duration: 400 });
  }

  // end the onboarding now (tests and recorded scenes that start mid-story)
  finish() {
    this.active = false;
    this.scene.tweens.killTweensOf(this.ui);
    this.ui.setAlpha(0);
    this.glow.clear();
  }

  // back to beat 1 (Rewind into note 1)
  reset() {
    this.i = 0;
    this.active = Req.current(this.scene.s)?.id === "glow";
    this.ui.setAlpha(this.active ? 1 : 0);
  }

  // the beat's own speed (the dusk wait runs as a time-lapse), or 0 to use the speed button
  get fast() {
    return (this.active && this.steps[this.i].fast) || 0;
  }

  // is this control live right now? keys: lid, lamp, mist, speed, jar, shop:<kind>
  allows(key) {
    return !this.active || this.steps[this.i].allow.includes(key);
  }

  // a locked control was tapped: nudge the arrow so the eye goes to the right one
  nudge() {
    const sc = this.scene;
    sc.tweens.killTweensOf(this.pillText);
    this.pillText.setScale(1.15);
    sc.tweens.add({ targets: this.pillText, scale: 1, duration: 300, ease: "Back.Out" });
  }

  update(time) {
    const sc = this.scene, s = sc.s;
    if (!this.active) return;
    if (Req.current(s)?.id !== "glow") { // note 1 finished (or the jar moved on): fade out for good
      this.active = false;
      this.glow.clear();
      sc.tweens.add({ targets: this.ui, alpha: 0, duration: 300 });
      return;
    }
    while (this.i < this.steps.length - 1 && this.steps[this.i].done(s)) this.i++;
    if (this.steps[this.i].back?.(s)) this.i--;
    const st = this.steps[this.i];
    if (this.pillText.text !== st.text) this.say(st.text);
    const t = st.at?.();
    this.arrow.setVisible(!!t);
    let px = JAR.x + JAR.w / 2, py = 214;
    if (t) {
      this.arrow.setPosition(t.x, t.y + Math.sin(time / 180) * 6);
      px = t.x; py = t.y - 64;
    }
    const w = this.pillW;
    // keep the pill off Hazel's face (left) and off the shop labels (right panel)
    if (t && t.x > 766) { px = 766 - w / 2 - 12; py = t.y - 20; }
    else px = Phaser.Math.Clamp(px, Math.max(w / 2 + 10, t && t.y > 560 ? 250 + w / 2 : 0), W - w / 2 - 10);
    this.pillBg.setPosition(px, py);
    this.pillText.setPosition(this.pillBg.x, py);
    // soft pulse behind the panel bar this beat moves
    const g = this.glow.clear(), row = { hum: 0, air: 1, light: 2 }[st.bar];
    if (row != null) g.fillStyle(0xffe6a8, 0.45 + 0.25 * Math.sin(time / 200)).fillRoundedRect(780, barY(row) - 17, 466, 34, 12);
  }

  say(text) {
    this.pillText.setText(text);
    const w = (this.pillW = this.pillText.width + 34);
    this.pillBg.clear().fillStyle(COL.inkHex, 0.2).fillRoundedRect(-w / 2, -19, w, 42, 21)
      .fillStyle(0xfffdf8).lineStyle(3, COL.inkHex).fillRoundedRect(-w / 2, -21, w, 42, 21).strokeRoundedRect(-w / 2, -21, w, 42, 21);
    this.pillText.setScale(0.8);
    this.scene.tweens.add({ targets: this.pillText, scale: 1, duration: 260, ease: "Back.Out" });
  }
}
