# Godscar Art Expansion v2

**This pack contains 728 new genuine transparent PNG sprite candidates cut from 12 original source sheets.** It expands the 197 assets in Godscar Environment Pack v1, for **925 total environment assets**.

## Folders

- `sprites/`: 728 individual RGBA PNGs organized by category.
- `source_sheets/`: the 12 original AI art sheets, preserved unmodified for quality recovery.
- `asset_manifest.json`: original source location, pixel dimensions, category, pivot, SHA-256, QA state and collision candidates for every sprite.
- `ASSET_INDEX.csv`: compact spreadsheet-friendly catalogue.
- `atlases/`: six 2048 x 2048 packed texture atlases and `atlas_index.json`.
- `tools/extract_assets.py`: source-to-sprite deterministic extraction (Pillow, numpy, OpenCV).
- `tools/build_atlases.py`: individual-sprites-to-atlas deterministic packer (Pillow).
- `godot/`: art-gallery scene and script, meant to live under `res://scenes/` and `res://scripts/` respectively in Godscar.
- `previews/`: representative category contact sheets, for inspection.

## Review versus production

**All 728 newly cut PNGs are review candidates.** They *are actual images Godot can render*, but some source objects overlap and several densely packed foliage pieces are partial or have isolated decorative fragments. The generator cannot reliably turn nearby cutouts into art-approved modular joins without visual cleanup.

- v1's **44 seamless ground textures remain the default repeatable flooring**.
- v2 `ground_overlays/` and `decals/` should be placed *on top of* ground, not tiled as seamless textures.
- v2 walls/arches/props do NOT yet have guaranteed compatible joins.
- No collisions, occlusion boundaries, lighting layers or actual character scale have been finalized.
- **Never use AI's transparency mask as a physics collider.** Use a conservative physical footprint, e.g. tree trunk not canopy.

## In-game Godot usage

After GitHub imports, paths are:

- `res://assets/godscar_environment/`: existing validated v1 assets (197).
- `res://assets/godscar_expansion/sprites/`: new sprites (728).
- `res://assets/godscar_expansion/asset_manifest.json`: searchable manifest.
- `res://assets/godscar_expansion/atlases/`: optional packed atlases.

The preview scene is `res://scenes/environment_expansion_gallery.tscn`, and the controller is `res://scripts/environment_expansion_gallery.gd`. It samples actual sprite PNGs and flooring from v1. It is for *art evaluation*, not a final camera, procedural generator or complete playable level.

## How we use this for Godscar

1. Expand and QA our texture/sprite library [this phase].
2. Choose camera zoom, viewing angle, character feet anchor and sprite proportions on portrait Android.
3. Build **Diablo III-inspired modular procedural dungeons**, with seeded layout generation, connected doors and reachability validation.
4. Only then build the starting-zone instances using the same art and collision rules.

No fixed narrow vertical corridor or fake 3D scenes. Story is secondary; loot grinding and endgame competition are the design priorities.

## Rebuilding

```
pip install pillow numpy opencv-python-headless
python tools/extract_assets.py
python tools/build_atlases.py .
```

Assets currently have transparent 3-pixel padding, with pivots tagged but not baked into texture coordinates. The original 12 source PNGs in this ZIP are required to rerun extraction.
