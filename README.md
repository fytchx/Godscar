# Godscar

**Current direction: native Godot idle ARPG.** One champion, uninterrupted automatic combat, loot, build crafting, and progress while the player manages everything else.

## Install a test APK without opening Godot

The [Godscar Android test APK workflow](https://github.com/fytchx/Godscar/actions/workflows/android-apk.yml) runs whenever a change to `godot/` is committed to `main`. Open the latest successful **Godscar Android test APK** run, download the **Godscar-Android-Test-...** artifact, extract its ZIP, and install `Godscar-test.apk` on an ARM64 Android device. Android may ask you to allow installation from the app you used to open the APK. This is a **debug-signed prototype**, not a Play Store release.

The build uses the package ID `com.fytchx.godscar` to avoid replacing the archived prototype. A debug keystore is cached in GitHub Actions so subsequent test builds can be installed over prior ones; if that cache or key is lost, Android will require uninstalling the older test APK. Back up any local save before uninstalling.

Future development can happen from this ChatGPT conversation: review/update the connected GitHub repository, commit changes to `godot/`, then get the new APK from the workflow. The APK is built by GitHub Actions, not by the chat itself. Test builds are retained 60 days; APK artifacts are accessible from GitHub's Actions UI.

## Open the new Godot project

Open **[godot/project.godot](godot/project.godot)** in Godot 4.3 or newer, or use the Godot Project Manager to import the `godot/` folder. Run the project to choose a class and begin.

- Native GDScript simulation: [godot/scripts/sim.gd](godot/scripts/sim.gd)
- Native phone-first interface: [godot/scripts/main.gd](godot/scripts/main.gd)
- Current data catalogue: [godot/scripts/catalog.gd](godot/scripts/catalog.gd)
- Setup, limitations, and next steps: [godot/README.md](godot/README.md)
- Automated native import, smoke and main-scene validation: [Godot CI](.github/workflows/godot-native.yml)

### Which version is authoritative?

The `web/` folder is **preserved as the original reference for the NEW game mechanics** and must remain until full rule-by-rule GDScript parity is verified. The GDScript port runs independently and is not yet feature-parity certified. Existing browser saves cannot be imported into the Godot build.

The older manual-movement/active-skill Android prototype remains on `archive/godot` only for historical reference. **Do not incorporate it into the new idle game.** Nothing in that archive was merged into the new Godot project.

### Production caveat

Combat and save data in this build run on the client. The future online game needs a server-authoritative simulation and accounts before player progress can be trusted.
