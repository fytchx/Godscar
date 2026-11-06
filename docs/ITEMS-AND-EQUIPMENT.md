# Godscar item and equipment system: complete owner review

**STATUS: IMPLEMENTED BEHAVIOR / PENDING DESIGN REVIEW.** This is NOT an owner-approved final design spec. Prepared from the actual original browser source on `preview/browser` (simulation SIM_VERSION 4), not the unfaithful Godot rewrite. Review decisions must be recorded in [DECISIONS.md](DECISIONS.md) after the owner confirms them.

**Purpose:** A player and a future human developer should understand precisely how loot, gear, crafting and item progression currently function, and be able to mark each section **KEEP / CHANGE / UNSURE** without having to reverse-engineer JavaScript. Items below may be implemented prototypes rather than final intentions.

## Quick review register (no choices have been made yet)

| ID | System to decide | Owner choice | Owner notes / replacement |
| --- | --- | --- | --- |
| I01 | Equipment slots and class access | UNSURE | |
| I02 | Weapon bases, handedness and attack speeds | UNSURE | |
| I03 | Base stats, attributes and item-level scaling | UNSURE | |
| I04 | Six rarity tiers and affix budgets | UNSURE | |
| I05 | 28 ordinary affixes and slot restrictions | UNSURE | |
| I06 | Epic+ enchantments | UNSURE | |
| I07 | Legendary game-changing augments | UNSURE | |
| I08 | Ascended armor sets and Ascension | UNSURE | |
| I09 | Scarbound Jewels and class transformations | UNSURE | |
| I10 | Drop rates and location-specific rewards | UNSURE | |
| I11 | Inventory, filters, autosalvage and protection | UNSURE | |
| I12 | Item comparison / automatic verdict | UNSURE | |
| I13 | Upgrade and reforge economies | UNSURE | |
| I14 | Crafting item bases and rarities | UNSURE | |
| I15 | Spell-granting items and inscription | UNSURE | |
| I16 | Boss loot and special rewards | UNSURE | |
| I17 | Save, offline and online implications | UNSURE | |

**Rule:** Keep the current implementation unchanged until review decisions are actually confirmed. Never mark a topic KEEP simply because it currently exists.

## I01. Equipment slots and who can equip what

**Implemented:** 11 slots: weapon; off-hand; helm; chest; gloves; belt; legs; boots; ring 1; ring 2; amulet. Drops use the generic `ring` slot, which can be put in either ring slot. The main weapon cannot be unequipped; every class starts with a low-grade rusted weapon.

The equipment action does **not** enforce class-specific weapon categories. All classes may use the weapon bases unless blocked by handedness/off-hand rules. Off-hand categories are Spell Tome (spell damage), Shield (reflect damage), Quiver (companion damage, bow-only). A bow requires a quiver if using an off-hand. Two-handed weapons normally exclude an off-hand. A Warrior with a Scarbound Jewel/Titan's Grip can off-hand a qualifying two-handed weapon instead. On an incompatible main-weapon swap, the off-hand may be moved back into the bag.

**Review questions:** Keep 11 slots? Should classes have gear restrictions? Are belts the only item eligible for class-transforming jewels? Are two rings enough? What should happen if swapping equipment while the bag is full?

Source: `web/src/sim.js` EQUIP/WEAPONS/OFFHANDS and `ACTIONS.equip`, `ACTIONS.unequip`.

## I02. Weapon base catalogue

The weapon's base controls **damage type, base damage multiplier, attack interval, and number of hands**. These values are not item rarity bonuses.

| Weapon | Type | Damage multiplier | Base interval | Hands |
| --- | --- | ---: | ---: | --- |
| Sword | Physical | 1.00× | 1.30 s | 1 |
| Mace | Holy | 0.95× | 1.35 s | 1 |
| Dagger | Physical | 0.62× | 0.85 s | 1 |
| Wand | Fire | 0.58× | 0.80 s | 1 |
| Frost Rod | Frost | 0.90× | 1.25 s | 1 |
| Greataxe | Physical | 1.80× | 2.10 s | 2 |
| Scythe | Shadow | 1.70× | 2.00 s | 2 |
| Storm Spear | Lightning | 1.45× | 1.70 s | 2 |
| Staff | Fire | 1.05× | 1.40 s | 2 |
| Bow | Physical | 1.15× | 1.55 s | 2, bow |

