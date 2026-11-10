# Godscar Living Arsenal prototype

**Status:** Playable, isolated browser prototype at /lab/arsenal/ on the Godscar preview. The original game at / and its save are untouched.

## What is playable

- Continuous deterministic auto-combat in the Greenward, Ashen Crossing, and Bellkeeper's Crypt.
- Leveling, ability conduit unlocks, weapon mastery, deaths and automatic recovery.
- Weapon drops with distinct family attacks, auto-equip, equipment inspection, bag filters, protected Rare reserve, item locking and salvage.
- Weapon rarity refinement, affix choice, charm engravings and compatible supports.
- A Character menu with Equipment, Inventory, Crafting and Materials; Skills is a separate screen.
- A live abbreviated DPS number on the Combat screen.
- Per-browser save and up to four hours of deterministic offline catch-up.

## Data and design boundary

The prototype imports the existing standalone engine, catalog and tests. The interface remains separate from the original game simulation and browser save. All balance values and names in the systems lab are experimental, not final decisions. The prototype is client-side and is not server-authoritative.

The nine equipment positions are the current engine model. The separate /lab/combat/ Character concept still presents the larger 12-position art mockup; do not infer those additional slots are implemented mechanically.

## Code ownership

- engine.mjs: deterministic event-driven combat, loot, progression and item actions.
- catalog.mjs: tunable weapons, hunts, skills, supports and affixes.
- ui.mjs: browser screens and input wiring. Keep presentation separate from mechanics.
- styles.css: phone layout and appearance tokens.
- art.mjs: replaceable original SVG silhouettes and combat visual placeholders.

The original route, old simulation and saves remain unchanged. Future asset replacement should preserve the slot and combat-feedback regions so art can be swapped without rewriting mechanics.
