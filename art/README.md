# GODSCAR: asset production pipeline

## Source of truth
- Branch: `dev` (leave `main` stable).
- `art/asset_manifest.json` lists the source-sheet crop definitions and candidate collision hints.
- `art/source_sheets/` is for original *unaltered* transparent artwork. These originals MUST be committed before the full batch can be rebuilt from GitHub alone.
- `assets/art_review/` contains transparent review sprites, NOT necessarily seamless or game-ready.
- Production-approved work will live separately in `assets/tilesets/`, `assets/props/`, `assets/characters/` with Godot import settings and scene definitions.

## Status of batch 01
Four original source sheets were generated in the project conversation. The batch was extracted into **36 individual candidate sprites** and a preview/archive for review. **The full-resolution sources and 36 crops are currently supplied in the conversation archive, not yet uploaded to GitHub.** One small quantized wall sprite is committed directly under `assets/art_review/fallfields/` as the initial binary proof of storage.

Do NOT mistake the preview sheet for a tileset. Some crops include stray neighboring pixels or inconsistent margins. No source image should be deployed as a finished map tile without QA.

## Rebuild
1. Add unchanged source files listed by `art/asset_manifest.json` into `art/source_sheets/`.
2. `pip install pillow`
3. `python tools/build_art_assets.py`
4. Inspect candidate cutouts and reject artifacts with spillover, lighting mismatches, or unclean alpha.
5. Build modular joins (straight, corner, T, end, door), align pivots, and test seams.
6. Only then promote vetted sprites to the production assets area.

## Godot and performance conventions
- Strict 2D world space, consistent three-quarter top-down camera/pixel-density.
- World modules are 2D interconnected rooms, outdoor clearings and passages, not a forced north-south hallway.
- Fixed gameplay collision separate from visible art. Walls block by footprints; tree trunks collide, canopies do not; distant scenery has neither physics nor AI.
- Use static/chunked art, active-neighborhood enemies, occlusion where useful, and atlas batching after size tests on a 4GB Android.
- Red Blight cracks use the approved Godscar crimson, not generic fire colors.
- For competitive endgame, validate dungeon traversability, connection sockets, spawn safety and layout fairness via seeded tests.

## Completion gate per asset
Transparent alpha; no neighboring object contamination; scale and perspective checked; intended collision and occlusion documented; no tile seam; Android 60 FPS benchmark supported; SHA recorded.
