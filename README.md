# Godscar

Online idle ARPG for the browser, phone first. One character, combat never stops, the build decides how far you get.

The game lives in `web/`. See `web/README.md` for layout, build and tests.

The earlier Godot/Android action prototype and its art packs were removed from this branch. They are kept on the `archive/godot` branch and in git history.

## Next

Server-authoritative from day one: the server runs `web/src/sim.js` and every player change goes through `doAction`, so the client can't edit its own progress.
