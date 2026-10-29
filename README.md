# Godscar

Portrait, one-thumb dark fantasy ARPG built with Godot 4.7.2 for Android.

**Current playable baseline:** Godscar 0.3. Five experimental classes, movement anywhere in the lower half, automatic basic attacks, release-to-cast actives, and button/double-tap ultimates.

## Android builds

The repository will produce debug APKs via **Actions → Godscar Android Debug APK**. Download the artifact from a successful run, extract it, and install the APK on Android.

**One-time bootstrap:** Upload `Godscar_0_3_GitHub_Automation_Ready.zip` to the repository root using GitHub's **Add file → Upload files**. The workflow will unpack it, build/test it, and publish editable source files back to this repository after a successful build. Future changes will use normal source commits instead of ZIPs.

Keep the repository private until ready for a public release. Do not commit signing keys. Android's debug signing key may differ from previously installed builds: back up saves before uninstalling an old APK.
