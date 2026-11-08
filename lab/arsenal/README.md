# Godscar interface and art-placeholder preview

**Status:** Phone-first preview at `/lab/arsenal/` on the isolated Godscar browser build. The original game remains at `/`.

This route maps Godscar's existing **Fight, Gear, Bag, Build, Forge** flow. It is a UI preview, not a second game engine. It uses the Warrior / Sword / Cleave start and Fallfields enemies to keep the layout grounded in recognizable Godscar content.

## What is shown

- **Fight:** a compact illustrated scene with the Warrior facing the selected monster and a looping sword-slash/impact effect; combat bars, primary attack and encounter details remain easy to read.
- **Gear:** all 11 existing equipment slots, each with a distinct authored SVG silhouette. Empty slots keep their art placement visible.
- **Bag:** example loot cards with larger art silhouettes, rarity color and compare/equip/salvage controls shown as layout placeholders.
- **Build:** weapon identity, primary/spell slots, specializations, passives, attributes and combat stats.
- **Forge:** material summary and service entry points.

The gear drawings and combat figures/effects are replaceable stand-ins, not final Godscar artwork. They reserve a known image area and show where visual combat feedback will live. They are original code-authored SVGs; no IdleArc assets or combat art are copied.

## Interaction and data boundary

Tab navigation, gear-slot selection, enemy selection and expanding item cards change presentation only. The red slash is a repeating visual animation, not a combat event or damage effect. Numbers and item examples are labeled as sample/preview content. This interface does not import the older lab simulation, write browser storage, change equipment, or alter the original game/save.

`art.mjs` owns the replaceable SVG stand-ins. `ui.mjs` composes those into the five screens. Keep this separation so real asset files or an approved sprite atlas can replace placeholders without rewriting screen layout.

## Staging plan

1. Agree on a clear navigation and screen skeleton before mechanics.
2. Establish gear/inventory image space and visible attack feedback (this visual-preview update).
3. Align layouts and labels with the current simulation and real item data.
4. Review the flow on a phone.
5. Design and implement weapon-defined abilities and spells.
6. Develop the Grim Dawn-influenced equipment and itemization rules.

Do not treat this stage's sample itemization, numbers, service descriptions, or SVG art as final game rules or artwork. The older standalone lab engine and its tests remain in this directory but are not loaded by the interface.
