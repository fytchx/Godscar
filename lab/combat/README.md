# Godscar combat screen concept

A compact, phone-first presentation of continuous browser-idle combat.

- Path: `/lab/combat/`; `/lab` redirects here.
- The player's name and health appear above a subtle weapon auto-attack cast bar. There is no equipped-weapon card and no player-character sprite.
- Active inscription timers are compact rows in the arena's upper-left. Their element-colored progress lines fade toward the right edge.
- The centered monster placeholder remains the focus. Sample melee strikes flash sharply; fire casts ember effects; poison ticks drip green; bleed ticks drip red. The attack numbers and all results are illustrative.
- XP, material and kill totals share a compact row. The session details button opens total DPS and ranked direct-hit/DoT damage totals with a manual reset.
- The launch recap closes via button or outside tap. Layout/effects preferences are stored under isolated `godscar.combat-preview.*` keys in this browser.
- This route does not use the game simulation or touch a game save.

Final monster and effect art remains replaceable after the owner supplies approved assets.
