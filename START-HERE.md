> **Current gameplay-slice override (2026-11-13):** For work on `slice/paladin-defense`, first read [docs/GAMEPLAY-RESUME.md](docs/GAMEPLAY-RESUME.md). The older `preview/browser` website and `SIM_VERSION=4` instructions below are historical **for this slice**. The actual sim here exports version **7**. Current Fight UI: `fytchx/Godscar-playtest@ui/fight-skeleton` (mock data; integration not yet authorized).

# START HERE | Godscar continuity guide

## Current direction
The selected starting point is the illustrated combat screen paired with the phone-first Character menu shown in the approved references. Combat is the home view; Character opens to Equipment, with Inventory, Crafting, and Materials tabs. Preserve the pixel-art arena, monster focus, subtle auto-attack bar, small abbreviated DPS at lower right, and the screen's style controls.

The website root **/** serves this presentation. Former **/lab**, **/lab/combat/**, and **/lab/arsenal/** pages redirect to root. They must not be treated as competing versions.

The current presentation still uses sample data. Do not attach the older engine, menus, saves, or balance values by default. The earlier **web/src/** simulation is preserved reference code, not the website's current UI. The custom Godot rewrite on **main** was rejected.

## Before changing anything
1. Confirm repository: [fytchx/Godscar](https://github.com/fytchx/Godscar).
2. Confirm active preview branch: [preview/browser](https://github.com/fytchx/Godscar/tree/preview/browser); verify its commit and Railway deployment.
3. Read [AGENTS.md](AGENTS.md), [docs/PROJECT-STATE.md](docs/PROJECT-STATE.md), [docs/DECISIONS.md](docs/DECISIONS.md), [docs/DESIGN-INTENT.md](docs/DESIGN-INTENT.md), [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/CODE-STANDARDS.md](docs/CODE-STANDARDS.md), [docs/WORKFLOW.md](docs/WORKFLOW.md), [docs/CHANGELOG.md](docs/CHANGELOG.md), and [docs/OPEN-QUESTIONS.md](docs/OPEN-QUESTIONS.md).
4. Inspect the actual current screen code and active branch. Do not infer that a mockup's sample numbers are game rules.

## Current preview
[Open Godscar](https://godscar-browser-preview-preview.up.railway.app/)

The site presents combat + Character as the chosen starting surface. It is not yet a complete gameplay loop: sample combat, items, crafting, and materials are not simulation-backed. Earlier browser simulation source remains available for deliberate reuse after the target behavior is agreed.

## Version boundaries

| Area | Status |
|---|---|
| preview/browser | Active website preview: combat + Character direction at root |
| web/src/* | Preserved earlier simulation/UI source; no longer served at root |
| lab/combat/* | Current screen implementation and its explicit asset routes |
| lab/arsenal/* | Historical experimental shell/engine; not served as a page |
| main / Godot rewrite | Rejected direction; historical only |
| Git history | Recovery/archive for prior versions; not another public site route |

## Working rules
- Keep the selected combat + Character direction visible while iterating.
- Separate presentation changes from game-rule and save changes.
- Never silently combine old engines, old screens, or old saves with the current prototype.
- Keep code understandable and project-state/changelog updates in the same change.
- Review the deployed commit and phone layout after preview changes; never call sample UI a connected game system.
