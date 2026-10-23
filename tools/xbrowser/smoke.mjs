// Cross-browser smoke test: Firefox and WebKit (Safari's engine) headless via Playwright, the game served over http
// with ?mute&audiotest (every sound runs through a muted manager at volume 0; nothing is ever heard).
// Title -> Play -> onboarding played with clicks -> first glow; audio beds running; no console errors; screenshots
// at desktop, small-laptop and phone sizes.
// usage: (cd tools/xbrowser && npm i && npx playwright install firefox webkit) then node tools/xbrowser/smoke.mjs
import { firefox, webkit } from "playwright";
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { serve } from "../cdp.mjs";

const root = resolve(import.meta.dirname, "../..");
const out = join(root, "dist", "xbrowser");
mkdirSync(out, { recursive: true });
const srv = await serve(root);
let fail = 0;
const check = (ok, msg) => { console.log((ok ? "ok   " : "FAIL ") + msg); if (!ok) fail++; };

for (const [name, type] of [["firefox", firefox], ["webkit", webkit]]) {
  const browser = await type.launch({ headless: true });
  for (const [label, size, mobile] of [["desktop", { width: 1280, height: 720 }], ["laptop", { width: 1024, height: 640 }], ["phone", { width: 844, height: 390 }, true]]) {
    const ctx = await browser.newContext({ viewport: size, isMobile: mobile && name === "webkit", hasTouch: !!mobile });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
    await page.goto(srv.url + "index.html?mute&audiotest&seed=7");
    const tag = `${name} ${label}`;
    check(await page.waitForFunction(() => window.STATE === "title", null, { timeout: 30000 }).then(() => true, () => false), `${tag}: title loads`);
    // game coordinates -> page pixels
    const at = async (gx, gy) => page.evaluate(([x, y]) => { const r = game.canvas.getBoundingClientRect(); return [r.left + x * r.width / 1280, r.top + y * r.height / 720]; }, [gx, gy]);
    const tap = async (gx, gy) => { const [x, y] = await at(gx, gy); if (mobile) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); await page.waitForTimeout(250); };
    await page.screenshot({ path: join(out, `${name}-${label}-title.png`) });
    await tap(1060, 372);
    check(await page.waitForFunction(() => window.STATE === "jar", null, { timeout: 10000 }).then(() => true, () => false), `${tag}: Play opens the jar`);
    if (label === "desktop") {
      // the onboarding with real clicks
      await page.waitForTimeout(800);
      await tap(295, 664);                                   // open lid
      await page.waitForFunction(() => jar.air >= 45, null, { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(600);
      await tap(295, 664);                                   // close
      await tap(555, 664);                                   // mist
      await tap(1182, 640);                                  // firefly card
      await tap(490, 330);                                   // place
      check(await page.evaluate(() => Sim.count(jar, "firefly") === 1), `${tag}: firefly placed with clicks`);
      await page.waitForFunction(() => game.scene.getScene("Jar").coach.pillText.text.startsWith("Dot the firefly hates"), null, { timeout: 30000 }).catch(() => {});
      await tap(425, 664);                                   // lamp off
      check(await page.waitForFunction(() => jar.req.i === 1, null, { timeout: 15000 }).then(() => true, () => false), `${tag}: Dot glows, note 1 done`);
      await page.waitForTimeout(2500);
      await page.screenshot({ path: join(out, `${name}-${label}-glow.png`) });
      const audio = await page.evaluate(() => ({ mute: game.sound.mute, vol: game.sound.volume, bed: Audio.beds.music?.key, playing: !!Audio.beds.music?.snd.isPlaying, renderer: game.renderer.type === Phaser.WEBGL ? "webgl" : "canvas" }));
      check(audio.mute && audio.vol === 0 && audio.playing && /music-/.test(audio.bed || ""), `${tag}: audio code runs muted (${JSON.stringify(audio)})`);
    } else {
      await page.waitForTimeout(1200);
      await page.screenshot({ path: join(out, `${name}-${label}-jar.png`) });
      const fit = await page.evaluate(() => { const r = game.canvas.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), vw: innerWidth, vh: innerHeight }; });
      check(fit.w <= fit.vw && fit.h <= fit.vh, `${tag}: canvas fits the viewport (${fit.w}x${fit.h} in ${fit.vw}x${fit.vh})`);
    }
    check(errors.length === 0, `${tag}: no console errors` + (errors.length ? ": " + errors.slice(0, 3).join(" | ") : ""));
    await ctx.close();
  }
  await browser.close();
}
srv.close();
console.log(fail ? `${fail} FAILED` : "ALL OK", "shots in", out);
process.exit(fail ? 1 : 0);
