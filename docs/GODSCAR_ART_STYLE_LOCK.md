# GODSCAR - LOCKED ART DIRECTION
Selected by project owner: 31 October 2026. **Do not change direction without explicit approval.**

## Definitive in-game reference
- The REAL asset library rendered in the Android Art Gallery as of Godscar dev Build #49.
- Repo: `assets/godscar_environment/` (197 base environment assets)
- Next expansion: `assets/godscar_expansion/` (728 sprites, source 12 AI art sheets).
- This is the exact art design the user praised and explicitly requested that we expand. **Do not substitute a random illustration style, isometric wallpaper, washed-out cartoon art, or another abstract concept sheet.**

## Recognizable characteristics
- Stylized hand-painted / pixel-adjacent **2D** dark-fantasy sprites; readable shapes, warm Caldris vegetation and wood, heavy slate/gray masonry, muted moss, ochre wheat and dark dungeon stone.
- Consistent softly lit **three-quarter top-down** artwork and subdued textures, with selective crisp detail. No photoreal 3D models.
- Signature Godscar scar-red crimson and rift-light used **specifically** in corrupted regions and occult structures, not indiscriminately on every building.
- Individual reusable sprites on transparent PNG, scene composition through layered assets over separately tiled terrain.
- **Seam-checked v1 128×128 ground textures** stay the base. v2 ground images become overlays unless tested. Separate colliders/occlusion from visuals.
- World design: broad 2D maps with varied directions and branches, **not** a vertical hallway. Portrait camera zoom, character size/orientation and physics will be chosen after asset library expansion.

## Production order (explicit)
1. Broaden the existing asset library massively while keeping this exact style.
2. Decide camera view scale and character orientation in portrait on Android.
3. Develop seeded, validated modular procedurally generated instances inspired by Diablo III's crypts/dungeons and Greater Rifts.
4. Build story starting zone using the validated systems.
Competitive build optimization, loot hunting, Ascended gear and leaderboard progression are the game's primary focus; story explains the world.

## Art packaging status
- v1: 197 environment sprites in `assets/godscar_environment/`, already imported.
- v2: 728 isolated review sprites in a verified <10MB indexed PNG import ZIP (must be uploaded to `art/Godscar_Expansion_v2_UPLOAD_TO_GITHUB.zip` to be imported).
- Original high-color images and 12 full unmodified source art sheets are preserved in the separate master archive. Import ZIP is color-indexed for small APK sizes. Preserve the master archive; do not misrepresent reviewed cutouts as final modular tiles.
- Per-sprite status from manifest: candidate, not seam/physics-approved. Actual game atlas/gallery can display them now; game design approval follows device checks.
