# Godscar combat screen concept

A phone-first presentation of continuous browser-idle combat with a Character menu layered over the same screen.

- Path: `/lab/combat/`; `/lab` redirects here.
- The player's name and health appear above a subtle weapon auto-attack cast bar. There is no equipped-weapon card and no player-character sprite.
- The character button opens a full-screen Character menu with Equipment, Inventory, Crafting and Materials tabs. Equipment is the first tab. The menu overlays the fight instead of navigating away, so the combat preview timers and session counter continue underneath it.
- Character appearance controls adjust scale, item size, spacing, corner radius and accent colour through isolated CSS tokens. These presentation preferences use the `godscar.character-preview.*` storage namespace and never touch a game save.
- Active inscription timers are compact rows in the arena's upper-left. Their element-colored progress lines fade toward the right edge.
- A compact, abbreviated damage-rate number sits in the arena's lower-right. Its detailed breakdown remains in Session Details. The auto-attack progress line uses a muted color and no glow.
- The centered monster placeholder remains the focus. Sample melee strikes flash sharply; fire casts ember effects; poison ticks drip green; bleed ticks drip red. The attack numbers and all results are illustrative.
- XP, material and kill totals share a compact row. The session details button opens total DPS and ranked direct-hit/DoT damage totals with a manual reset.
- The launch recap closes via button or outside tap. Layout/effects preferences are stored under isolated `godscar.combat-preview.*` keys in this browser.
- This route does not use the game simulation or touch a game save.
- Equipment, inventory, crafting recipes, material counts and character stats in the Character menu are visual sample content; actions do not spend items or change equipment.

The monster art remains a replaceable placeholder. Character gear illustrations use the current Godscar art pack in a small sprite atlas; source artwork is still concept art rather than production-approved game art.
