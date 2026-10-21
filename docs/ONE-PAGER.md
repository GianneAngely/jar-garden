# Jar Garden: one-pager (M3 design, locked Oct 22)

Built from a 3-proposal design panel plus 2 judges. Every number was checked against `src/sim.js` (20 rng seeds at the game step, DT 1/240). Evidence: `tools/reqtest.mjs`.

## Core loop
Read a bubble, use a verb (lid, lamp, mist, buy), then watch a bar and a creature change. One jar all game, one neighbour note at a time. Each midnight pays 1 seed per happy species, and seeds buy new life.

## First 5 minutes (at 2x)
- 0:27 the first firefly glows.
- 0:38 first midnight seeds.
- ~1:45 moss carpet.
- ~2:40 three fireflies.
- ~3:40 mould cleaned.

## Neighbour requests
| # | Who | Ask | Done when | Reward | Teaches |
|---|---|---|---|---|---|
| 1 | Hazel (hedgehog) | "Make my jar glow?" | Dot glows, not sad, lamp off, held 0.05 d | +4, speed button | all four verbs |
| 2 | Mo (mole) | "Moss on 40% of the floor!" | moss cover >= 40% | +4, unlocks Springtail | light + damp grows moss; the lamp makes Dot sulk |
| 3 | Olive (owl) | "3 fireflies glowing for 6 hours!" | >= 3 glowing, none sad, held 0.25 d (pauses by day) | +6, unlocks Mushroom | darkness, damp, saving seeds |
| 4 | Fen (frog) | "Soggy leaves! Mould under 1%?" | after a staged leaf dump: mould < 1%, held 0.5 d | +4, unlocks Fern | fresh air or mushrooms beat mould |
| 5 | Hazel | "Every kind, nobody sad, lid shut a day!" | 6 kinds, none sad, lid shut, mould < 5%, held 1 d | +4 | a shut jar makes its own air |
| 6 | Everyone | "Party! 5 fireflies, every kind here." | >= 5 glowing, every kind present, nobody sad, held 0.25 d (pauses by day) | WIN | everything |

- A broken hold drains at 2x; it never resets. A toast names the cause ("Dot: lamp too bright").
- Moss counts as a kind at >= 25% cover.
- During note 4 the Mould bar zooms to 0-20%.

## Onboarding (30 s, no long text)
The jar is staged at 8:38 AM: hum 47, air 30, lamp on, 5 moss tufts. Only the prompted control responds. The clock holds at 4:48 PM until the firefly is in, and at 9:36 PM until the lamp is off, so slow readers still get the glow.
1. "Pip can't breathe! Open the lid." (Air rises, Pip smiles.)
2. "Close it. Keeps it damp." (Fires at air 45.)
3. "Mist!" (Humidity 46 to 56.)
4. "Add a firefly!"
5. Dusk: Dot shows the bulb bubble. "Lamp off. Watch!"
6. Glow at 26.8 s (3x-slow reader: 50.5 s), then Hazel's postcard on the sill.

## Win / lose
- **Win:** the firefly party, then a postcard of your own jar (median 5.5 in-game days, 5-9 min at 2x). After that, free play.
- **Lose:** no snail, springtail or firefly alive for 1 day. A "Last animal gone!" banner comes first. Then "The jar went quiet": Rewind to the start of the note, with a tip from the last death ("Snails need fresh air").
- Doing nothing never loses. Leaving the lid open loses at about 4.4 d.

## What a judge sees in 30 s
Every tap moves a bar and flips a mood bubble. Dusk falls on its own, and lamp-off makes Dot glow. The air and humidity bars name their causes ("▲ plants ▼ snail"). Seeds pop out of the creatures that earned them.

## Seed economy
- **Payday:** +1 per happy species, max 6 a day (was ~12). A sulking creature shows "no seed".
- **Seeds:** start with 8. Note rewards 4 / 4 / 6 / 4 / 4.
- **Income:** passive 2.5 a day, engaged 5.4 (was 4.9 / 9.3).
- **Choices:**
  - Lamp for fast moss vs a happy Dot.
  - Buy one firefly now or wait for midnight.
  - Free lid vs 6 seeds of mushrooms.
- **Shop at start:** Moss, Snail, Firefly. Notes unlock the rest.

## Sim changes
1. Payday rule above (`s.lastPay` drives the seed pops).
2. Fireflies no longer breed (`FIREFLY_BREED = 0`).
3. `s.flux` cause rates, inert.

## Art
- Hazel exists. Mo, Olive and Fen are generated in Flow (A/B/C sheet sent to Angel, temp picks in use).
- The postcard frame and request card are drawn in code.
- The title is key art plus a Flow logo (A/B/C sent).

## Cut order if late
1. Note 5 (note 4 then pays +8)
2. Cause lines
3. Postcard snapshot
4. Fern
