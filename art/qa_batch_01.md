# Batch 01 visual QA register (31 October 2026)

**This register is intentionally cautious.** A transparent PNG is not automatically a modular game tile. All 36 extracted sprites remain in **review**, not production.

## Review of preview sheet
Potential neighboring-sprite contamination was observed in these crops:
- `ruin_wall_end`: a detached narrow fragment near the left edge.
- `crypt_candle_altar`: unassociated debris near top and bottom edges.
- `crypt_torture_table`: fragments near top crop edge.
- `crypt_treasure_chest`: cropped fragments along the upper edge.
- `bush_blighted`: possible detached small marks.
- `rock_cliff`: detached foliage at top.
- `fallen_log`: plant fragments along upper crop edge.
- `fence_broken`: small extraneous part at lower edge.
- `gate_wood`: isolated debris near bottom.
- `sign_lantern`: bottom fragments.
- `well_wood`: wheat-like debris at bottom.
- `chapel_ruined`: neighboring object fragment at the right.

Treat these as **possible issues requiring manual verification**; some detached parts are intentional set dressing.

## Missing production requirements
- No proven seamless joins between straight walls, corner pieces, and broken ends.
- No consistent world-unit sizing or atlas packing approved.
- No verified sprite pivots, occlusion fade rules, or in-game collisions.
- No gameplay test on Samsung Galaxy A15 with these new images.
- Art currently has more painterly/realistic detail than the previously proposed final 2D style. Test scaled previews before committing to the rendering approach.

## Rules
1. Preserve originals from AI generations. Never use post-crop cutouts as the only archive.
2. Promote a sprite only after seam, overlap, camera-scale and sprite-alignment review.
3. Prefer material reuse with restrained variation over dozens of unique high-resolution textures.
4. Only solid geometry has physics; decorative plants, roofs, and distant scenery do not.
5. Fix artifact issues in the source asset and regenerate; keep downstream file names stable.
6. Do not push to `main` or ship art-review sprites in production APKs.

## Next art passes
1. Finish crypt modular floor tiles (floor, cracked stone, wall, interior/exterior corners, transitions, stairs, doorway).
2. Build sample rooms and compare clipping and perspective at actual portrait camera scale.
3. Extract dedicated collision masks/footprints and occlusion boundaries separately.
4. Bake preview atlases, benchmark batching, and test seeded dungeon modules.
