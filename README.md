# Jar Garden

Grow a tiny living world inside a glass jar. Moss, ferns, mushrooms, snails, springtails and fireflies keep each other alive, or don't.
Made for the Game Gauntlet: SIM Jam (theme SIMULATION). Phaser 3.90, plain JS, runs in the browser.

## Run
Open `index.html` (Canvas on file://), or serve the folder for WebGL. `?mute` = no audio, `?seed=N` = fixed jar, `?play` = skip the title.

## Tests
- `node tools/simtest.mjs` — balance scenarios for `src/sim.js` (pure, no Phaser).
- `node tools/reqtest.mjs` — the six neighbour notes on one jar: onboarding glow timing, 20 players, wrong/idle baselines, lose rule.
- `node tools/test.mjs [url]` — silent headless browser run through the UI, screenshots in `dist/shots/`.
- `tools/build.sh jar-garden` — itch zip in `dist/`.
- `node tools/record.mjs tools/scenes/<name>.mjs out.gif|out.mp4 [--http]` — silent frame-stepped GIF or MP4 of a scripted scene; `node tools/mux.mjs raw.mp4 out.mp4` adds the soundtrack offline from its sound marks.
- `node tools/test.mjs --http --audio` — the UI test over http in WebGL, with every sound run through a muted manager (`?mute&audiotest`).
- `node tools/xbrowser/smoke.mjs` — Firefox + WebKit headless smoke test (one-time setup: `cd tools/xbrowser && npm i && npx playwright install firefox webkit`).

## Layout
- `src/sim.js` the simulation (rules in `docs/PLAN.md`)
- `src/requests.js` the neighbour notes (goals, holds, unlocks, lose rule), `src/card.js` the note card and postcards
- `src/coach.js` the 30-second onboarding, `src/fx.js` juice and sim tells, `src/audio.js` music beds and SFX, `src/title.js` the title
- `src/game.js` the jar scene + UI
- `docs/PLAN.md` milestones to the Nov 5 deadline, `docs/ONE-PAGER.md` the M3 game design
- `docs/AUDIO-CREDITS.md` every shipped sound (all CC0), `docs/m5/ITCH-PAGE.md` the itch page draft
