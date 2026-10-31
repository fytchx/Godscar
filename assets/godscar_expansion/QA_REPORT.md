# Godscar Art Expansion v2: validation

- 12 original source sheets included and unmodified.
- 728 RGBA PNG cutouts.
- Every sprite has empty transparent outside edges, nonempty alpha, exact recorded dimensions and a SHA-256 checksum.
- Six 2048x2048 atlas pages generated; asset positions saved to atlas index.
- No manual physics / seam verification of newly generated objects.
- Known limitations: partial foliage islands, neighboring props in dense sources, slightly varying simulated 3/4 perspective, painterly detail at mobile scale.
- **Playable floor materials remain the seam-checked v1 textures.** New v2 ground pieces are *decal overlays*, never assumed seamless.
- Mobile APK framerate is untested with these new 728 candidates. Do not show all at once: lazy-load 20-30 selected sprites in the review gallery.

Original sources and QA state are documented so later revisions replace specific IDs, instead of producing arbitrary unrelated artwork.