Attack-speed bonuses shorten the interval. A special Legendary rule can also slow it; final attack speed comes from the sim and is **not tied to the old abandoned global-tick design**.

**Review questions:** Should any weapon be faster/slower, do class restrictions make sense, should all weapons have distinct effects, and are elemental base damage types appropriate?

Source: `WEAPONS`, `computeStats`.

## I03. Item anatomy, base stats and item levels

- Every generated item has an ID, slot, item level (`ilvl`), rarity, an upgrade level (`plus`), affixes, augments, a locked flag and a shard-investment record.
- Every normal weapon starts from raw damage `7 × 1.105^(ilvl−1) × random(0.92–1.08)`, then uses its weapon-type multiplier.
- Every off-hand has one base bonus: Shield reflect roughly `3–5 × item-level scaling`; Tome/Quiver percent bonuses roughly `15–30 × (1+0.008×ilvl)`.
- Helm, chest, gloves, belt, legs and boots have armor/defense based on `[3,6,2,2,4,2] × 1.105^(ilvl−1) × random(0.9–1.1)`. Chest also grants flat life.
- Rings and amulets have a random STR/DEX/INT base bonus `random(3–6)+0.35×ilvl`.
- Item-level scaling uses exponential `1.105^(ilvl−1)` for many raw stats. Monster scaling differs at `1.155^(level−1)` and should be considered together with gear progression.
- STR adds physical damage and health; DEX adds speed and critical chance; INT adds elemental/spell damage. Every class uses all three.
- Ordinary upgrades add `+10%` per plus level to qualifying base/scaling stats; they do **not** simply increase every percentage affix.

**Review questions:** Are item levels understandable and meaningful? Is the scaling curve sensible for a long-running idle game? Should ring/amulet base attributes be random, or item-family specific?

Source: `makeItem`, `gearG`, `monG`, `scaleOf`, `computeStats`.

## I04. Rarities: six labels but five ordinary roll weights

| Rarity | Ordinary affix count | Additional implemented properties |
| --- | --- | --- |
| Common | 0 | Base stat only |
| Uncommon | 1–2 | Ordinary affixes |
| Rare | 3–4 | Ordinary affixes; may grant a spell in Hollow |
| Epic | 4–5 | Enchantment; may grant a spell |
| Legendary | exactly 6 | Enchantment + 1–3 rule-based augments, special belt socket chance |
| Ascended | exactly 6 | Enchantment + an Ascended set identity, socket chance on belts; **normally awarded through separate unlocked sources**, not from the ordinary five-weight rarity roll |

The code selects affix counts from the defined range using rounded random values (endpoint probabilities are not identical to uniform integer draws). Special rarity can affect salvage value, crafting cost and minimum retention.

**Review questions:** Keep all six? Are 6 affixes too much? Should Ascended be a rarity, a separate item class, or both? Should more rarity tiers actually change *playstyle* rather than just number of stats?

Source: `RARITIES`, `AFFIX_COUNT`, `makeItem`.

## I05. Ordinary affix pool (28 modifier keys)

The current pool has **28** different keys, with slot restrictions.

- **6 added attack damage keys:** physical, fire, frost, lightning, shadow, holy. These appear on weapons, gloves, rings and amulets.
- **5 elemental resistances:** fire, frost, lightning, shadow, holy. Available on most armor/jewelry/off-hands, depending on the piece. Physical damage is handled by armor instead of a matching physical-resistance affix.
- **3 primary attributes:** STR, DEX, INT, on all non-weapon categories.
- **14 other types:** % damage, % elemental damage, haste, critical chance, critical damage, flat life, armor, life regeneration, life on hit, damage reflect, spell damage, cooldown reduction, dodge, gold find.

**Examples of slot rules:** Haste can roll on weapon/gloves/ring/belt; dodge on boots/legs/gloves; gold find on helm/boots/ring/amulet/belt; cooldown reduction on helm/amulet/belt. Roll ranges and level scaling are codified in `AFFIXES`, with duplicate keys excluded on an individual item.

**Review questions:** Are all these stats exciting and legible? Which are filler? Should some be exclusive to certain equipment types? Is RNG too broad when chasing one perfect item?

Source: `AFFIXES`, `rollAffix`.

## I06. Epic+ enchantments (four)

