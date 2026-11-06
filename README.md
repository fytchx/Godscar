# Godscar

**Current direction: native Godot idle ARPG.** One champion, uninterrupted automatic combat, loot, build crafting, and progress while the player manages everything else.

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
