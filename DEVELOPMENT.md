# GODSCAR — Android-first development workflow

## Source of truth
The GitHub `Godscar` repository is the authoritative source. Do not keep sending new project ZIPs after setup.

- `dev`: in-progress features, automatic debug APK builds.
- `main`: last accepted playable candidate, automatic debug APK builds.
- Each feature should be a small isolated commit/PR, reviewed and tested before it joins `main`.
- Mark stable points with tags (`v0.3-playable`, etc.) and preserve a known-good build.

## Initial setup
1. Create an empty **private** GitHub repository called `Godscar` (no README/license/.gitignore); enable Actions.
2. Upload the Godot project from the archive root including hidden `.github/workflows/android-debug.yml`, or have the connected GitHub integration push the files.
3. The workflow automatically triggers on push to `main` or `dev` (or under Actions > Godscar Android Debug APK > Run workflow).
4. Open the successful run, download the `Godscar-Android-<run number>` artifact, unzip it, and install `Godscar-debug.apk`.
5. Feedback: tell us build number + class + what you did, and optionally provide a short screen recording.

## APK installation & signing
The CI debug APK uses the build image's debug signing key. This may DIFFER from the APK exported on the phone; Android may reject installation over the old build. If so, preserve saves first, uninstall the old debug APK, and install the CI APK. CI builds from the same pinned image can generally update each other, but debug signing is not a permanent release-key strategy. Before user testing with real saves, store a dedicated signing keystore securely as GitHub Actions secrets and add a versioned save migration strategy. Never commit private keys to GitHub.

## Running checks
- Linux Godot export is automated; errors surface in the Actions log.
- This does NOT replace device testing for touch ergonomics, visuals, performance, crashes, etc.
- Debug artifacts are retained 30 days; tag known-good source commits for rollback.

## Future improvements
- CI-managed signing keystore (for reliable in-place upgrades and saved data).
- Release uploads (direct APK download link rather than a ZIP artifact).
- Static scripts tests and headless gameplay tests.
- Player feedback/crash report template linked to GitHub Issues.