All Epic, Legendary and Ascended generated items get **one** random enchantment:
- **Elemental:** +18–30% elemental damage, multiplied by enchant tier.
- **Hasted:** +10–16% attack speed, multiplied by enchant tier.
- **Honed:** +15–25% primary attack damage, multiplied by enchant tier.
- **Echoing:** +8–15% chance for the primary attack to repeat, multiplied by enchant tier.

Enchant magnitude tier multipliers: Epic 1.0, Legendary 1.3, Ascended 1.5. These are in addition to ordinary affixes. Enchants are NOT the same as Legendary augments.

**Review questions:** Are four enough? Should the enchant be random, chosen, rerolled, or linked to the equipment base? Are there clearer names than 'enchant' versus 'augment'?

Source: `ENCHANTS`, `ENCHANT_TIER`, `makeItem`.

## I07. Legendary rule-changing augments (20 total)

Legendary items receive 1 augment, plus a 45% chance of a second, plus a 12% chance of a third. These bonuses are extra rolls and are not mutually exclusive. No repeated augment, and only one damage-conversion family can appear on a single item.

**General augments (15):**
1. **Splitting:** primary attack repeats for 40%.
2. **Searing:** primary attack applies burn.
3. **Crushing:** primary is 35% slower but 75% stronger.
4. **Rending:** primary ignores 50% of armor.
5. **Siphoning:** primary heals based on damage dealt.
6. **Momentum:** repeated hits on the same monster stack damage, up to five.
7. **Wound-Echo:** offensive spells hit twice.
8. **Scar Kindling:** all hits apply burn.
9. **Bulwark of Caldris:** armor adds reflect damage.
10. **Bloodtithe:** triples life on hit, reduces maximum life.
11. **Riftspark:** critical hits can trigger first utility spell (time-limited).
12. **Brute Sorcery:** STR also improves spell damage.
13. **Aegis Fury:** increased damage when shielded.
14. **Glass Oath:** increased damage with reduced life.
15. **Frostbite:** chilled enemies take increased damage.

**Conversion augments (5):** Ember Heart (fire), Rime Heart (frost), Storm Heart (lightning), Void Heart (shadow) and Dawn Heart (holy). Each converts half of physical damage to its element.

**Important implementation nuance:** `computeStats` accumulates equipped augment keys as booleans. This means equipping two copies of an augment **does not double that rule** in the current implementation. The exact augment text and detailed balance coefficients live in the `AUGMENTS` table.

**Review questions:** Are these the defining chase items we want? Are there enough interactions to build around, but not so many that one item dominates everything? Should duplicate equipped augments stack, be forbidden, or stay boolean?

Source: `AUGMENTS`, `makeItem`, `computeStats`.

## I08. Ascended armor, sets and slot progression

There are **five Ascension-eligible armor slots**: helm, chest, gloves, legs, boots. Defeating the **Woundwarden** opens Ascension and sets a base Ascended item level equal to the defeated boss level +6.

Each eligible slot has its own persistent Ascension level: a new level grants **+2 effective item levels** to any Ascended piece worn in that slot, now and in the future. The cost rises with slot level: `ceil(2 × 1.22^current_level)` of that slot's specific monster material.

| Slot | Ascension material | Source monster |
| --- | --- | --- |
| Helm | Grave Iron | Grave Knight |
| Chest | Cinder Heart | Cinder Colossus |
| Gloves | Hound Sinew | Blight Hound |
| Legs | Zealot Ash | Ashbound Zealot |
| Boots | Shade Silk | Rift Shade |

**Four universal armor sets, with 2-piece and 4-piece bonuses:**
- **Wardens of Caldris:** 2-piece armor/reflect boost; 4-piece turns reflect into frost and chills.
- **Ashen Vigil:** 2-piece boosts fire/holy; 4-piece burn heals.
- **Riftwalker:** 2-piece boosts spell damage; 4-piece chance offensive spells remain ready.
- **Scarbound Hunt:** 2-piece boosts companion damage; 4-piece companion hits shock enemies.

Ascended items have six ordinary affixes + an enchant + a set identity. They are **not** generated with standard Legendary augments. Ascended gear is excluded from the normal +0–+10 shard upgrade system.

**Review questions:** Is this more engaging than simply upgrading individual pieces? Is permanent slot progression too detached from item identity? Should Ascended be set-only armor? Is each slot's dedicated monster-material grind fun?

