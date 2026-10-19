// file:// (double-click index.html): WebGL refuses local images, so use Canvas there.
const LOCAL = location.protocol === "file:";

const game = new Phaser.Game({
  type: LOCAL && !QS.has("gl") ? Phaser.CANVAS : Phaser.AUTO,
  parent: "game",
  width: W,
  height: H,
  backgroundColor: COL.wall,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  audio: { noAudio: NO_AUDIO },
  loader: LOCAL ? { imageLoadType: "HTMLImageElement" } : undefined,
  scene: [Boot, Jar],
});
document.addEventListener("contextmenu", e => e.preventDefault());
window.game = game;
