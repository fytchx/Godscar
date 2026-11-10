# Project state and immediate handoff

**Last documented:** 2026-11-09 (UTC). **Active source branch:** `preview/browser` (verify current commit before work). The website's sole intended entry screen is the selected combat + Character direction.
**Read this before every work session, and update it in the same commit as EACH change set.** This document is a snapshot; re-check HEAD, workflows, Railway and live site rather than treating old statuses as current.

## Latest focused screen work
The selected phone-first combat + Character presentation is the website's current entry direction at `/`. The equipped-weapon card, recent-hit feed, and retired systems-preview card are removed; the auto-attack cast bar is muted, active inscriptions use fading progress bars in the arena's upper-left, and an abbreviated live session damage-rate number sits at the lower-right. Attack/DoT hits create distinct sample slash, ember, poison and blood-drip effects. XP, materials and kills share a compact summary strip; detailed DPS and ranked per-source damage remain behind its details button. The Character button opens the approved phone-first Character mockup as an Equipment-first full-screen overlay with Inventory, Crafting and Materials tabs. It has the shown 12 gear positions, Oathkeeper loadout card, and Fight/Character/World/Skills/Menu bottom navigation; Fight closes the overlay while the parent combat timer continues. Individual current-pack art is used instead of a newly assembled sprite sheet. Offline recap, saved layout and reduced-effects controls remain. Combat values, inventory and character content remain illustrative; no old simulation or save is blended into this screen. Prior `/lab`, `/lab/combat/`, and `/lab/arsenal/` page routes redirect to `/` so the website has one visible version.

## Product identity
**2026-11-06 direction update:** Owner adopted the Living Arsenal as the core of the game and approved reworking mechanics without retaining prototype saves/progress. Permanent white-weapon attack + 1–5 gear/crafting/progression-derived automatic abilities, meaningful but recoverable investments, and a brighter adventurous tone. The selected combat + Character presentation is the website's starting surface. The earlier browser simulation and Living Arsenal experiment remain historical source material, not alternate public website versions. Read `docs/PROGRESSION-V2.md` and `docs/VISUAL-DIRECTION-V2.md`.

Godscar is a phone-first dark fantasy **continuous-combat idle ARPG**, potentially an online RPG in later phases. The approved next-game presentation is the illustrated combat screen and matching Character menu shown in the phone references. This is a presentation foundation; its sample values are not connected to the preserved browser simulation. The custom Godot rewrite remains rejected.

## Current source of truth
- Repository: https://github.com/fytchx/Godscar
- Active game branch: `preview/browser`; baseline archival branch: `web`.
- Preserved earlier simulation source: `web/src/sim.js`, `web/src/ui.js`, `web/src/shell.html` (tested/buildable reference, no longer served as the website entry page).
- Historical simulation identifier in the preserved source: **SIM_VERSION 4** (top comment still calls the core v3). This applies to the earlier simulation only.
- Live preview: https://godscar-browser-preview-preview.up.railway.app/ (root serves the selected combat + Character presentation).
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

## What the preserved browser simulation contains (reference only; not served at root)
- Five classes: Warrior, Paladin, Sorcerer, Hunter, Rogue, three specializations each, passives and class evolutions.
- Ongoing self-attacking monster fights; attacks, autocast spells, health/regen, resistances, damage types, status effects, deaths/respawn.
- Stage/zone progression, autopush/retries, zone scouting and build/item projections, boss snapshot fights and sigils.
- Loot from common through ascended, equipment, affixes, enchantments, augment mechanics, crafting, upgrades, salvage, socketed belts/Jewels, save migration and up to 24h offline catch-up.
- Historical browser UI tabs: Fight, Gear, Bag, Build, Forge. These do not define the new site's current screen direction.

## Retired website versions (not public routes)
- The former `/lab/arsenal/` Stage 1 shell is no longer routed. Its page URL redirects to `/`; it cannot appear as a competing website version.
- The earlier standalone Living Arsenal engine was connected to the shell briefly in PR #9, then fully reverted from the preview branch. Its routes also redirect to `/`.
- The previous original browser game page is no longer served at root. Its source and save format are preserved; the current page does not read, migrate, or delete that save.
- Historical screen and engine files remain in Git history for recovery, not as public entry routes.
- Stage 1 was merged through PR #4 into `preview/browser` at `cda6a18412fe5b6a7b3558c495cb0844401b1d7f`; Railway deployment `4d80970c-5ae2-4377-bc07-55442735a1e6` reached SUCCESS. The public `/lab/arsenal/` route was verified in the browser, including the Fight, Gear, and Build screens. Physical-device review is still pending.
- PR #5 merged into `preview/browser` at `772ebc07953c04b41c0541223bbbbd65a4c798fb`. Railway deployment `098ce66a-8515-4182-9e76-6cc0a0a3b773` reached SUCCESS, and the public route plus art module were HTTP-verified. Physical phone review remains pending. Next: review the shell on phone, then align it with current game state; this UI step adds no item or combat mechanics.

