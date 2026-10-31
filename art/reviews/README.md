# Godscar art review, owner ratings (31 Oct 2026)

## Source of truth
The file `v2_2026-10-31.json` records the first complete owner-reviewed A/B/C vote for all 728 v2 sprites. It is keyed by **stable asset ID**, not just a page number. The included one-based B/C index lists preserve the exact compact A/B/C report.

- A = 598 keep: visually liked; **not yet certified for tile seams, animation or collisions**.
- B = 128 fix: preserve and flag; causes are not individually specified.
- C = 2 reject: archive source, exclude from auto-assembled preview scenes.
- v1 = 197 assets **not rated**; do not silently assign an A.

## Highest priority repair batch
All 84 sprites (manifest indexes 222..305) originating from `dark_fantasy_terrain_tileset_atlas.png` are B. Inspect the source atlas and reslice/rework the whole family, rather than interpreting these votes as 84 independent failures. Do not auto-approve them after machine cleanup. Test edges on both light and dark backgrounds for matte halos.

Remaining 44 B votes: 14 stone architecture, 21 village, 3 crypt, 6 vegetation. Two rejected decals are #78 and #82.

## In-game result
`scenes/environment_expansion_gallery.tscn` reads the curated JSON. Example biomes use A-rated sprites only; the catalogue can toggle ALL/A/B/C and identifies sprites by their original one-based number. Godscar's A/B/C Judge on the phone retains local votes separately until intentionally copied.

## Next step
Visual halo/crop cleanup, with before/after verification of affected IDs. Never modify 197 seam-checked base textures merely because the expansion needs fixing. Commit changes only to `dev`; keep the agreed art direction.
