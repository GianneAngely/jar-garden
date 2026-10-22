// Builds a trailer soundtrack offline from the recorder's sound marks and muxes it into the video. Nothing is
// played: ffmpeg mixes files to files. Music beds are marks with { bed: true } (a bed runs until the next bed,
// with crossfades); other marks are one-shot SFX from assets/audio.
// usage: node tools/mux.mjs <video.mp4> <out.mp4>
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const [video, out] = process.argv.slice(2);
const { fps, frames, events } = JSON.parse(readFileSync(resolve(video) + ".events.json", "utf8"));
const total = frames / fps;
const beds = events.filter(e => e.bed), sfx = events.filter(e => !e.bed);
const inputs = ["-i", resolve(video)], parts = [];
let k = 1;
beds.forEach((b, i) => {
  const end = i + 1 < beds.length ? beds[i + 1].t + 1.5 : total;
  const len = end - b.t, vol = b.volume ?? 0.6, fade = 1.5;
  inputs.push("-stream_loop", "-1", "-i", join(root, "assets/audio", b.key + ".mp3"));
  parts.push(`[${k}:a]atrim=0:${len.toFixed(3)},afade=t=in:d=${i ? fade : 0.6},afade=t=out:st=${(len - fade).toFixed(3)}:d=${fade},volume=${vol},adelay=${Math.round(b.t * 1000)}:all=1[a${k}]`);
  k++;
});
for (const e of sfx) {
  inputs.push("-i", join(root, "assets/audio", e.key + ".mp3"));
  parts.push(`[${k}:a]volume=${e.volume ?? 0.6}${e.rate ? `,asetrate=44100*${e.rate},aresample=44100` : ""},adelay=${Math.round(e.t * 1000)}:all=1[a${k}]`);
  k++;
}
const mix = Array.from({ length: k - 1 }, (_, i) => `[a${i + 1}]`).join("") + `amix=inputs=${k - 1}:normalize=0:duration=longest,atrim=0:${total.toFixed(3)},alimiter=limit=0.9[mix]`;
execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...inputs, "-filter_complex", [...parts, mix].join(";"),
  "-map", "0:v", "-map", "[mix]", "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-shortest", resolve(out)]);
console.log(`${out}: ${total.toFixed(1)} s, ${beds.length} beds, ${sfx.length} sfx`);
