# Godscar browser preview

## Current website direction

**[Open Godscar](https://godscar-browser-preview-preview.up.railway.app/)**. The root page is the selected phone-first combat screen paired with the Equipment-first Character menu. It keeps the illustrated enemy arena central, the auto-attack bar subtle, and the compact DPS counter in the lower right. Character includes Equipment, Inventory, Crafting, and Materials.

The older **/lab**, **/lab/combat/**, and **/lab/arsenal/** page routes redirect to **/** so there is one visible version to review. The combat and Character screens remain a presentation prototype: combat values, inventory, recipes, crafting, materials, and saves are not connected to the preserved simulation.

## Source and preview

- Repository: [fytchx/Godscar](https://github.com/fytchx/Godscar)
- Active preview branch: **preview/browser**
- Railway project: **Godscar Browser Preview**; environment: **preview**
- Root screen: **lab/combat/index.html**
- Screen assets: **lab/combat/**, exposed through a fixed allowlist in **preview/server.mjs**
- Earlier simulation source: **web/src/**, retained as reference and independently tested; not served at root.
- Earlier interface/engine experiments: retained in repository history; not public routes.

Read [START-HERE.md](START-HERE.md), [AGENTS.md](AGENTS.md), and [docs/PROJECT-STATE.md](docs/PROJECT-STATE.md) before changing the project. Keep this page and docs aligned with the actual deployed commit.
