// Neighbour note card on the left windowsill: who asks, what, live progress, the reward. Drawn in code next to
// the Flow portraits. refresh() runs every frame but only re-lays out when the note changes.
const WHO = { hazel: "hedgehog", mole: "mole", owl: "owl", frog: "frog" };
const CARD = { x: 12, y: 132, w: 256 };
const PORTRAIT_H = 236;
const MUTED = "#9a7a66";
const UNLOCK_NAME = { speed: "Speed button", springtail: "Springtail", mushroom: "Mushroom", fern: "Fern" };

class NoteCard {
  constructor(scene) {
    this.scene = scene;
    this.people = scene.add.container(0, 0).setDepth(29);
    this.box = scene.add.container(CARD.x, CARD.y).setDepth(30).setAlpha(0); // layout() fades it in
    this.bg = scene.add.graphics();
    this.head = label(scene, 16, 24, "", 21);
    this.count = label(scene, CARD.w - 16, 24, "", 15, MUTED, 1);
    const wrap = { fontFamily: FONT, color: COL.ink, wordWrap: { width: CARD.w - 32 }, lineSpacing: 1 };
    this.ask = scene.add.text(16, 42, "", { ...wrap, fontSize: "18px" });
    this.line = scene.add.text(16, 0, "", { ...wrap, fontSize: "15px", color: MUTED });
    this.viz = scene.add.graphics();
    this.icons = scene.add.container(0, 0);
    this.status = label(scene, 16, 0, "", 15);
    this.chipBg = scene.add.graphics();
    this.chipText = label(scene, 0, 0, "", 14, COL.ink, 0.5);
    this.seedIcon = scene.add.image(26, 0, "icon-seed").setScale(20 / 96);
    this.rewardText = label(scene, 42, 0, "", 15);
    this.box.add([this.bg, this.head, this.count, this.ask, this.line, this.viz, this.icons, this.status, this.chipBg, this.chipText, this.seedIcon, this.rewardText]);
    this.noteId = null;
    this.shown = 0;   // eased meter value
    this.busy = false;
  }

  // Lay out the card for a note: text blocks first, then the rows its goal needs (dots, pips, kind icons).
  layout(note, index, total) {
    this.noteId = note.id;
    this.head.setText(note.name);
    this.count.setText(`note ${index + 1}/${total}`);
    this.ask.setText(note.ask);
    this.line.setText(note.line).setY(this.ask.y + this.ask.height + 4);
    let y = this.line.y + this.line.height + 12;
    this.rows = {};
    const g = note.goal(this.scene.s);
    if (g.dots) { this.rows.dots = y; y += 20; }
    if (g.pips) { this.rows.pips = y; y += 34; }
    if (g.icons) { this.rows.icons = y; y += 36; }
    this.rows.bar = y; y += 22;
    this.status.setY(y + 4); y += 26;
    this.rows.chip = y;
    this.rows.reward = y; // moves down 30 px while a chip shows
    this.seedIcon.setY(y + 8); this.rewardText.setY(y + 8);
    const unlock = note.unlock ? ` · ${UNLOCK_NAME[note.unlock]}` : "";
    this.rewardText.setText(note.reward ? `+${note.reward}${unlock}` : "a party postcard");
    this.seedIcon.setVisible(!!note.reward);
    this.h = y + 26;
    this.chipOn = false;
    this.drawBox();
    this.buildIcons(g);
    this.buildPeople(note.who);
    this.shown = 0;
    if (note.id === "soggy") this.scene.leafFall?.();
  }

  drawBox() {
    const { w } = CARD, h = this.h, b = this.bg.clear();
    b.fillStyle(COL.inkHex, 0.18).fillRoundedRect(4, 6, w, h, 18);
    b.fillStyle(COL.card).lineStyle(3, COL.inkHex).fillRoundedRect(0, 0, w, h, 18).strokeRoundedRect(0, 0, w, h, 18);
    // speech tail down towards the neighbour
    b.fillStyle(COL.card).fillTriangle(96, h - 2, 128, h - 2, 112, h + 22);
    b.lineStyle(3, COL.inkHex).lineBetween(96, h, 112, h + 22).lineBetween(112, h + 22, 128, h);
  }

