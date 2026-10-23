const W = 1280, H = 720;
const FONT = "Tiny5, monospace"; // pixel font (OFL), assets/fonts/tiny5.css
const COL = {
  wall: 0xf3e6d3, ink: "#6b4a3a", inkHex: 0x6b4a3a, card: 0xfff8ef,
  soil: 0x8a6448, soilDark: 0x6e4e38, glass: 0xdff1f0,
  moss: [0xb9d98a, 0x7fb069, 0x5a9356], mould: 0xe9e6dc, det: 0x5b4030,
  hum: 0x8fc3e8, air: 0xa8dcc0, light: 0xf6d77a, mouldBar: 0xc8c0b4, mossBar: 0x7fb069,
  night: 0x1d2547,
};

// Jar geometry: sim x 0..1 maps across the floor, y 0..1 up from the soil.
const JAR = { x: 280, y: 170, w: 420, h: 446, soil: 530, floor: 604 }; // stands on the pixel room's windowsill
const jx = x => JAR.x + 26 + x * (JAR.w - 52);
const AIR_H = 290; // px of open air above the soil
const jy = y => JAR.soil - 6 - y * AIR_H;
const inJar = (px, py) => px > JAR.x + 10 && px < JAR.x + JAR.w - 10 && py > JAR.y + 20 && py < JAR.floor;

const QS = new URLSearchParams(location.search);
// ?mute: no audio at all. ?mute&audiotest (tests only): load and run every sound, but through a muted sound
// manager in a --mute-audio browser, so the audio code is exercised and nothing is ever heard.
const AUDIO_TEST = QS.has("audiotest");
const NO_AUDIO = QS.has("mute") && !AUDIO_TEST;
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
};

// One autosaved jar per browser (after the onboarding: at each finished note and each midnight). Test and demo
// runs with a fixed ?seed never save, so they always start fresh.
const Save = {
  key: "jar-garden-save-v1",
  on: !QS.has("seed"),
  snapKey: "jar-garden-snap-v1", // the Rewind point (start of the current note, or this free-play morning)
  load(k = this.key) { try { return JSON.parse(store.get(k)); } catch { return null; } },
  write(s, isSnap) { if (this.on && s.req?.i > 0) { store.set(this.key, JSON.stringify(s)); if (isSnap) store.set(this.snapKey, JSON.stringify(s)); } },
  clear() { try { localStorage.removeItem(this.key); localStorage.removeItem(this.snapKey); } catch {} },
};
