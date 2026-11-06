# Godscar browser preview

## New experimental Living Arsenal systems lab

**[Open the Living Arsenal V2 lab](https://godscar-browser-preview-preview.up.railway.app/lab/arsenal/)**. This is a separate, opt-in implementation of the new owner-approved weapon-driven autocast progression concept. It does **not** replace the original game served at `/`, does not read its save data, and does not yet reproduce all old systems. Read [lab/arsenal/README.md](lab/arsenal/README.md) and [docs/PROGRESSION-V2.md](docs/PROGRESSION-V2.md) before editing or treating it as a release.


**Contributor onboarding:** read [START-HERE.md](START-HERE.md), [AGENTS.md](AGENTS.md) and [docs/PROJECT-STATE.md](docs/PROJECT-STATE.md) before making any change. The code and design must be clear to human readers, and each source change needs same-commit state/changelog updates.

## Live preview

**Play in your phone's browser:** https://godscar-browser-preview-preview.up.railway.app/

Railway project: `Godscar Browser Preview`; environment: `preview`; GitHub source: `fytchx/Godscar`, branch: `preview/browser`.
This service builds the original `web/src/*` files at startup and redeploys on new commits to the preview branch.

### Verified source identity

At the time this preview was created, GitHub reported the following matching blob SHAs on `web`, `feature/server-phase1`, and `preview/browser`:

- `web/src/sim.js`: `ef6c206b11de6c88c25e9a31badc6c1ac1307c55`
- `web/src/ui.js`: `e6994f1bde2a94e29f7a7351ba28273d3dd77fae`
- `web/src/shell.html`: `b4a4825c4be9f8883bd44d64d8d9c272b47fe04d`

The game page and `/health` endpoint were verified reachable after the first successful Railway deployment. A matching downloadable HTML build is published by [the browser preview tests](https://github.com/fytchx/Godscar/actions/workflows/browser-preview.yml) as a GitHub Actions artifact.

This branch, `preview/browser`, restores **Claude's existing browser game without rewriting the game logic or interface**.

* `web/src/sim.js` is the original deterministic simulation from the `web` branch.
* `web/src/ui.js` and `web/src/shell.html` are the original phone UI.
* `preview/build.mjs` bundles these exact files into `web/dist/index.html` on each preview start.
* `preview/server.mjs` serves this original game with a simple `/health` endpoint and no server-side game logic.

Run locally using Node 22+:

```
npm test
npm start
# Open http://localhost:3000
```

## Important separation

* This is the **browser prototype**. The Godot APK conversion is deliberately **not** used.
* This preview is separate from `fytchx/Arcana`, its Railway services, production site, and account data.
* The Godscar `main` branch is unchanged by changes made only to this preview branch.
* The newer development API is preserved separately on `feature/server-phase1`. It has not been deployed or connected to this preview.
* Browser save data is stored **in the specific browser+origin**, using localStorage. A character saved in the claude.ai artifact or an earlier preview will not automatically appear on this domain. The existing **Build → Export/Import** save code can be used to move progress, if available.
* The original Claude UI only supports Claude-hosted cloud saves via optional `window.claude` integration. It will gracefully run here without that feature. **Do not reset your Claude artifact or old browser saves** while testing.
* This is public-facing prototype code if hosted on a public URL. No login, multiplayer authority, cheat prevention, or protected game progress is implemented in this preview.

The authoritative game source of this preview is still `web/src/`; changes to the game's mechanics should be made there, tested, and only then staged here.
