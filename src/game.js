const DT = 1 / 240;          // sim step (days)
const DAY_SECONDS = 60;      // real seconds per in-game day at 1x
const SPEEDS = [1, 2, 4, 0];
const SHOP = ["moss", "springtail", "fern", "mushroom", "snail", "firefly"];
const SPRITES = ["snail", "snail-sad", "springtail", "firefly", "fern", "mushroom", "moss", "mould", "leaves", "lamp", "cork", "soil", "hedgehog", "owl", "frog", "mole"];
const ICONS = ["spray", "bulb", "lid", "drop", "seed", "sprout", "air", "heart"];

// creature sprite: display scale + origin. Ground creatures stand on the soil (origin bottom).
const LOOK = {
  snail: { s: 0.3, oy: 1 }, springtail: { s: 0.3, oy: 1 }, firefly: { s: 0.3, oy: 0.5 },
  fern: { s: 0.55, oy: 0.97 }, mushroom: { s: 0.36, oy: 0.98 },
};
const WHY_ICON = {
  "too dry": "drop", "stuffy air": "air", "can't breathe": "air", "hungry": "leaves", "nothing to eat": "leaves",
  "too dim": "bulb", "needs more moss": "sprout", "lamp too bright": "bulb",
};

const sunAt = day => { const f = day % 1; return f > 0.25 && f < 0.75 ? Math.sin(Math.PI * (f - 0.25) / 0.5) : 0; };
const clock = day => {
  const m = Math.floor((day % 1) * 24 * 60), h = Math.floor(m / 60);
  return `${(h + 11) % 12 + 1}:${String(m % 60).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};
const hash = (a, b) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };

function label(scene, x, y, str, size = 22, color = COL.ink, origin = 0) {
  return scene.add.text(x, y, str, { fontFamily: FONT, fontSize: size + "px", color }).setOrigin(origin, 0.5);
}

function button(scene, x, y, w, h, str, icon, onTap) {
  const c = scene.add.container(x, y);
  const bg = scene.add.graphics();
  const t = label(scene, icon ? 14 : 0, 0, str, 19, COL.ink, 0.5);
  const paint = on => {
    bg.clear().fillStyle(COL.inkHex, 0.2).fillRoundedRect(-w / 2, -h / 2 + 4, w, h, 14);
    bg.fillStyle(on ? 0xffe6a8 : COL.card).lineStyle(3, COL.inkHex).fillRoundedRect(-w / 2, -h / 2, w, h, 14).strokeRoundedRect(-w / 2, -h / 2, w, h, 14);
  };
  paint(false);
  c.add([bg, t]);
  if (icon) c.add(scene.add.image(-w / 2 + 22, 0, "icon-" + icon).setScale(26 / 96));
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
  preload() {
    for (const k of SPRITES) this.load.image(k, `assets/${k}.webp`);
    for (const k of ICONS) this.load.image("icon-" + k, `assets/icon-${k}.webp`);
    this.load.image("bg-day", "assets/bg-day.jpg");
    this.load.image("bg-night", "assets/bg-night.jpg");
    this.load.image("title", "assets/title.jpg");
    this.load.image("logo", "assets/logo.webp");
  }
  create() {
    Audio.apply(this.game);
    // soft radial glow, used for fireflies and the lamp (works in Canvas and WebGL)
    const t = this.textures.createCanvas("glow", 128, 128), ctx = t.getContext();
    const grd = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, "rgba(255,255,255,1)"); grd.addColorStop(0.35, "rgba(255,255,255,0.45)"); grd.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grd; ctx.fillRect(0, 0, 128, 128); t.refresh();
    document.fonts.load("600 22px Fredoka").finally(() => this.scene.start(QS.has("play") ? "Jar" : "Title"));
  }
}

class Jar extends Phaser.Scene {
  constructor() { super("Jar"); }

  create() {
    const seed = Number(QS.get("seed")) || (Date.now() % 100000) + 1;
    this.s = Sim.create(seed);
    Req.create(this.s);
    this.noteSnap = structuredClone(this.s);
    window.jar = this.s;
    this.speedIdx = 0;
    this.acc = 0;
    this.selected = null;
    this.views = new Map();

    this.add.image(0, 0, "bg-day").setOrigin(0).setDisplaySize(W, H);
    this.bgNight = this.add.image(0, 0, "bg-night").setOrigin(0).setDisplaySize(W, H).setAlpha(0);
    this.jarBack = this.add.graphics();
    this.drawJarBack();

    // soil band, clipped to the jar's rounded bottom
    const mask = this.make.graphics({ add: false }).fillRoundedRect(JAR.x + 3, JAR.y + 40, JAR.w - 6, JAR.h - 43, 44);
    const soilImg = this.add.image(JAR.x + JAR.w / 2, JAR.soil - 4, "soil").setOrigin(0.5, 0);
    soilImg.setDisplaySize(JAR.w + 30, JAR.y + JAR.h - JAR.soil + 10).setMask(mask.createGeometryMask());

    // per-slot soil life: leftovers, moss, mould (pooled images, scaled each frame)
    this.slotViews = this.s.slots.map((_, i) => {
      const x = jx(Sim.slotX(i)), flip = hash(i, 7) < 0.5;
      return {
        leaves: this.add.image(x, JAR.soil + 3, "leaves").setOrigin(0.5, 1).setFlipX(flip).setVisible(false),
        moss: this.add.image(x, JAR.soil + 5, "moss").setOrigin(0.5, 1).setFlipX(flip).setVisible(false),
        mould: this.add.image(x, JAR.soil + 4, "mould").setOrigin(0.5, 1).setFlipX(!flip).setVisible(false),
      };
    });
    this.ents = this.add.layer();
    this.night = this.add.rectangle(0, 0, W, H, COL.night, 0).setOrigin(0);
    this.lamp = this.add.image(JAR.x - 10, 0, "lamp").setOrigin(0.5, 0).setScale(0.5);
    this.lampGlow = this.add.image(this.lamp.x, 122, "glow").setScale(6).setTint(0xffd27a).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    this.glows = this.add.layer();
    this.jarFront = this.add.graphics();
    this.drawJarFront();
    this.lid = this.add.image(JAR.x + JAR.w / 2, JAR.y + 22, "cork").setOrigin(0.5, 1).setDisplaySize(JAR.w - 112, 46);
    this.lidHome = { x: this.lid.x, y: this.lid.y };

    this.buildToolbar();
    this.buildPanel();
    this.toast = this.add.container(JAR.x + JAR.w / 2, 240).setDepth(50).setAlpha(0);
    this.toastBg = this.add.graphics();
    this.toastText = label(this, 0, 0, "", 19, COL.ink, 0.5);
    this.toast.add([this.toastBg, this.toastText]);
    this.tip = this.add.container(0, 0).setDepth(60).setVisible(false);
    this.tipBg = this.add.graphics();
    this.tipText = label(this, 0, 0, "", 18, COL.ink, 0.5);
    this.tip.add([this.tipBg, this.tipText]);

    this.card = new NoteCard(this);
    this.coach = new Coach(this);
    this.thanks = [];
    this.syncButtons();
    this.input.on("pointerdown", (p, over) => this.tapJar(p, over));
    this.input.keyboard?.on("keydown-SPACE", () => this.speedBtn.visible && this.cycleSpeed());
    this.input.keyboard?.on("keydown-ESC", () => this.select(null));
    window.STATE = "jar";
  }

  // Jar glass: drawn in code (Flow kept copying its reference into glass), styled like the art
  drawJarBack() {
    const { x, y, w, h } = JAR;
    this.jarBack.fillStyle(0xeef8f6, 0.32).fillRoundedRect(x, y + 40, w, h - 40, 46).fillRect(x + 60, y, w - 120, 50);
  }

  drawJarFront() {
    const f = this.jarFront, { x, y, w, h } = JAR, ink = 0x7a5a44;
    // body outline, open between the neck walls
    const r = 46, top = y + 40, bot = y + h, R = x + w;
    f.lineStyle(4, ink).beginPath();
    f.moveTo(x + 60, top); f.lineTo(x + r, top);
    f.arc(x + r, top + r, r, -Math.PI / 2, Math.PI, true); f.lineTo(x, bot - r);
    f.arc(x + r, bot - r, r, Math.PI, Math.PI / 2, true); f.lineTo(R - r, bot);
    f.arc(R - r, bot - r, r, Math.PI / 2, 0, true); f.lineTo(R, top + r);
    f.arc(R - r, top + r, r, 0, -Math.PI / 2, true); f.lineTo(R - 60, top);
    f.strokePath();
    f.lineStyle(4, ink).lineBetween(x + 60, y, x + 60, y + 42).lineBetween(x + w - 60, y, x + w - 60, y + 42);
    f.lineStyle(3, ink).strokeRoundedRect(x + 52, y - 6, w - 104, 14, 6);
    f.lineStyle(9, 0xffffff, 0.4).lineBetween(x + 26, y + 100, x + 26, y + 270);
    f.lineStyle(5, 0xffffff, 0.3).lineBetween(x + 26, y + 292, x + 26, y + 322);
    f.lineStyle(4, 0xffffff, 0.3).lineBetween(x + w - 30, y + 120, x + w - 30, y + 170);
  }

  // UI -----------------------------------------------------------------------
  buildToolbar() {
    const y = 664, cx = JAR.x + JAR.w / 2;
    // during the onboarding only the control the coach points at responds
    const live = (key, fn) => () => (this.coach.allows(key) ? fn() : this.coach.nudge());
    this.lidBtn = button(this, cx - 195, y, 122, 40, "Open lid", "lid", live("lid", () => this.toggleLid()));
    this.lampBtn = button(this, cx - 65, y, 122, 40, "Lamp off", "bulb", live("lamp", () => this.toggleLamp()));
    this.mistBtn = button(this, cx + 65, y, 122, 40, "Mist", "spray", live("mist", () => { Sim.mist(this.s); this.puff(); this.say("Pssst! +10 humidity"); }));
    this.speedBtn = button(this, cx + 195, y, 122, 40, "▶ 1x", null, live("speed", () => this.cycleSpeed()));
  }

  buildPanel() {
    const g = this.add.graphics();
    g.fillStyle(COL.inkHex, 0.18).fillRoundedRect(770, 26, 490, 676, 22);
    g.fillStyle(COL.card).lineStyle(4, COL.inkHex).fillRoundedRect(766, 20, 490, 676, 22).strokeRoundedRect(766, 20, 490, 676, 22);
    this.barGlow = this.add.graphics(); // the coach's highlight, under the bars
    this.dayText = label(this, 792, 56, "", 28);
    this.add.image(1102, 56, "icon-seed").setScale(30 / 96);
    this.seedText = label(this, 1122, 56, "", 26, COL.ink, 0);
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
      const tex = this.textures.get(kind).getSourceImage();
      const icon = this.add.image(-44, 2, kind).setScale(Math.min(56 / tex.width, 54 / tex.height));
      const name = label(this, -12, -12, Sim.KINDS[kind].name, 18);
      const n = Sim.KINDS[kind].cost;
      const cost = label(this, -12, 14, n + (n === 1 ? " seed" : " seeds"), 15, "#9a7a66");
      c.add([bg, icon, name, cost]);
      const unlockAt = Req.NOTES.findIndex(nt => nt.unlock === kind);
      const lock = label(this, -12, 14, `after note ${unlockAt + 1}`, 15, "#9a7a66");
      c.add(lock);
      c.setSize(146, 74).setInteractive({ useHandCursor: true }).on("pointerup", () => {
        if (!Req.canBuy(this.s, kind)) return this.say(`${Sim.KINDS[kind].name} comes with note ${unlockAt + 1}`);
        if (!this.coach.allows("shop:" + kind)) return this.coach.nudge();
        this.select(this.selected === kind ? null : kind);
      });
      c.paint = () => {
        const open = Req.canBuy(this.s, kind), on = this.selected === kind, afford = this.s.seeds >= Sim.KINDS[kind].cost;
        bg.clear().fillStyle(on ? 0xffe6a8 : open ? 0xfffdf8 : 0xf1e6d6).lineStyle(on ? 4 : 2, COL.inkHex, afford && open ? 1 : 0.35).fillRoundedRect(-73, -37, 146, 74, 14).strokeRoundedRect(-73, -37, 146, 74, 14);
        icon.setTint(open ? 0xffffff : 0x9a8a80);
        cost.setVisible(open); lock.setVisible(!open);
        c.setAlpha(open ? (afford ? 1 : 0.5) : 0.6);
      };
      return c;
    });
  }

  select(kind) {
    this.selected = kind;
    if (this.coach.active) return; // the coach has its own prompt
    this.say(kind ? `Tap inside the jar to add a ${Sim.KINDS[kind].name.toLowerCase()} · ${Sim.KINDS[kind].blurb}` : "", 0, true);
  }

  // short message over the jar; it fades after ms unless sticky (the "tap inside the jar" hint while placing)
  say(str, ms = 2200, sticky = false) {
    this.toastText.setText(str).setWordWrapWidth(380).setAlign("center");
    const w = Math.min(410, this.toastText.width + 30), h = this.toastText.height + 16;
    this.toastBg.clear().fillStyle(0xfffdf8, 0.95).lineStyle(2, COL.inkHex).fillRoundedRect(-w / 2, -h / 2, w, h, 14).strokeRoundedRect(-w / 2, -h / 2, w, h, 14);
    this.tweens.killTweensOf(this.toast);
    this.toast.setAlpha(str ? 1 : 0);
    if (str && !sticky) this.tweens.add({ targets: this.toast, alpha: 0, delay: ms, duration: 500 });
  }

  puff() {
    for (let k = 0; k < 10; k++) {
      const d = this.add.image(JAR.x + 60 + Math.random() * (JAR.w - 120), JAR.y + 70, "icon-drop").setScale(0.12).setAlpha(0.9).setDepth(40);
      this.tweens.add({ targets: d, y: JAR.y + 140 + Math.random() * 220, alpha: 0, duration: 900 + Math.random() * 500, onComplete: () => d.destroy() });
    }
  }

  toggleLid() {
    Sim.setLid(this.s, !this.s.lid);
    this.lidBtn.setLabel(this.s.lid ? "Close lid" : "Open lid");
    this.lidBtn.setOn(this.s.lid);
    const { x, y } = this.lidHome;
    this.tweens.add({ targets: this.lid, x: x + (this.s.lid ? 175 : 0), y: y - (this.s.lid ? 40 : 0), angle: this.s.lid ? 14 : 0, duration: 380, ease: "Back.Out" });
  }

  toggleLamp() {
    Sim.setLamp(this.s, !this.s.lamp);
    this.lampBtn.setLabel(this.s.lamp ? "Lamp on" : "Lamp off");
    this.lampBtn.setOn(this.s.lamp);
  }

  cycleSpeed() {
    this.speedIdx = (this.speedIdx + 1) % SPEEDS.length;
    const sp = this.coach.fast || SPEEDS[this.speedIdx];
    this.speedBtn.setLabel(sp ? `▶ ${sp}x` : "⏸ paused");
  }

  tapJar(p, over) {
    if (over.length) return;
    if (!inJar(p.x, p.y)) { this.tip.setVisible(false); if (this.selected) this.select(null); return; }
    if (!this.selected) return;
    if (!this.coach.allows("jar")) return this.coach.nudge();
    const x = Phaser.Math.Clamp((p.x - JAR.x - 26) / (JAR.w - 52), 0, 1);
    const y = Phaser.Math.Clamp((JAR.soil - 6 - p.y) / AIR_H, 0.25, 0.85);
    const r = Req.place(this.s, this.selected, x, y);
    if (r.ok) { Audio.blip(this, 520); if (!this.coach.active) this.say(`${Sim.KINDS[this.selected].name} added!`); this.selected = this.s.seeds >= Sim.KINDS[this.selected].cost ? this.selected : null; }
    else this.say("Can't: " + r.why);
  }

  showTip(e, x, y) {
    const name = e.name || Sim.KINDS[e.kind].name;
    const str = e.why ? `${name}: ${e.why}` : `${name}: ${e.mood === "happy" ? "happy!" : "doing okay"}`;
    this.tipText.setText(str);
    const w = this.tipText.width + 24;
    this.tipBg.clear().fillStyle(0xfffdf8).lineStyle(2, COL.inkHex).fillRoundedRect(-w / 2, -16, w, 32, 10).strokeRoundedRect(-w / 2, -16, w, 32, 10);
    this.tip.setPosition(x, y - (e.kind === "fern" ? 140 : 80)).setVisible(true);
    this.tipFor = e.id;
  }

  // Notes --------------------------------------------------------------------
  onNote(ev) {
    if (ev.type === "broke") { if (ev.why) this.say(`Oh no! ${ev.why}`); return; }
    if (ev.type === "warn") { this.say("Last animal gone! Add one by tomorrow.", 6000); return; }
    if (ev.type === "lose") { this.showLose(ev.tip); return; }
    // done: the sim already paid the seeds and set up the next note; snapshot it for Rewind
    // (unless no animal is alive: Rewind must never bring back a jar that is already lost)
    if (this.s.ents.some(e => Sim.ANIMALS.includes(e.kind))) this.noteSnap = structuredClone(this.s);
    this.thanks.push(ev.note);
    if (this.thanks.length === 1) this.thank(0);
  }

  // one thank-you at a time; a note finished during another's thank-you still gets read for a moment first
  thank(wait) {
    const note = this.thanks[0];
    this.time.delayedCall(wait, () => this.snapJar("pc-" + note.id, photo => {
      Audio.blip(this, 880, 0.15);
      this.card.celebrate(note, () => {
        if (note.unlock === "speed") {
          this.speedBtn.setVisible(true).setScale(0);
          this.tweens.add({ targets: this.speedBtn, scale: 1, duration: 400, ease: "Back.Out" });
          this.say("Speed unlocked! Try 2x.");
        } else if (note.unlock) {
          this.tweens.add({ targets: this.cards[SHOP.indexOf(note.unlock)], scale: 1.12, yoyo: true, repeat: 1, duration: 220 });
          this.say(`New in the shop: ${Sim.KINDS[note.unlock].name}!`);
        }
        this.thanks.shift();
        if (this.thanks.length) this.thank(1800);
        else if (this.s.req.won) this.showWin();
      }, Math.floor(this.s.day) + 1, photo);
    }));
  }

  // Photo of the jar for a postcard: hide the floating UI for one frame, read the pixels back, add as a texture.
  // file:// in Canvas mode taints the canvas (no read-back), so there the postcard shows the neighbour instead.
  snapJar(key, done) {
    if (LOCAL && this.game.renderer.type !== Phaser.WEBGL) return done(null);
    const hidden = [this.toast, this.tip, this.coach.ui].filter(o => o.visible && o.alpha > 0);
    hidden.forEach(o => o.setVisible(false));
    this.game.renderer.snapshotArea(JAR.x - 14, JAR.y - 30, JAR.w + 28, JAR.floor - JAR.y + 46, img => {
      hidden.forEach(o => o.setVisible(true));
      if (this.textures.exists(key)) this.textures.remove(key);
      this.textures.addImage(key, img);
      done(key);
    });
  }

  bumpSeeds() {
    this.tweens.killTweensOf(this.seedText);
    this.seedText.setScale(1.35);
    this.tweens.add({ targets: this.seedText, scale: 1, duration: 260, ease: "Back.Out" });
  }

  // swap in another jar state (Rewind): drop every creature view, re-sync buttons
  loadJar(s) {
    this.s = s;
    window.jar = s;
    for (const v of this.views.values()) v.c.destroy();
    this.views.clear();
    this.tip.setVisible(false);
    this.syncButtons();
    this.card.noteId = null;
    this.coach.reset();
  }

  // lid, lamp and speed controls follow the jar state (staged jars and Rewind start with the lamp on)
  syncButtons() {
    const s = this.s;
    this.lidBtn.setLabel(s.lid ? "Close lid" : "Open lid");
    this.lidBtn.setOn(s.lid);
    this.lid.setPosition(this.lidHome.x + (s.lid ? 175 : 0), this.lidHome.y - (s.lid ? 40 : 0)).setAngle(s.lid ? 14 : 0);
    this.lampBtn.setLabel(s.lamp ? "Lamp on" : "Lamp off");
    this.lampBtn.setOn(s.lamp);
    this.speedBtn.setVisible(s.req.perks.includes("speed"));
  }

  // a centred card over a dim screen, used for lose and (until M3c) the win
  overlay(title, body, btnText, onTap) {
    this.speedIdx = SPEEDS.length - 1; // pause
    const o = this.add.container(0, 0).setDepth(70);
    const dim = this.add.rectangle(0, 0, W, H, 0x2b2036, 0.45).setOrigin(0).setInteractive();
    const g = this.add.graphics().fillStyle(COL.card).lineStyle(4, COL.inkHex).fillRoundedRect(W / 2 - 230, 210, 460, 260, 22).strokeRoundedRect(W / 2 - 230, 210, 460, 260, 22);
    const t = label(this, W / 2, 260, title, 30, COL.ink, 0.5);
    const b = this.add.text(W / 2, 320, body, { fontFamily: FONT, fontSize: "19px", color: COL.ink, align: "center", wordWrap: { width: 400 } }).setOrigin(0.5, 0.5);
    const btn = button(this, W / 2, 415, 180, 46, btnText, null, () => { o.destroy(); onTap(); });
    o.add([dim, g, t, b, btn]);
    o.setAlpha(0);
    this.tweens.add({ targets: o, alpha: 1, duration: 300 });
  }

  showLose(tip) {
    this.overlay("The jar went quiet", `No animals are left.\nTip: ${tip}`, "Rewind", () => {
      this.loadJar(structuredClone(this.noteSnap));
      this.speedIdx = 0;
      this.speedBtn.setLabel("▶ 1x");
      this.say("Back to the start of this note.");
    });
  }

  // The end: every postcard from the six notes in a row (photos of your jar over the whole story), a few numbers
  showWin() {
    this.speedIdx = SPEEDS.length - 1;
    const s = this.s, o = this.add.container(0, 0).setDepth(70);
    const dim = this.add.rectangle(0, 0, W, H, 0x2b2036, 0.5).setOrigin(0).setInteractive();
    const g = this.add.graphics().fillStyle(COL.card).lineStyle(4, COL.inkHex).fillRoundedRect(130, 70, 1020, 580, 26).strokeRoundedRect(130, 70, 1020, 580, 26);
    o.add([dim, g, label(this, W / 2, 124, "Party night!", 40, COL.ink, 0.5), label(this, W / 2, 168, "Your neighbours sent you six postcards.", 20, "#9a7a66", 0.5)]);
    Req.NOTES.forEach((n, i) => {
      const pc = postcard(this, n, s.req.days?.[i] ?? i + 1, "pc-" + n.id).setScale(0.6).setPosition(240 + i * 160, 336).setAngle(i % 2 ? 4 : -4);
      o.add(pc);
      pc.setAlpha(0).y += 30;
      this.tweens.add({ targets: pc, alpha: 1, y: 336, delay: 300 + i * 140, duration: 420, ease: "Back.Out" });
    });
    const kinds = Req.SPECIES.filter(k => Req.species(s)[k].n > 0).length;
    o.add(label(this, W / 2, 506, `${Math.floor(s.day) + 1} days · ${s.born} babies born · ${kinds} kinds living together`, 20, COL.ink, 0.5));
    o.add(button(this, W / 2, 580, 220, 50, "Keep playing", null, () => { o.destroy(); this.speedIdx = 0; this.speedBtn.setLabel("▶ 1x"); }));
    o.setAlpha(0);
    this.tweens.add({ targets: o, alpha: 1, duration: 400 });
  }

  // Frame --------------------------------------------------------------------
  update(time, delta) {
    const sp = this.coach.fast || SPEEDS[this.speedIdx];
    this.acc += (delta / 1000) * sp / DAY_SECONDS;
    for (let n = 0; this.acc >= DT && n < 60 && !this.s.req.lost; n++) {
      Sim.tick(this.s, DT);
      Req.gate(this.s, DT);
      const ev = Req.update(this.s, DT);
      this.acc -= DT;
      if (ev) this.onNote(ev);
    }
    const s = this.s;
    const sun = sunAt(s.day);
    const dusk = Phaser.Math.Clamp(1 - sun * 2.2, 0, 1);   // night art fades in only near sunset
    this.bgNight.setAlpha(dusk);
    this.night.setFillStyle(COL.night, dusk * 0.38);
    this.lampGlow.setAlpha(s.lamp ? 0.6 : 0);

    this.coach.update(time);
    this.drawSoil(time);
    this.syncCreatures(time);
    this.drawPanel();
  }

  drawSoil(time) {
    const sw = (JAR.w - 52) / Sim.N;
    this.s.slots.forEach((sl, i) => {
      const v = this.slotViews[i];
      v.leaves.setVisible(sl.det > 0.05).setScale(0.12 + sl.det * 0.16);
      const m = sl.moss;
      v.moss.setVisible(m > 0.01);
      if (m > 0.01) v.moss.setScale((sw * (2 + m * 1.8)) / 220, 0.16 + m * 0.5 + Math.sin(time / 900 + i) * 0.006).setAlpha(0.75 + m * 0.25);
      v.mould.setVisible(sl.mould > 0.02);
      if (sl.mould > 0.02) v.mould.setScale((sw * (1.2 + sl.mould * 2.2)) / 200, 0.12 + sl.mould * 0.32);
    });
  }

  syncCreatures(time) {
    const alive = new Set();
    for (const e of this.s.ents) {
      alive.add(e.id);
      let v = this.views.get(e.id);
      const look = LOOK[e.kind];
      if (!v) {
        const c = this.add.container(jx(e.x), e.kind === "firefly" ? jy(e.y) : JAR.soil + 2);
        const img = this.add.image(0, 0, e.kind).setOrigin(0.5, look.oy).setScale(look.s);
        const glow = e.kind === "firefly" ? this.add.image(-12, 6, "glow").setScale(0.75).setTint(0xffe680).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0) : null;
        const bubble = this.add.container(0, 0).setVisible(false);
        const bubbleBg = this.add.graphics().fillStyle(0xfffdf8, 0.95).lineStyle(2, COL.inkHex).fillCircle(0, 0, 15).strokeCircle(0, 0, 15);
        const bubbleIcon = this.add.image(0, 0, "icon-drop");
        bubble.add([bubbleBg, bubbleIcon]);
        if (glow) c.add(glow);
        c.add([img, bubble]);
        const big = e.kind === "fern" ? 120 : 50;
        // pointerdown, so the tap that places a creature doesn't also open its tooltip on release
        c.setSize(big, big).setInteractive({ useHandCursor: true }).on("pointerdown", () => this.showTip(e, c.x, c.y));
        c.input.hitArea.y = look.oy === 1 || e.kind === "fern" ? -big / 2 : 0;
        (e.kind === "firefly" ? this.glows : this.ents).add(c);
        c.setScale(0); this.tweens.add({ targets: c, scale: 1, duration: 320, ease: "Back.Out" });
        v = { c, img, glow, bubble, bubbleIcon, why: null };
        this.views.set(e.id, v);
      }
      const tx = jx(e.x);
      let ty = e.kind === "firefly" ? jy(e.y) + Math.sin(time / 300 + e.id) * 6 : JAR.soil + 2;
      if (e.kind === "springtail") ty -= Math.abs(Math.sin(time / 160 + e.id)) * 12;
      v.c.x += (tx - v.c.x) * 0.15;
      v.c.y += (ty - v.c.y) * 0.3;

      const sad = e.mood === "sad";
      if (e.kind === "snail") v.img.setTexture(sad ? "snail-sad" : "snail");
      let sx = look.s, sy = look.s, rot = 0;
      if (e.kind === "snail") sy *= 1 + Math.sin(time / 260 + e.id) * 0.035;
      if (e.kind === "firefly") sy *= 1 + Math.sin(time / 60 + e.id) * 0.05;
      if (e.kind === "fern") { sx *= 0.45 + e.size * 0.55; sy = sx; rot = Math.sin(time / 1300 + e.id) * 0.04; }
      if (e.kind === "mushroom") sy *= 1 + Math.sin(time / 700 + e.id) * 0.03;
      if (sad && e.kind !== "snail") { sy *= 0.9; rot += 0.06; }
      const dir = e.kind === "snail" || e.kind === "springtail" ? e.dir : e.kind === "firefly" ? (e.tx > e.x ? 1 : -1) : 1;
      v.img.setScale(sx * dir, sy).setRotation(rot);
      if (v.glow) { v.glow.x = -12 * dir; v.glow.setAlpha(e.glow ? 0.75 + 0.25 * Math.sin(time / 280 + e.id * 2) : 0); }

      const icon = e.why ? WHY_ICON[e.why] || "drop" : "";
      if (icon !== v.why) {
        v.why = icon;
        v.bubble.setVisible(!!icon);
        if (icon) {
          const key = icon === "leaves" ? "leaves" : "icon-" + icon;
          const src = this.textures.get(key).getSourceImage();
          v.bubbleIcon.setTexture(key).setScale(20 / Math.max(src.width, src.height));
        }
      }
      if (icon) v.bubble.setY((e.kind === "fern" ? -125 : e.kind === "firefly" ? -34 : -66) + Math.sin(time / 400) * 3);
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

  drawPanel() {
    const s = this.s;
    this.dayText.setText(`Day ${Math.floor(s.day) + 1} · ${clock(s.day)}`);
    this.seedText.setText(String(s.seeds));
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
    const q = this.thanks[0]; // a finished note waiting for its thank-you stays on the card, full
    const pr = q ? { note: q, goal: q.goal(s), p: 1, paused: false } : Req.progress(s);
    if (pr) this.card.refresh(pr, Req.NOTES.indexOf(pr.note), Req.NOTES.length);
    for (const c of this.cards) c.paint();
  }
}
