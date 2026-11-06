# Decisions log (owner decisions vs engineering observations)

**How to use:** Add dated entries with **status (confirmed / proposed / rejected / unknown)**, reason and consequences. Do not convert a discussion, code comment, or AI suggestion into an owner-approved fact. When superseding, keep the old entry and point to the new one.

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
