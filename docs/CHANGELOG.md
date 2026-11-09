## 2026-11-09 UTC — Keep displayed ability timers within range
- **Why:** Browser review caught a negative timer value briefly appearing just before a sample cast reset.
- **Changed:** Reset the illustration timer before rendering its next countdown value.
- **Verification:** Confirmed the issue in the latest live build; verify the corrected counter after deployment. No test suite run.

## 2026-11-09 UTC — Animate automatic inscription timers
- **Why:** The weapon and inscription timers are meant to explain the automatic combat flow, so static countdown numbers did not communicate that behavior.
- **Changed:** The two sample timers now count down and restart; their illustrative cast events add their own colored combat entries and session damage. Timer bars follow the countdown. Values remain presentation-only.
- **Verification:** Checked the live preview’s interaction flow; verify the deployed timer update after this commit. No test suite run.

## 2026-11-09 UTC — Separate direct hits from DoT session totals
- **Why:** Live preview inspection showed that one spell's direct hit and burn tick shared a name, so the summary could label their combined damage as only a tick.
- **Changed:** Session accounting now keeps each hit category separate (for example, Ember Brand direct damage versus Ember Brand burn ticks) while preserving icon, element color, hit count and ranking.
- **Verification:** Checked the live damage dialog and corrected its tally keys in source. No test suite run; verify after the deployment completes.

## 2026-11-09 UTC — Wire the focused combat preview route
- **Why:** The first preview deployment exposed that the new assets were not yet reachable through the HTTP server.
- **Changed:** Added the combat assets to the server's explicit allowlist, routed `/lab` to `/lab/combat/`, and kept `/lab/arsenal/` separate. Removed temporary root-level asset entries from the preview source tree.
- **Verification:** Source fix committed; the active branch and public HTTP route are being checked after this deployment. No test suite run.

## 2026-11-09 UTC — Add a focused continuous-combat screen concept
- **Why:** The broad interface skeleton did not make the combat flow feel familiar or immediately legible. The owner asked to focus on the Fight screen and confirmed the content, recap, damage accounting, layout controls and performance option.
- **Changed:** Added `/lab/combat/` with player health/weapon/autocast information above a monster-centered scene; distinct sample physical, fire and poison hit/tick feedback; status indicators; per-hit feed; clickable ranked session damage with manual reset; XP/material/kill summary; and a launch recap modal that closes on outside tap. Added reorder/hide controls (combat fixed), locally saved layout/effects preferences, and a link to the wider systems preview. `/lab` redirects to the combat page.
- **Boundary:** All hit values, health changes, monster turnover, loot and offline gains are illustrative animation. The page is disconnected from `web/src/sim.js` and does not read or alter game saves. Original `/` and `/lab/arsenal/` stay available.
- **Files:** `lab/combat/{index.html,styles.css,main.mjs}`, `preview/server.mjs`, project/design docs and `README-PREVIEW.md`.
- **Verification:** No test suite was run. Verify the new page and its assets over HTTP after the preview deployment; real phone review remains outstanding.
- **Next:** Get owner feedback on a phone. Refine the demonstrated layout, then specify the first interaction that will use live simulation state.

## 2026-11-08 UTC — Verify the gear-art and combat visual deployment
- **PR:** #5 merged into `preview/browser` at `772ebc07953c04b41c0541223bbbbd65a4c798fb`.
- **Deployment:** Railway deployment `098ce66a-8515-4182-9e76-6cc0a0a3b773` reached SUCCESS. Verified the public `/lab/arsenal/` route and `art.mjs` module over HTTP.
- **Review status:** GitHub `test`, `lab`, and `handoff` checks passed. Physical phone review remains pending.
- **Scope:** The gear silhouettes and attack scene are presentation placeholders; combat and inventory state remain unchanged.

