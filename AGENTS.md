> **Current gameplay-slice override (2026-11-13):** For work on `slice/paladin-defense`, first read [docs/GAMEPLAY-RESUME.md](docs/GAMEPLAY-RESUME.md). The older `preview/browser` website and `SIM_VERSION=4` instructions below are historical **for this slice**. The actual sim here exports version **7**. Current Fight UI: `fytchx/Godscar-playtest@ui/fight-skeleton` (mock data; integration not yet authorized).

# Godscar contributor instructions (AI and human)

**Read [START-HERE.md](START-HERE.md) first.** This is an operational contract for anyone editing the repository, including coding assistants that have no previous chat context.

## The product, in one paragraph
Godscar is a dark-fantasy, phone-first **idle ARPG**. A single champion automatically fights monsters continuously; the player makes meaningful decisions about gear, passives, spells, enemy stages, bosses and crafting **without interrupting that fight**. The current faithful playable implementation is the ORIGINAL **browser game** in `web/src/` on branch `preview/browser`. Do not mistake the abandoned/incomplete Godot port on default `main` for the game the owner approved.

## Required reading at the start of EVERY task
1. Verify the actual repo `fytchx/Godscar`, current HEAD, branch, file state and access permissions. Switch to `preview/browser` for active browser work. Do **not** assume GitHub's default branch is the active product.
2. Read `START-HERE.md`, `docs/PROJECT-STATE.md`, `docs/DECISIONS.md`, `docs/DESIGN-INTENT.md`, `docs/ARCHITECTURE.md`, `docs/CODE-STANDARDS.md`, `docs/WORKFLOW.md`, and recent `docs/CHANGELOG.md`. Then inspect the actual code/tests relevant to the request.
3. Treat recorded decisions as context, not untouchable law. If the user's new request conflicts, flag it and resolve the scope before changing fundamental behavior.
4. Separate VERIFIED code/deployed behavior from PLANNED ideas, ESTIMATES and UNKNOWN facts. Do not invent tests, designs, mechanics, approvals, saved data or deployments.

## Design and collaboration
- Be realistic. Challenge needless rewrites, impossible scope, poor UX, insecure multiplayer designs, performance risks and unjustified complexity. Offer evidence and a smaller demonstrable alternative. Do not agree simply to please the owner.
- **Understand a proposed design before building it**. Identify what the user means, how it works during nonstop combat, interactions with systems already in the game, mobile UX, data/save impact and the cost to maintain it. For materially unclear choices, contradictory goals, or irreversible design decisions, **ask a precise question**. Do not fill gaps with invented lore, mechanics, assets or settings.
- Don't ask repeated questions for confirmed decisions. For small obvious fixes, make the best grounded change without friction. Never imply the owner needs technical expertise to justify a concern.
- Treat artwork as authored product design. See `docs/visual_identity.md`. Don't produce generic placeholder AI art and silently call it final.

## Human-readable implementation is mandatory
- Write code for a future human maintainer, not for the fastest text generator. Follow `docs/CODE-STANDARDS.md`.
- Use descriptive names, cohesive modules, understandable control flow, explicit state/data contracts, and comments explaining WHY non-obvious rules exist. Prefer boring readable solutions to clever abstractions.
- Keep UI, simulation, storage and transport concerns distinguishable. Don't create another massive opaque file. The existing sim/UI files are large legacy starting points, **not permission to make them worse**. Refactor gradually with tests; never rewrite wholesale to make the layout prettier.
- Every new nontrivial mechanic needs understandable player-facing wording plus clear rules and focused tests. Update architecture docs for data flow, save formats, APIs or component boundary changes.
- A fresh human should be able to find the entry point, trace one action, understand one combat result, run tests, and know what is still uncertain.

## Every change must be durable
- Work on the correct branch. Prefer a focused branch/PR for risky changes; routine changes to `preview/browser` trigger a live public preview redeploy.
- **For EACH code/config/asset change set, update `docs/PROJECT-STATE.md` and add an entry to `docs/CHANGELOG.md` in the SAME commit.** Update design, decision, architecture, tests and open questions when applicable. No important work should exist only in a chat or ephemeral AI workspace.
- Run focused tests and relevant full checks; verify what was actually run. Inspect diffs for regressions, generated debris, secrets and unintended deletions. Save migrations need extra care.
- Commit and push (or open an appropriate PR), then verify remote HEAD. Separately verify tests and deployment when relevant. **Pushed does not mean tested; tested does not mean deployed; deployed does not mean device-tested.**
- Report: summary, branch, commit link, verified tests, live preview status, remaining risks and next step. If write access is missing or a step fails, state **NOT COMMITTED / NOT DEPLOYED** explicitly and leave reproducible instructions. Never claim success from intention alone.

## Hard boundaries
- Preserve nonstop automatic combat while managing all other systems. No click-to-attack, manual movement or active-skill game conversion without explicit approval.
- `web/src/sim.js` (`SIM_VERSION=4`) is the gameplay engine; changes to player state flow through `doAction`. Preserve deterministic RNG, offline catch-up, save migrations, projections and action validation.
- Browser saves are origin-local (Claude cloud sync works only in its host integration); don't assume old character progress travels to the Railway preview. Never erase or invalidate saves without a tested migration and approval if loss is possible.
- `feature/server-phase1` is an unfinished development-only server branch, not production multiplayer. No claim of secure online play or server authority in current preview.
- The new Godot code on `main` is an incomplete side experiment, NOT an alternative source of game rules. `archive/godot` and `dev` are older action-game directions.
- `fytchx/Arcana` is unrelated production infrastructure. Never edit/deploy Arcana as part of Godscar. Never publish changes or expose secrets without explicit approval.
- The preview URL is publicly reachable; decide whether a change is safe to publish before committing to the auto-deploy branch.
