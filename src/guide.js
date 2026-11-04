// Jar guide: the rules of the sim on one card (who needs what, who makes and eats what, what each bubble means),
// so a judge who likes systems can read the whole model in ten seconds. Opened from the "?" in the panel.
const GUIDE = [
  ["moss", "Moss", "Grows in light when damp (45-95%).", "Makes fresh air and damp. Spreads.", "Dries out under 30%; mould smothers it."],
  ["springtail", "Springtail", "Needs damp (55%+).", "Eats mould and leftovers.", "Breeds fast when fed."],
  ["fern", "Fern", "Needs light and damp (50%+).", "Big fresh-air maker.", "Drops old leaves."],
  ["mushroom", "Mushroom", "Needs damp (55%+).", "Eats leftovers, keeps mould away.", "Uses a little air."],
  ["snail", "Snail", "Needs damp (45%+) and fresh air.", "Eats leftovers, then moss.", "Uses lots of air."],
  ["firefly", "Firefly", "Needs a moss carpet and damp (50%+).", "Glows in the dark.", "Hates the lamp at night."],
];
const BUBBLES = [["drop", "too dry: mist"], ["air", "stuffy: open the lid"], ["bulb", "light: lamp on/off"], ["sprout", "needs more moss"], ["leaves", "hungry"]];

function showGuide(sc) {
  const o = sc.openModal();
  const dim = sc.add.rectangle(0, 0, W, H, 0x2b2036, 0.5).setOrigin(0).setInteractive();
  const g = sc.add.graphics().fillStyle(COL.card).lineStyle(4, COL.inkHex).fillRoundedRect(110, 40, 1060, 640, 26).strokeRoundedRect(110, 40, 1060, 640, 26);
  o.add([dim, g, label(sc, W / 2, 86, "Jar guide", 34, COL.ink, 0.5),
    label(sc, W / 2, 124, "Lid open: fresh air in, damp out. Lid shut: damp stays, and wet leftovers grow mould.", 18, "#7a5a48", 0.5)]);
  GUIDE.forEach(([key, name, need, gives, note], i) => {
    const x = 140 + (i % 2) * 510, y = 158 + Math.floor(i / 2) * 132;
    // 124 tall with the text from x + 122: the 2x fern (96x106) and snail (100x80) keep a margin all round
    const box = sc.add.graphics().fillStyle(0xfffdf8).lineStyle(2, COL.inkHex, 0.5).fillRoundedRect(x, y, 490, 124, 16).strokeRoundedRect(x, y, 490, 124, 16);
    const icon = sc.add.image(x + 64, y + 62, key).setScale(2); // the jar's own 2x
    o.add([box, icon, label(sc, x + 122, y + 27, name, 21),
      label(sc, x + 122, y + 55, need, 16), label(sc, x + 122, y + 79, gives, 16, "#4f7a3e"), label(sc, x + 122, y + 102, note, 16, "#9a6a56")]);
  });
  const by = 572;
  o.add(label(sc, 140, by, "Bubbles over a creature say what it needs:", 17, "#7a5a48"));
  // laid out left to right by text width, the same bubbles as in the jar
  let x = 150;
  BUBBLES.forEach(([icon, text]) => {
    const t = label(sc, x + 44, by + 40, text, 16);
    o.add([sc.add.graphics().fillStyle(0xfffdf8).lineStyle(2, COL.inkHex).fillCircle(x + 18, by + 40, 18).strokeCircle(x + 18, by + 40, 18),
      sc.add.image(x + 18, by + 40, icon === "leaves" ? "leaves" : `icon-${icon}-s`), t]);
    x += 44 + t.width + 28;
  });
  const close = button(sc, W / 2, 648, 160, 40, "Got it", null, () => sc.closeModal(o));
  o.add(close);
  sc.armButtons([close]);
}