  buildIcons(g) {
    this.icons.removeAll(true);
    this.pipImgs = [];
    this.kindImgs = [];
    if (g.pips) for (let i = 0; i < g.pips.of; i++) {
      const im = this.scene.add.image(28 + i * 40, this.rows.pips + 14, "firefly").setScale(0.17);
      const glow = this.scene.add.image(im.x - 6, im.y + 3, "glow").setScale(0.42).setTint(0xffe680).setBlendMode(Phaser.BlendModes.ADD);
      this.icons.add([glow, im]);
      this.pipImgs.push({ im, glow });
    }
    if (g.icons) g.icons.forEach((k, i) => {
      const tex = this.scene.textures.get(k.key).getSourceImage();
      const im = this.scene.add.image(30 + i * 38, this.rows.icons + 16, k.key).setScale(30 / Math.max(tex.width, tex.height));
      const sad = this.scene.add.circle(im.x + 12, im.y - 11, 5, 0xc8553d).setStrokeStyle(2, COL.inkHex);
      this.icons.add([im, sad]);
      this.kindImgs.push({ im, sad });
    });
  }

  buildPeople(who) {
    this.people.removeAll(true);
    const keys = who === "all" ? ["hedgehog", "mole", "owl", "frog"] : [WHO[who]];
    const h = who === "all" ? 122 : PORTRAIT_H;
    keys.forEach((k, i) => {
      const tex = this.scene.textures.get(k).getSourceImage();
      const x = who === "all" ? 44 + i * 58 : 124;
      const im = this.scene.add.image(x, 724, k).setOrigin(0.5, 1).setScale(h / tex.height);
      this.people.add(im);
      im.y += h + 20;
      this.scene.tweens.add({ targets: im, y: 724, duration: 520, delay: 120 + i * 90, ease: "Back.Out" });
    });
    this.box.setScale(0.85).setAlpha(0);
    this.scene.tweens.add({ targets: this.box, scale: 1, alpha: 1, duration: 360, delay: 260, ease: "Back.Out" });
  }

  chip(text, fill) {
    // the card grows to make room for a chip and shrinks back without one
    if (!!text !== this.chipOn) {
      this.chipOn = !!text;
      const d = this.chipOn ? 30 : 0;
      this.seedIcon.setY(this.rows.reward + d + 8); this.rewardText.setY(this.rows.reward + d + 8);
      this.h = this.rows.reward + d + 26;
      this.drawBox();
    }
    this.chipText.setText(text);
    const w = Math.min(CARD.w - 24, this.chipText.width + 22), y = this.rows.chip + 12;
    this.chipText.setPosition(CARD.w / 2, y);
    this.chipBg.clear();
    if (!text) return;
    this.chipBg.fillStyle(fill).lineStyle(2, COL.inkHex, 0.6).fillRoundedRect(CARD.w / 2 - w / 2, y - 12, w, 24, 12).strokeRoundedRect(CARD.w / 2 - w / 2, y - 12, w, 24, 12);
  }

