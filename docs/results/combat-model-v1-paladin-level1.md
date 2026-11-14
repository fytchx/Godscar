# Combat Model v1: first committed level-1 Paladin progression replay

**Verified run source:** `fytchx/Godscar` / `slice/paladin-defense` / `1b5808e49d5e986737618ed59d0ee1fa2fbe9da3` / `SIM_VERSION=8`. Run command: `node web/test/paladin-progression.js 360`; seeds **31, 2026**; fresh level-1 Paladin with Common starter mace. **Six simulated hours per run.** Bot policy: optimizer checks/equips/upgrades every 5 minutes, lazy checks/equips one item every 30 minutes and may craft a fire ring when ingredients are held. Both hunt **Fallfields only** and attempt Bellkeeper; they never deliberately visit Hollow.

**CI:** `npm test` at this commit passed in separate [Paladin gameplay slice tests](https://github.com/fytchx/Godscar/actions/runs/43537584109). Bot logs and run metadata: [Actions replay](https://github.com/fytchx/Godscar/actions/runs/43537584187). Full unabridged data: [combat-model-v1-paladin-level1.jsonl](combat-model-v1-paladin-level1.jsonl).

## Progression

| Bot | Seed | Stage 10 | Stage 20 | Stage 30 | Total deaths in 6h | Actual Wisp kills | Bellkeeper wins/attempts |
|---|---:|---:|---:|---:|---:|---:|---:|
| optimizer | 31 | 16.65 min | 28.90 min | 45.32 min | 52 | 0 | 45/45 |
| lazy | 31 | 118.72 min | not reached | not reached | 109 | 4286 | 3/10 |
| optimizer | 2026 | 30.53 min | 46.77 min | 80.27 min | 193 | 8898 | 40/54 |
| lazy | 2026 | 46.00 min | 102.00 min | 268.48 min | 0 | 0 | 6/10 |

Deaths include counted boss deaths and ordinary combat deaths. Stage times are minute-resolution **highest unlocked stages in Fallfields** and should not be mistaken for individual Wisp frontier completion. Death rate by individual stage band is in the JSON. The first detected 20-minute stage plateau may be caused by bot check-in cadence and does not prove an intentional boss wall.

## Controlled Wisp counter probe, same stage snapshot

For each stage threshold actually reached, we hold the build snapshot and use a hypothetical 15-minute Wisp fight. The treatment **replaces** one ring with a test-only `res_fire=25` ring, so actual resistance change may be less than 25 percentage points when the existing ring already had resistance. These are not actual bot hunts, acquired items, or a claim of attainable gear.

| Bot | Seed | Wisp stage | Base → counter fire resistance | Deaths / 15 min | Kills/min |
|---|---:|---:|---:|---:|---:|
| optimizer | 31 | 10 | 14.2% → 39.2% | 16 → 10 | 5.73 → 8.33 |
| optimizer | 31 | 20 | 15.0% → 40.0% | 24 → 22 | 2.40 → 3.40 |
| optimizer | 31 | 30 | 15.0% → 40.0% | 26 → 25 | 2.20 → 2.27 |
| lazy | 31 | 10 | 15.0% → 40.0% | 9 → 3 | 7.53 → 9.67 |
| optimizer | 2026 | 10 | 15.0% → 40.0% | 5 → 0 | 25.20 → 26.53 |
| optimizer | 2026 | 20 | 27.4% → 52.4% | 13 → 4 | 23.80 → 34.00 |
| optimizer | 2026 | 30 | 64.1% → 71.3% | 14 → 7 | 16.33 → 23.60 |
| lazy | 2026 | 10 | 0.0% → 25.0% | 21 → 18 | 0.67 → 1.20 |
| lazy | 2026 | 20 | 15.0% → 40.0% | 26 → 24 | 0.00 → 0.00 |
| lazy | 2026 | 30 | 15.0% → 40.0% | 28 → 27 | 0.00 → 0.00 |

## Evidence and next decisions

- **First-wall pacing is inconsistent:** optimizer stage 10 took 16.65/30.53 minutes; lazy took 118.72/46.00 minutes (seeds 31/2026 respectively). The 20–30-minute early obstacle objective is therefore not met reliably, especially for lazy.
- **Fire-resistance counter helps but can remain lethal:** some Wisp replays still exceed 20 deaths per 15 minutes even with the replacement resistance ring. Do not call the Wisp wall balanced. Some bots ignore Wisp entirely while other runs farm it heavily; it is not a guaranteed progression gate yet.
- **Bellkeeper is not consistently a meaningful DPS wall:** the optimizer cleared 45/45 (seed31) and 40/54 (seed2026) of its attempts, usually from the early game. Lazy cleared 3/10 and 6/10, so the contrast is substantial.
- **No balance change is justified yet solely by four runs:** further design should clarify how players are guided toward Wisp, when resistance crafting becomes actionable, and what Bellkeeper actually gates. Reduce huge deaths/hour without removing meaningful threat. Do not invent a crit-reduction equipment source or a new elemental formula without owner agreement.
- **Boundaries:** No Fight-screen simulation wiring; v8 is in the gameplay repo only. Older v7 experimental results used different run policies and must not be compared as an apples-to-apples balance regression. The generic old browser CI's dist diff failure predates this work and is independent of the passing dedicated gameplay suite.
