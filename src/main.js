// file:// (double-click index.html): WebGL refuses local images, so use Canvas there.
const LOCAL = location.protocol === "file:";

// crisp text on retina, and pixel-font sizes snapped to whole design pixels (Tiny5 draws cleanly in steps of 8 px)
const addText = Phaser.GameObjects.GameObjectFactory.prototype.text;
const fontPx = s => { const n = parseFloat(s) || 16; return (n <= 19 ? 16 : n <= 27 ? 24 : Math.round(n / 8) * 8) + "px"; };
Phaser.GameObjects.GameObjectFactory.prototype.text = function (x, y, text, style = {}) {
  const st = { resolution: Math.min(2, window.devicePixelRatio || 1), ...style };
  if (st.fontSize) st.fontSize = fontPx(st.fontSize);
  return addText.call(this, x, y, text, st);
};
const setFontSize = Phaser.GameObjects.Text.prototype.setFontSize;
Phaser.GameObjects.Text.prototype.setFontSize = function (s) { return setFontSize.call(this, fontPx(s)); };

const game = new Phaser.Game({
  type: LOCAL && !QS.has("gl") ? Phaser.CANVAS : Phaser.AUTO,
  parent: "game",
  width: W,
  height: H,
  backgroundColor: COL.wall,
  pixelArt: true, // nearest-neighbour everywhere: 4x pixel sprites stay crisp
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  audio: { noAudio: NO_AUDIO },
  loader: LOCAL ? { imageLoadType: "HTMLImageElement" } : undefined,
  scene: [Boot, Title, Jar],
});
document.addEventListener("contextmenu", e => e.preventDefault());
window.game = game;
