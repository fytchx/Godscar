# Decisions log (owner decisions vs engineering observations)

## 2026-11-09 UTC — Confirmed: Paladin vertical slice is current priority
- **Owner direction:** Prioritize the one-zone, three-wall Paladin vertical slice using the existing `web/src/sim.js` over Living Arsenal work.
- **Boundary:** Keep this priority scoped to the slice; do not implement Living Arsenal, multiplayer, or server-branch work as part of it. This does not by itself reverse the broader Living Arsenal direction.

## 2026-11-09 UTC — Make the combat + Character direction the only public website version
- **Owner direction:** The illustrated combat screen and matching phone-first Character prototype shown in the approved references are where Godscar should continue. Remove earlier website versions from public routes so they cannot be confused with this direction.
- **Implementation boundary:** Serve the selected presentation at `/`. Former `/lab`, `/lab/combat/`, and `/lab/arsenal/` page URLs redirect to `/`. Keep prior code recoverable in Git history; do not combine its game engine or saves with the selected UI by default.
- **Data boundary:** Combat numbers, inventory, recipes and materials remain sample content until a separate explicit game-state integration is designed.


## 2026-11-09 UTC — Corrected: Character must match the approved phone preview
- **Owner feedback:** The first site version did not look like the approved Character preview.
- **Implementation:** Use the original prototype structure and actual individual art: 12 visible slots, stat deltas, Oathkeeper loadout, combat-role card, Character tabs, and the bottom navigation. Keep Fight as the existing parent combat view and place Character over it.
- **Boundary:** Keep sample character/inventory values clearly illustrative; never write simulation or save state from this prototype screen.

## 2026-11-09 UTC — Confirmed: keep Combat central and add Character as an overlay
- **Owner direction:** Preserve the current continuous-combat screen as the main Godscar view. The Character button opens on Equipment, with Inventory, Crafting and Materials tabs. Combat remains visible underneath and continues while the player manages the character.
- **Owner direction:** Keep the compact live damage-rate number at the battlefield's lower-right and make the weapon auto-attack progress line quieter.
- **Implementation boundary:** The Character screen is a presentation preview with sample item data and isolated appearance preferences. It does not change simulation, inventory, crafting or save data.

## 2026-11-09 UTC — Confirmed: compact combat HUD refinement
- **Owner direction:** Reduce vertical space. Remove the equipped-weapon card; use only a subtle weapon auto-attack cast bar. Move the active inscription list into the arena's upper-left as compact colored rows with a progress bar that fades at its right edge. Remove the recent-hits feed. Put XP, materials and monsters slain in one compact summary with a button to detailed session stats and damage breakdown; show total DPS inside that view.
- **Owner direction:** Use a more modern dark-menu/gamer visual treatment. Show distinct event effects as hits happen, including a sharp flash for melee and visible dripping blood on bleed ticks.
- **Implementation boundary:** This refines the earlier screen arrangement recorded below. All numbers, timer events and hit effects remain sample presentation; no game rules or saves change.


## 2026-11-09 UTC — Confirmed: combat-screen priorities
- **Owner direction:** Keep the browser-idle fight flowing. Put the player's name, health, weapon attack and automated ability timers above the combat scene. The monster gets the scene; do not show a player-character sprite. Show organized text for each attack and each DoT tick with an ability icon and damage-type/element color. Keep the monster name and health visible in the scene.
- **Owner direction:** A compact DPS number opens a session damage breakdown ranked by source; it counts each attack/tick until the player manually resets it. Show XP, materials and monster kills below. Show an offline recap only on launch; tapping outside closes it. Allow whole UI sections to be reordered/hidden, keep combat fixed, persist layout locally, and provide reduced effects.
- **Prototype boundary:** The separate `/lab/combat/` route demonstrates the presentation with sample values and animation only. It does not set balance, define game simulation rules or touch saves.


**How to use:** Add dated entries with **status (confirmed / proposed / rejected / unknown)**, reason and consequences. Do not convert a discussion, code comment, or AI suggestion into an owner-approved fact. When superseding, keep the old entry and point to the new one.

## 2026-11-06 UTC — Confirmed: browser idle presentation for the Living Arsenal prototype
- **Owner:** Reaffirmed that Godscar is a browser idle game and said “full send” on the substantial prototype direction. Grim Dawn is a strong equipment inspiration; the previously stated weapon-centered build identity remains core.
- **Prototype interpretation:** Keep combat continuously automatic; make equipment, weapon-specific powers, loot and crafting the meaningful interactions. Present a persistent battle view and responsive browser management panels, not joystick/action controls.
- **Status:** This authorizes a significant isolated prototype, not final production balance, artwork or system scope. The first deliverable is an opt-in route beside the existing browser game.

## 2026-11-06 PT — Confirmed: Living Arsenal is Godscar's core direction
- **Owner:** Explicitly endorsed the Living Arsenal item/weapon/crafting/autocast concept as the foundation of the whole game. **Legacy prototype saves and progress do not need compatibility** when developing the new system. This is permission to design a new progression system and prototype, not proof that the system already exists.
- **Confirmed principles:** (1) a weapon-specific innate automatic primary that never stops, (2) 1–5 additional automated powers earned through loot, crafting and progression, (3) a player must never be permanently stuck or trapped by a past choice, (4) meaningful costs, rewards for commitment and optional risks still matter, (5) changing to another playstyle must always be possible, and (6) Godscar's overall world/UI should become brighter, somewhere between Diablo-like dark fantasy and IdleArc readability.
- **Engineering consequences:** base attack + bounded automatic loadout are the mechanical anchor; design progression around evergreen access, alternative growth routes and reversible choices. Work from original browser architecture and test on isolated new code before replacing its approved live experience. No forced old-save migration, but do not silently erase the existing browser's stored saves.
- **Not owner-approved:** exact 1–5 slot unlock levels, material names, color hex values, rarity tiers, character/mastery/world gates, concrete ability numbers, world names or irreversible crafting risks. These are proposals in `docs/PROGRESSION-V2.md` and `docs/VISUAL-DIRECTION-V2.md`.