## Current risks and known gaps
1. **Prototype acceptance:** Does the selected combat + Character presentation feel substantial and legible on the owner’s phone? Review the root page before connecting real game state.
2. **Cloud saves:** Claude-hosted integration uses `window.claude`; Railway preview uses this browser origin's localStorage. Existing Claude progress will not appear automatically. Back up saves before experiments.
3. **Server:** actions execute client-side in the preview, so progress is not cheat-proof. Server phase 1 remains an unconnected local scaffold; no real public account launch.
4. **Visuals:** the approved identity is documented in `docs/visual_identity.md`, but the official raster logo kit is not verified as integrated. Don't imply final art quality.
5. **Experience parity:** owner said the preview feels right, but later Claude-only changes may still be unknown.
6. **Maintainability:** `web/src/sim.js` and `web/src/ui.js` are large source modules. Keep them understandable and avoid untested giant rewrites.
7. **Branch confusion:** GitHub's default is still `main`. Root pointers there must direct new contributors to `preview/browser`.

## Immediate priorities (not authorization for speculative changes)
1. Preserve the earlier browser simulation and its saves in source/history while the new presentation is developed; do not silently migrate or delete player data.
2. Keep the approved phone references as the visual target; document any deliberate design differences before implementing them.
3. Collect owner feedback on the root combat + Character screen on a phone: inscription readability, visible effects, arena scale, Character layout, and the appearance controls. Decide what game state to build underneath after that review.
4. Plan server integration only with a credible migration, secrets, database and abuse-prevention strategy; no rushed multiplayer claims.
5. Improve clarity and structure incrementally, preserving reproducible combat behavior.

## Latest activity
- 2026-11-09 UTC: Make the approved combat + Character presentation the sole public preview entry point. Root now serves that screen; former `/lab` route aliases redirect to root. The earlier simulation and Living Arsenal content are no longer exposed as alternate website versions. Sample combat and Character data remain presentation-only.
- 2026-11-09 UTC: Corrected the Character screen after owner review found the site version did not match the approved mockup. The screen now uses the original phone layout, all 12 pictured gear positions, actual item illustrations, Oathkeeper loadout, four Character tabs, and the matching bottom navigation. Fight stays primary and Character overlays it; the Fight nav button returns to the running battle. The page has a separate, allowlisted route and sample data only; verify PR checks and deployment.
- 2026-11-09 UTC: Tightened `/lab/combat/` into a shorter HUD: inscriptions moved into the arena, weapon card and recent-hit list removed, auto-attack cast bar added, XP/material/kill strip consolidated, detailed session stats moved behind one button, and sample slash/ember/poison/blood effects added. No simulation or save changes. Confirm the current deployment and gather phone feedback.
- 2026-11-08 UTC: PR #5 merged to `preview/browser` at `772ebc07953c04b41c0541223bbbbd65a4c798fb`; GitHub `test`, `lab`, and `handoff` checks passed. Railway deployment `098ce66a-8515-4182-9e76-6cc0a0a3b773` reached SUCCESS, and the public route/art module were HTTP-verified. Phone review remains pending.
- 2026-11-07 UTC: Stage 1 UI skeleton merged as PR #4; GitHub checks passed, Railway preview deployed successfully, and the live Fight/Gear/Build tab flow was browser-verified. Awaiting owner review on their phone before Stage 2.
- 2026-11-06 UTC: expanded the isolated browser prototype from a narrow proof into a broader playable loop: four distinct weapon families, nine equipment slots, gear affixes and a set bonus, three hunts including a named boss, equipment recovery, deliberate weapon refinement and charm engraving, responsive fight/build/forge UI. All local checks, all three GitHub workflow checks, preview deployment and route/health HTTP verification passed. Separate save remains isolated; no phone visual test yet.
- 2026-11-06 PT: integrated the **opt-in** Living Arsenal V2 lab route `/lab/arsenal/` with the original browser preview, after isolated feature branch CI passed lab unit tests, original browser tests and route smoke tests. Original `/` game and its save key remain unchanged; lab is an experimental second engine/UI. New route needs post-deployment HTTP and real phone review; no full feature parity, online play or final balancing is claimed.
- 2026-11-06 PT: corrected second lab test scenario to compare accessory damage before both characters finish the same enemy. Code mechanics unchanged. CI revalidation pending.
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