## 2026-11-07 UTC — Add gear-art placeholders and visible combat attacks
- **Why:** Owner requested equipment artwork positions in Gear and Bag plus a fight scene showing attacks travelling toward a monster, with final artwork planned for later.
- **Changed:** Added one original SVG silhouette for each of the 11 equipment slots, larger sample-item images in Bag, and a small looping hero sword slash/impact scene for Fight. The visual scene reacts to the selected enemy. Placeholder artwork and animation are labeled; they are not final assets or combat simulation.
- **Boundary:** Presentation-only updates in the isolated `/lab/arsenal/` route. No changes to original game source, combat rules, game saves, or Arcana assets.
- **Paths:** `lab/arsenal/{art.mjs,art-tests.mjs,ui.mjs,styles.css,README.md}`, `preview/server.mjs`, `.github/workflows/living-arsenal-lab.yml`, `docs/{PROJECT-STATE,ARCHITECTURE,DECISIONS,OPEN-QUESTIONS,CHANGELOG}.md`.
- **Verification:** Local art checks, existing lab tests, `npm test`, `npm run build`, route smoke, and `git diff --check` passed. GitHub `test`, `lab`, and `handoff` checks passed. PR #5 merged to `preview/browser` at `772ebc07953c04b41c0541223bbbbd65a4c798fb`; Railway deployment `098ce66a-8515-4182-9e76-6cc0a0a3b773` reached SUCCESS. The public route and `art.mjs` returned expected content over HTTP. Phone review remains pending.
- **Next:** Review the visual hierarchy on a phone. Replace SVGs only after final item/character art is prepared; next design step is binding the screens to actual game state.

## 2026-11-07 UTC — Replaced the prototype presentation with Stage 1 interface skeleton
- **Why:** Owner reported the prior prototype did not feel like Godscar or make the game flow understandable, and agreed to stage the redesign by designing the skeleton first.
- **Changed:** `/lab/arsenal/` now presents a phone-first layout preview using the familiar Fight / Gear / Bag / Build / Forge tabs, sticky combat ribbon, actual starting-game labels, 11 equipment slots, and entry points for equipment decisions. Clicks only navigate or reveal explanation text. Arcana is used as a mobile UI pattern reference; no Arcana assets/code are copied.
- **Boundaries:** Static sample values are identified as preview data. Stage 1 does not import the old lab engine, write localStorage, simulate combat, or touch the original route/save. Earlier standalone engine files remain present but unused by this UI.
- **Paths:** `lab/arsenal/{index.html,ui.mjs,styles.css,README.md}`, `.github/workflows/living-arsenal-lab.yml`, `docs/{PROJECT-STATE,ARCHITECTURE,DECISIONS,CHANGELOG}.md`.
- **Verification:** Local `node --check lab/arsenal/ui.mjs`, focused lab tests, original `npm test`, `npm run build`, local route smoke and `git diff --check` passed. GitHub PR #4 `test`, `lab`, and `handoff` checks passed. Merged by PR #4 into `preview/browser` at `cda6a18412fe5b6a7b3558c495cb0844401b1d7f`. Railway deployment `4d80970c-5ae2-4377-bc07-55442735a1e6` reached SUCCESS; the public route and Fight/Gear/Build tab content were verified in the browser. Physical-device review remains pending.
- **Next:** Owner reviews the screen flow and phone layout; then Stage 2 aligns the shell with actual simulation state before any mechanic expansion.

# Godscar project changelog and handoff history