Source: `SETS`, `ASC_MATS`, `effIlvl`, `ascCost`, `ACTIONS.ascend`.

## I09. Scarbound Jewels and class transformations

- A Jewel belongs to the current hero's class. It has randomly rolled potency roughly **1.00–1.30**.
- It goes into an **equipped socketed belt**, not into an arbitrary piece of gear.
- Legendary and Ascended belts have a **20% socket chance** when generated. A socket can also be forged on a normal equipped belt for gold and five units of **each of the six** elemental/physical essences.
- Removing a jewel costs gold and returns it to the Jewel collection.
- The class transformations currently are **Titan's Grip** (Warrior), **Death Knight** (Paladin), **Tri-Elementalist** (Sorcerer), **Demonbinder** (Hunter), and **Demon Hunter** (Rogue). These alter actual combat mechanics, not merely the label.
- Jewels can drop from Hollow kills at approximately **0.005% per kill** (1 in 20,000), and from bosses: Bellkeeper **0.8% per win**; Woundwarden **3% per win**. These are code probabilities, not measured player outcomes.

**Review questions:** Is a class evolution appropriately tied to a belt/Jewel? Are drops too rare? Do we want irreversible transformations, alternate evolution paths, or multiple Jewels? What does 'potency' mean to players?

Source: `makeJewel`, `jewelOf`, `ACTIONS.socketJewel`, `ACTIONS.unsocketJewel`, `receiveJewel`, `bossRewards`.

## I10. Monster drops and rarity odds

- Each normal monster kill has a **20% independent chance** to drop an ordinary item. The item slot is randomly selected from ten drop categories (including a generic ring).
- Regular item rarity rolls use **five** weights (Common → Legendary); **Ascended is a separate roll**.
- In the Fallfields, approximate conditional rarity distribution **among ordinary items that drop**: Common 58%, Uncommon 30%, Rare 10.8%, Epic 1.1%, Legendary 0.06%.
- In the Ashen Hollow: Common 30%, Uncommon 40%, Rare 25%, Epic 4.5%, Legendary 0.35%.
- These are the raw rarity weights normalized over approximately 100, not percentages of ALL kills. Example: a Hollow Legendary is roughly **0.2 × 0.0035 ≈ 0.07% per monster kill** before anything else.
- Hollow ordinary item level = monster stage +4; Fallfields item level = stage. Hollow also has stronger monsters and higher rewards.
- After Ascension unlock, a Hollow kill independently has a **0.4% chance** to drop an Ascended armor piece, in addition to the ordinary item roll.
- Scar Shards drop separately at **30% chance** in Fallfields; **45% chance** in Hollow, where eligible drops give 1 or 2 shards (40% chance of the second).
- Certain Hollow monsters independently drop corresponding essences; their chance is commonly 5%, with Cinder Colossus at 12%.
- Post-Ascension, monster-specific armor materials drop at 6% from their matching monsters, or 12% from Cinder Colossus.

**Review questions:** Do rarity odds feel fair in a game that fights 24/7? Is Legendary rare enough to remain exciting but frequent enough to support build experimentation? Should monsters/regions have more targeted item drops, and should Ascended drops bypass the same bag limits?

Source: `ZONES`, `DROP_CHANCE`, `receiveItem`, kill reward code.

## I11. Bag capacity, filters, locking, salvage

- Bag capacity is **36 items**. Gear currently worn and Jewels in the separate Jewel list aren't counted against this bag size.
- Player chooses **Keep Everything**, **Keep Uncommon+**, or **Keep Rare+** (the game defaults to Uncommon+).
- Regardless of filter, **Epic+**, items granting spells, and socketed belts are normally retained.
- Filtered-out drops are automatically salvaged for **gold**. If bag is full, *even a Legendary or other notable drop* is automatically salvaged for gold. The code records a notable message but cannot recover that item.
- Automatic salvage uses the `salvageValue` gold amount, **not** the shard recovery available from manual salvage.
- Players may lock individual bag items against manual and bulk salvage, but a new item has not yet entered the bag when capacity/filter decisions happen.
- Bulk salvage removes all **unlocked items below Legendary**, even Epic items, so it is separate from the incoming loot filter. Manual salvage yields gold + some Scar Shards and returns a socketed Jewel if present.

