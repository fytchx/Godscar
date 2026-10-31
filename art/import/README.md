# Import the Godscar 197-asset environment pack

**Status: upload required for binary files.** The archive is generated in the Godscar project chat. ChatGPT's GitHub connector cannot directly transfer the 21 MB binary archive even though it can write scripts and manifests.

To store every finished file in the repo, do the following **once** from the GitHub website (Android works):

1. Open the `dev` branch of `fytchx/Godscar`, then open `art/import/`.
2. Select **Add file → Upload files** and upload **Godscar_Environment_Asset_Pack_v1.zip** downloaded from the chat.
3. Commit directly to `dev`. Do **not** change `main` or deploy anything.

A GitHub Action will then verify the ZIP, extract all 197 PNGs, atlases, Godot demo, manifest, and previews to `assets/godscar_environment/`, and commit them automatically. Original source sheets are preserved *inside the archive* for reconstruction.

If GitHub's mobile UI won't upload a large file, use your Android browser's **Desktop site** option.

Asset pack limits: generated ground textures are seam-tested, but modular props and physics colliders require in-game QA; original art has inconsistent crop padding. This is a working review pack, not a fully finished commercial tileset.
