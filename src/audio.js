// One mute flag for everything. Sound files go through scene.sound (honours game.sound.mute);
// blip() is a file-free placeholder SFX so the kit has feedback before real assets exist.
const Audio = {
  muted: NO_AUDIO || store.get("muted") === "1",

  apply(game) { game.sound.mute = this.muted; },

  toggle(game) {
    this.muted = !this.muted;
    store.set("muted", this.muted ? "1" : "0");
    this.apply(game);
    return this.muted;
  },

  play(scene, key, cfg) {
    if (!this.muted && scene.cache.audio.exists(key)) scene.sound.play(key, cfg);
  },

  blip(scene, freq = 660, dur = 0.08) {
    const ctx = scene.sound.context;
    if (this.muted || !ctx) return;
    if (ctx.state === "suspended") ctx.resume();
    const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime;
    o.type = "triangle";
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.15, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + dur);
  },
};
