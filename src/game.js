const DT = 1 / 240;          // sim step (days)
const DAY_SECONDS = 60;      // real seconds per in-game day at 1x
const SPEEDS = [1, 2, 4, 0];
const SHOP = ["moss", "springtail", "fern", "mushroom", "snail", "firefly"];

const sunAt = day => { const f = day % 1; return f > 0.25 && f < 0.75 ? Math.sin(Math.PI * (f - 0.25) / 0.5) : 0; };
const lerpColor = (a, b, t) => {
  const ca = Phaser.Display.Color.IntegerToColor(a), cb = Phaser.Display.Color.IntegerToColor(b);
  const c = Phaser.Display.Color.Interpolate.ColorWithColor(ca, cb, 100, Math.round(t * 100));
  return Phaser.Display.Color.GetColor(c.r, c.g, c.b);
};
const clock = day => {
  const m = Math.floor((day % 1) * 24 * 60), h = Math.floor(m / 60);
  return `${(h + 11) % 12 + 1}:${String(m % 60).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

function label(scene, x, y, str, size = 22, color = COL.ink, origin = 0) {
  return scene.add.text(x, y, str, { fontFamily: FONT, fontSize: size + "px", color }).setOrigin(origin, 0.5);
}

function button(scene, x, y, w, h, str, onTap) {
  const c = scene.add.container(x, y);
  const bg = scene.add.graphics();
  const t = label(scene, 0, 0, str, 20, COL.ink, 0.5);
  const paint = on => {
    bg.clear().fillStyle(COL.inkHex, 0.2).fillRoundedRect(-w / 2, -h / 2 + 4, w, h, 14);
    bg.fillStyle(on ? 0xffe6a8 : COL.card).lineStyle(3, COL.inkHex).fillRoundedRect(-w / 2, -h / 2, w, h, 14).strokeRoundedRect(-w / 2, -h / 2, w, h, 14);
  };
  paint(false);
  c.add([bg, t]);
  c.setSize(w, h).setInteractive({ useHandCursor: true })
    .on("pointerdown", () => c.setScale(0.95))
    .on("pointerout", () => c.setScale(1))
    .on("pointerup", () => { c.setScale(1); Audio.blip(scene, 700); onTap(); });
  c.setLabel = s => t.setText(s);
  c.setOn = paint;
  return c;
}

class Boot extends Phaser.Scene {
  constructor() { super("Boot"); }
  create() {
    Audio.apply(this.game);
    // soft radial glow, used for fireflies and the lamp (works in Canvas and WebGL)
    const t = this.textures.createCanvas("glow", 128, 128), ctx = t.getContext();
    const grd = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, "rgba(255,255,255,1)"); grd.addColorStop(0.35, "rgba(255,255,255,0.45)"); grd.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grd; ctx.fillRect(0, 0, 128, 128); t.refresh();
    document.fonts.load("600 22px Fredoka").finally(() => this.scene.start("Jar"));
  }
}

class Jar extends Phaser.Scene {
  constructor() { super("Jar"); }

  create() {
    const seed = Number(QS.get("seed")) || (Date.now() % 100000) + 1;
    this.s = Sim.create(seed);
    window.jar = this.s;
    this.speedIdx = 0;
    this.acc = 0;
    this.selected = null;
    this.views = new Map();

    this.sky = this.add.graphics();
    this.room = this.add.graphics();
    this.drawRoom();
    this.jarBack = this.add.graphics();
    this.soil = this.add.graphics();
    this.ents = this.add.layer();
    this.night = this.add.rectangle(0, 0, W, H, COL.night, 0).setOrigin(0);
    this.lampGlow = this.add.image(430, 60, "glow").setScale(5.5).setTint(0xffd27a).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    this.glows = this.add.layer();
    this.jarFront = this.add.graphics();
    this.drawJar();
    this.lid = this.add.container(JAR.x + JAR.w / 2, JAR.y - 6);
    const lg = this.add.graphics();
    lg.fillStyle(0xd9a874).lineStyle(3, COL.inkHex).fillRoundedRect(-185, -22, 370, 34, 10).strokeRoundedRect(-185, -22, 370, 34, 10);
    lg.fillStyle(0xc28f5c).fillCircle(-120, -6, 3).fillCircle(-40, 0, 2.5).fillCircle(60, -8, 3).fillCircle(140, -2, 2);
    this.lid.add(lg);

    this.buildToolbar();
    this.buildPanel();
    this.toast = this.add.container(JAR.x + JAR.w / 2, 205).setDepth(50).setAlpha(0);
    this.toastBg = this.add.graphics();
    this.toastText = label(this, 0, 0, "", 20, COL.ink, 0.5);
    this.toast.add([this.toastBg, this.toastText]);
    this.tip = this.add.container(0, 0).setDepth(60).setVisible(false);
    this.tipBg = this.add.graphics();
    this.tipText = label(this, 0, 0, "", 18, COL.ink, 0.5);
    this.tip.add([this.tipBg, this.tipText]);

    this.input.on("pointerdown", (p, over) => this.tapJar(p, over));
    this.input.keyboard?.on("keydown-SPACE", () => this.cycleSpeed());
    this.input.keyboard?.on("keydown-ESC", () => this.select(null));
    window.STATE = "jar";
  }

  // Static scenery ---------------------------------------------------------
  drawRoom() {
    const g = this.room;
    g.fillStyle(0xfff8ef).lineStyle(6, COL.inkHex);
    g.strokeRoundedRect(110, 24, 640, 560, 18);              // window frame
    g.lineStyle(4, COL.inkHex).lineBetween(430, 24, 430, 584).lineBetween(110, 300, 750, 300);
    g.fillStyle(0xc99a6b).fillRect(60, 652, 680, 22);         // shelf
    g.fillStyle(0xa97b50).fillRect(60, 674, 680, 8);
    g.lineStyle(3, COL.inkHex).strokeRect(60, 652, 680, 30);
    g.lineStyle(2, COL.inkHex).lineBetween(430, 0, 430, 22);  // lamp cord
    g.fillStyle(0xf7a8b8).lineStyle(3, COL.inkHex);
    g.beginPath(); g.moveTo(400, 46); g.lineTo(460, 46); g.lineTo(448, 22); g.lineTo(412, 22); g.closePath(); g.fillPath(); g.strokePath();
  }

  drawJar() {
    const b = this.jarBack, f = this.jarFront, { x, y, w, h } = JAR;
    b.clear().fillStyle(COL.glass, 0.35).fillRoundedRect(x, y + 40, w, h - 40, 46).fillRect(x + 70, y, w - 140, 50);
    f.clear().lineStyle(5, COL.inkHex).strokeRoundedRect(x, y + 40, w, h - 40, 46);
    f.fillStyle(COL.glass, 1).fillRect(x + 72, y + 36, w - 144, 10);
    f.lineStyle(5, COL.inkHex).lineBetween(x + 70, y, x + 70, y + 42).lineBetween(x + w - 70, y, x + w - 70, y + 42);
    f.lineStyle(10, 0xffffff, 0.55).lineBetween(x + 30, y + 110, x + 30, y + 330);
    f.lineStyle(6, 0xffffff, 0.45).lineBetween(x + 30, y + 360, x + 30, y + 400);
  }

  // UI -----------------------------------------------------------------------
  buildToolbar() {
    const y = 700;
    this.lidBtn = button(this, 225, y, 120, 36, "Open lid", () => this.toggleLid());
    this.lampBtn = button(this, 355, y, 120, 36, "Lamp off", () => this.toggleLamp());
    this.mistBtn = button(this, 485, y, 120, 36, "Mist 💦", () => { Sim.mist(this.s); this.say("Pssst! +10 humidity"); });
    this.speedBtn = button(this, 615, y, 120, 36, "▶ 1x", () => this.cycleSpeed());
  }

  buildPanel() {
    const g = this.add.graphics();
    g.fillStyle(COL.inkHex, 0.18).fillRoundedRect(770, 26, 490, 676, 22);
    g.fillStyle(COL.card).lineStyle(4, COL.inkHex).fillRoundedRect(766, 20, 490, 676, 22).strokeRoundedRect(766, 20, 490, 676, 22);
    this.dayText = label(this, 792, 56, "", 28);
    this.seedText = label(this, 1150, 56, "", 26, COL.ink, 1);
    this.muteBtn = label(this, 1226, 56, Audio.muted ? "🔇" : "🔊", 24, COL.ink, 0.5).setInteractive({ useHandCursor: true })
      .on("pointerup", () => this.muteBtn.setText(Audio.toggle(this.game) ? "🔇" : "🔊"));

    this.bars = this.add.graphics();
    this.barDefs = [
      { key: "hum", name: "Humidity", col: COL.hum, good: [45, 85] },
      { key: "air", name: "Fresh air", col: COL.air, good: [50, 100] },
      { key: "light", name: "Light", col: COL.light },
      { key: "mould", name: "Mould", col: COL.mouldBar, good: [0, 5] },
    ];
    this.barVals = this.barDefs.map((d, i) => {
      label(this, 792, 104 + i * 38, d.name, 20);
      return label(this, 1232, 104 + i * 38, "", 20, COL.ink, 1);
    });

    this.graph = this.add.graphics();
    label(this, 792, 272, "last 15 days", 16, "#9a7a66");
    [["humidity", COL.hum], ["air", 0x5fb38a], ["moss", COL.mossBar], ["mould", 0xa79d90]].forEach(([n, c], i) => {
      this.add.rectangle(912 + i * 84, 272, 14, 6, c).setOrigin(0, 0.5);
      label(this, 930 + i * 84, 272, n, 15, "#9a7a66");
    });

    this.logText = this.add.text(792, 420, "", { fontFamily: FONT, fontSize: "17px", color: COL.ink, lineSpacing: 4 }).setOrigin(0, 0);

    this.cards = SHOP.map((kind, i) => {
      const cx = 870 + (i % 3) * 156, cy = 556 + Math.floor(i / 3) * 84;
      const c = this.add.container(cx, cy);
      const bg = this.add.graphics();
      const icon = this.add.graphics().setPosition(-44, kind === "fern" ? 22 : 14).setScale(kind === "fern" ? 0.42 : kind === "moss" ? 1 : 1.1);
      if (kind === "moss") icon.fillStyle(COL.moss[1]).lineStyle(2, COL.inkHex).fillEllipse(0, -6, 34, 18).strokeEllipse(0, -6, 34, 18);
      else DRAW[kind](icon, "happy");
      const name = label(this, -18, -12, Sim.KINDS[kind].name, 18);
      const n = Sim.KINDS[kind].cost;
      const cost = label(this, -18, 14, n + (n === 1 ? " seed" : " seeds"), 15, "#9a7a66");
      c.add([bg, icon, name, cost]);
      c.setSize(146, 74).setInteractive({ useHandCursor: true }).on("pointerup", () => this.select(this.selected === kind ? null : kind));
      c.paint = () => {
        const on = this.selected === kind, afford = this.s.seeds >= Sim.KINDS[kind].cost;
        bg.clear().fillStyle(on ? 0xffe6a8 : 0xfffdf8).lineStyle(on ? 4 : 2, COL.inkHex, afford ? 1 : 0.35).fillRoundedRect(-73, -37, 146, 74, 14).strokeRoundedRect(-73, -37, 146, 74, 14);
        c.setAlpha(afford ? 1 : 0.5);
      };
      return c;
    });
  }

  select(kind) {
    this.selected = kind;
    this.say(kind ? `Tap inside the jar to add a ${Sim.KINDS[kind].name.toLowerCase()} · ${Sim.KINDS[kind].blurb}` : "");
  }

  say(str) {
    this.toastText.setText(str).setWordWrapWidth(440).setAlign("center");
    const w = Math.min(470, this.toastText.width + 30), h = this.toastText.height + 16;
    this.toastBg.clear().fillStyle(0xfffdf8, 0.95).lineStyle(2, COL.inkHex).fillRoundedRect(-w / 2, -h / 2, w, h, 14).strokeRoundedRect(-w / 2, -h / 2, w, h, 14);
    this.tweens.killTweensOf(this.toast);
    this.toast.setAlpha(str ? 1 : 0);
    if (str && !this.selected) this.tweens.add({ targets: this.toast, alpha: 0, delay: 2200, duration: 500 });
  }

  toggleLid() {
    Sim.setLid(this.s, !this.s.lid);
    this.lidBtn.setLabel(this.s.lid ? "Close lid" : "Open lid");
    this.lidBtn.setOn(this.s.lid);
    this.tweens.add({ targets: this.lid, x: JAR.x + JAR.w / 2 + (this.s.lid ? 150 : 0), y: JAR.y - 6 - (this.s.lid ? 46 : 0), angle: this.s.lid ? 12 : 0, duration: 350, ease: "Back.Out" });
  }

  toggleLamp() {
    Sim.setLamp(this.s, !this.s.lamp);
    this.lampBtn.setLabel(this.s.lamp ? "Lamp on" : "Lamp off");
    this.lampBtn.setOn(this.s.lamp);
  }

  cycleSpeed() {
    this.speedIdx = (this.speedIdx + 1) % SPEEDS.length;
    const sp = SPEEDS[this.speedIdx];
    this.speedBtn.setLabel(sp ? `▶ ${sp}x` : "⏸ paused");
  }

  tapJar(p, over) {
    if (over.length) return;
    if (!inJar(p.x, p.y)) { this.tip.setVisible(false); return; }
    if (!this.selected) return;
    const x = Phaser.Math.Clamp((p.x - JAR.x - 26) / (JAR.w - 52), 0, 1);
    const y = Phaser.Math.Clamp((JAR.soil - 8 - p.y) / 360, 0.25, 0.85);
    const r = Sim.place(this.s, this.selected, x, y);
    if (r.ok) { Audio.blip(this, 520); this.say(`${Sim.KINDS[this.selected].name} added!`); this.selected = this.s.seeds >= Sim.KINDS[this.selected].cost ? this.selected : null; }
    else this.say("Can't: " + r.why);
  }

  showTip(e, x, y) {
    const name = Sim.KINDS[e.kind].name;
    const str = e.why ? `${name}: ${e.why}` : `${name}: ${e.mood === "happy" ? "happy!" : "doing okay"}`;
    this.tipText.setText(str);
    const w = this.tipText.width + 24;
    this.tipBg.clear().fillStyle(0xfffdf8).lineStyle(2, COL.inkHex).fillRoundedRect(-w / 2, -16, w, 32, 10).strokeRoundedRect(-w / 2, -16, w, 32, 10);
    this.tip.setPosition(x, y - 70).setVisible(true);
    this.tipFor = e.id;
  }

  // Frame --------------------------------------------------------------------
  update(time, delta) {
    const sp = SPEEDS[this.speedIdx];
    this.acc += (delta / 1000) * sp / DAY_SECONDS;
    for (let n = 0; this.acc >= DT && n < 60; n++) { Sim.tick(this.s, DT); this.acc -= DT; }
    const s = this.s;
    const sun = sunAt(s.day);

    this.sky.clear().fillStyle(lerpColor(0x2b3566, 0xbfe3f2, sun)).fillRoundedRect(112, 26, 636, 556, 16);
    if (sun > 0 && sun < 0.35) this.sky.fillStyle(0xf7b38a, 0.35 * (1 - sun / 0.35)).fillRect(112, 300, 636, 282);
    if (!sun) for (let i = 0; i < 14; i++) this.sky.fillStyle(0xfff3b0, 0.6 + 0.4 * Math.sin(time / 600 + i)).fillCircle(130 + hash(i, 1) * 600, 40 + hash(i, 2) * 240, 1.5 + hash(i, 3) * 1.5);
    this.night.setFillStyle(COL.night, (1 - sun) * 0.45);
    this.lampGlow.setAlpha(s.lamp ? 0.55 : 0);

    this.drawSoil();
    this.syncCreatures(time);
    this.drawPanel(sun);
  }

  drawSoil() {
    const g = this.soil, { x, w, soil, floor } = JAR;
    g.clear();
    g.fillStyle(COL.soil).fillRoundedRect(x + 4, soil, w - 8, floor - soil + 14, { tl: 0, tr: 0, bl: 40, br: 40 });
    g.fillStyle(COL.soilDark).fillRoundedRect(x + 4, floor - 18, w - 8, 32, { tl: 0, tr: 0, bl: 40, br: 40 });
    for (let k = 0; k < 26; k++) g.fillStyle(0xa98468).fillCircle(x + 30 + hash(k, 9) * (w - 60), soil + 14 + hash(k, 4) * 50, 3 + hash(k, 5) * 3);
    const sw = (w - 52) / Sim.N;
    this.s.slots.forEach((sl, i) => {
      const cx = jx(Sim.slotX(i));
      for (let k = 0; k < Math.round(sl.det * 7); k++) g.fillStyle(COL.det).fillEllipse(cx - sw / 2 + hash(i, k) * sw, soil + 2 + hash(k, i) * 6, 6, 3);
      if (sl.moss > 0.01) {
        const col = sl.moss < 0.35 ? COL.moss[0] : sl.moss < 0.7 ? COL.moss[1] : COL.moss[2];
        const hgt = 6 + sl.moss * 22;
        g.fillStyle(col).lineStyle(2, COL.inkHex, 0.6);
        g.fillEllipse(cx, soil, sw + 10, hgt).strokeEllipse(cx, soil, sw + 10, hgt);
        g.fillStyle(lerpColor(col, 0xffffff, 0.25)).fillCircle(cx - 3, soil - hgt * 0.25, hgt * 0.15);
      }
      for (let k = 0; k < Math.round(sl.mould * 9); k++) {
        g.fillStyle(COL.mould).lineStyle(1, 0x9f978a).fillCircle(cx - sw / 2 + hash(i, k + 20) * sw, soil - 4 - hash(k + 20, i) * 14, 3 + hash(i * 3, k) * 3).strokeCircle(cx - sw / 2 + hash(i, k + 20) * sw, soil - 4 - hash(k + 20, i) * 14, 3 + hash(i * 3, k) * 3);
      }
    });
  }

  syncCreatures(time) {
    const alive = new Set();
    for (const e of this.s.ents) {
      alive.add(e.id);
      let v = this.views.get(e.id);
      if (!v) {
        const c = this.add.container(jx(e.x), e.kind === "firefly" ? jy(e.y) : JAR.soil);
        const g = this.add.graphics();
        const glow = e.kind === "firefly" ? this.add.image(0, 6, "glow").setScale(0.7).setTint(0xffe680).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0) : null;
        const bubble = label(this, 0, -46, "", 18, COL.ink, 0.5).setVisible(false);
        if (glow) c.add(glow);
        c.add([g, bubble]);
        c.setSize(e.kind === "fern" ? 90 : 44, e.kind === "fern" ? 90 : 44).setInteractive({ useHandCursor: true })
          .on("pointerup", () => this.showTip(e, c.x, c.y));
        (e.kind === "firefly" ? this.glows : this.ents).add(c);
        c.setScale(0); this.tweens.add({ targets: c, scale: 1, duration: 300, ease: "Back.Out" });
        v = { c, g, glow, bubble, mood: null };
        this.views.set(e.id, v);
      }
      if (v.mood !== e.mood) { v.g.clear(); DRAW[e.kind](v.g, e.mood); v.mood = e.mood; }
      const tx = jx(e.x);
      let ty = e.kind === "firefly" ? jy(e.y) + Math.sin(time / 300 + e.id) * 6 : JAR.soil - 2;
      if (e.kind === "springtail") ty -= Math.abs(Math.sin(time / 160 + e.id)) * 12;
      v.c.x += (tx - v.c.x) * 0.15;
      v.c.y += (ty - v.c.y) * 0.3;
      if (e.kind === "snail" || e.kind === "springtail") v.g.scaleX = e.dir;
      if (e.kind === "fern") v.g.setScale(0.5 + e.size * 0.6);
      if (e.kind === "snail") v.g.scaleY = 1 + Math.sin(time / 250 + e.id) * 0.03;
      if (v.glow) v.glow.setAlpha(e.glow ? 0.7 + 0.3 * Math.sin(time / 280 + e.id * 2) : 0);
      const icon = e.why ? MOOD_ICON[e.why] || "❗" : "";
      v.bubble.setText(icon).setVisible(!!icon).setY((e.kind === "fern" ? -100 : -48) + Math.sin(time / 400) * 3);
      if (this.tipFor === e.id && this.tip.visible) this.showTip(e, v.c.x, v.c.y);
    }
    for (const [id, v] of this.views) {
      if (alive.has(id)) continue;
      this.views.delete(id);
      v.c.disableInteractive();
      this.tweens.add({ targets: v.c, alpha: 0, y: v.c.y + 10, duration: 600, onComplete: () => v.c.destroy() });
      if (this.tipFor === id) this.tip.setVisible(false);
    }
  }

  drawPanel(sun) {
    const s = this.s;
    this.dayText.setText(`Day ${Math.floor(s.day) + 1} · ${clock(s.day)}`);
    this.seedText.setText(`🌰 ${s.seeds}`);
    const vals = { hum: s.hum, air: s.air, light: Sim.light(s) * 100, mould: (Sim.mouldTotal(s) / Sim.N) * 100 };
    const b = this.bars.clear();
    this.barDefs.forEach((d, i) => {
      const y = 104 + i * 38, x0 = 916, bw = 250, v = vals[d.key];
      b.fillStyle(0xf1e6d6).fillRoundedRect(x0, y - 10, bw, 20, 10);
      if (d.good) b.fillStyle(0xdcefd2).fillRect(x0 + bw * d.good[0] / 100, y - 10, bw * (d.good[1] - d.good[0]) / 100, 20);
      b.fillStyle(d.col).fillRoundedRect(x0, y - 10, Math.max(10, bw * v / 100), 20, 10);
      b.lineStyle(2, COL.inkHex).strokeRoundedRect(x0, y - 10, bw, 20, 10);
      const bad = d.good && (v < d.good[0] || v > d.good[1]);
      this.barVals[i].setText(Math.round(v) + "%").setColor(bad ? "#c8553d" : COL.ink);
    });

    const g = this.graph.clear(), gx = 792, gy = 292, gw = 440, gh = 110;
    g.fillStyle(0xfffdf8).lineStyle(2, COL.inkHex, 0.5).fillRoundedRect(gx, gy, gw, gh, 10).strokeRoundedRect(gx, gy, gw, gh, 10);
    const hst = s.history;
    for (const [key, col] of [["hum", COL.hum], ["air", 0x5fb38a], ["moss", COL.mossBar], ["mould", 0xa79d90]]) {
      if (hst.length < 2) break;
      g.lineStyle(3, col).beginPath();
      hst.forEach((h, i) => {
        const px = gx + 8 + (i / 149) * (gw - 16), py = gy + gh - 8 - (h[key] / 100) * (gh - 16);
        i ? g.lineTo(px, py) : g.moveTo(px, py);
      });
      g.strokePath();
    }
    this.logText.setText(s.log.slice(0, 4).map(l => "· " + l.text).join("\n"));
    for (const c of this.cards) c.paint();
  }
}
