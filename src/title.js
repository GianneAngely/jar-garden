// Title: the M2 key art, the logo over the window sky, fireflies drifting round the painted jar, one Play button.
class Title extends Phaser.Scene {
  constructor() { super("Title"); }

  create() {
    this.add.image(0, 0, "title").setOrigin(0).setScale(PX);
    // fireflies around the jar in the art (centred about 660, 330)
    for (let k = 0; k < 7; k++) {
      const g = this.add.image(0, 0, "glow").setTint(0xffc94a).setBlendMode(Phaser.BlendModes.ADD).setScale(0.32 + (k % 3) * 0.08);
      const p = { a: k * 0.9, r: 40 + (k % 4) * 22, sp: 0.00035 + (k % 3) * 0.00012, cx: 645 + (k % 2) * 30, cy: 310 + (k % 3) * 20 };
      this.events.on("update", (t) => {
        g.setPosition(p.cx + Math.cos(t * p.sp + p.a) * p.r, p.cy + Math.sin(t * p.sp * 1.7 + p.a) * p.r * 0.45);
        g.setAlpha(0.55 + 0.45 * Math.sin(t / 300 + k * 2));
      });
    }
    // logo, tagline and buttons on the wall to the right of the window
    const lx = 1060;
    const logo = this.add.image(lx, 190, "logo").setScale(2);
    this.tweens.add({ targets: [logo], y: 184, yoyo: true, repeat: -1, duration: 2400, ease: "Sine.InOut" });
    const tg = this.add.graphics();
    const tag = label(this, lx, 284, "a tiny living world in a jar", 18, COL.ink, 0.5);
    const goal = label(this, lx, 312, "Goal: help 6 neighbours, then throw a firefly party", 15, COL.ink, 0.5);
    const tw = Math.max(tag.width, goal.width);
    tg.fillStyle(0xfff8ef, 0.9).fillRoundedRect(lx - tw / 2 - 14, 266, tw + 28, 64, 8);
    // with a saved jar: Continue is the big button, "New jar" starts over
    const saved = Save.on && Save.load();
    const play = button(this, lx, 372, 210, 58, saved ? "▶  Continue" : "▶  Play", null, () => this.go(!!saved));
    play.list[1].setFontSize(26);
    if (saved) button(this, lx, 440, 150, 40, "New jar", null, () => { if (this.leaving) return; Save.clear(); this.go(false); });
    this.time.addEvent({ delay: 700, loop: true, callback: () => (play.y = play.y === 372 ? 368 : 372) }); // a 4 px bob
    const credit = label(this, 26, 700, "Made for Game Gauntlet: SIM Jam", 16, COL.ink);
    tg.fillStyle(0xfff8ef, 0.9).fillRoundedRect(16, 686, credit.width + 20, 28, 6);
    muteButton(this, W - 40, 38);
    this.input.keyboard?.once("keydown-ENTER", () => this.go(!!saved));
    this.input.keyboard?.once("keydown-SPACE", () => this.go(!!saved));
    Audio.loadBeds(this, () => this.scene.isActive() && Audio.bed(this, "music", "music-title", 1200));
    window.STATE = "title";
  }

  go(resume) {
    if (this.leaving) return;
    this.leaving = true;
    this.cameras.main.fadeOut(350, 0xf3, 0xe6, 0xd3);
    this.cameras.main.once("camerafadeoutcomplete", () => this.scene.start("Jar", { resume }));
  }
}
