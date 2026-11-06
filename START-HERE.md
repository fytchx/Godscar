# START HERE | Godscar continuity guide

Godscar's GitHub repository is the durable project memory. If you have never seen this game before, this file is enough to find the right branch and read the actual context **before** proposing changes.

## DO THIS FIRST
1. Confirm repo: **`fytchx/Godscar`**. The currently approved, faithful game is branch **[`preview/browser`](https://github.com/fytchx/Godscar/tree/preview/browser)**.
2. The default branch `main` currently contains an incomplete **Godot remake that the owner rejected**. Do not begin development from its Godot code. If you landed on `main`, switch to `preview/browser`.
3. Read, in order:
   - [AGENTS.md](AGENTS.md) (mandatory operating rules)
   - [docs/PROJECT-STATE.md](docs/PROJECT-STATE.md) (current verified status, next tasks and handoff)
   - [docs/DECISIONS.md](docs/DECISIONS.md) (decisions and rejected directions)
   - [docs/DESIGN-INTENT.md](docs/DESIGN-INTENT.md) (game's identity, what to clarify)
   - [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) (system map)
   - [docs/CODE-STANDARDS.md](docs/CODE-STANDARDS.md) (human-readable implementations)
   - [docs/WORKFLOW.md](docs/WORKFLOW.md) (how to commit, test and update the preview)
   - [docs/CHANGELOG.md](docs/CHANGELOG.md) (most recent actual changes)
   - [docs/OPEN-QUESTIONS.md](docs/OPEN-QUESTIONS.md) (what is still unconfirmed)
4. Inspect relevant source code and tests. A document is not evidence that a feature really works. Verify current HEAD, CI and deployed revision separately.

## See the game before changing it
**Live original browser game:** https://godscar-browser-preview-preview.up.railway.app/

This is a mobile-first dark-fantasy idle ARPG: combat NEVER stops as the player manages everything else. The owner specifically confirmed this browser version feels like the Godscar they were building with Claude; the rushed Godot/APK rewrite did not.

**Source:** `web/src/sim.js` for combat, items, progression, deterministic simulation, bosses, actions, offline catch-up; `web/src/ui.js` for interaction; `web/src/shell.html` for structure/style; `preview/` for web preview packaging; `web/test/` for validation.

## Branch map (verify before using)
| Branch | Purpose | Safe to build on? |
| --- | --- | --- |
| `preview/browser` | **ACTIVE**, original Claude browser game and Railway preview | Yes, following workflow and auto-deploy caution |
| `web` | Original saved browser baseline | Reference; don't casually rewrite |
| `feature/server-phase1` | Server-authoritative API and account scaffold, locally incomplete | Research/isolated future development only |
| `main` | Historic incomplete native Godot port and APK workflow | NO for current game development; documentation pointer only |
| `archive/godot`, `dev` | Older joystick/manual-skill action prototypes and art | Historic research only, not current gameplay |

## Working philosophy
Build what the owner *actually wants*, not what a model guesses would be impressive. Explain constraints, point out when an idea doesn't fit nonstop combat or current scope, and ask on ambiguous major design decisions. Favor incremental work, visible tests, clear documentation and code a human can maintain.

Every change needs a GitHub commit **and** a durable project-state/changelog update. Otherwise the next session cannot trust that work happened.

## What is not yet solved
- This preview is not an online multiplayer service. Browser storage is local to each site origin.
- Claude's optional cloud-save integration doesn't automatically sync to this domain. Use the game's existing **Build → Export/Import** save flow when available; never promise automatic transfer.
- The server branch is not connected or production-safe. Original logo assets are documented but not confirmed integrated.
- Confirm whether any later Claude-only artifact changes exist before claiming GitHub represents the very latest work.

**First useful continuation:** inspect the live game with the owner, record any discrepancies from their latest Claude artifact, then plan and test precise incremental fixes.