  refresh(pr, index, total) {
    if (this.busy || !pr) return;
    if (pr.note.id !== this.noteId) this.layout(pr.note, index, total);
    const { note, goal } = pr, r = this.scene.s.req;
    this.shown += (pr.p - this.shown) * 0.12;
    const v = this.viz.clear(), bw = CARD.w - 32, by = this.rows.bar;
    v.fillStyle(0xf1e6d6).fillRoundedRect(16, by, bw, 16, 8);
    v.fillStyle(pr.paused ? 0xb9c7dd : 0x9fd08a).fillRoundedRect(16, by, Math.max(14, bw * this.shown), 16, 8);
    v.lineStyle(2, COL.inkHex).strokeRoundedRect(16, by, bw, 16, 8);
    if (goal.dots) goal.dots.forEach((m, i) => {
      const x = 22 + i * 11.2, y = this.rows.dots + 8;
      v.fillStyle(0x8a6448, 0.35).fillCircle(x, y, 4.5);
      if (m > 0.02) v.fillStyle(0x7fb069).fillCircle(x, y, 1.5 + 3 * Math.min(1, m / 0.6));
      if (m >= 0.6) v.lineStyle(1.5, 0xd9a521).strokeCircle(x, y, 5.5);
    });
    if (goal.pips) this.pipImgs.forEach((p, i) => {
      const lit = i < goal.pips.n;
      p.im.setAlpha(lit ? 1 : 0.3);
      p.glow.setAlpha(lit && !pr.paused ? 0.8 : 0);
    });
    if (goal.icons) this.kindImgs.forEach((k, i) => { k.im.setAlpha(goal.icons[i].on ? 1 : 0.25); k.sad.setVisible(goal.icons[i].sad); });
    const hrs = note.hold >= 0.1 ? ` · ${pr.p >= 1 ? Math.round(note.hold * 24) : Math.floor(r.hold * 24)}h/${Math.round(note.hold * 24)}h` : "";
    this.status.setText(goal.text + hrs);
    if (pr.p >= 1) this.chip("", 0);
    else if (goal.why && !goal.ok) this.chip(goal.why, 0xf6d3c8);
    else if (goal.hint && !goal.ok) this.chip(goal.hint, 0xffe6a8);
    else if (pr.paused) this.chip("Paused till dusk · try 4x", 0xdfe7f3);
    else this.chip("", 0);
  }

  // Thank-you beat: full bar, hearts, seeds fly to the counter, the neighbour bounces, the card turns into their
  // postcard (photo = texture key of the jar snapshot, or null), then they leave. then() shows the next note.
  celebrate(note, then, day, photo) {
    this.busy = true;
    const sc = this.scene;
    this.shown = 1;
    this.chip("Thank you!", 0xcfe8c0);
    this.viz.fillStyle(0x9fd08a).fillRoundedRect(16, this.rows.bar, CARD.w - 32, 16, 8).lineStyle(2, COL.inkHex).strokeRoundedRect(16, this.rows.bar, CARD.w - 32, 16, 8);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2, h = sc.add.image(CARD.x + CARD.w / 2, CARD.y + this.h / 2, "icon-heart").setScale(0.18).setDepth(31);
      sc.tweens.add({ targets: h, x: h.x + Math.cos(a) * 150, y: h.y + Math.sin(a) * 120, scale: 0.08, alpha: 0, duration: 900, ease: "Cubic.Out", onComplete: () => h.destroy() });
    }
    for (let k = 0; k < note.reward; k++) {
      const sd = sc.add.image(CARD.x + 26, CARD.y + this.seedIcon.y, "icon-seed").setScale(0.22).setDepth(55);
      sc.tweens.add({ targets: sd, x: SEED_AT.x, y: SEED_AT.y, duration: 700, delay: 300 + k * 110, ease: "Cubic.In", onComplete: () => { sd.destroy(); sc.bumpSeeds?.(); } });
    }
    this.people.each(im => sc.tweens.add({ targets: im, scaleY: im.scaleY * 1.08, scaleX: im.scaleX * 0.94, yoyo: true, repeat: 2, duration: 160 }));
    sc.time.delayedCall(1300, () => {
      sc.tweens.add({ targets: this.box, alpha: 0, scale: 0.9, duration: 260 });
      const pc = postcard(sc, note, day, photo).setPosition(140, 300).setDepth(31).setAngle(-14).setScale(0.6).setAlpha(0);
      sc.tweens.add({ targets: pc, angle: -4, scale: 1, alpha: 1, duration: 520, ease: "Back.Out" });
      Audio.sfx(sc, "postcard", { volume: 0.5 });
      sc.time.delayedCall(3400, () => {
        sc.tweens.add({ targets: pc, x: -200, angle: -20, duration: 450, ease: "Back.In", onComplete: () => pc.destroy() });
        this.people.each(im => sc.tweens.add({ targets: im, y: 724 + im.displayHeight + 20, duration: 380, ease: "Back.In" }));
        sc.time.delayedCall(480, () => { this.busy = false; this.noteId = null; then?.(); });
      });
    });
  }
}

