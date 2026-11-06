# Godscar

> **IMPORTANT: This GitHub default branch (`main`) is NOT the current playable Godscar direction.**
>
> The owner approved returning to **the original browser idle ARPG**. The authoritative current work, live preview and complete contributor handoff are on **[`preview/browser`](https://github.com/fytchx/Godscar/tree/preview/browser)**.

## Start here

- **[READ START-HERE.md on the active branch](https://github.com/fytchx/Godscar/blob/preview/browser/START-HERE.md)**
- **[AI and human contributor rules](https://github.com/fytchx/Godscar/blob/preview/browser/AGENTS.md)**
- **[Current project state](https://github.com/fytchx/Godscar/blob/preview/browser/docs/PROJECT-STATE.md)**
- **[Human-readable coding standards](https://github.com/fytchx/Godscar/blob/preview/browser/docs/CODE-STANDARDS.md)**
- **[Decisions, design intent and workflow](https://github.com/fytchx/Godscar/blob/preview/browser/docs/WORKFLOW.md)**
- **[Play the original Godscar browser game](https://godscar-browser-preview-preview.up.railway.app/)**

### Why is there a Godot project here?
An earlier AI-driven conversion reproduced only part of the browser game's functionality and substituted an incomplete interface. Despite build tests passing, **the owner rejected this version as unfaithful**. The `godot/` files here are retained as historical/experimental work, NOT the baseline for future features. Do not automatically export, rewrite, merge or deploy them.

### Current game in one sentence
A mobile-first dark-fantasy idle ARPG where your hero automatically fights forever while you manage loot, builds, spells, progression and bosses.

### Branch map
- **`preview/browser`**: ACTIVE original browser game + isolated Railway preview; updates here automatically deploy.
- `web`: preserved original browser reference.
- `feature/server-phase1`: unconnected development-only server/API experiment.
- `main`: incomplete Godot rewrite; not the intended gameplay baseline.
- `archive/godot`, `dev`: older manual-movement action prototypes.

**If you are an AI connected to this repository:** immediately checkout `preview/browser`, read its `AGENTS.md`, `START-HERE.md`, project state, decisions, design intent, coding standards, architecture and workflow. Don't change the game from `main`. After every coherent update, commit source + project state + changelog together; test, verify deployment and give an honest handoff.

Arcana (`fytchx/Arcana`) is a separate product and must not be modified or deployed as part of Godscar.
