const W = 1280, H = 720;
const FONT = "Fredoka, sans-serif";
const COL = {
  wall: 0xf3e6d3, ink: "#6b4a3a", inkHex: 0x6b4a3a, card: 0xfff8ef,
  soil: 0x8a6448, soilDark: 0x6e4e38, glass: 0xdff1f0,
  moss: [0xb9d98a, 0x7fb069, 0x5a9356], mould: 0xe9e6dc, det: 0x5b4030,
  hum: 0x8fc3e8, air: 0xa8dcc0, light: 0xf6d77a, mouldBar: 0xc8c0b4, mossBar: 0x7fb069,
  night: 0x1d2547,
};

// Jar geometry: sim x 0..1 maps across the floor, y 0..1 up from the soil.
const JAR = { x: 280, y: 146, w: 420, h: 446, soil: 506, floor: 580 };
const jx = x => JAR.x + 26 + x * (JAR.w - 52);
const AIR_H = 290; // px of open air above the soil
const jy = y => JAR.soil - 6 - y * AIR_H;
const inJar = (px, py) => px > JAR.x + 10 && px < JAR.x + JAR.w - 10 && py > JAR.y + 20 && py < JAR.floor;

const QS = new URLSearchParams(location.search);
const NO_AUDIO = QS.has("mute");
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
};
