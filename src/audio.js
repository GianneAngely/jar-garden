// One mute flag for everything (?mute in the URL also skips loading audio). CC0 files in assets/audio, credits in
// docs/AUDIO-CREDITS.md. Ogg is listed first because it loops without a gap; mp3 is the fallback for old Safari.
const SFX = ["click", "lid-open", "lid-close", "mist", "plop", "seed", "note-done", "postcard", "unlock", "lose", "win", "lamp-on", "lamp-off", "glow", "drip"];
const LOOPS = ["music-day", "music-night", "music-title", "amb-day", "amb-night"];
const BED_VOLUME = { "music-day": 0.4, "music-night": 0.45, "music-title": 0.4, "amb-day": 0.35, "amb-night": 0.45 };

const Audio = {
  muted: NO_AUDIO || AUDIO_TEST || store.get("muted") === "1",
  beds: {}, // slot ("music" | "amb") -> { key, snd }

  apply(game) {
    game.sound.mute = this.muted;
    if (AUDIO_TEST) game.sound.volume = 0; // belt and braces for test runs
  },

  toggle(game) {
    if (AUDIO_TEST) return true; // tests stay muted whatever is clicked
    this.muted = !this.muted;
    store.set("muted", this.muted ? "1" : "0");
    this.apply(game);
    return this.muted;
  },

  load(scene) {
    if (NO_AUDIO) return;
    for (const k of [...SFX, ...LOOPS]) scene.load.audio(k, [`assets/audio/${k}.ogg`, `assets/audio/${k}.mp3`]);
  },

  sfx(scene, key, { rate = 1, volume = 0.5, delay = 0 } = {}) {
    if (NO_AUDIO || (this.muted && !AUDIO_TEST) || !scene.cache.audio.exists(key)) return;
    scene.sound.play(key, { rate, volume, delay });
  },

  // a looping bed per slot (music, ambience); a new key crossfades over `fade` ms using this scene's tweens
  bed(scene, slot, key, fade = 2500) {
    if (NO_AUDIO || !scene.cache.audio.exists(key)) return;
    const cur = this.beds[slot];
    if (cur?.key === key) return;
    if (cur) scene.tweens.add({ targets: cur.snd, volume: 0, duration: fade, onComplete: () => cur.snd.destroy() });
    const snd = scene.sound.add(key, { loop: true, volume: 0 });
    snd.play();
    scene.tweens.add({ targets: snd, volume: BED_VOLUME[key] ?? 0.4, duration: fade });
    this.beds[slot] = { key, snd };
  },
};
