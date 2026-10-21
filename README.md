# Jar Garden

Grow a tiny living world inside a glass jar. Moss, ferns, mushrooms, snails, springtails and fireflies keep each other alive, or don't.
Made for the Game Gauntlet: SIM Jam (theme SIMULATION). Phaser 3.90, plain JS, runs in the browser.

## Run
Open `index.html` (Canvas on file://), or serve the folder for WebGL. `?mute` = no audio, `?seed=N` = fixed jar.

## Tests
- `node tools/simtest.mjs` — balance scenarios for `src/sim.js` (pure, no Phaser).
- `node tools/reqtest.mjs` — the six neighbour notes on one jar: onboarding glow timing, 20 players, wrong/idle baselines, lose rule.
- `node tools/test.mjs [url]` — silent headless browser run through the UI, screenshots in `dist/shots/`.
- `tools/build.sh jar-garden` — itch zip in `dist/`.
- `node tools/record.mjs tools/scenes/<name>.mjs out.gif` — silent frame-stepped GIF of a scripted scene.

## Layout
- `src/sim.js` the simulation (rules in `docs/PLAN.md`)
- `src/requests.js` the neighbour notes (goals, holds, unlocks, lose rule), `src/card.js` the note card
- `src/game.js` the jar scene + UI
- `docs/PLAN.md` milestones to the Nov 5 deadline, `docs/ONE-PAGER.md` the M3 game design
