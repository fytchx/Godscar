# Installing these assets in the main Godscar Godot repo

1. Copy `textures/`, `sprites/`, `atlases/` and `asset_manifest.json` to `res://assets/godscar_environment/`.
2. Texture references become `res://assets/godscar_environment/textures/terrain/farm_dirt_00.png`, etc.
3. Do NOT copy the included `project.godot` over the existing game's project.godot.
4. Use the sample `godot_demo/gallery.gd` only as a visual import test; do not replace `scripts/arena.gd` or `scripts/fallfields.gd` without merging.
5. Connect wall module boundaries in a map editor before using them in endgame dungeon generation.
6. Collisions should be added to Godot static bodies based on verified footprints, not inferred from the PNG alpha alone.