**Design risk worth deciding:** "Never lost" in the bag UI means **converted to gold**, *not stored or recoverable*. A jackpot Legendary can be destroyed at full capacity. Is that acceptable in an always-running idle game, especially offline?

Source: `BAG_CAP`, `receiveItem`, `ACTIONS.salvage`, `ACTIONS.salvageAll`, UI `bagPanel`.

## I12. Item comparison and verdicts

The Bag UI simulates **240 seconds (4 minutes)** of combat against your **currently selected monster** twice: current build, and build with the candidate item equipped. It compares **XP per minute** if the current build gains XP, otherwise damage-per-second. It also flags a change in deaths. A projected `≥2%` XP/min improvement without worse deaths is tagged as a recommended upgrade.

The verdict is **situational**, not a universal item score. A weapon can be "worse" for one enemy resistance profile but better for another. Simulated projections can be computationally costly when many items must be compared, so there may be a mobile performance tradeoff.

**Review questions:** Keep projection-based item scoring? Should it compare farming XP, boss damage, survivability and gold separately? Should the player select a comparison target or build goal?

Source: UI `verdict`, `baseProj`, `itemProj`, engine `project`.

## I13. Upgrading and reforging

**Ordinary upgrade:** Equip a non-Ascended item, spend Scar Shards, increase it from +0 up to **+10**. Cost rises with both current plus level and rarity. Cost formula: `ceil(3 × 1.45^plus × (1 + rarity_rank×0.3))`. Item upgrade effects are not uniformly applied to all affixes.

**Reforge:** On an equipped item, choose one specific affix line. Spend gold to replace it with a random permitted affix for that item slot; the new result excludes the item's existing modifier keys. Cost rises with item level and rarity. It doesn't let you directly select a desired replacement or recover a previous roll.

**Manual salvage:** Provides gold plus some Scar Shards. Item upgrade shards invested are only partially recovered.

**Review questions:** Should reforges allow you to keep the old roll, lock desired stats or target a stat family? Does +10 create meaningful choices or just compulsory upkeep? Should more materials be spent upgrading or crafting?

Source: `upgradeCost`, `reforgeCost`, `salvageValue`, `salvageShards`, `ACTIONS.upgrade`, `ACTIONS.reforge`.

## I14. Crafting

The Forge can make **Common, Uncommon, Rare, Epic, or Legendary** items; there is no current Ascended crafting action. Player selects item slot, rarity and optionally a specific weapon/off-hand base; other bases are generated by slot. All rolled affixes, enchants and Legendary augments remain random.

Crafting uses gold; higher rarity also uses Scar Shards and, for Epic/Legendary, essences of **every one of the six damage types**. Craft cost grows with requested item level. The UI requests the highest currently recorded unlocked monster stage. The action permits item level up to highest recorded unlocked stage +4.

**Potential implementation concern, to verify before changing:** Initial `unlocked` values for Hollow monsters are set to that zone's minimum stage (20), even when the Hollow is locked. The crafting maximum is calculated across ALL monsters, so the interface may show a crafting level 20 on a brand-new character. This is a code-based suspicion, not a measured UI bug report.

**Review questions:** Should crafting produce fully random items, or let players influence affix families? Are six-element costs too much friction? Should crafting level follow current zone progression instead of merely the maximum initialized value?

Source: `CRAFT_MULT`, `craftCost`, `ACTIONS.craft`, UI `forgePanel`, `blankState`.

## I15. Item-granted spells and inscription

- A Hollow Rare ordinary item has an **18% conditional chance** to grant a found spell; Hollow Epic/Legendary ordinary items have **27% conditional chance**. Fallfields have zero random grant chance. (Chance is per qualifying item, not per kill; Ascended generation also goes through the Epic+ chance path.)
- Found spells include offensive and utility spells: fire, frost, lightning, physical, shadow, holy, healing/ward/war-cry utility effects. They are distinct from class spells.
- Equipped item spells join your list of available spells. The UI supports a **3-offensive + 2-utility** autocast bar with automatic conditions. A spell item does not consume an active attack button.
- Inscription: on an **equipped Rare or better** item that grants no spell, spend **3 matching essence** + item-level-scaled gold to select a found spell and attach it. The code presently does not limit inscription to a particular equipment slot.

