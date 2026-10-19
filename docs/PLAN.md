# Jar Garden — jam plan

Jam: Game Gauntlet: SIM Jam · due **Thu Nov 5, 03:00 WITA** (hard, no late entries) · browser build on itch · English.
Picked 2026-10-19 by the manager (Angel: "yang mana aja bebas yang penting peluang menangnya paling tinggi"). Flow budget ~40 generations on /u/2.
Out of the plan: Slapjam #2, Oct 29 23:00 to Oct 31 23:00 WITA.

## Win priorities (from manager)
1. The sim looks alive and is readable: every number has a visible cause (mood bubbles, moss spreading, mould creeping, graphs).
2. One "wow" moment: night falls, lamp off, fireflies light up the jar.
3. 30-second onboarding.
4. Cozy sound (CC0 only, mute flag).

## Milestones
| # | Dates (WITA) | Done when |
|---|---|---|
| M1 sim core | Oct 19–21 | Pure `sim.js` (6 species, humidity/air/light/detritus/mould) + node balance tests; placeholder art jar you can play: place creatures, lid, lamp, mist, speed, stats + graphs. |
| M2 art + wow | Oct 22–24 | Flow art (Cake Tower style, ~30–40 gens, one per generation on #00FF00) keyed into sprites; creature idle/walk/blink; day/night tint; firefly night glow. |
| M3 game | Oct 25–28 | Neighbour requests (goal mode, 6), seed shop tuning, 30 s onboarding, title screen, end-of-request postcard. |
| — | Oct 29–31 | Slapjam (other project). |
| M4 sound + polish | Nov 1–2 | CC0 music/SFX, juice, balance pass. **Playable complete build by Nov 2 (H-3).** |
| M5 ship prep | Nov 3–4 | itch page draft (EN, theme fit, controls, credits, AI disclosure: Graphics + Code), browser tests, bug fixes. Submission itself: only after Angel approves via manager. |

Cut list if late (in order): breeding of fireflies, postcard, requests 5–6, fern.

## Sim model (v1)
Time: 1 day = 60 s at 1x (2x, 4x, pause). Day 0.25–0.75 sun.
Jar-wide: humidity (0–100), air freshness (0–100), light (sun or lamp).
Soil: 20 slots, each with moss (0–1), mould (0–1), detritus (0–1).
- Moss: grows with light + humidity 45–90, spreads to neighbours, makes air + humidity; dries out under 30; mould eats it.
- Fern: big plant, more air/humidity, needs real light.
- Mushroom: eats detritus, needs humidity > 55, keeps mould away nearby, drops spores.
- Mould: appears on detritus when humidity > 80 and the lid is closed; spreads, eats air, kills moss. Fresh air (lid open) and springtails beat it.
- Snail: eats detritus, then moss; needs humidity > 45 and air; breeds when fed.
- Springtail: tiny, eats mould and detritus, breeds fast in damp jars.
- Firefly: needs moss and damp air; glows only in the dark; a lamp at night makes it grumpy.
- Lid open: humidity drifts to room (40), air refreshes. Closed: humidity stays, air only from plants.
- Mist: +humidity.
Seeds: earned each day from happy creatures and species variety; spent in the shop.
