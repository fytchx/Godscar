# Godscar environment expansion v2
**Status: imported and SHA-verified on dev, 2026-10-31.**

The 197-piece v1 environment asset library is preserved under `assets/godscar_environment/`.
The 728 new v2 transparent sprite candidates are now committed under `assets/godscar_expansion/sprites/`, plus six generated atlases and the catalogue.

- Original indexed-PNG import archive: `art/Godscar_Expansion_v2_UPLOAD_TO_GITHUB.zip`
- Verified workflow: `https://github.com/fytchx/Godscar/actions/runs/41201983092`
- Expanded gallery: `scenes/environment_expansion_gallery.tscn`
- From the Android game menu: **ART GALLERY → EXPANDED ART LIBRARY**.

## Current quality gate
The manifest lists the 728 objects as `review_candidates`, not production-approved modular tiles. Scene/camera scale, seamless connections, collision footprints and 4GB-phone performance still require visual QA.

The 197-piece base pack remains the source of seam-tested terrain. Use v2 ground pieces as overlays until tested.

## Locked art and development sequence
Keep the precise in-game art direction documented in `docs/GODSCAR_ART_STYLE_LOCK.md`. First finish asset QA, then camera perspective and character orientation, then modular Diablo-inspired procedural dungeons, then the starting zone. `main` stays unchanged.
