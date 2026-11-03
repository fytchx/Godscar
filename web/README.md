# Godscar web: idle ARPG prototype

Godscar: a mobile-first idle ARPG where combat never stops.

## Layout
- `src/sim.js`: the whole game simulation. One deterministic event engine drives live play, offline catch-up (24h cap), item verdicts, zone scouting and boss fights.
- `src/ui.js`: the phone UI. It only views and changes state; it never runs combat itself.
- `src/shell.html`: markup and styles.
- `build.py`: inlines both scripts into `dist/index.html`, a single self-contained page.
- `test/balance.js`: headless bot that plays N hours for a class. `node test/balance.js rogue 6`
- `test/browser.js`: Playwright phone-size check (needs `playwright`).
- `test/migrate.js`: v1 save to v2 migration check.
- `test/actions.js`: fuzzes every action with junk input (must never throw or change state when rejected) and checks determinism across processes.

## Build
    python3 build.py   # writes dist/index.html

## What's in v3
Everything a player does goes through `doAction` in `src/sim.js`, the interface a server can later run and verify. On top of v2: the item anatomy from the design doc (base stat by slot, Epic+ enchants, up to 6 affixes, Legendary augments built from rule families), six damage types with their own mechanics (burn, chill, shock, drain, purify), STR/DEX/INT for any class, eleven equipment slots (off-hands, belt, legs, two rings), Ascended set pieces that scale to per-slot Ascension levels fed by monster-specific materials, Scarbound Jewels in socketed belts that evolve all five classes, crafting Common to Legendary, and auto-push retry settings.

Tests: `node test/balance.js <class> <hours>`, `node test/evo.js` (every evolution changes combat; trigger and repeat loops stay bounded), `node test/migrate.js`, `node test/browser.js`.

Not yet: alchemy, the branching passive tree, group content, a server. Saves live in the browser (plus a private cloud copy as a claude.ai artifact), so nothing is cheat-proof yet.
