# Godscar browser preview

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
