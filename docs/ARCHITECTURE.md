# Architecture map for the original Godscar browser game

This records what can be established from the repository and identifies where changes belong. See source for exact rules; avoid writing speculative architecture as fact.

## Experimental Living Arsenal lab (feature branch only)
New `lab/arsenal` isolates an early V2 proof-of-concept from the approved browser game. `catalog.mjs` owns small content tables; `engine.mjs` owns deterministic per-character event scheduling and validated actions; `ui.mjs` handles presentation and an independent browser-local test save. No existing `web/src` combat logic is reused by this lab yet, and that is a deliberate scope limitation, **not a statement that the rewrite is production-ready**. When feature branch is exercised, explicit `/lab/arsenal/` routes in `preview/server.mjs` serve it without replacing `/`.

Before integration, evaluate reuse of old class/target/boss and offline rules against new combat events and measure mobile performance.

## Runtime and build
```text
web/src/shell.html  (phone-first HTML/CSS)
       + web/src/sim.js  (game state, deterministic engine, action rules)
       + web/src/ui.js   (DOM rendering, input, save UI)
       |
       v
preview/build.mjs or web/build.py  (inline scripts)
       |
       v
web/dist/index.html  (standalone browser game)
       |
       v
preview/server.mjs  (serves page /health only; NO gameplay server)
       |
       v
Railway: Godscar Browser Preview  (public preview/browser branch)
```

## What each layer is responsible for
- **`web/src/sim.js`:** simulation rules, character and item definitions, deterministic RNG, stats, enemy event scheduling, damage, fight duration, offline catch-up, bosses, projections, migration, action validation. The `doAction` entrypoint is the only intended player-state mutation interface. `SIM_VERSION` currently equals 4.
- **`web/src/ui.js`:** DOM, tabs, game presentation, event handlers, invoking `doAction`, live rendering, projections shown to player, browser save/load, import/export, single-tab lock, conditional Claude-only cloud-save integration. It holds local UI state and some gameplay state for current client prototype; this is **not a server-client separation yet**.
- **`web/src/shell.html`:** current markup, styles, visual surface and inline composition placeholders.
- **`web/test/`:** actions fuzzing/determinism, class-evolution tests, migration, simulated balance and optional Playwright phone view tests.
- **`preview/build.mjs`:** takes the three original source files and injects them unchanged into the shell's placeholders for local/Railway serving.
- **`preview/server.mjs`:** trivial HTTP page server and health endpoint; **does not run multiplayer/game authority**.
- **`feature/server-phase1` branch `server/`:** separate Node + PostgreSQL account/session and authoritative-action prototype; UI is not wired to it. Branch has production restrictions; read its `server/README.md`.
- **`godot/` on `main`:** rejected fidelity-losing native rewrite; not source of current gameplay truth.

## Main data flow in today's browser prototype
1. User chooses a class. `newGame` creates a character with initial combat state.
2. Time progresses through the same deterministic simulation engine in live play, projections and capped offline catch-up.
3. UI renders results and invokes `dispatch(action)`, which advances to the current moment, calls `doAction`, then saves/renders if accepted.
4. Browser localStorage stores a serialized save under `godscar.save.v1`; the client migrates/refreshes older data on hydration. A tab lock helps avoid two active simulations writing the same browser save.
5. On Claude-hosted artifacts only, `window.claude` may allow a separate cloud save. This is not an interoperable Railway account store.
6. The UI includes an export/import mechanism to move a save code manually. Migration and compatibility must be tested for any schema change.

## Rules for changing architecture
- Preserve deterministic behavior and ensure test fixtures make balance/projections reproducible. If sim results change, evaluate `SIM_VERSION`, migration behavior and the server branch contract; document compatibility.
- Do **not** let UI buttons secretly duplicate combat or alter authoritative sim state outside the action path.
- Write explicit input/output shapes and invariants before inventing a new data layer. Document significant boundaries in clear diagrams or short examples.
- Extract modules *incrementally*, keeping the single-file browser build valid, rather than a wholesale rewrite for abstract cleanliness. Keep Node tests and browser presentation working throughout.
- Saving, account creation, anti-cheat and eventual live multiplayer require a different trust boundary. **Client-side progress is not trustworthy for competitive multiplayer.**
- Public preview changes automatically deploy; never assume preview == private development environment.

## Third-party boundaries
`fytchx/Arcana` belongs to a separate product. The existence of existing Railway services for Arcana or unrelated idle game prototypes is not permission to reuse them. Godscar has its own isolated Railway project.
