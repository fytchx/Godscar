# GODSCAR 0.3 — One-Thumb Combat Test

An Android-first **Godot 4.7.2** portrait ARPG combat sandbox. This is a playable controls/build prototype, not a finished game. Uses temporary geometric pixel art.

## What's new compared with 0.2

- **Move from any touch in the lower half:** Press and drag anywhere in the lower 50% of the screen, including above the experience bars and around the globe. No need to reach for the on-screen joystick.
- **Fixed vs. floating is only the joystick's visual anchor:** FIXED shows the joystick at bottom-left, but thumb input still begins wherever touched. FLOAT draws the joystick at the touch position. Tap `FIXED / JOYSTICK` in the top-right header to switch.
- **Basic damage is passive:** Your character automatically attacks enemies in range while moving or standing still. Class passives and early specialization modifiers are still active.
- **Release = active skill:** Lift your finger after a movement gesture (or tap once) to use your class's active skill, subject to 40 resource and a short 0.85s cooldown.
- **Ultimate = button or double tap:** Press the bottom-right ULT button, or tap twice quickly anywhere in the lower control half. Separate 18s cooldown. Five experimental class ultimates.
- The **reputation label** can still be tapped to switch tracked faction. Dragging on that label instead begins movement. Top-left opens the class/specialization menu. HUD / menu interactions don't trigger active casts.
- Android export preset is configured with portrait orientation, arm64, Gradle disabled, and version code 3. Exporting a debug APK still requires Godot 4.7.2 export templates installed in the editor.

## Current class controls

| Class | Automatic/passive combat | Release skill | Ultimate |
|---|---|---|---|
| Warrior | Basic attacks + Bloodrush | Shockwave | Ruinbreaker |
| Paladin | Basic attacks + Vow of Life | Judgement | Divine Verdict |
| Sorcerer | Basic attacks + Arcane Echo | Arc Nova | Cataclysm |
| Hunter | Basic attacks + Keen Eye | Arrowstorm | Wild Hunt |
| Rogue | Basic attacks + Bloodletter | Shadowstep | Nightfall |

These mechanics are **rough previews**, including all 15 specializations. Actual classes, balance, VFX, skill trees, gear and lore are pending.

## Import to Android Godot

1. Download the ZIP and go to **Godot Project Manager**.
2. Tap **Import**. Import the ZIP to a **new folder** (e.g. `godscar-0-3`) to preserve 0.2.
3. Open the project and press **Run**. Test touch gestures first.
4. To build an APK: **Main Menu > Project > Export > Android > Export Project**. Use the installed export templates for Godot 4.7.2, enable **Export With Debug**, and save the APK to Downloads.
5. If Android refuses to install over 0.2 due to a signing conflict, uninstall the old APK after preserving any saves; this prototype only persists settings and not combat progression.

## Quick acceptance tests

- Place your thumb at the middle-right of the screen just below the midpoint and drag: character moves.
- Release: one active ability should fire, or a notice should explain insufficient resource / cooldown.
- Repeat the same movement in fixed and floating modes: input works in both.
- Double tap quickly on the lower screen: ultimate fires once; no movement or additional active on the second tap.
- Tap ULT button: ultimate fires if ready, otherwise displays remaining cooldown.
- Test all five classes in the top-left class menu and the three preview specs per class.
- Tap faction reputation LABEL: cycles the tracked faction; swipe across it: moves normally.

## Scope / testing note

Script and project configuration have been reviewed for structural issues. **Godot engine runtime / Android APK was not available to compile or execute in the authoring environment**, so launching the project in the Android editor is the first actual compiler and runtime validation.

## GitHub automation

Automated APK workflow included at `.github/workflows/android-debug.yml`. See `DEVELOPMENT.md` for the recommended phone-first release flow.