## 2026-11-06 PT — Confirmed design direction, NOT a completed system
- **Confirmed owner intent:** Completely rethink item and crafting mechanics. Even a white weapon should automatically perform a weapon-type-specific (and where appropriate element-specific) baseline attack. Gear, loot, crafting and progression should enable an additional 1–5 modifiable automatic skills/attacks/spells/DoTs, drawing broad inspiration from Path of Exile, Grim Dawn and Diablo.
- **Not decided:** The proposed "Living Arsenal" architecture, number of rarity classes, support/Conduit terminology, item-skill ownership, crafting randomness, class interactions, balance and release sequence. See `docs/proposals/LIVING-ARSENAL-ITEMIZATION-V2.md`.
- **Consequence:** Preserve the existing original browser game unchanged until the concept has been reviewed and a safe prototype/migration plan is approved.

## 2026-11-05 PT — Confirmed: original browser Godscar is the active direction
- **Decision:** The owner opened the separately hosted original Godscar browser game and explicitly confirmed: "yesss. That's it." Continue the original browser version rather than the stripped-down Godot APK.
- **Why:** An attempted Godot rebuild delivered a different experience, with missing UI/presentation/systems despite passing tests.
- **Consequence:** `preview/browser` + `web/src/` are primary for gameplay, and the separate Railway preview is our review loop. `main/godot` is not the active baseline. Do not silently import older joystick/manual-combat content.

## 2026-11-05 PT — Confirmed: durable, portable collaboration rules
- **Decision:** Every meaningful change needs verified GitHub commits, updated durable project context and clear handoffs so a completely new AI/human can continue without prior conversation.
- **Consequence:** Root `AGENTS.md` and `START-HERE.md`, structured design/state/change records and CI handoff checks. Failures must be disclosed, not covered over.

## 2026-11-05 PT — Confirmed: human-readable code and design
- **Decision:** Source and system design must make sense to a human reading them, not depend on AI-generated mystery code. The owner wants realistic pushback and questions where design intent is unclear.
- **Consequence:** Follow `docs/CODE-STANDARDS.md` and `docs/DESIGN-INTENT.md` for understandable modules, clear rules, tests, traceable decisions and incremental refactors.

## Earlier / ongoing — Confirmed core gameplay
- **Decision:** Combat runs automatically and continues while the player manages loot, builds, bosses and all other activities. Inspiration from IdleArc's nonstop combat is a core preference.
- **Consequence:** New systems must preserve this baseline. No required active attack input, click-to-kill design or movement-driven combat without a newly confirmed change.

## Earlier — Rejected: global combat tick design
- **Decision:** A prior brainstorm used a fixed server tick/attack-speed increments; the owner subsequently explicitly dropped the tick concept.
- **Consequence:** Never revive global tick design from old notes without a new request. Existing deterministic event scheduling is distinct from the rejected global-tick proposal.

## 2026-10-30 — Confirmed: Godscar visual identity
- **Decision:** Owner chose weathered GODSCAR gothic-metal lettering split by the crimson scar, plus world color language in `docs/visual_identity.md`.
- **Consequence:** Preserve that distinct identity. Official asset kit is not verified in repository; don't invent that it is integrated.

## 2026-11-05 PT — Engineering decision: isolated preview hosting
- **Decision:** Host original browser build in a **separate Railway project** and branch, not under Arcana.
- **Reason:** Arcana is a different live project; mixing risks destabilizing unrelated services.
- **Consequence:** Safe separate preview loop, but current browser prototype saves remain client-side and publicly viewable code is not anti-cheat.

## Not decided
- Final online architecture, production authentication/hosting, whether to change default branch, exact art pipeline, complete content roadmap, final balance, and how to import Claude-origin saves automatically. Track in `docs/OPEN-QUESTIONS.md`. An engineering experiment is not owner consent.


## 2026-11-07 UTC — Confirmed: stage the Godscar interface before mechanics
- **Decision:** Begin with a phone-first UI/UX skeleton that makes the five current game areas and their relationships immediately legible. Use the existing Fight, Gear, Bag, Build, and Forge structure and recognizable Godscar terminology.
- **Interaction boundary:** Stage 1 is a static layout preview; clicking navigates screens and reveals explanations only. It must not invent gameplay, alter saves, or imply sample numbers are finalized.
- **Visual reference:** Use Arcana as inspiration for clear mobile menus, panels, and navigation. Keep Godscar's own scar-crimson, ash, and forged-gold identity; do not copy Arcana assets or branding into the game.
- **Sequence:** Review the shell first, refine it against current simulation state second, review on phone third, then design weapon-bound abilities and Grim Dawn-influenced itemization.


## 2026-11-07 UTC — Confirmed: placeholder equipment art and visible attack feedback
- **Owner request:** Add gear artwork placement in Gear and Bag, and show attacks travelling toward a monster on Fight, in the readable spirit of IdleArc. The owner will create/commission final artwork later.
- **Implementation boundary:** Use replaceable, code-authored SVG silhouettes and a small looping sword-slash/impact visual. Clearly label them as placeholders/visual-only; do not imply art is final or that the animation is a combat event. Keep actual damage/combat untouched.
- **Consequence:** Keep art data in a replaceable module so approved item/character assets can swap in later without changing screen layout. Do not copy IdleArc's assets or exact presentation.
