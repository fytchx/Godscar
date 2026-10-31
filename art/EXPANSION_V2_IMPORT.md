# Godscar environment expansion v2

The 197-piece v1 art library is already stored in `assets/godscar_environment/`.

## Import v2 (Android GitHub browser)
1. Download **Godscar_Expansion_v2_UPLOAD_TO_GITHUB.zip** from this conversation.
2. Open `fytchx/Godscar` on branch `dev`, go to `art/`, choose **Add file → Upload files**.
3. Upload the ZIP unchanged. Commit to `dev`, **not** main.
4. GitHub Action **Import Godscar expansion v2 assets** validates each PNG against the SHA256 manifest, extracts 728 images, generates six atlases, and installs the in-game browsing scene. Another Android dev APK will then be built.

The import ZIP is <10 MB and contains indexed-color PNGs optimized for Android. The separate master archive holds 12 original full-resolution source sheets and non-quantized sprite PNGs. Preserve it.

After importing, start Godscar Dev APK → **ART GALLERY** → **EXPANDED ART LIBRARY**. The expanded library can show individual asset sprites by category and sample biomes, but camera scale and collisions are NOT finalized.

All assets remain on dev for visual QA. No Arcana, Fandom or game release deployment is requested.