**Review questions:** Should gear-granted abilities be core build expression? Are five autocast slots enough? Should inscription have slot/class restrictions? Should items lose granted spells on unequip (they currently do)?

Source: `FOUND_SPELLS`, `SPELLS`, `availableSpells`, `refresh`, `ACTIONS.inscribe`.

## I16. Boss loot

Players spend a Boss Sigil for snapshot boss fights, while ordinary farming continues. On a win:
- Boss grants **1 ordinary item**, plus a **35% chance** of another. Each reward item is **Rare (65%) / Epic (31%) / Legendary (4%)**, conditionally. The item level is boss stage + zone bonus +2.
- After Ascension is unlocked, a successful Hollow boss win also has a **25% chance** of a separate Ascended armor piece.
- Gold, Scar Shards, XP and (for Hollow bosses) independent essence rolls are also rewarded.
- Successful Bellkeeper: **0.8%** Jewel chance; successful Woundwarden: **3%**.
- First Woundwarden defeat unlocks Ascension.

**Review questions:** Should boss rewards be more unique/targetable than regular loot? Are sigil costs and Jewel chances compatible with continuous idle farming? Should a special boss be tied to a special item family?

Source: `fightBoss`, `bossRewards`.

## I17. Save, offline progression and eventual multiplayer

Loot generation uses deterministic RNG state. The browser saves game state locally and can catch up on up to **24 hours** of combat. This means rates, bag overflow and filtering also matter when a player leaves for hours. Gameplay modifiers are not just text; they affect the simulation, projections and boss fights.

The current public browser preview is client-side. `feature/server-phase1` contains a separate development API, but it is **not connected**. Treat existing item saves as valuable: introducing new rarity, slots, item fields or reworked modifiers requires migration/compatibility testing before rollout.

**Review questions:** How much offline reward should a player receive? Should rare items ever be auto-destroyed offline? What is the smallest safe server migration plan when accounts are added?

Source: `blankState`, `migrate`, `advance`, `catchUp`, `web/src/ui.js` storage.

## Discrepancies and uncertainties to check, not silently "fix"

1. **Overflow semantics:** The UI says items are 'salvaged, never lost' but an item can disappear irreversibly into gold, with no recovery or shard yield for automatic salvage.
2. **Craft level initialization:** The max-stage calculation appears to include locked zone minimum stages. Requires a reproduction test before making a patch.
3. **Scarbound Jewel hint:** Gear UI suggests Hollow bosses carry Jewels; the code also gives Bellkeeper a Jewel chance.
4. **Very low jewel frequency:** 1/20,000 Hollow kills for a regular Jewel, plus small boss chances. These may be prototypes rather than intentional endgame tuning.
5. **"Best item" projection caveat:** Item verdict depends on one target and short sampling, and may not reflect actual long-run farm strategy or alternative boss builds.
6. **Rare items vs true build chase:** Rarity tiers, six-affix equipment, Legendary rules and Ascended sets currently overlap in complexity. Verify player readability and whether each tier has a distinct reason to exist.
7. **Save evolution:** `SIM_VERSION=4` while stored data `v=3`. These versions represent different contracts; avoid conflating them during changes.

## How to approve changes

Owner can respond with **`I01 keep; I02 change: ...; I03 unsure`** for any subset. An unmentioned item remains **UNSURE**. Do not mark anything finalized until the owner explicitly decides. Record approved choices in [DECISIONS.md](DECISIONS.md) and update this register in the next commit, without rewriting the sim until there's a scoped implementation plan.

## Code source index

- `web/src/sim.js` lines approx 147–356: equipment slots, bases, affixes, enchantments, augments, sets, rarities, item generation and costs.
- `web/src/sim.js` lines approx 357–456: stat aggregation, class evolution, damage scaling and granted spells.
- `web/src/sim.js` lines approx 680–739: monster drops, bag retention, auto salvage and Jewels.
- `web/src/sim.js` lines approx 740–809: new character, item save format and migrations.
- `web/src/sim.js` lines approx 810–929: equip/unequip, upgrades, reforging, crafting, socketing, inscription and filtering.
- `web/src/sim.js` lines approx 963–997: boss rewards.
- `web/src/ui.js` lines approx 110–124, 208–232, 290–348, 392–433: projections, item text, Gear, Bag and Forge views.

File locations are descriptive starting points, not contractual line numbers. Reinspect current HEAD before using this document for future changes.