// A postcard from the neighbour: a photo of your jar when the note was done (or the neighbour, when the
// browser can't take snapshots), their thank-you, a stamp with their face and a postmark with the day.
const STAMP = { hazel: "hedgehog", mole: "mole", owl: "owl", frog: "frog", all: "firefly" };
function postcard(scene, note, day, photo) {
  const c = scene.add.container(0, 0);
  const w = 250, h = 318, px = -w / 2 + 14, py = -h / 2 + 14, pw = w - 28, ph = 200;
  const g = scene.add.graphics();
  g.fillStyle(COL.inkHex, 0.22).fillRoundedRect(-w / 2 + 5, -h / 2 + 7, w, h, 10);
  g.fillStyle(0xfffaf1).lineStyle(3, COL.inkHex).fillRoundedRect(-w / 2, -h / 2, w, h, 10).strokeRoundedRect(-w / 2, -h / 2, w, h, 10);
  g.fillStyle(0xdfeee9).fillRect(px, py, pw, ph);
  c.add(g);
  if (photo && scene.textures.exists(photo)) {
    const im = scene.add.image(px + pw / 2, py + ph / 2, photo);
    const k = Math.max(pw / im.width, ph / im.height);
    im.setScale(k).setCrop((im.width - pw / k) / 2, (im.height - ph / k) / 2, pw / k, ph / k);
    c.add(im);
  } else {
    const im = scene.add.image(px + pw / 2, py + ph, STAMP[note.who] === "firefly" ? "hedgehog" : STAMP[note.who]).setOrigin(0.5, 1);
    im.setScale((ph - 12) / im.height);
    c.add(im);
  }
  const frame = scene.add.graphics().lineStyle(2, COL.inkHex, 0.7).strokeRect(px, py, pw, ph);
  const msg = scene.add.text(-w / 2 + 16, py + ph + 10, note.thanks, { fontFamily: FONT, fontSize: "15px", color: COL.ink, wordWrap: { width: w - 32 }, lineSpacing: 1 });
  const sig = label(scene, w / 2 - 16, h / 2 - 18, "~ " + note.name, 17, COL.ink, 1);
  // stamp: scalloped paper edge around the neighbour's face
  const sx = w / 2 - 36, sy = -h / 2 + 34, st = scene.add.graphics();
  st.fillStyle(0xfffaf1);
  for (let i = 0; i <= 6; i++) for (const [x, y] of [[-24 + i * 8, -28], [-24 + i * 8, 28], [-24, -28 + i * 9.33], [24, -28 + i * 9.33]]) st.fillCircle(sx + x, sy + y, 4.5);
  st.fillRect(sx - 24, sy - 28, 48, 56).fillStyle(0xf3d9cf).fillRect(sx - 19, sy - 23, 38, 46);
  st.lineStyle(1.5, COL.inkHex, 0.6).strokeRect(sx - 19, sy - 23, 38, 46);
  const key = STAMP[note.who], tw = scene.textures.get(key).getSourceImage().width;
  const face = scene.add.image(0, 0, key).setOrigin(0);
  const cw = tw * (key === "firefly" ? 1 : 0.62), k = 36 / cw, cx = (tw - cw) / 2, cy = key === "firefly" ? 0 : tw * 0.02;
  face.setScale(k).setCrop(cx, cy, cw, cw * 44 / 36).setPosition(sx - 18 - cx * k, sy - 22 - cy * k);
  // postmark rings with the day
  const mx = px + 30, my = py + ph - 28;
  const pm = scene.add.graphics().fillStyle(0xfffaf1, 0.92).fillCircle(mx, my, 23).lineStyle(2, COL.inkHex, 0.5).strokeCircle(mx, my, 22).strokeCircle(mx, my, 16);
  const pmt = label(scene, mx, my, `DAY ${day}`, 11, "#7a5a44", 0.5).setAngle(-12);
  c.add([frame, msg, sig, st, face, pm, pmt]);
  return c;
}
