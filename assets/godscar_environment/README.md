# Godscar Environment Pack v1

This ZIP contains **real raster PNGs**, alpha transparent sprites, *seamlessly tileable* 128px materials, side-mask transition tiles, decals, and original art sources. This is an experimental asset pack for the Godscar Godot 4 project.

## What's genuinely usable
- 11 material types x 4 variants = 44 material tiles. Variants for one type have identical edge boundaries, so they can join without seams.
- Four overlay families x 16 NESW masks = 64 transparent transition sprites.
- Eight decal types x 5 variants = 40 transparent decorative overlays.
- 36 standalone high-detail object/environment cutouts from original image sheets + a separate small modular wall set.
- Two PNG atlases, SHA-256 manifest, and a Godot demo project you can open or copy into your existing project.

## Limitations (important)
- Sprite cutouts remain **review candidates**. Some original AI art sheets contain neighboring objects; automated connected-component cleanup may remove tiny intentional details or retain artifacts.
- Generated terrain is seamless but there is still **no certified hand-painted terrain autotile system**. NESW overlays are intended for a rules-driven map brush.
- Tree / fence / wall game hitboxes are initial footprint approximations; validate gameplay collision and occlusion in Godot.
- No genuine multi-frame hero/enemy animations are provided. The art-direction reference sheet includes illustrated classes and monsters but those are not polished spritesheets.
- Full scene lighting and low-end 60 FPS need an APK performance test.

## Recommended Godot defaults
- Sprite2D.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST (try linear if deliberately using softer painted art).
- Use static colliders only for trunks, big stones, walls, gates, buildings.
- Use y-sorting based on feet and occlude/fade canopy/roof layers if character passes behind.
- Separate terrain from collision, batch props by chunks, and keep distant AI unloaded.

## Folder structure
- textures/terrain: repeatable 128px materials with numbered variants
- textures/transitions: transparent NESW edge overlays
- textures/decals: non-colliding visual detail
- sprites/: isolated alpha objects, environment props, structures, flora
- atlases/: 128px texture grids
- source_originals/: original unmodified AI-generation sheets to preserve source provenance
- godot_demo/: self-contained example Godot project with click-to-run demo scene
