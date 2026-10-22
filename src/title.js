// Title: the M2 key art, the logo over the window sky, fireflies drifting round the painted jar, one Play button.
class Title extends Phaser.Scene {
  constructor() { super("Title"); }

  create() {
    this.add.image(0, 0, "title").setOrigin(0).setDisplaySize(W, H);
    // fireflies around the painted jar (jar sits at about x 510-745, y 250-580 in this art)
    for (let k = 0; k < 7; k++) {
      const g = this.add.image(0, 0, "glow").setTint(0xffc94a).setBlendMode(Phaser.BlendModes.ADD).setScale(0.32 + (k % 3) * 0.08);
      const p = { a: k * 0.9, r: 60 + (k % 4) * 22, sp: 0.00035 + (k % 3) * 0.00012, cx: 620 + (k % 2) * 30, cy: 330 + (k % 3) * 40 };
      this.events.on("update", (t) => {
        g.setPosition(p.cx + Math.cos(t * p.sp + p.a) * p.r, p.cy + Math.sin(t * p.sp * 1.7 + p.a) * p.r * 0.45);
        g.setAlpha(0.55 + 0.45 * Math.sin(t / 300 + k * 2));
      });
    }
    const lx = 381;
    const halo = this.add.image(lx, 172, "glow").setScale(7.5, 3.2).setTint(0xfff8ef).setAlpha(0.85);
    const logo = this.add.image(lx, 172, "logo").setScale(0.9);
    this.tweens.add({ targets: [logo], y: 166, yoyo: true, repeat: -1, duration: 2400, ease: "Sine.InOut" });
    const tg = this.add.graphics();
    const tag = label(this, lx, 290, "a tiny living world in a jar", 22, COL.ink, 0.5);
    tg.fillStyle(0xfff8ef, 0.88).fillRoundedRect(lx - tag.width / 2 - 16, 272, tag.width + 32, 36, 18);
    const play = button(this, lx, 362, 210, 58, "▶  Play", null, () => this.go());
    play.list[1].setFontSize(26);
    this.tweens.add({ targets: play, scale: 1.05, yoyo: true, repeat: -1, duration: 900, ease: "Sine.InOut" });
    label(this, 24, 700, "Made for Game Gauntlet: SIM Jam", 15, "#9a7a66");
    const mute = label(this, W - 34, 34, Audio.muted ? "🔇" : "🔊", 26, COL.ink, 0.5).setInteractive({ useHandCursor: true })
      .on("pointerup", () => mute.setText(Audio.toggle(this.game) ? "🔇" : "🔊"));
    this.input.keyboard?.once("keydown-ENTER", () => this.go());
    this.input.keyboard?.once("keydown-SPACE", () => this.go());
    Audio.bed(this, "music", "music-title", 1200);
    window.STATE = "title";
  }

  go() {
    if (this.leaving) return;
    this.leaving = true;
    this.cameras.main.fadeOut(350, 0xf3, 0xe6, 0xd3);
    this.cameras.main.once("camerafadeoutcomplete", () => this.scene.start("Jar"));
  }
}
