# Godscar combat screen concept

A phone-first, presentation-only view of continuous browser-idle combat.

- Path: `/lab/combat/`; `/lab` redirects to it.
- The player's name, health, equipped weapon and automatic inscriptions appear above the monster scene; no player-character sprite is shown.
- A small authored SVG beast silhouette is a replaceable placeholder. Hit numbers, events, monster turnover, session totals, rewards and offline catch-up are sample animation, not actual game results.
- Session damage ranks each source and can be manually reset.
- The launch recap closes via its button or tapping outside.
- Customize reorders or hides panels, with combat fixed. Reduced effects and layout preferences are stored under `godscar.combat-preview.*` in this browser only.
- No game simulation or game save is imported or modified.

Wire to live simulation state only after review and an agreed data contract.
