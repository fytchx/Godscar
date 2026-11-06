# Godscar: The Living Arsenal

**Status:** experimental browser-first vertical slice, served at `/lab/arsenal/` from the separate Godscar preview. Open https://godscar-browser-preview-preview.up.railway.app/lab/arsenal/. The original browser game remains at `/`.

This prototype explores a Grim Dawn-inspired equipment and loot loop inside a continuously running browser idle ARPG. It has its own event-driven simulation and browser-local save key, `godscar.living-arsenal.lab.v2`; it does not read, migrate, or overwrite the original game save.

## Playable systems

- Four weapon families, each changing the automatic primary attack and granting a weapon-bound art: sword, dagger, wand, and mace. Weapon-family hit mastery persists through swaps and gives a small capped damage bonus.
- Five automatic power conduits unlock at levels 2, 5, 10, 18, and 30. Mastery and charm-engraved powers can be assigned without pausing combat; three support effects modify compatible skills.
- Nine equipment slots: main hand, off hand, helm, chest, gloves, boots, belt, ring, and charm. Gear affixes change damage, speed, health, armor, or find rate; two Ashen Warden pieces grant a set armor bonus.
- Three selectable hunts: Greenward Verge, Ashen Crossing, and Bellkeeper's Crypt. The crypt is a named boss encounter with guaranteed crafting marks on victory.
- Loot in white, magic, and rare tiers; equip, lock, salvage, and refine the equipped weapon with a chosen property. Engrave a charm to unlock additional automatic powers.
- A 12-slot bag and a 5-slot rare reserve protect overflow. If both fill, equipment rolls pause while combat, XP, and materials continue.
- Scrap, seals, and sigils come from combat and boss kills. Offline catch-up is capped at four hours for this experiment.
- Browser layouts keep the fight visible on wide screens and reorganize tabs for narrower screens. The UI uses authored CSS and inline SVG scene art; no external image or font assets.

## What this proves and what it does not

This is a meaningful systems prototype, not a complete game or final balance pass. Content names, drop rates, scaling, unlock levels, skills, weapon numbers, art, and pacing remain provisional. It does not include final classes, a full campaign, a large affix pool, endgame uniques, a server-authoritative economy, accounts, multiplayer, or device-tested long-session performance. There is no simulated gear comparison score; inspect affixes and weapon behavior before equipping.

The original game's existing browser save is intentionally separate and untouched. Experimental progress is stored locally in this browser origin and will not transfer between Claude artifacts or other domains.

## Run and verify

```bash
node lab/arsenal/tests.mjs
npm test
npm run build
```

The preview route is allowlisted by `preview/server.mjs`. The focused workflow smoke checks `/`, `/lab/arsenal/`, its engine module, and stylesheet.
