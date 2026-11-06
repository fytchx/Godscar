# Project state and immediate handoff

**Last documented:** 2026-11-05 (America/Los_Angeles). **Active branch:** `preview/browser`.
**Read this before every work session, and update it in the same commit as EACH change set.** This document is a snapshot; re-check HEAD, workflows, Railway and live site rather than treating old statuses as current.

## Product identity
**2026-11-06 direction update:** Owner adopted the Living Arsenal as the core of the game and approved reworking mechanics without retaining prototype saves/progress. Permanent white-weapon attack + 1–5 gear/crafting/progression-derived automatic abilities, meaningful but recoverable investments, and a brighter adventurous tone. The original browser remains the stable playable baseline; V2 not yet integrated. Read `docs/PROGRESSION-V2.md` and `docs/VISUAL-DIRECTION-V2.md`.

Godscar is a phone-first dark fantasy **continuous-combat idle ARPG**, potentially an online RPG in later phases. The current approved experience is Claude's original browser version, **not the custom Godot port**. The owner confirmed the live browser preview matches the direction they intended.

## Current source of truth
- Repository: https://github.com/fytchx/Godscar
- Active game branch: `preview/browser`; baseline archival branch: `web`.
- Original source: `web/src/sim.js`, `web/src/ui.js`, `web/src/shell.html`.
- Current simulation identifier in code: **SIM_VERSION 4** (top comment still calls the core v3; favor the numeric constant and verify actual code).
- Live preview: https://godscar-browser-preview-preview.up.railway.app/
- Deploy: Railway project **Godscar Browser Preview**, environment **preview**, service **godscar-browser-preview**, source `fytchx/Godscar@preview/browser`. Commits to this branch auto-deploy; it is a separate project from Arcana.
- Existing reference branch: `feature/server-phase1`; it contains a PostgreSQL + login/action API scaffold but is NOT linked to the UI, ready for public signup or running secure multiplayer.
- `main` is not the active development baseline; it includes a rushed Godot rewrite and Android APK experiment.

## Verified at the time of establishing this handoff
- Original browser game served publicly on Railway; page and `/health` HTTP endpoints responded.
- GitHub browser preview workflow passed build, legacy gameplay tests and page smoke checks: https://github.com/fytchx/Godscar/actions/runs/42172538698
- GitHub legacy web tests passed: https://github.com/fytchx/Godscar/actions/runs/42172538774
- Original sim, UI and HTML blob hashes matched the `web` and `feature/server-phase1` branches when preview was established. See `README-PREVIEW.md` for the snapshot hashes.
- No real-device usability acceptance or comprehensive feature-by-feature acceptance from the owner has been recorded.
- The repository is NOT proof that uncommitted Claude-only work is included.

## What currently exists in source (verify behavior; not all acceptance-tested)
- Five classes: Warrior, Paladin, Sorcerer, Hunter, Rogue, three specializations each, passives and class evolutions.
- Ongoing self-attacking monster fights; attacks, autocast spells, health/regen, resistances, damage types, status effects, deaths/respawn.
- Stage/zone progression, autopush/retries, zone scouting and build/item projections, boss snapshot fights and sigils.
- Loot from common through ascended, equipment, affixes, enchantments, augment mechanics, crafting, upgrades, salvage, socketed belts/Jewels, save migration and up to 24h offline catch-up.
- Phone UI tabs: Fight, Gear, Bag, Build, Forge. Not a finished MMO; some future systems are explicitly not implemented.

## Current risks and known gaps
1. **Cloud saves:** Claude-hosted integration uses `window.claude`; Railway preview uses this browser origin's localStorage. Existing Claude progress will not appear automatically. Back up saves before experiments.
2. **Server:** actions execute client-side in the preview, so progress is not cheat-proof. Server phase 1 remains an unconnected local scaffold; no real public account launch.
3. **Visuals:** the approved identity is documented in `docs/visual_identity.md`, but the official raster logo kit is not verified as integrated. Don't imply final art quality.
4. **Experience parity:** owner said the preview feels right, but later Claude-only changes may still be unknown.
5. **Maintainability:** `web/src/sim.js` and `web/src/ui.js` are large source modules. Keep them understandable and avoid untested giant rewrites.
6. **Branch confusion:** GitHub's default is still `main`. Root pointers there must direct new contributors to `preview/browser`.

## Immediate priorities (not authorization for speculative changes)
1. Keep original browser experience stable and backup/verify the owner’s character-save path.
2. Compare source against any later Claude artifact or owner screenshots; document verified differences without speculation.
3. Choose a small, valuable game/UI enhancement with the owner, define acceptance criteria, implement + test it **on the real browser code**, and let Railway redeploy.
4. Plan server integration only with a credible migration, secrets, database and abuse-prevention strategy; no rushed multiplayer claims.
5. Improve clarity and structure incrementally, preserving reproducible combat behavior.

## Latest completed activity
- 2026-11-06 PT: fixed the new Aegis test's scenario: changed from a meadow mob that dies before attacking to a surviving Rift Sentinel that can cause a genuinely lethal blow. Code behavior unchanged. CI revalidation pending.
- 2026-11-06 PT: lab correction on feature branch: browser-local offline catch-up (4h cap), pre-impact automatic guard, functional charm affix bonuses and bounded persistent weapon mastery bonus. Added regression tests. These are experimental, not approved balance values.
- 2026-11-06 PT: on isolated branch `work/living-arsenal-lab` implemented **experimental, separate** Living Arsenal playable systems lab (`lab/arsenal`) for three white weapon attacks, 1–5 conduits, limited ability sources/supports, guaranteed earning floor, white→rare forging, protected loot reserve and brighter sample UI; server routes `/lab/arsenal/` only on this branch. This is NOT yet integrated into the original game or published on the active live preview. Run `node lab/arsenal/tests.mjs`. Exact balance and design details are provisional.
- 2026-11-06 PT: owner confirmed Living Arsenal core, no-stuck progression and brightened world direction. Authored V2 progression + visual direction design specs with provisional milestones, economy and implementation tests. Legacy game source currently unaffected.
- 2026-11-06 PT: proposed `docs/proposals/LIVING-ARSENAL-ITEMIZATION-V2.md` after owner requested a new item/crafting/loot system: white weapon's innate automated action plus up to five additional automatic abilities from gear, loot, crafting and progression. Design is **proposal only** except this confirmed direction. No code changes, no player migration, no new abilities implemented. Review unresolved design choices before coding.
- 2026-11-05 PT: documented every implemented item/equipment subsystem in `docs/ITEMS-AND-EQUIPMENT.md` with an I01–I17 Keep/Change/Unsure review register, precise current behavior, and unverified implementation concerns. **No owner design decisions have been recorded from this review yet. No gameplay source changed.**
- 2026-11-05 PT: hardened handoff CI to inspect each commit in ordinary multi-commit pushes; published GitHub Copilot onboarding on the active branch. No gameplay source changed.
- 2026-11-05 PT: created repository-wide AI/human contributor instructions, design and architecture context, human-readable code standards, handoff workflow, changelog and a CI documentation gate. **Documentation/guardrails only; no gameplay mechanics changed.** See the most recent `docs/CHANGELOG.md` entry.

## Mandatory end-of-task handoff template
- **Goal / request:** 
- **What changed (files and player impact):**
- **Branch + commit SHA/link:**
- **Tests (commands, results, not run):**
- **Preview (deployment commit / URL / health / device test):**
- **Owner decisions recorded (or still pending):**
- **Known risks / assumptions:**
- **Exactly what the next agent should do:**

Update the standing sections above after each coherent change. Do not overwrite valuable historical status with wishful thinking.
