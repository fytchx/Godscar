# Godscar combat and character preview

A phone-first browser preview that keeps the current continuous-combat screen as the primary view. The Character button and bottom navigation open the approved Character prototype as a full-screen overlay; its Fight navigation button returns to the running combat page.

The Character view follows `Godscar_Character_Screen_Preview.png`: equipment first, 12 visible positions (helmet, pauldrons, chest, gloves, belt, leggings, boots, two rings, amulet, main hand and off hand), summary stats, Oathkeeper loadout, combat role, four character sections, and Fight / Character / World / Skills / Menu bottom navigation. Inventory, crafting and materials remain sample UI content.

Character presentation is isolated in `character.html`; its CSS design tokens are at the top of that file. Gear and RPG icons come from the approved Character prototype pack and are served through an explicit allowlist. The combat screen and timer remain in the parent page while Character is open. No original game simulation, inventory, crafting or saves are read or changed.

The combat page retains the compact lower-right DPS counter and muted auto-attack timer. Its hit effects and values remain illustrative.
