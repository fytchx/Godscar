# Godscar interface skeleton

**Status:** Stage 1 phone-first layout preview at `/lab/arsenal/` on the isolated Godscar browser preview. The original game remains at `/`.

This route is a static, clickable map of the existing game flow. It uses the original five tabs—Fight, Gear, Bag, Build, Forge—and familiar starting-game terms: Warrior, Cleave, Sword, The Fallfields, Blighted Husk, Carrion Swarm, and Hollow Wisp. The persistent combat ribbon and screen organization follow the current browser game's structure, with compact mobile navigation patterns informed by Arcana.

## What can be clicked

- The five bottom tabs switch between screen layouts.
- Fight enemy rows switch the selected enemy shown in the layout.
- Gear slots switch the selected slot and detail panel.
- Bag item actions expand a small explanation of where item decisions belong.
- Forge service rows open a short explanatory panel.

These controls only change local presentation state. This version does not simulate combat, equip items, save progress, or change the original game. Sample values and preview-only interactions are labeled in the UI.

## Screens in this stage

- **Fight:** current encounter, always-active primary attack, enemy selection, hunt settings, and first-play explanation.
- **Gear:** the game's 11 equipment slots and selected-item detail.
- **Bag:** filters, item cards, compare/equip/salvage action locations.
- **Build:** weapon identity, primary and spell slots, specializations, passives, attributes, and combat stats.
- **Forge:** materials and service entry points for crafting, improving, reforging, and socketing.

## Staging plan

1. Agree on a clear navigation and screen skeleton before designing new game mechanics.
2. Refine the layouts against the existing simulation and actual state/data.
3. Review the layout and core flow on a phone.
4. Design and implement weapon-defined abilities and spells.
5. Develop the Grim Dawn-influenced equipment and itemization rules.

Do not treat Stage 1's sample itemization, numbers, or service descriptions as final game rules. The earlier isolated systems prototype engine and its focused tests remain in this directory but are not imported by the Stage 1 interface. They are not part of the original game.
