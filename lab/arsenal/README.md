# The Living Arsenal playable systems lab

**Status:** experimental V2 *vertical slice*, not a complete redesign or a release. Source: original Godscar browser repository, branch preview/browser.

Open at /lab/arsenal/ on the separately hosted Godscar browser preview after the feature branch is reviewed and merged. It has **no connection to the current original browser save**, using its own localStorage key.

## Files
- catalog.mjs: explicit, human-readable white-weapon, hunt, skill and support definitions
- engine.mjs: pure seeded combat/event engine, level-up and resource rules, crafting and validated actions
- ui.mjs: phone-first presentation and action dispatch, no combat formulas
- styles.css: warmer fantasy palette, no new approved artwork/logo
- tests.mjs: deterministic engine/progression and no-trap regression tests

## Current implementation
- Three White weapons with different always-on primary attacks and Fire Wand burn
- Character level unlocks 1–5 extra conduits at provisional levels 2/5/10/18/30
- Mastery skills: Ember Brand, Aegis Pulse, Spirit Hawk
- Item-engraved skills: Frost Lance and Blood Mark
- Supports: Lingering, Echo, Siphon with tag-validation and resource cost
- Always available Greenward hunt and harder Ashen Crossing at level 5
- Every kill earns XP and Scrap; tougher runs earn Seals and Sigils faster
- Sword, Dagger and Wand mastery survives equipment switching
- White→Magic→Rare item refinement with chosen focus, charm engraving, salvage and item swapping
- Separate bounded 12-slot bag + 5-slot Rare reserve. When both fill, new item rolls pause instead of silently destroying protected finds; XP/materials continue
- Limited catch-up; no global server tick or multiplayer authority

## Not implemented / not to overclaim
- Full PoE-like affix pool or endgame Unique items and boss campaigns
- Classes, skill tree, advanced/mastery crafting, final region progression, respec tree
- Real online server, account persistence, security, anti-cheat, balanced economy
- Real gameplay integration with the original browser game's UI or simulation
- Proven multi-hour offline mobile performance or polished artwork
- Save migration (owner confirmed prototype progress may be reset; older original save stays untouched)

## Reproduction
Run:
  node lab/arsenal/tests.mjs
Run the original web tests separately:
  npm test
  npm run build

For development, use the existing preview server after registering the /lab routes. Avoid touching Arcana.
