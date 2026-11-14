> **Measured gameplay results:** Read [combat-model-v1-paladin-level1.md](results/combat-model-v1-paladin-level1.md) for the first committed v8 level-one optimizer/lazy results (source `1b5808e49d5e986737618ed59d0ee1fa2fbe9da3`). First-wall pacing and Wisp/Bellkeeper checks are not balanced yet; *do not* silently tune from old v7 reports or connect UI without the owner's separate approval.

> **New v8 bot-run script:** `node web/test/paladin-progression.js 360` on the gameplay branch, seeds 31/2026, optimizer 5-minute and lazy 30-minute checks; an isolated Actions workflow captures exact commit and JSONL. Use generated v8 output rather than comparing it directly to the historical report as though policies were identical.

> **Implementation update (2026-11-13):** The code now applies Combat Model v1 k=0.00045, 8% monster crit at 3x, capped 35% reduction (unobtainable until itemization agreed), 30-second recovery and one-stage auto-retreat; `SIM_VERSION=8`. The table below is the **pre-implementation v7 audit**, retained for comparison, not the current state. Do not run the old experimental scripts without checking their v7 source anchors.

# Godscar gameplay resumption: Paladin slice (2026-11-13)

This is the current gameplay-handoff contract for `fytchx/Godscar@slice/paladin-defense`. It **overrides the older preview/browser directions for this branch**. It is not a UI design change.

## Verified sources
- Gameplay repo/branch/last code commit: `fytchx/Godscar`, `slice/paladin-defense`, `4e04564d9a134c1f335971c2e52d540a0f5f73c6`. `web/src/sim.js` exports `SIM_VERSION=7`. Existing bot code includes `web/test/balance.js` and `web/test/defense-*.js`. Future run reports must give exact repo, branch, commit, command, seed, and fixture.
- Current Fight interface is in a **different repo**: `fytchx/Godscar-playtest@ui/fight-skeleton`; initial accepted Fight screen `1c3adf44f1d77cc9549f8cc9b024ec6276cd253e`; review URL: https://godscar-playtest-ui-godscarplaytest.up.railway.app/ . The preview uses *fake data*. Do not connect it to the simulator, migrate its saves, or deploy it without separate owner approval.
- Never treat old `preview/browser` pages, Godot on `main`, or previous combat lab UIs as the current Fight direction.

## Accepted design versus code
| Concern | Current **verified** v7 code | Accepted experimental v1 design |
| --- | --- | --- |
| Physical armor | Ratio formula with `ARMOR_K_FACTOR=0.001` | `0.00045` relative to average **unsplit** stage hit |
| Monster crit | Not implemented in `monsterAttack()` | 8% crit chance, 3x multiplier |
| Crit reduction | No live stat / acquisition path | 35% cap; source of gear or passives not decided |
| Death recovery | 12 seconds | 30 seconds and one-stage retreat (proposed policy) |
| Preparation tiers | Not a player-facing system | 0.75x / 1.0x / 1.5x armor in **test fixtures** |
| Elemental damage | Existing resistance-percentage mitigation | Fire wall must be demanding without hundreds of deaths/hour; stage-scaling remains undecided |

Combat Model v1 is accepted as a **working design direction**, not fully integrated implementation or finished balance. Saved reports in `docs/results/` use in-memory simulation variants; do not mistake them for current production behavior.

## Already measured; not a new bot run
- `docs/results/level1-combat-model-v1.txt`: level-1 Paladin, common starter weapon, seeds 31/2026. V1 lazy bot hit stage 10 at 60.75/77.54 minutes and failed to hit stage 30 during six hours; optimizer stage 10 at 15.76/28.27 minutes. These outcomes missed the earlier 20–30-minute first-wall pacing target for lazy.
- `docs/results/paladin-defense-crit-final.txt`: under 8% / 3x / 35% experimental setup, the *well-prepared* tier was not consistently near 1 death/hour; high-stage differences were substantial. Re-evaluate with reproducible committed tests.
- `web/test/slice-mechanics.js` currently explicitly asserts `ARMOR_K_FACTOR=0.001`.

## Next gameplay milestone
1. Run current `npm test` and report **exact commit** and whether output includes `slice mechanics ok`. Never invent a test result.
2. Reproduce a fresh level-1 Paladin optimizer/lazy baseline on seeds 31/2026 using **the existing harness** and preserve raw results with the full source metadata.
3. Implement the accepted v1 armor and monster-crit model in small, individually tested changes to `web/src/sim.js`; add deterministic mechanics tests, verify saved-state compatibility and update `SIM_VERSION` appropriately. Do not invent the crit-reduction acquisition system or additional formulas.
4. Tune the first real progression obstacle for the Paladin slice (Wisp fire resistance via Ember Essence, Bellkeeper damage counter via Dawn Essence); check deaths/hour and first-wall time from level 1. Owner approval is needed before altering core design decisions.
5. Only **after separate approval**, build a read-only simulation data boundary for the current Fight UI. Do not start UI integration now.

Slice scope: Paladin, existing simulator, one zone with two planned walls, optimizer vs lazy bots. No extra classes, multiplayer, new mechanics unrelated to the slice, or alternate UI.
