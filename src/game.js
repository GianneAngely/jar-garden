const DT = 1 / 240;          // sim step (days)
const DAY_SECONDS = 60;      // real seconds per in-game day at 1x
const SPEEDS = [1, 2, 4];
const UPRIGHT = matchMedia("(orientation: portrait) and (max-width: 820px)"); // same query as #rotate in index.html
const SHOP = ["moss", "springtail", "fern", "mushroom", "snail", "firefly"];
const SPRITES = ["snail", "snail-sad", "springtail", "firefly", "fern", "mushroom", "moss", "mould", "leaves", "lamp", "cork", "soil", "hedgehog", "owl", "frog", "mole"];
const ICONS = ["spray", "bulb", "lid", "drop", "seed", "sprout", "air", "heart"];

// creature sprite: display scale + origin. Ground creatures stand on the soil (origin bottom).
// in the jar one art pixel is 2 screen pixels (the creature sprites are twice as detailed as the room)
const JAR_PX = 2;
const LOOK = {
  snail: { s: JAR_PX, oy: 1 }, springtail: { s: 1, oy: 1 }, firefly: { s: JAR_PX, oy: 0.5 }, // springtails are tiny
  fern: { s: JAR_PX, oy: 0.97 }, mushroom: { s: JAR_PX, oy: 0.98 },
};
const WHY_ICON = {
  "too dry": "drop", "stuffy air": "air", "can't breathe": "air", "hungry": "leaves", "nothing to eat": "leaves",
  "too dim": "bulb", "needs more moss": "sprout", "lamp too bright": "bulb",
};