## 2026-11-06 UTC — Publish the expanded prototype to the isolated Godscar preview
- **PR:** [#3](https://github.com/fytchx/Godscar/pull/3), merged to `preview/browser` at `377cc258188387f7a3372ebe233df09d14f308b4`.
- **Checks:** GitHub `handoff`, `test`, and `lab` all passed. Local focused lab checks (16), original `npm test`, `npm run build`, and route smoke all passed.
- **Deployment:** Railway `6dca9cc1-aac7-4cf0-b60d-c94157515b9d` succeeded. Verified public `/health` and `/lab/arsenal/` respond with updated page. Playwright’s browser binary was unavailable; no physical-device review yet.
- **Next:** Owner should play the prototype on phone and judge the core feel, progression, and item loop before deeper system expansion.


## 2026-11-06 UTC — Expanded the browser-first Living Arsenal prototype
- **Why:** Owner confirmed this should be a browser idle game and full-sent a significant prototype after the earlier combat UI felt too empty. Grim Dawn equipment influence and weapon-defined build identity guide this iteration.
- **Changed:** Expanded the isolated lab to four distinct weapons and arts, nine equipment slots, five affixes, Warden set defense, three hunts including a named boss, loot/lock/salvage/reserve flow, weapon refinement, charm engraving, and responsive Hunt / Build & Gear / Forge screens. Updated the route smoke checks and prototype/architecture/handoff/design docs.
- **Paths:** `lab/arsenal/{catalog,engine,index.html,styles.css,tests,ui}.mjs`, `lab/arsenal/README.md`, `.github/workflows/living-arsenal-lab.yml`, `docs/{PROJECT-STATE,ARCHITECTURE,DECISIONS,OPEN-QUESTIONS,CHANGELOG}.md`.
- **Data impact:** Separate `godscar.living-arsenal.lab.v2` browser-local save; original game route and save are untouched.
- **Validation:** `node --check` for all lab modules, 16 focused lab checks, `npm test`, `npm run build`, and local route smoke for `/`, `/lab/arsenal/`, engine module, CSS and `/health` all passed. Playwright visual check was unavailable because its browser executable is not installed. Remote CI and deployment are pending; no physical-phone visual check completed.
- **Status / next:** PR #3 merged into `preview/browser` as `377cc258188387f7a3372ebe233df09d14f308b4`. All three GitHub workflow checks passed. Railway deployment `6dca9cc1-aac7-4cf0-b60d-c94157515b9d` reached SUCCESS; public `/lab/arsenal/` and `/health` return the new build. All content and balance values remain provisional; still needs owner review on a real phone.


## 2026-11-06 PT — Release opt-in Living Arsenal systems lab alongside original browser game
- **Reason:** Owner endorsed Living Arsenal as new core and requested a tangible, reviewable implementation without the prior fidelity-losing wholesale rewrite.
- **Change:** Merge feature branch `work/living-arsenal-lab` into active `preview/browser`; serve lab at `/lab/arsenal/` from the existing Godscar Railway preview. Original browser homepage remains served at `/`, untouched. Added lab link, expanded lab CI to active branch, and clarified source documentation.
- **Verification:** Feature branch lab workflow and web tests passed before merge on commit `cc8eaee5d84b1f54fb0ab3a1c68133b85aab07e8`. Active branch CI and Railway deployment must be separately verified after merge.
- **Player/data:** Experimental lab uses its own localStorage key; no migration or deletion of the original browser character. Lab has no production account/multiplayer or final content.
- **Limitations:** New UI is not yet verified on a physical phone. Prototype supports 3 weapons, basic 1–5 autocast progression, basic forging and bounded 4h offline catch-up. Mastery numbers and level gates are provisional.
- **Next:** Test lab with owner, validate the core fun loop and make decisions on class identity, skill permanence and late crafting risk before deepening integration.


## 2026-11-06 PT — Compare charm damage before first kill
- **Why:** At the original test checkpoint both builds had killed the same foe; this obscured the expected relative damage. Repositioned comparison at 2s, when both foes still exist.
- **Paths:** `lab/arsenal/tests.mjs`, `docs/PROJECT-STATE.md`, `docs/CHANGELOG.md`.
- **Game impact:** None; corrected the assertion scenario, not gameplay code.
- **Verification:** New feature-branch CI required before merge.


## 2026-11-06 PT — Correct Aegis scenario in Living Arsenal automated test
- **Why:** First defensive trigger regression was a false failure: the safe meadow monster was killed before making an attack, so the trigger was never exercised.
- **Change:** Use a Rift Sentinel with sufficient life to hit the player and verify the pre-impact guard actually fires.
- **Files:** `lab/arsenal/tests.mjs`, `docs/PROJECT-STATE.md`, `docs/CHANGELOG.md`.
- **Game impact:** No gameplay code changed. Test revalidation pending GitHub workflow completion.


## 2026-11-06 PT — Validate automatic defense, accessory effects, offline progress
- **Files:** `lab/arsenal/{engine,ui,tests}.mjs`, `lab/arsenal/README.md`, `docs/PROJECT-STATE.md`, `docs/CHANGELOG.md`.
- **Changes:** Aegis triggers before damage can kill the hero, accessory affixes affect the build, persisted local lab state catches up offline up to four hours, and weapon-family mastery grants a small capped prototype effect while persisting through swaps. Added regression tests.
- **Impact:** Lab-only; no change to original browser game, live Arcana, accounts or older saves.
- **Verification:** New lab CI and web tests must pass on the feature branch after commit. Physical-device visual/long offline profiling is not yet completed.


## 2026-11-06 PT — Living Arsenal isolated playable lab (feature branch)
- **Implemented:** A separate deterministic combat engine/catalog, new responsive V2 UI/style, 3 white weapons, 5 milestone-gated conduits, 5 skill definitions, 3 support tags, 2 hunt paths, basic gear swaps, intentional Magic/Rare forging and engraving, safe Scrap/XP income, protected storage. Added `/lab/arsenal/` via explicit allowlisted routes to the existing preview server, on feature branch only.
- **Paths:** `lab/arsenal/{catalog,engine,ui}.mjs`, `index.html`, `styles.css`, `README.md`, `tests.mjs`, `preview/server.mjs`, `.github/workflows/living-arsenal-lab.yml`, `docs/PROJECT-STATE.md`, `docs/ARCHITECTURE.md`, `docs/CHANGELOG.md`.
- **Scope:** This is a bounded proof of concept, **not** a full rebuild of the approved browser experience. No existing sim/UI file replaced, no existing saves touched; original root URL untouched. No real online authority, unique items, final balancing, full classes or world chapters.
- **Validation:** New focused Node tests and route smoke CI to be confirmed on branch; existing browser tests must also pass. Rendering in a physical phone browser has not yet been proven.
- **Deployment:** Source branch is not connected to Railway's active preview. Host only after branch/CI validation; do not claim this prototype is the default game.
- **Next:** Test deterministic engine and interface; tune pacing and reconcile with original browser UI before considering adoption.


## 2026-11-06 PT — Living Arsenal is the owner-approved foundation
- **Owner direction:** Weapon innate autocast + 1–5 supplemental autonomous abilities, experimentation without permanent dead-ends, optional intentional risk, deliberate build investment and brighter adventurous fantasy. Old prototype saves/progress need not be migrated to the new design.
- **Docs:** `docs/PROGRESSION-V2.md`, `docs/VISUAL-DIRECTION-V2.md`, `docs/{DECISIONS,DESIGN-INTENT,visual_identity,PROJECT-STATE,OPEN-QUESTIONS,CHANGELOG}.md`.
- **Code/deployment:** Documentation-only on current approved browser branch. No existing gameplay changes, no new saved-game incompatibility. Prototype implementation is a separate next step.
- **Next:** Implement and test small interactive vertical slice with white base, 1–5 ability capacity, craftable items and guaranteed baseline progression; assess gameplay with owner before expanding content.


## 2026-11-06 PT — Living Arsenal itemization redesign concept
- **Why:** Owner requested a comprehensive rethink inspired by Path of Exile, Grim Dawn and Diablo, preserving automatic white-weapon attacks and adding 1–5 modifiable autonomous abilities from items, crafting, loot and progression.
- **Change:** New `docs/proposals/LIVING-ARSENAL-ITEMIZATION-V2.md` with system definitions, weapon identities, ability sources, Conduits, modified skills/supports, white-to-rare crafting, named items, targeted drops, idle event rules, example build, migration risks, rollout and decision questions; `docs/PROJECT-STATE.md`, `docs/DECISIONS.md`, `docs/OPEN-QUESTIONS.md` updated for continuity.
- **Impact:** Documentation only. No gameplay code, user saves, crafting actions or preview UI changed. No owner approval assumed for exact mechanics.
- **Verification:** Proposal checked against known original browser architecture. CI and deployment results must be checked after GitHub commit; tests cannot validate an unimplemented design.
- **Next:** Present core tradeoffs to owner, collect choices for skill sources / rarity / classes / crafting risk, then design a small isolated prototype with save protection.


## 2026-11-05 PT — Complete equipment system inventory for owner review
- **What / why:** Extracted actual browser-code item mechanics into a human-readable, source-indexed reference covering all equipment slots, weapon bases, rarities, 28 affix keys, enchants, augments, Ascended sets, Jewels, drops, inventory, item comparison, crafting, forge, bosses and saves. Added I01–I17 owner review IDs with all decisions remaining UNSURE.
- **Files:** `docs/ITEMS-AND-EQUIPMENT.md`, `docs/PROJECT-STATE.md`, `docs/CHANGELOG.md`, `docs/OPEN-QUESTIONS.md`.
- **Game impact:** None; original browser source and UI untouched.
- **Validation:** Compared documented rules to original source. Remote GitHub commit/CI/deployment must be separately verified; this documentation is not proof of mobile gameplay quality.
- **Concerns flagged:** Inventory full auto-salvage, rarity distributions, extremely rare Jewels, potentially incorrect crafting level cap from locked-zone initial stages, and item comparison limits.
- **Next:** Owner reviews any subset of I01–I17 and explicitly marks Keep / Change / Unsure; record confirmed decisions before editing mechanics.


## 2026-11-05 PT — Make handoff checks cover full pushes and connect GitHub Copilot
- **What / why:** Tightened the handoff script so multi-commit pushes are checked commit-by-commit when GitHub supplies the previous SHA; added GitHub Copilot instructions on the active branch and linked onboarding from the preview README.
- **Paths:** `scripts/check-handoff.mjs`, `.github/workflows/handoff.yml`, `.github/copilot-instructions.md`, `README-PREVIEW.md`, `docs/PROJECT-STATE.md`, `docs/CHANGELOG.md`.
- **Game impact:** None; original UI and simulation untouched.
- **Validation:** GitHub workflow check to be verified after push, not yet a substitute for branch protection. Regular web tests also run.
- **Known limits:** New-branch pushes and some PR merge contexts may only check HEAD. GitHub may accept pushes before CI evaluates them. This is a compliance signal, not a hard server-side ban.
- **Next:** Start feature work only after confirming intended design and human acceptance criteria.


This log records **completed and committed change sets**, not wishes. Most recent first. For every code/asset/config/test change, prepend an entry in the **same commit** as that change. Distinguish tests and deployment status from assumptions. Important old entries should not be deleted.

## 2026-11-05 PT — Durable GitHub handoff and human-readable standards
- **What / why:** Created permanent AI + human onboarding and contributor agreement, active-branch signpost, current project snapshot, confirmed design intent/decisions, code readability standards, architecture map, workflow, open questions, PR checklist, and an automated documentation completeness check. This is to stop future agents starting from the abandoned Godot remake or losing work between conversations.
- **Paths:** `AGENTS.md`, `CLAUDE.md`, `START-HERE.md`, `docs/{PROJECT-STATE,DESIGN-INTENT,DECISIONS,ARCHITECTURE,CODE-STANDARDS,WORKFLOW,OPEN-QUESTIONS,CHANGELOG}.md`, `.github/PULL_REQUEST_TEMPLATE.md`, `.github/workflows/handoff.yml`, `scripts/check-handoff.mjs`.
- **Game impact:** None. Source files `web/src/` unchanged.
- **Validation:** Documentation cross-references / CI handoff gate must be checked after commit. The prior original browser game and preview workflows were green as of the earlier deployment, not proof of any newer code changes.
- **Deployment:** Commit to `preview/browser` triggers Railway auto-deploy. Check status and deployed revision afterward.
- **Risks / next:** Default GitHub branch remains `main`; update its top-level README/instructions to route collaborators to active branch. Ensure future commits honor same-commit documentation.
  
## 2026-11-05 PT — Original Claude browser game restored as separate live preview
- **What / why:** Reused unmodified `web/src/sim.js`, `web/src/ui.js`, `web/src/shell.html` from saved browser branch. Added Node build/server on `preview/browser` and an isolated Railway preview, without touching Arcana.
- **Validation:** [Preview workflow passed](https://github.com/fytchx/Godscar/actions/runs/42172538698); [legacy Web tests passed](https://github.com/fytchx/Godscar/actions/runs/42172538774); public web page and `/health` returned content.
- **Owner acceptance:** Owner recognized and approved this as the intended game.
- **Limitations:** Browser saves are origin-specific, Claude cloud sync does not automatically transfer, server authority not live, later uncommitted Claude work unknown.

## Earlier — Incorrect Godot APK rewrite
- **What happened:** An unfaithful native Godot version was committed to default `main` and packaged for Android. Basic automated tests passed but presentation and mechanics did not match the original game. The owner rejected it.
- **Disposition:** Preserve history only; do not build current game features on this rewrite or claim it was faithful.
