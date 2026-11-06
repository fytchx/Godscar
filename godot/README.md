# Godscar: native Godot port (new idle ARPG only)

Open this folder in **Godot 4.3+** using **Import > project.godot**, then run the main scene. Supports touch and mouse, portrait 540 × 960 layout. This is the **new** Godscar continuous-combat game, not the abandoned 0.3 action-controls prototype on `archive/godot`.

## Current implementation

- Native GDScript idle simulation and native Control-based UI.
- Five classes, class spells, passive talents, level-10 specializations and attributes.
- Continuous automatic combat, respawns, stage unlocks, auto-push, boss sigils, 150-second boss challenges, six damage types with status effects.
- Two zones, eight normal monster types and two bosses.
- Equipment drops, rarities, affixes, enchants, legendary augments, Ascended sets, crafting, upgrades, salvage, conditional spells and a 36-item bag.
- Rare Scarbound Jewels and class evolution modifiers, limited by socketed-belt availability.
- Autosaves to `user://godscar_save.json` every 12 seconds and on application pause. Up to 24 hours of offline simulation on reload.
- No dependence on HTML, JavaScriptBridge, WebView, or the archived action-prototype scripts.

## Source-of-truth and accuracy notice

`web/src/sim.js` (SIM_VERSION 4) is the **reference implementation** for detailed rules. This Godot code is an initial **native port**, **not yet validated for feature/seed parity** with the browser implementation. It does not claim full equivalence.

Differences still needing parity work: exact Mulberry32 RNG and deterministic projections, accurate ring/offhand edge cases, equipment socket creation/removal, reforge/inscription controls, all loot naming and class-evolution details, boss reward probabilities, six-essence crafting menus for all slots, full offline edge-case testing, and save migration from v3 browser saves. Visual art is placeholder vector work drawn natively rather than imported final art; the official logo kit has not been incorporated.

**Do not import a browser save into this Godot build.** The Godot save is independent and its version field is specific to this port. Browser code and saves have not been modified.

## Testing

The project has a native smoke script (`scripts/smoke_test.gd`). Run from Godot CLI:

```sh
godot --headless --path godot --editor --quit
godot --headless --path godot --script res://scripts/smoke_test.gd
```

The root repository's Node tests still test the reference JavaScript implementation, **not** the native one. Android exports require Android export templates and signing configuration.

## Next priorities

1. Pass the native Godot smoke/parse checks, then phone-device testing.
2. Build parity fixture tests comparing the reference JS outcomes with Godot using fixed content and test seeds.
3. Finish missing inventory, forging and spell-condition screens.
4. Replace vector placeholders with approved Godscar assets.
5. Keep combat authoritative on a future server. Current Godot saves are local and **not cheat-proof**.