const sunAt = day => { const f = day % 1; return f > 0.25 && f < 0.75 ? Math.sin(Math.PI * (f - 0.25) / 0.5) : 0; };
// in 15-minute steps: at 4x a minute is shorter than a frame, and re-rendering the text every frame is costly
const clock = day => {
  const m = Math.floor((day % 1) * 24 * 4) * 15, h = Math.floor(m / 60);
  return `${(h + 11) % 12 + 1}:${String(m % 60).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};
const SEED_AT = { x: 1060, y: 56 }; // the seed counter, where flying seeds land
const barY = i => 102 + i * 44; // panel bar rows (room under Humidity and Fresh air for their cause line)
const FLUX_NAME = { lid: "open lid", plants: "plants", animals: "animals", mould: "mould", glass: "glass" };
const hash = (a, b) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };

function label(scene, x, y, str, size = 22, color = COL.ink, origin = 0) {
  return scene.add.text(x, y, str, { fontFamily: FONT, fontSize: size + "px", color }).setOrigin(origin, 0.5);
}

// hand-drawn speaker (the emoji was the only glossy thing on screen); a cross when muted
function muteButton(scene, x, y) {
  const g = scene.add.graphics().setDepth(40);
  const draw = () => {
    g.clear().fillStyle(COL.card).lineStyle(2.5, COL.inkHex).fillCircle(x, y, 18).strokeCircle(x, y, 18);
    g.fillStyle(COL.inkHex).fillRect(x - 10, y - 4, 5, 8).fillTriangle(x - 6, y - 4, x - 6, y + 4, x + 1, y - 10).fillTriangle(x - 6, y + 4, x + 1, y - 10, x + 1, y + 10);
    g.lineStyle(2.5, COL.inkHex);
    if (Audio.muted) g.lineBetween(x + 4, y - 5, x + 11, y + 5).lineBetween(x + 11, y - 5, x + 4, y + 5);
    else { g.beginPath().arc(x + 2, y, 6, -0.9, 0.9).strokePath(); g.beginPath().arc(x + 2, y, 11, -0.9, 0.9).strokePath(); }
  };
  draw();
  const hit = scene.add.zone(x, y, 40, 40).setInteractive({ useHandCursor: true }).on("pointerup", () => { Audio.toggle(scene.game); draw(); });
  return { g, hit };
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
  if (icon) c.add(scene.add.image(-w / 2 + 22, 0, "icon-" + icon).setScale(fitPx(scene, "icon-" + icon, 26)));
  c.setSize(w, h).setInteractive({ useHandCursor: true })
    .on("pointerdown", () => c.setScale(0.95))
    .on("pointerout", () => c.setScale(1))
    .on("pointerup", () => { c.setScale(1); Audio.sfx(scene, "click", { volume: 0.35 }); onTap(); });
  c.setLabel = s => t.setText(s);
  c.setOn = paint;
  return c;
}

class Boot extends Phaser.Scene {
  constructor() { super("Boot"); }
  preload() {
    // a small progress bar, so a slow connection never shows an empty screen while art and audio load
    const g = this.add.graphics(), t = this.add.text(W / 2, H / 2 - 40, "Growing the jar...", { fontFamily: FONT, fontSize: "26px", color: COL.ink }).setOrigin(0.5);
    this.load.on("progress", p => g.clear().fillStyle(0xe6d5bf).fillRoundedRect(W / 2 - 160, H / 2, 320, 18, 9).fillStyle(0x9fd08a).fillRoundedRect(W / 2 - 160, H / 2, Math.max(18, 320 * p), 18, 9).lineStyle(3, COL.inkHex).strokeRoundedRect(W / 2 - 160, H / 2, 320, 18, 9));
    this.load.once("complete", () => { g.destroy(); t.destroy(); });
    document.getElementById("boot")?.remove(); // the plain-HTML "Growing the jar..." shown while Phaser itself downloads
    for (const k of SPRITES) this.load.image(k, `assets/px/${k}.png`);
    for (const k of ICONS) this.load.image("icon-" + k, `assets/px/icon-${k}.png`);
    Audio.load(this);
    for (const k of ["bg-day", "bg-night", "title", "logo"]) this.load.image(k, `assets/px/${k}.png`);
  }
  create() {
    Audio.apply(this.game);
    // soft radial glow, used for fireflies and the lamp (works in Canvas and WebGL)
    const t = this.textures.createCanvas("glow", 128, 128), ctx = t.getContext();
    const grd = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, "rgba(255,255,255,1)"); grd.addColorStop(0.35, "rgba(255,255,255,0.45)"); grd.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grd; ctx.fillRect(0, 0, 128, 128); t.refresh();
    document.fonts.load("16px Tiny5").finally(() => this.scene.start(QS.has("play") ? "Jar" : "Title"));
  }
}

class Jar extends Phaser.Scene {
  constructor() { super("Jar"); }

  create(data) {
    const seed = Number(QS.get("seed")) || (Date.now() % 100000) + 1;
    const saved = data?.resume && Save.load();
    if (saved) this.s = saved;
    else {
      this.s = Sim.create(seed);
      Req.create(this.s);
    }
    const snap = saved && Save.load(Save.snapKey); // Continue: Rewind still goes where it did before the reload
    this.noteSnap = snap?.req?.i === this.s.req.i ? snap : structuredClone(this.s);
    window.jar = this.s;
    this.speedIdx = this.s.req.perks.includes("speed") ? 1 : 0; // a continued jar runs at 2x like after note 1
    this.paused = false;
    this.acc = 0;
    this.selected = null;
    this.views = new Map();

    this.add.image(0, 0, "bg-day").setOrigin(0).setScale(PX);
    this.bgNight = this.add.image(0, 0, "bg-night").setOrigin(0).setScale(PX).setAlpha(0);
    this.jarBack = this.add.graphics();
    this.drawJarBack();

    // soil band, clipped to the jar's rounded bottom
    const mask = this.make.graphics({ add: false }).fillRoundedRect(JAR.x + 3, JAR.y + 40, JAR.w - 6, JAR.h - 43, 44);
    const soilImg = this.add.image(JAR.x + JAR.w / 2, JAR.soil - 4, "soil").setOrigin(0.5, 0);
    soilImg.setScale(JAR_PX).setMask(mask.createGeometryMask());

    // per-slot soil life: leftovers, moss, mould (pooled images, scaled each frame)
    // drawn in layers: every moss tuft first, then leftovers and mould on top, so a leaf pile or a mould patch
    // never hides under the carpet
    const at = i => ({ x: jx(Sim.slotX(i)), flip: hash(i, 7) < 0.5 });
    this.slotViews = this.s.slots.map((_, i) => ({ moss: this.add.image(at(i).x, JAR.soil + 5, "moss").setOrigin(0.5, 1).setFlipX(at(i).flip).setVisible(false) }));
    this.slotViews.forEach((v, i) => { v.leaves = this.add.image(at(i).x, JAR.soil + 6, "leaves").setOrigin(0.5, 1).setFlipX(at(i).flip).setVisible(false); });
    this.slotViews.forEach((v, i) => { v.mould = this.add.image(at(i).x, JAR.soil + 6, "mould").setOrigin(0.5, 1).setFlipX(!at(i).flip).setVisible(false); });
    this.ents = this.add.layer();
    this.night = this.add.rectangle(0, 0, W, H, COL.night, 0).setOrigin(0);
    // the lamp hangs where the room art has its own lamp (covering it), so the room's lamp is the one you switch
    this.lamp = this.add.image(112, 52, "lamp").setOrigin(0.5, 0).setScale(PX);
    this.lampGlow = this.add.image(this.lamp.x, 270, "glow").setScale(6).setTint(0xffd27a).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    this.glows = this.add.layer();
    this.jarFront = this.add.graphics();
    this.drawJarFront();
    // sim tells on the glass: droplets when it is too wet (hum > 85), a grey haze when the air goes stale (< 35)
    this.haze = this.add.graphics().fillStyle(0x9aa0a6).fillRoundedRect(JAR.x + 6, JAR.y + 44, JAR.w - 12, JAR.soil - JAR.y - 40, 40).setAlpha(0);
    this.dew = this.add.graphics().setAlpha(0);
    for (let k = 0; k < 46; k++) {
      const side = k % 2, x = side ? JAR.x + JAR.w - 14 - hash(k, 1) * 26 : JAR.x + 14 + hash(k, 1) * 26, y = JAR.y + 70 + hash(k, 2) * (JAR.soil - JAR.y - 90);
      const r = 2 + hash(k, 3) * 3.5;
      this.dew.fillStyle(0xffffff, 0.55).fillCircle(x, y, r).fillStyle(0xbfdbe6, 0.6).fillCircle(x + r * 0.25, y + r * 0.3, r * 0.6);
    }
    this.jarBack = this.bake(this.jarBack, "jar-back");
    this.jarFront = this.bake(this.jarFront, "jar-front");
    this.haze = this.bake(this.haze, "jar-haze");
    this.dew = this.bake(this.dew, "jar-dew");
    this.lid = this.add.image(JAR.x + JAR.w / 2, JAR.y + 22, "cork").setOrigin(0.5, 1).setScale(PX);
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

    Audio.loadBeds(this); // in case the title's background load was cut short by a quick Play
    this.card = new NoteCard(this);
    this.coach = new Coach(this);
    this.showSpeed();
    this.thanks = [];
    this.dim = 0;          // extra night darkness for the first-glow moment (tweened)
    this.nextWisp = 0;
    this.nextSpore = 0;
    this.prevMoss = this.s.slots.map(sl => sl.moss);
    this.pendingSeeds = 0;
    this.lastPayShown = this.s.lastPay?.day;
    this.syncButtons();
    this.input.on("pointerdown", (p, over) => this.tapJar(p, over));
    this.input.keyboard?.on("keydown-SPACE", () => this.speedBtn.visible && !this.modal && this.togglePause());
    this.input.keyboard?.on("keydown-ESC", () => this.select(null));
    window.STATE = "jar";
    if (this.s.req.won && !this.s.req.winSeen) this.time.delayedCall(800, () => this.showWin()); // closed mid-party: the finale still shows
  }

  // Turn a static Graphics into a texture once, in the same place in the display list: WebGL rebuilds every
  // Graphics' geometry each frame, and these never change (playtest perf: 4x-throttled CPU dropped to 30 fps).
  bake(g, key) {
    if (this.textures.exists(key)) this.textures.remove(key);
    g.generateTexture(key, W, H);
    const img = this.make.image({ x: 0, y: 0, key, add: false }).setOrigin(0).setAlpha(g.alpha).setDepth(g.depth);
    this.children.addAt(img, this.children.getIndex(g));
    g.destroy();
    return img;
  }

  // Jar glass: drawn in code (Flow kept copying its reference into glass), styled like the art
  drawJarBack() {
    const { x, y, w, h } = JAR;
    this.jarBack.fillStyle(0xeef8f6, 0.32).fillRoundedRect(x, y + 40, w, h - 40, 46).fillRect(x + 60, y, w - 120, 50);
  }

  drawJarFront() {
    const f = this.jarFront, { x, y, w, h } = JAR, ink = 0x5e3d2e;
    // stepped pixel outline, open between the neck walls; a light rim inside it like the style reference's glass
    f.fillStyle(0xd8eef0, 0.9);
    pxOutline(f, x + 4, y + 44, w - 8, h - 48, 42, 4, [x + 60, x + w - 60]);
    f.fillStyle(ink);
    pxOutline(f, x, y + 40, w, h - 40, 46, 4, [x + 64, x + w - 64]);
    f.fillRect(x + 60, y, 4, 44).fillRect(x + w - 64, y, 4, 44);
    f.lineStyle(4, ink).fillStyle(0xd8eef0, 0.9).fillRoundedRect(x + 52, y - 8, w - 104, 16, 6).strokeRoundedRect(x + 52, y - 8, w - 104, 16, 6);
    // glass glints: chunky pixel streaks
    f.fillStyle(0xffffff, 0.5).fillRect(x + 20, y + 100, 8, 168).fillRect(x + 20, y + 288, 8, 32);
    f.fillStyle(0xffffff, 0.35).fillRect(x + w - 32, y + 120, 4, 52);
  }

  // UI -----------------------------------------------------------------------
  buildToolbar() {
    const y = 664, cx = JAR.x + JAR.w / 2;
    // during the onboarding only the control the coach points at responds
    const live = (key, fn) => () => (this.thanks.length ? null : this.coach.allows(key) ? fn() : this.coach.nudge());
    this.lidBtn = button(this, cx - 195, y, 122, 40, "Open lid", "lid", live("lid", () => this.toggleLid()));
    this.lampBtn = button(this, cx - 65, y, 122, 40, "Lamp off", "bulb", live("lamp", () => this.toggleLamp()));
    this.mistBtn = button(this, cx + 65, y, 122, 40, "Mist", "spray", live("mist", () => {
      const h0 = this.s.hum;
      Sim.mist(this.s); this.puff(); FX.fog(this);
      this.say(h0 >= 95 ? "Already soaked!" : `Pssst! +${Math.round(this.s.hum - h0)} humidity`);
      Audio.sfx(this, "mist", { volume: 0.45 }); Audio.sfx(this, "drip", { volume: 0.25, delay: 0.45, rate: 1.1 });
    }));
    this.speedBtn = button(this, cx + 195, y, 122, 40, "▶ 1x", null, live("speed", () => this.cycleSpeed()));
    for (const b of [this.lidBtn, this.lampBtn, this.mistBtn, this.speedBtn]) b.setDepth(35); // above the party portraits
  }

  buildPanel() {
    const g = this.add.graphics();
    g.fillStyle(COL.inkHex, 0.18).fillRoundedRect(770, 26, 490, 676, 22);
    g.fillStyle(COL.card).lineStyle(4, COL.inkHex).fillRoundedRect(766, 20, 490, 676, 22).strokeRoundedRect(766, 20, 490, 676, 22);
    this.bake(g, "panel-bg");
    this.barGlow = this.add.graphics(); // the coach's highlight, under the bars
    this.dayText = label(this, 792, 56, "", 28);
    this.add.image(SEED_AT.x, SEED_AT.y, "icon-seed").setScale(fitPx(this, "icon-seed", 30));
    this.seedText = label(this, SEED_AT.x + 20, 56, "", 30, COL.ink, 0);
    // "?": the jar guide (every species' needs and what the bubbles mean)
    const help = this.add.graphics().fillStyle(COL.card).lineStyle(2.5, COL.inkHex).fillCircle(1178, 56, 18).strokeCircle(1178, 56, 18);
    label(this, 1178, 55, "?", 22, COL.ink, 0.5);
    this.add.zone(1178, 56, 40, 40).setInteractive({ useHandCursor: true })
      .on("pointerup", () => (this.coach.active || this.modal || this.thanks.length ? null : (Audio.sfx(this, "click", { volume: 0.35 }), showGuide(this))));
    this.muteBtn = muteButton(this, 1222, 56);

    this.bars = this.add.graphics();
    // green zones follow the sim's own thresholds for whoever lives in the jar; a number turns red when it is out
    // of its zone or when any creature is sad because of it, so red always means someone is suffering
    this.barDefs = [
      { key: "hum", name: "Humidity", col: COL.hum, why: ["too dry"] },
      { key: "air", name: "Fresh air", col: COL.air, good: [35, 100], why: ["stuffy air", "can't breathe"] },
      { key: "light", name: "Light", col: COL.light, why: ["too dim", "lamp too bright"] },
      { key: "mould", name: "Mould", col: COL.mouldBar, good: [0, 5] },
    ];
    this.barVals = this.barDefs.map((d, i) => {
      label(this, 792, barY(i), d.name, 20);
      return label(this, 1232, barY(i), "", 20, COL.ink, 1);
    });
    // cause lines: what is pushing humidity and fresh air up or down right now (sim s.flux, per day)
    this.causeText = ["hum", "air"].map((k, i) => label(this, 916, barY(i) + 20, "", 13, "#7a5a48"));
    // the next payday, live: which kinds are happy enough to pay a seed at midnight
    this.payText = label(this, SEED_AT.x - 2, 84, "", 14, "#7a5a48", 0);

    this.graph = this.make.graphics({ add: false }); // drawn into graphRT only when the history changes
    this.graphRT = this.add.renderTexture(792, 292, 440, 110).setOrigin(0);
    this.graphLabel = label(this, 792, 272, "last 15 days", 16, "#9a7a66");
    [["humidity", COL.hum], ["air", 0x5fb38a], ["moss", COL.mossBar], ["mould", 0xa79d90]].forEach(([n, c], i) => {
      this.add.rectangle(912 + i * 84, 272, 14, 6, c).setOrigin(0, 0.5);
      label(this, 930 + i * 84, 272, n, 15, "#9a7a66");
    });

    this.logText = this.add.text(792, 420, "", { fontFamily: FONT, fontSize: "17px", color: COL.ink, lineSpacing: 4 }).setOrigin(0, 0);

    this.cards = SHOP.map((kind, i) => {
      const cx = 855 + (i % 3) * 156, cy = 556 + Math.floor(i / 3) * 84;
      const c = this.add.container(cx, cy);
      const bg = this.add.graphics();
      const tex = this.textures.get(kind).getSourceImage();
      const icon = this.add.image(-44, 2, kind).setScale(Math.max(1, Math.floor(Math.min(56 / tex.width, 54 / tex.height))));
      const name = label(this, -12, -12, Sim.KINDS[kind].name, 17);
      const n = Sim.KINDS[kind].cost;
      const cost = label(this, -12, 14, n + (n === 1 ? " seed" : " seeds"), 15, "#7a5a48");
      c.add([bg, icon, name, cost]);
      const unlockAt = Req.NOTES.findIndex(nt => nt.unlock === kind);
      const lock = label(this, -12, 14, `after note ${unlockAt + 1}`, 15, "#7a5a48");
      c.add(lock);
      c.setSize(146, 74).setInteractive({ useHandCursor: true }).on("pointerup", () => {
        if (!Req.canBuy(this.s, kind)) return this.say(`${Sim.KINDS[kind].name} comes with note ${unlockAt + 1}`);
        if (!this.coach.allows("shop:" + kind)) return this.coach.nudge();
        this.select(kind);
      });
      c.paint = () => {
        const open = Req.canBuy(this.s, kind), on = this.selected === kind, afford = this.s.seeds >= Sim.KINDS[kind].cost;
        const look = `${open}${on}${afford}`;
        if (look === c.look) return;
        c.look = look;
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
    this.tip.setVisible(false);
    if (this.coach.active) return; // the coach has its own prompt
    this.say(kind ? `Tap inside the jar to add a ${Sim.KINDS[kind].name.toLowerCase()} · ${Sim.KINDS[kind].blurb}` : "", 0, true);
  }

  // short message over the jar; it fades after ms unless sticky (the "tap inside the jar" hint while placing)
  say(str, ms = 2200, sticky = false) {
    if (str && this.coach?.active) return;
    this.toastText.setText(str).setWordWrapWidth(380).setAlign("center");
    const w = Math.min(410, this.toastText.width + 30), h = this.toastText.height + 16;
    this.toastBg.clear().fillStyle(0xfffdf8, 0.95).lineStyle(2, COL.inkHex).fillRoundedRect(-w / 2, -h / 2, w, h, 14).strokeRoundedRect(-w / 2, -h / 2, w, h, 14);
    this.tweens.killTweensOf(this.toast);
    this.toast.setAlpha(str ? 1 : 0);
    if (str && !sticky) this.tweens.add({ targets: this.toast, alpha: 0, delay: ms, duration: 500 });
  }

  puff() {
    for (let k = 0; k < 10; k++) {
      const d = this.add.image(JAR.x + 60 + Math.random() * (JAR.w - 120), JAR.y + 70, "icon-drop").setScale(fitPx(this, "icon-drop", 12)).setAlpha(0.9).setDepth(40);
      this.tweens.add({ targets: d, y: JAR.y + 140 + Math.random() * 220, alpha: 0, duration: 900 + Math.random() * 500, onComplete: () => d.destroy() });
    }
  }

  toggleLid() {
    Sim.setLid(this.s, !this.s.lid);
    Audio.sfx(this, this.s.lid ? "lid-open" : "lid-close", { volume: 0.5 });
    this.lidBtn.setLabel(this.s.lid ? "Close lid" : "Open lid");
    this.lidBtn.setOn(this.s.lid);
    const { x, y } = this.lidHome;
    this.tweens.add({ targets: this.lid, x: x + (this.s.lid ? 110 : 0), y: y - (this.s.lid ? 52 : 0), angle: this.s.lid ? 12 : 0, duration: 380, ease: "Back.Out" });
  }

  toggleLamp() {
    Sim.setLamp(this.s, !this.s.lamp);
    Audio.sfx(this, this.s.lamp ? "lamp-on" : "lamp-off", { volume: 0.5 });
    this.syncButtons();
  }

  // the button cycles 1x, 2x, 4x; Space pauses and resumes
  cycleSpeed() {
    this.paused = false;
    this.speedIdx = (this.speedIdx + 1) % SPEEDS.length;
    this.showSpeed();
  }
  togglePause() {
    this.paused = !this.paused;
    this.showSpeed();
  }
  showSpeed() { this.speedBtn.setLabel(this.paused ? "⏸ paused" : `▶ ${SPEEDS[this.speedIdx]}x`); }

  tapJar(p, over) {
    if (over.length) return;
    if (!inJar(p.x, p.y)) { this.tip.setVisible(false); if (this.selected && !this.coach.active) this.select(null); return; }
    if (!this.selected) { if (this.coach.active) this.coach.nudge(); else if (!this.tip.visible) this.say("Pick something in the shop first"); return; }
    if (!this.coach.allows("jar")) return this.coach.nudge();
    const x = Phaser.Math.Clamp((p.x - JAR.x - 26) / (JAR.w - 52), 0, 1);
    const y = Phaser.Math.Clamp((JAR.soil - 6 - p.y) / AIR_H, 0.25, 0.85);
    const r = Req.place(this.s, this.selected, x, y);
    if (r.ok) {
      Audio.sfx(this, "plop", { rate: { moss: 1.25, springtail: 1.15, fern: 0.85, mushroom: 0.95 }[this.selected] || 1 });
      if (this.selected === "firefly") FX.sparkle(this, p.x, p.y, 6);
      else FX.dust(this, this.selected === "moss" ? jx(Sim.slotX(r.slot)) : jx(x), JAR.soil);
      if (this.selected === "moss") {
        this.prevMoss[r.slot] = 1; // placed, not spread: no spread sparkle
        const t = label(this, jx(Sim.slotX(r.slot)), JAR.soil - 40, "+2.5%", 15, COL.ink, 0.5).setDepth(55).setStroke("#fff8ef", 4);
        this.tweens.add({ targets: t, y: t.y - 26, alpha: 0, delay: 300, duration: 900, onComplete: () => t.destroy() });
      }
    }
    if (r.ok) { if (!this.coach.active) this.say(`${Sim.KINDS[this.selected].name} added!`); this.selected = this.s.seeds >= Sim.KINDS[this.selected].cost ? this.selected : null; }
    else this.say("Can't: " + r.why);
  }

  showTip(e, x, y) {
    const name = e.name || Sim.KINDS[e.kind].name;
    const str = e.why ? `${name}: ${e.why}` : `${name}: ${e.mood === "happy" ? "happy!" : "doing okay"}`;
    this.tipText.setText(str);
    const w = this.tipText.width + 24;
    this.tipBg.clear().fillStyle(0xfffdf8).lineStyle(2, COL.inkHex).fillRoundedRect(-w / 2, -16, w, 32, 10).strokeRoundedRect(-w / 2, -16, w, 32, 10);
    this.tip.setPosition(x, y - (e.kind === "fern" ? 140 : 80)).setVisible(true);
    if (this.tipFor !== e.id) this.tipUntil = this.time.now + 3000;
    this.tipFor = e.id;
  }

  // Notes --------------------------------------------------------------------
  onNote(ev) {
    if (ev.type === "broke") { if (ev.why) this.say(`Oh no! ${ev.why}`); return; }
    if (ev.type === "warn") { this.say("Last animal gone! Add one by tomorrow.", 6000); return; }
    if (ev.type === "lose") { this.showLose(ev.tip); return; }
    // done: the sim already paid the seeds and set up the next note; snapshot it for Rewind
    // (unless no animal is alive: Rewind must never bring back a jar that is already lost)
    if (this.s.ents.some(e => Sim.ANIMALS.includes(e.kind))) { this.noteSnap = structuredClone(this.s); Save.write(this.s, true); }
    this.thanks.push(ev.note);
    this.pendingSeeds += ev.note.reward; // they fly in during the thank-you
    if (this.thanks.length === 1) this.thank(0);
  }

  // one thank-you at a time; a note finished during another's thank-you still gets read for a moment first
  thank(wait) {
    const note = this.thanks[0];
    this.time.delayedCall(wait, () => this.snapJar("pc-" + note.id, photo => {
      Audio.sfx(this, "note-done", { volume: 0.55 });
      const lead = note.id === "glow" ? this.firstGlow() : note.id === "party" ? this.partyGlow() : 0;
      this.time.delayedCall(lead, () => this.card.celebrate(note, () => {
        if (note.unlock === "speed") {
          // from here on the jar runs at 2x (playtest: judges stay at 1x and wait); the button changes it
          this.speedIdx = 1;
          this.showSpeed();
          this.speedBtn.setVisible(true).setScale(0);
          this.tweens.add({ targets: this.speedBtn, scale: 1, duration: 400, ease: "Back.Out" });
          this.say("Time now runs 2x. Tap ▶ to change it.");
          Audio.sfx(this, "unlock", { volume: 0.45 });
        } else if (note.unlock) {
          this.tweens.add({ targets: this.cards[SHOP.indexOf(note.unlock)], scale: 1.12, yoyo: true, repeat: 1, duration: 220 });
          this.say(`New in the shop: ${Sim.KINDS[note.unlock].name}!`);
          Audio.sfx(this, "unlock", { volume: 0.45 });
        }
        this.thanks.shift();
        if (this.thanks.length) this.thank(1800);
        else if (this.s.req.won) this.showWin();
      }, Math.floor(this.s.day) + 1, photo));
    }));
  }

  // The finale: every glowing firefly sparkles, a bloom fills the jar, the room dims and the camera leans in
  partyGlow() {
    const cam = this.cameras.main;
    Audio.sfx(this, "glow", { volume: 0.6 });
    this.tweens.add({ targets: this, dim: 0.25, duration: 600, yoyo: true, hold: 1600 });
    cam.pan(580, 370, 800, "Sine.easeInOut");
    cam.zoomTo(1.1, 800, "Sine.easeInOut");
    const bloom = this.add.image(JAR.x + JAR.w / 2, 380, "glow").setScale(2).setTint(0xffd27a).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setDepth(22);
    this.tweens.add({ targets: bloom, scale: 8, alpha: { from: 0, to: 0.38 }, duration: 1000, yoyo: true, hold: 900, ease: "Sine.InOut", onComplete: () => bloom.destroy() });
    this.s.ents.filter(e => e.glow).forEach((e, i) => {
      const v = this.views.get(e.id);
      if (v) this.time.delayedCall(200 + i * 160, () => { FX.sparkle(this, v.c.x, v.c.y, 10, 0xffe680, 60); FX.hearts(this, v.c.x, v.c.y - 16, 3, 30); });
    });
    this.time.delayedCall(2300, () => { cam.pan(W / 2, H / 2, 700, "Sine.easeInOut"); cam.zoomTo(1, 700, "Sine.easeInOut"); });
    return 3000;
  }

  // The wow beat after Hazel's note: dim the room, lean the camera in on the jar, let Dot sparkle. Returns its
  // length in ms so the thank-you card waits for it.
  firstGlow() {
    const dot = this.s.ents.find(e => e.name === "Dot"), v = dot && this.views.get(dot.id);
    const cam = this.cameras.main;
    Audio.sfx(this, "glow", { volume: 0.55 });
    this.tweens.add({ targets: this, dim: 0.22, duration: 500, yoyo: true, hold: 1200 });
    cam.pan(580, 380, 700, "Sine.easeInOut"); // 580: at 1.12x the view stays inside the 1280-wide room
    cam.zoomTo(1.12, 700, "Sine.easeInOut");
    if (v) {
      // a warm bloom fills the jar for a moment, so the glow lights the moss and the snail, not just Dot
      const bloom = this.add.image(v.c.x, v.c.y + 40, "glow").setScale(1).setTint(0xffd27a).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setDepth(22);
      this.tweens.add({ targets: bloom, scale: 6.5, alpha: { from: 0, to: 0.42 }, duration: 900, yoyo: true, hold: 600, ease: "Sine.InOut", onComplete: () => bloom.destroy() });
      this.time.delayedCall(300, () => FX.sparkle(this, v.c.x, v.c.y, 14, 0xffe680, 70));
      this.time.delayedCall(700, () => FX.hearts(this, v.c.x, v.c.y - 20, 5, 30));
    }
    this.time.delayedCall(1700, () => { cam.pan(W / 2, H / 2, 600, "Sine.easeInOut"); cam.zoomTo(1, 600, "Sine.easeInOut"); });
    return 2300;
  }

  // Fen's soggy leaves tumble in from the jar mouth onto the piles the note just dumped there
  leafFall() {
    Req.PILES.forEach((slot, i) => {
      for (let k = 0; k < 2; k++) {
        const lf = this.add.image(JAR.x + JAR.w / 2 + (hash(i, k) - 0.5) * 120, JAR.y + 20, "leaves").setScale(JAR_PX).setDepth(25).setAngle(hash(k, i) * 360);
        this.tweens.add({ targets: lf, x: jx(Sim.slotX(slot)), y: JAR.soil - 4, angle: lf.angle + 200, duration: 1100 + hash(i, k + 3) * 500, delay: i * 120 + k * 200,
          ease: "Sine.In", onComplete: () => this.tweens.add({ targets: lf, alpha: 0, duration: 300, onComplete: () => lf.destroy() }) });
      }
    });
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

  // Midnight payday, made visible: a seed rises from one happy member of each paying kind (the fullest moss tuft
  // for moss) and flies to the counter; sad animals get a small "no seed" instead.
  payPops(pay) {
    const s = this.s, at = [];
    for (const k of pay.kinds) {
      if (k === "moss") {
        let best = 0;
        s.slots.forEach((sl, i) => { if (sl.moss > s.slots[best].moss) best = i; });
        at.push([jx(Sim.slotX(best)), JAR.soil - 20]);
      } else {
        const e = s.ents.find(o => o.kind === k && o.mood === "happy"), v = e && this.views.get(e.id);
        if (v) at.push([v.c.x, v.c.y - (k === "firefly" ? 10 : 30)]);
      }
    }
    this.bumpSeeds(0);
    at.forEach(([x, y], i) => {
      this.pendingSeeds++;
      const sd = this.add.image(x, y, "icon-seed").setScale(fitPx(this, "icon-seed", 22)).setDepth(55).setAlpha(0);
      const plus = label(this, x + 30, y - 40, "+1", 18, "#fff8ef", 0.5).setStroke(COL.ink, 4).setDepth(55).setAlpha(0);
      this.tweens.add({ targets: plus, alpha: 1, y: y - 56, duration: 380, delay: i * 160, yoyo: true, hold: 300 });
      this.tweens.chain({ targets: sd, tweens: [
        { alpha: 1, y: y - 36, duration: 380, delay: i * 160, ease: "Back.Out" },
        { x: SEED_AT.x, y: SEED_AT.y, duration: 650, delay: 200, ease: "Cubic.In", onComplete: () => { sd.destroy(); plus.destroy(); this.bumpSeeds(); } },
      ] });
    });
    for (const e of s.ents.filter(o => o.mood === "sad" && Sim.ANIMALS.includes(o.kind)).slice(0, 3)) {
      const v = this.views.get(e.id);
      if (!v) continue;
      const t = label(this, v.c.x, v.c.y - 50, "no seed", 15, "#fff8ef", 0.5).setStroke(COL.ink, 4).setDepth(55);
      this.tweens.add({ targets: t, y: t.y - 24, alpha: 0, delay: 500, duration: 1400, onComplete: () => t.destroy() });
    }
  }

  // one seed landed on the counter (n = 1), or just re-show it; the counter lags the sim by the seeds still flying
  bumpSeeds(n = 1) {
    if (n) { this.seedRun = this.time.now - (this.lastSeedAt || 0) < 600 ? (this.seedRun || 0) + 1 : 0; this.lastSeedAt = this.time.now; }
    if (n) Audio.sfx(this, "seed", { volume: 0.3, rate: 1 + Math.min(8, this.seedRun) * 0.07 });
    this.pendingSeeds = Math.max(0, this.pendingSeeds - n);
    this.seedText.setText(String(Math.max(0, this.s.seeds - this.pendingSeeds)));
    if (!n) return;
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
    this.select(null);
    this.pendingSeeds = 0;
    this.lastPayShown = s.lastPay?.day;
    this.graphStamp = null;
    this.syncButtons();
    this.card.noteId = null;
    this.coach.reset();
  }

  // lid, lamp and speed controls follow the jar state (staged jars and Rewind start with the lamp on)
  syncButtons() {
    const s = this.s;
    this.lidBtn.setLabel(s.lid ? "Close lid" : "Open lid");
    this.lidBtn.setOn(s.lid);
    this.lid.setPosition(this.lidHome.x + (s.lid ? 110 : 0), this.lidHome.y - (s.lid ? 52 : 0)).setAngle(s.lid ? 12 : 0);
    this.lampBtn.setLabel(s.lamp ? "Lamp off" : "Lamp on"); // the action, like the lid button; yellow = lamp is on
    this.lampBtn.setOn(s.lamp);
    this.lampBtn.list[2].setAlpha(s.lamp ? 1 : 0.45);
    if (!this.thanks?.length) this.speedBtn.setVisible(s.req.perks.includes("speed")); // revealed by its thank-you
  }

  // a centred card over a dim screen, used for lose and (until M3c) the win
  overlay(title, body, btnText, onTap) {
    const o = this.openModal();
    const dim = this.add.rectangle(0, 0, W, H, 0x2b2036, 0.45).setOrigin(0).setInteractive();
    const g = this.add.graphics().fillStyle(COL.card).lineStyle(4, COL.inkHex).fillRoundedRect(W / 2 - 230, 210, 460, 260, 22).strokeRoundedRect(W / 2 - 230, 210, 460, 260, 22);
    const t = label(this, W / 2, 260, title, 30, COL.ink, 0.5);
    const b = this.add.text(W / 2, 320, body, { fontFamily: FONT, fontSize: "19px", color: COL.ink, align: "center", wordWrap: { width: 420 } }).setOrigin(0.5, 0.5);
    const btn = button(this, W / 2, 415, 180, 46, btnText, null, () => { this.closeModal(o); onTap(); });
    o.add([dim, g, t, b, btn]);
    this.armButtons([btn]);
  }

  // modal overlays: the jar holds still, toasts/tips/selection clear, buttons only take taps once faded in
  openModal() {
    this.modal = true;
    this.say("");
    this.select(null);
    const o = this.add.container(0, 0).setDepth(70).setAlpha(0);
    this.tweens.add({ targets: o, alpha: 1, duration: 350 });
    return o;
  }
  closeModal(o) {
    o.destroy();
    this.modal = false;
  }
  armButtons(btns) {
    btns.forEach(b => b.disableInteractive());
    this.time.delayedCall(600, () => {
      btns.forEach(b => b.setInteractive({ useHandCursor: true }));
      const kb = this.input.keyboard, go = () => { if (btns[0].active) btns[0].emit("pointerup"); kb?.off("keydown-ENTER", go); kb?.off("keydown-SPACE", go); };
      kb?.once("keydown-ENTER", go); kb?.once("keydown-SPACE", go);
    });
  }

  showLose(tip) {
    Audio.sfx(this, "lose", { volume: 0.5 });
    this.overlay("The jar went quiet", `No animals are left.\nTip: ${tip}`, "Rewind", () => {
      this.loadJar(structuredClone(this.noteSnap));
      this.paused = false;
      this.showSpeed();
      this.say(this.s.req.won ? "Back to this morning." : "Back to the start of this note.");
    });
  }

  // The end: every postcard from the six notes in a row (photos of your jar over the whole story), a few numbers
  showWin() {
    Audio.sfx(this, "win", { volume: 0.55 });
    const s = this.s, o = this.openModal();
    s.req.winSeen = this.noteSnap.req.winSeen = true;
    Save.write(s);
    const dim = this.add.rectangle(0, 0, W, H, 0x2b2036, 0.5).setOrigin(0).setInteractive();
    const g = this.add.graphics().fillStyle(COL.card).lineStyle(4, COL.inkHex).fillRoundedRect(130, 70, 1020, 580, 26).strokeRoundedRect(130, 70, 1020, 580, 26);
    o.add([dim, g, label(this, W / 2, 124, "Party night!", 40, COL.ink, 0.5), label(this, W / 2, 168, "Your neighbours sent you six postcards.", 20, "#9a7a66", 0.5)]);
    Req.NOTES.forEach((n, i) => {
      const pc = postcard(this, n, s.req.days?.[i] ?? i + 1, "pc-" + n.id).setScale(0.6).setPosition(240 + i * 160, 336).setAngle(i % 2 ? 4 : -4);
      o.add(pc);
      pc.setAlpha(0).y += 30;
      this.tweens.add({ targets: pc, alpha: 1, y: 336, delay: 300 + i * 140, duration: 420, ease: "Back.Out" });
      // tap a postcard to read it big, tap again to put it back
      const home = { x: pc.x, angle: pc.angle };
      pc.setSize(250, 318).setInteractive({ useHandCursor: true }).on("pointerup", () => {
        const big = pc.scale > 0.7;
        o.bringToTop(pc);
        this.tweens.add({ targets: pc, x: big ? home.x : W / 2, y: big ? 336 : 360, scale: big ? 0.6 : 1.45, angle: big ? home.angle : 0, duration: 320, ease: "Back.Out" });
      });
    });
    const kinds = Req.SPECIES.filter(k => Req.species(s)[k].n > 0).length;
    const days = s.req.days?.at(-1) ?? Math.floor(s.day) + 1;
    o.add(label(this, W / 2, 470, "Tap a postcard to read it.", 15, "#9a7a66", 0.5));
    o.add(label(this, W / 2, 506, `${days} days · ${s.born} ${s.born === 1 ? "baby" : "babies"} born · ${kinds} kinds living together`, 20, COL.ink, 0.5));
    const keep = button(this, W / 2, 580, 220, 50, "Keep playing", null, () => this.closeModal(o));
    o.add(keep);
    this.armButtons([keep]);
  }

  // Frame --------------------------------------------------------------------
  update(time, delta) {
    const sp = this.coach.fast || (this.paused ? 0 : SPEEDS[this.speedIdx]);
    this.acc += (delta / 1000) * sp / DAY_SECONDS;
    if (this.thanks.length || this.modal || UPRIGHT.matches) this.acc = 0; // the jar holds still during a thank-you or an overlay
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
    // nights are darker with the lamp off, so the fireflies carry the light
    this.night.setFillStyle(COL.night, Math.min(0.8, dusk * (s.lamp ? 0.38 : 0.5) + this.dim));
    const shade = Phaser.Display.Color.Interpolate.ColorWithColor({ r: 255, g: 255, b: 255 }, { r: 140, g: 150, b: 190 }, 1, s.lamp ? dusk * 0.5 : dusk);
    const tint = Phaser.Display.Color.GetColor(shade.r, shade.g, shade.b);
    this.lid.setTint(tint); this.lamp.setTint(s.lamp ? tint : 0x8c90a8); this.card.people.each(im => im.setTint(tint));
    this.haze.setAlpha(Phaser.Math.Clamp((45 - s.air) / 45, 0, 1) * 0.45);
    this.dew.setAlpha(Phaser.Math.Clamp((s.hum - 85) / 12, 0, 1));
    if (s.lid && time > this.nextWisp) { FX.airWisp(this); this.nextWisp = time + 240; }
    if (time > this.nextSpore) {
      this.nextSpore = time + 260;
      const i = Math.floor(Math.random() * Sim.N);
      if (s.slots[i].mould > 0.2 && Math.random() < s.slots[i].mould + 0.3) FX.spore(this, jx(Sim.slotX(i)));
    }
    this.lampGlow.setAlpha(s.lamp ? 0.6 : 0);

    const nightNow = dusk > 0.5;
    Audio.bed(this, "music", nightNow ? "music-night" : "music-day");
    Audio.bed(this, "amb", nightNow ? "amb-night" : "amb-day");
    this.glowCount = s.ents.filter(e => e.glow).length;
    const glowing = s.ents.some(e => e.glow && e.mood !== "sad");
    if (glowing && !this.wasGlowing && Req.current(s)?.id !== "glow") Audio.sfx(this, "glow", { volume: 0.3 });
    this.wasGlowing = glowing;

    this.coach.update(time);
    this.drawSoil(time);
    this.syncCreatures(time);
    this.drawPanel();
  }

  drawSoil(time) {
    this.s.slots.forEach((sl, i) => {
      const v = this.slotViews[i];
      v.leaves.setVisible(sl.det > 0.05).setScale(pxStep(JAR_PX * (0.6 + sl.det)));
      const m = sl.moss;
      if (m > 0.02 && this.prevMoss[i] <= 0.02) FX.sparkle(this, v.moss.x, JAR.soil - 8, 4, 0xd6f0a8, 22); // moss spread here
      this.prevMoss[i] = m;
      v.moss.setVisible(m > 0.01);
      if (m > 0.01) v.moss.setScale(pxStep(JAR_PX * (0.8 + m * 0.7)), pxStep(JAR_PX * (0.4 + m))).setAlpha(m < 0.15 ? 0.7 : 1);
      v.mould.setVisible(sl.mould > 0.02);
      if (sl.mould > 0.02) v.mould.setScale(pxStep(JAR_PX * (0.7 + sl.mould)), pxStep(JAR_PX * (0.5 + sl.mould)));
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
        const glow = e.kind === "firefly" ? this.add.image(-12, 6, "glow").setScale(0.95).setTint(0xffe680).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0) : null;
        const halo = e.kind === "firefly" ? this.add.image(-12, 6, "glow").setScale(2.6).setTint(0xffd27a).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0) : null;
        const bubble = this.add.container(0, 0).setVisible(false);
        const bubbleBg = this.add.graphics().fillStyle(0xfffdf8, 0.95).lineStyle(2, COL.inkHex).fillCircle(0, 0, 15).strokeCircle(0, 0, 15);
        const bubbleIcon = this.add.image(0, 0, "icon-drop");
        bubble.add([bubbleBg, bubbleIcon]);
        if (glow) c.add([halo, glow]);
        c.add([img, bubble]);
        const big = e.kind === "fern" ? 120 : 50;
        // pointerdown, so the tap that places a creature doesn't also open its tooltip on release
        // while a shop item is picked, a tap that lands on a creature still places it
        c.setSize(big, big).setInteractive({ useHandCursor: true }).on("pointerdown", p => (this.selected ? this.tapJar(p, []) : this.showTip(e, c.x, c.y)));
        c.input.hitArea.y = look.oy === 1 || e.kind === "fern" ? -big / 2 : 0;
        (e.kind === "firefly" ? this.glows : this.ents).add(c);
        c.setScale(0); this.tweens.add({ targets: c, scale: 1, duration: 320, ease: "Back.Out" });
        if (e.baby) FX.hearts(this, c.x, c.y - 30, 3, 26);
        v = { c, img, glow, halo, bubble, bubbleIcon, why: null };
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
      if (e.baby && e.age < 1) { sx *= 0.5 + e.age * 0.5; sy *= 0.5 + e.age * 0.5; } // babies grow up over a day
      if (e.kind === "snail") sy *= 1 + Math.sin(time / 260 + e.id) * 0.035;
      if (e.kind === "firefly") sy *= 1 + Math.sin(time / 60 + e.id) * 0.05;
      if (e.kind === "fern") { sx *= 0.45 + e.size * 0.55; sy = sx; rot = Math.sin(time / 1300 + e.id) * 0.04; }
      if (e.kind === "mushroom") sy *= 1 + Math.sin(time / 700 + e.id) * 0.03;
      if (sad && e.kind !== "snail") { sy *= 0.9; rot += 0.06; }
      const dir = e.kind === "snail" || e.kind === "springtail" ? e.dir : e.kind === "firefly" ? (e.tx > e.x ? 1 : -1) : 1;
      v.img.setScale(sx * dir, sy).setRotation(rot);
      if (v.glow) {
        const a = e.glow ? (sad ? 0.3 : 1) * (0.75 + 0.25 * Math.sin(time / 280 + e.id * 2)) : 0;
        v.glow.x = v.halo.x = -12 * dir;
        v.glow.setAlpha(a);
        v.halo.setAlpha(a * 0.28 / Math.sqrt(Math.max(1, this.glowCount || 1)));
      }

      const icon = e.why ? WHY_ICON[e.why] || "drop" : "";
      if (icon !== v.why) {
        v.why = icon;
        v.bubble.setVisible(!!icon);
        if (icon) {
          const key = icon === "leaves" ? "leaves" : "icon-" + icon;
          const src = this.textures.get(key).getSourceImage();
          v.bubbleIcon.setTexture(key).setScale(fitPx(this, key, 20));
        }
      }
      if (icon) v.bubble.setY(-v.img.displayHeight * look.oy - 20 + Math.sin(time / 400) * 3);
      if (this.tipFor === e.id && this.tip.visible) {
        if (this.time.now > this.tipUntil) this.tip.setVisible(false);
        else this.showTip(e, v.c.x, v.c.y);
      }
    }
    const flies = this.s.ents.filter(e => e.kind === "firefly").map(e => this.views.get(e.id)).filter(Boolean);
    for (let a = 0; a < flies.length; a++) for (let b = a + 1; b < flies.length; b++) {
      const A = flies[a].c, B = flies[b].c, dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy) || 1;
      if (d < 60) { const push = (60 - d) * 0.2; A.x -= dx / d * push; A.y -= dy / d * push; B.x += dx / d * push; B.y += dy / d * push; }
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
    if (s.lastPay && s.lastPay.day !== this.lastPayShown) {
      this.lastPayShown = s.lastPay.day;
      this.payPops(s.lastPay);
      if (s.req.won && s.ents.some(e => Sim.ANIMALS.includes(e.kind))) this.noteSnap = structuredClone(s); // free play: Rewind to this morning
      if (s.ents.some(e => Sim.ANIMALS.includes(e.kind))) Save.write(s, s.req.won); // free play: this morning is the Rewind point
    }
    this.seedText.setText(String(Math.max(0, s.seeds - this.pendingSeeds)));
    const vals = { hum: s.hum, air: s.air, light: Sim.light(s) * 100, mould: (Sim.mouldTotal(s) / Sim.N) * 100 };
    const dry = { moss: 30, snail: 45, firefly: 50, fern: 50, springtail: 55, mushroom: 55 };
    const humLo = Math.max(Sim.mossTotal(s) > 0.05 ? 30 : 0, ...s.ents.map(e => dry[e.kind]));
    const sadWhy = new Set(s.ents.filter(e => e.mood === "sad").map(e => e.why));
    const zoom = Req.current(s)?.id === "soggy" ? 20 : 100; // Fen's note: the Mould bar reads 0-20%, with a 1% tick
    const b = this.bars.clear();
    this.barDefs.forEach((d, i) => {
      const y = barY(i), x0 = 916, bw = 250, v = vals[d.key];
      const good = d.key === "hum" ? [humLo, 85] : d.good, max = d.key === "mould" ? zoom : 100;
      b.fillStyle(0xf1e6d6).fillRoundedRect(x0, y - 10, bw, 20, 10);
      if (good) b.fillStyle(0xdcefd2).fillRect(x0 + bw * good[0] / max, y - 10, bw * (Math.min(max, good[1]) - good[0]) / max, 20);
      b.fillStyle(d.col).fillRoundedRect(x0, y - 10, Math.max(10, Math.min(bw, bw * v / max)), 20, 10);
      if (max !== 100) b.lineStyle(3, 0xc8553d).lineBetween(x0 + bw / max, y - 13, x0 + bw / max, y + 13);
      b.lineStyle(2, COL.inkHex).strokeRoundedRect(x0, y - 10, bw, 20, 10);
      const bad = (good && (v < good[0] || v > good[1])) || d.why?.some(w => sadWhy.has(w));
      const txt = d.key === "mould" && v > 0 && v < 10 ? (Math.ceil(v * 10) / 10).toFixed(1) : Math.round(v);
      this.barVals[i].setText(txt + "%").setColor(bad ? "#c8553d" : COL.ink);
    });

    const hst = s.history, stamp = hst.length + ":" + (hst.at(-1)?.hum ?? "");
    if (stamp !== this.graphStamp) this.drawGraph(hst, stamp);
    this.logText.setText(s.log.slice(0, 4).map(l => "· " + l.text).join("\n"));
    ["hum", "air"].forEach((k, i) => {
      const all = Object.entries(s.flux?.[k] || {}).filter(([n]) => n !== "lid" || s.lid);
      const big = Math.max(1, ...all.map(([, v]) => Math.abs(v)));
      const f = all.filter(([, v]) => Math.abs(v) >= Math.max(1, big * 0.1));
      const up = f.filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([n]) => FLUX_NAME[n]);
      const down = f.filter(([, v]) => v < 0).sort((a, b) => a[1] - b[1]).slice(0, 2).map(([n]) => FLUX_NAME[n]);
      this.causeText[i].setText([up.length ? "▲ " + up.join(", ") : "", down.length ? "▼ " + down.join(", ") : ""].filter(Boolean).join("   "));
    });
    const pay = Req.paying(s);
    this.payText.setText(pay.length && !this.coach.active ? `+${pay.length} at midnight` : "");
    const q = this.thanks[0]; // a finished note waiting for its thank-you stays on the card, full
    const pr = q ? { note: q, goal: q.goal(s), p: 1, paused: false } : Req.progress(s);
    if (pr) this.card.refresh(pr, Req.NOTES.indexOf(pr.note), Req.NOTES.length);
    for (const c of this.cards) c.paint();
  }

  // the 15-day graph, redrawn into its texture only when a new sample arrives
  drawGraph(hst, stamp) {
    this.graphStamp = stamp;
    const g = this.graph.clear(), gx = 792, gy = 292, gw = 440, gh = 110;
    this.graphLabel.setText(hst.length >= 150 ? "last 15 days" : "so far");
    g.fillStyle(0xfffdf8).lineStyle(2, COL.inkHex, 0.5).fillRoundedRect(gx + 1, gy + 1, gw - 2, gh - 2, 10).strokeRoundedRect(gx + 1, gy + 1, gw - 2, gh - 2, 10);
    for (const [key, col] of [["hum", COL.hum], ["air", 0x5fb38a], ["moss", COL.mossBar], ["mould", 0xa79d90]]) {
      if (hst.length < 3) break;
      g.lineStyle(3, col).beginPath();
      hst.forEach((h, i) => {
        const px = gx + 8 + (i / Math.max(hst.length - 1, 29)) * (gw - 16), py = gy + gh - 8 - (h[key] / 100) * (gh - 16);
        i ? g.lineTo(px, py) : g.moveTo(px, py);
      });
      g.strokePath();
    }
    this.graphRT.clear().draw(g, -gx, -gy);
  }
}
