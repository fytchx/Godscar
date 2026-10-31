# Godscar web: idle ARPG prototype

The browser direction for Godscar: a mobile-first idle ARPG where combat never stops. Everything in this folder is separate from the Godot project in the rest of the repo, and this branch does not trigger the Android build workflow (it only runs on `main` and `dev`).

## Layout
- `src/sim.js`: the whole game simulation. One deterministic event engine drives live play, offline catch-up (24h cap), item verdicts, zone scouting and boss fights.
- `src/ui.js`: the phone UI. It only views and changes state; it never runs combat itself.
- `src/shell.html`: markup and styles.
- `build.py`: inlines both scripts into `dist/index.html`, a single self-contained page.
- `test/balance.js`: headless bot that plays N hours for a class. `node test/balance.js rogue 6`
- `test/browser.js`: Playwright phone-size check (needs `playwright`).
- `test/migrate.js`: v1 save to v2 migration check.

## Build
    python3 build.py   # writes dist/index.html

## What's in v2
Five classes, each with a primary ability that never stops and a class spell. A 3 offensive + 2 utility autocast bar with cast conditions. Items that change the primary ability. Specializations at level 10 (15 total). Passive points. Two zones (the Fallfields and the Ashen Hollow). Spell-granting rares. Scar Shards for upgrades. Ember/Ash/Rift essences for inscribing spells. Reforging. Boss fights that run on a snapshot of the build while farming continues.

Not yet: alchemy, dungeons, a server, multiplayer. Saves live in the browser (plus a private cloud copy when run as a claude.ai artifact), so nothing here is cheat-proof.
