# GODSCAR: THE LIVING ARSENAL
## A new item, crafting, loot and automatic-ability design

**STATUS: PROPOSED, NOT IMPLEMENTED.** Drafted 2026-11-06 PT. Owner explicitly requested a complete redesign drawing inspiration from Path of Exile, Grim Dawn and Diablo, with the following approved DIRECTION: white weapons provide an always-running weapon/element-specific automatic attack; loot, crafting and progression unlock and modify **one to five additional automatic abilities**, including attacks, spells, damage over time and defensive effects. Everything below beyond that direction is design exploration pending review. It must NOT be silently treated as fully approved.

**Source baseline:** the original, accepted browser Godscar on branch preview/browser. See docs/ITEMS-AND-EQUIPMENT.md for the existing system. No code in web/src was changed by this proposal.

## 1. The pitch

**The weapon defines how you fight. The items define what else happens while you fight. Crafting lets the player author the interaction.**

Godscar is not a clicker and not a manual ARPG. The character attacks continuously; the player builds a deterministic engine that fights intelligently without constant manual input. Each character has:

- **One innate, always-on weapon action** (free, no slot, works on a plain white item).
- **Up to five extra autocast abilities**, awarded or enabled through progression, equipment, found inscriptions, crafted engravings and named special items. A beginning character may have zero unlocked extras until the first quick milestone; five is the late-game cap, not five guaranteed skills from every item.
- **Support modifiers** that alter those actions without creating new autocast lanes or secretly bypassing the five-skill limit.
- **Ailments**, such as burning, bleeding, chilling and shock, which are outcomes of damage and not automatically an extra cast slot.

The first big difference from the current browser game: **weapon identity, skill identity and support identity become separate, comprehensible systems**. Rarity no longer means “pile six random stats plus several independent proc powers onto every legendary.”

## 2. White weapons are real build foundations

Every weapon base specifies its **innate attack**, physical or inherent element, speed interval, single-target behavior, attack tags, reach (if the game supports reach), and a clear implicit. White weapons have no random affixes. A strong white base is a desirable crafting target rather than disposable trash.

| Base (working name) | Free automatic action | Character / element |
| --- | --- | --- |
| Sword | Measured Slash | Balanced strike; damage normally physical |
| Axe | Sundering Chop | Slower heavy strike; bleed/armor-break synergy |
| Dagger | Twin Cuts | Rapid repeated hits; poison/bleed/on-hit synergy where implemented |
| Mace | Crushing Blow | Slow impact; mitigation-break synergy |
| Spear | Piercing Thrust | Precise strike; penetration synergy |
| Bow | Hunter's Shot | Ranged projectile; crit/elemental arrow synergy |
| Wand | Arc Bolt | Ranged spell; wand's own elemental type |
| Staff | Channel Pulse | Slower spell; elemental/DoT affinity |
| Scythe | Reaping Cut | Slow strike; shadow/decay affinity |

These are **suggested names and roles**, not verified new game content. Current combat mostly fights one monster at a time. Do not promise AoE, chain, poison or stagger mechanics until those capabilities are specifically designed and implemented.

**Category ≠ element:** a sword with a fire infusion remains a sword with a fire component. Its free Slash can apply an elemental ailment; an item can separately convert part/all of its damage. A Fire Wand has a fire-based Arc Bolt because its base has that implicit. This avoids maintaining a separate ability implementation for every weapon × element permutation.

A high-tier white base should have a recognizably different implicit or favorable stat envelope, not just a larger hidden item-level number. Whites may be turned into high-value Rares through the crafting path.

### One sample character progression
1. Found white dagger → Twin Cuts automatically starts.
2. First class milestone → unlock one extra skill slot and learn a small bleed ability.
3. Find a rare amulet inscribed with Ember Brand → choose to equip it and place Ember Brand in an unlocked slot.
4. Add a support to Ember Brand that extends burn duration in return for a weaker initial hit.
5. Find a named Unique dagger that changes Twin Cuts so its critical strikes refresh an existing burn, subject to a strict internal cooldown.
6. At endgame, combine five deliberate auto abilities for damage, sustain and defense, but primary Twin Cuts always fires.

No part of the progression asks the player to manually cast those skills.

## 3. Ability sources and the five-conduit limit

**Working UI term: Conduits.** There are five extra slots. Progression determines how many are unlocked; gear/skills determine the abilities available. The free weapon action occupies a separate always-on panel. Unlock levels are to be decided through pacing tests, not invented as final facts.

**Three principal ways to gain an ability:**

1. **Mastery abilities**: earned through character/class progression; permanently available once learned. They are reliable foundation choices.
2. **Inscribed abilities**: attached to a piece of equipment through random loot or crafting; available while that item is equipped. Removing it disables the corresponding conduit, with a visible warning and preserved player preference.
3. **Named powers**: a hand-designed Unique item or boss reward grants or transforms an ability. It still occupies a conduit if it produces an independent periodic/triggered action. A modifier that transforms an existing action does not consume a second slot.

The player explicitly selects and prioritizes up to five skills from those available. Owning ten items that grant abilities does not grant ten automatic casts. Skills are organized by clear source, element, tags, trigger and cooldown.

**Slots are not “five attacks per second.”** An equipped skill follows its trigger and cooldown, and the free weapon action continues independently.

### Skill roles and examples (illustrative, not implemented)

| Skill | Type and tags | Trigger | Purpose |
| --- | --- | --- | --- |
| Ember Brand | Fire, Spell, DoT | Every fourth successful primary hit, cooldown 5 sec | Sustained burning |
| Frost Lance | Frost, Spell, Projectile | Cooldown 7 sec | Burst and chill |
| Blood Mark | Physical, Curse, DoT | First crit when ready, cooldown 8 sec | Bleeding boss damage |
| Aegis Pulse | Guard, Defense | Life below 45%, cooldown 15 sec | Emergency shield |
| Spirit Hawk | Companion | Cooldown 9 sec | Additional repeatable hits |
| Rift Reprisal | Shadow, Counter | After being hit, cooldown 10 sec | Retaliation and sustain |

*DoTs are not all the same:* a Fire Wand's ordinary burn is an ailment delivered by its normal attack, while Ember Brand is a distinct autocast ability with its own source, cooldown, and support rules.

**No infinite proc engines by default:** triggered abilities cannot trigger other triggered abilities. Any named exception must state depth limits, event budget, timing and tests. Chance-on-hit effects have internal cooldowns or per-time normalization so fast weapons cannot trivially multiply five proc systems into a server-melting mess.

## 4. Automatic combat editor: simple screen, deep decisions

The player can see:
- **Primary:** “Twin Cuts | Dagger | Physical 70% / Fire 30% | every 0.7s.”
- **Conduit 1:** “Ember Brand | from Amulet | after 4 primary hits | 5s cooldown | Lingering support.”
- **Conduit 2:** “Aegis Pulse | from Mastery | trigger below 45% life | 15s cooldown.”
- **Conduits 3–5:** locked or empty, with clear reason.
- **Global trigger log:** why each power fired, what it affected, and any cooldown or invalid-source warning.
- **Skill damage/sustain previews:** expected damage by type, DoT uptime and damage taken over a reproducible period, with enemy-specific caveats.

**Player control:** select which abilities are equipped and choose their order when simultaneous triggers occur; condition thresholds are visible and editable only within safe, tested constraints. No automated AI optimization changes the player's build behind their back.

## 5. Rarities rethought: fewer colors, more reasons to loot

**Proposal: four meaningful kinds of item.**

| Item class | What makes it interesting |
| --- | --- |
| White / Normal | Base and implicit; desirable blank canvas for careful crafting |
| Magic | One to two affixes; cheap experimentation |
| Rare | Three to four powerful affixes, eligible engravings/supports; main endgame crafting project |
| Unique | Hand-authored named item with fixed identity, a specific ability or modifier and a tradeoff; not statistically superior by default |

This intentionally **parks** the current Epic/Legendary/Ascended structure; it does **not** delete existing player items, character evolutions or stored saves. A future exceptional item category must justify itself with a distinct interaction rather than a different text color.

**Rare vs Unique tension:** an excellent crafted Rare should beat a mediocre Unique in many builds; a Unique should win when the player commits to the mechanic it enables. Whites remain valuable when their bases/implicits are in demand.

**Mod pools:** deliberately curated, tagged stat families, not dozens of redundant fillers:
- Survival: life, armor, resistances, recovery, avoidance.
- Offense: weapon damage, elemental conversion, attack/spell speed, crit, DoT.
- Timing/behavior: internal cooldown, trigger frequency, status duration, skill target restrictions.
- Skill-specific: e.g. “Ember Brand burns 20% longer,” not generic “all damage +5%.”
- Utility: gold/material yield and farming specialization only where balanced against combat alternatives.

All affixes need defined eligible bases and visible minimum/maximum ranges. Prefix and suffix counts can matter, but the early prototype should not implement a huge hidden affix lattice until the small set is fun.

## 6. Supports: the player's main expressive crafting tool

**A support modifies an existing ability. It does not grant another automatic cast.** Skills have tags, and each support has required and excluded tags. The primary weapon may take one dedicated weapon mark. For the first prototype, each extra ability has **one support slot**; a later progression milestone may unlock a second support slot per ability. Cap stacking, costs and contradictions explicitly.

| Support (working name) | Applies to | Change / meaningful tradeoff |
| --- | --- | --- |
| Lingering | DoT | Longer duration but weaker initial impact |
| Echo | Hit Spell/Attack | Secondary repeat but longer cooldown or reduced damage |
| Hastebound | Attack/Spell | Faster activation, less damage per event |
| Siphon | Hit | Life recovered from hits, at offensive cost |
| Fracture | Physical Strike | Weakens target armor, longer interval |
| Cinder | Fire/DoT | Increases burn uptime, maximum refresh limit |
| Glacial | Frost | Stronger chill, weaker direct strike |
| Execution | Hit | Stronger near enemy death, weaker above half life |
| Conversion | Eligible Hit/Spell | Partial elemental conversion, lower unconverted scaling |
| Steady | Triggered | More consistent trigger at reduced peak effect |

Avoid blindly copying another game's socket-link complexity. Every player should be able to answer **which action this support affects** and **what is sacrificed**.

**Compatibility rule:** e.g. Lingering requires DoT; it cannot modify a pure direct-hit sword attack. A conversion does not turn a weapon attack into a spell unless a unique explicitly changes the skill's tags. Supports must be validated in the deterministic engine, not by UI text alone.

## 7. Crafting: agency, risk and earned permanence

Design goal: let people build equipment toward a plan, but preserve the excitement of lucky drops. **No mandatory 27-currency lottery.** Crafting stations / functions may be presented as one phone-friendly Forge with named operations.

### Stage A: Choose a promising base
Find or buy (if trading exists later) a White item with the wanted innate attack / implicit / item-level band. Equipment bases have distinct drop sources and visible properties. The starting base is not silently changed by rolling rarity.

### Stage B: Establish identity
Use a modest, common resource (working name **Embers**) to promote White → Magic with one random affix. The player may choose a category such as offense, survival or spell, but not the exact final value. Add the second affix separately.

### Stage C: Forge a Rare
Combine a Magic item with a more specialized resource (working name **Forged Seals**) to create a Rare while preserving its base and chosen locked affix. Rare adds bounded new affixes with explicit slot restrictions. This produces a stable project, not a full random replacement every click.

### Stage D: Engrave an ability
Use a **Sigil** acquired from combat, quest/mastery or a target boss to add one compatible autocast ability to the item. Engraved ability may be changed only through a clearly costly, deliberate recipe. Some items may instead roll a natural ability engraving, allowing lucky finds.

### Stage E: Support a chosen ability
Apply a **Glyph** support to an ability or the primary weapon mark. Valid tags are checked before spending resources. For basic supports, choose the category and accept a random roll; advanced upgrades can improve a known support through reliable investment.

### Stage F: Improve quality, not spam currencies
Spend salvage/monster-specific materials to raise equipment quality at a capped rate (e.g. 0–20, proposed). Quality improves defined base stats, NOT all damage and skill effects at once. High-end specialized crafting can involve a risky corruption step, but irreversible risk must be opt-in, with clear preview and a confirm screen.

### What costs what
- **Embers:** high-frequency normal-drop salvage; base experimentation.
- **Forged Seals:** Magic/Rare salvage, monster drops; rare affix building.
- **Sigils:** targeted elite/boss drops and discoveries; add an ability to gear.
- **Glyphs:** targeted boss/monster families; modify abilities.
- **Caldris Marks:** rare high-end item transformations; never necessary to reach basic power.

These names and currency quantities are provisional; reuse/rename current resources only after economy review. It is better to start with 3–4 understandable materials than six generic elemental essences required for every craft.

### Anti-frustration rules
- **Never delete a protected rare or unique drop on full inventory.** Use a small temporary overflow queue of protected items and offer clear choices. Cap it, define oldest/newest policy and handle offline overflow explicitly; a truly infinite queue is not viable.
- A craft previews its effect, preserved properties, possible roll range, cost, and whether it will destroy/replace anything.
- Manual reroll costs scale predictably; preserve existing crafted progress except for clearly labeled destructive operations.
- A player should be able to target **some** desired result through source/slot/category choice but not deterministically manufacture every ideal Unique.
- No auction/trading economy is assumed. If a server/shared economy is added, drop scarcity and crafting sinks need a separate anti-abuse design.

## 8. Drops: enemies should mean something

Keep automatic loot. Improve the why and where of drops:
- All monster families can drop normal gear, basic crafting materials, and rare modifier-bearing items.
- Specific enemy families favor particular bases, ability engravings, support Glyphs and crafting materials. Example: Ashen Zealots prefer Ember Brand materials; Grave Knights prefer impact/guard; Rift Shades prefer shadow conversion. **Targeted influence, not exclusive drops**, so experimentation stays possible.
- Bosses have small **named loot pools** with unique behavior; they also grant recipes/engravings and meaningful first-kill milestones.
- Craft-worthy White bases should be visible in filters as "valuable base", independent of item color.
- Smart-loot should avoid flooding players with completely unusable items but preserve off-build discoveries that inspire new characters.
- Distinguish actual per-kill probabilities from conditional rarity probabilities when showing odds.
- Special loot cannot be silently destroyed if a player is offline and the bag is full. Protected overflow requires a finite, documented policy.

**Illustrative hunt:** farm Grave Knights for a Heavy Mace base and Fracture Glyph; upgrade it into a Rare, engrave Aegis Pulse on a compatible amulet from a different hunt, and keep a Unique shield that changes blocking into damage. Every choice affects the automatic script without an active combat button.

## 9. Deterministic runtime, server safety and offline simulation

The current browser game has one deterministic simulation in web/src/sim.js with SIM_VERSION 4. **Preserve the event-driven simulation; do not revive the abandoned global one-second combat tick.**

A future human-readable model could use small modules/data:
- weapon-bases: implicit actions, tags, speeds, allowed equipment;
- ability-catalog: trigger, cooldown, effects, source rules;
- support-catalog: compatibility and stat changes;
- item-generation: rarity and tagged affix pools;
- crafting-actions: validated state changes/costs;
- combat-scheduler: seeded RNG, event ordering, caps;
- save-migrations: item/ability versions and conversion tests.

The UI calls validated actions; it does not reimplement combat. Every mechanic runs identically for online play, offline catch-up, boss snapshots, and build comparisons. Include trigger recursion caps and event budgets. Profile long offline catch-up, inventory size and mobile UI; never assume 5 full builds of spell procs are cheap because the current game is single-target.

**Migration is a separate project:** don't replace legacy Epic/Legendary/Ascended save items by coercing them into new formats. Plan a versioned adapter and test representative old saves; preserve originals/export safety. Integrating the unconnected server branch needs a separate security design.

## 10. A complete example character

**“Ash Dagger Inquisitor” is an illustrative build, not a current class or confirmed name.**

- **White base:** Quick Dagger → Twin Cuts, 0.85 sec base interval, physical.
- **Crafted Rare dagger:** converts 30% of primary damage to fire; critical hits accelerate burn refresh (bounded cooldown). The baseline Twin Cuts remains automatic.
- **Conduit 1, Ember Brand (from amulet):** after every four primary hits, starts/refreshes a DoT. Lingering support extends duration but cuts first impact.
- **Conduit 2, Blood Mark (from mastery):** first critical hit when ready applies bleed; Execution support shifts payoff toward low-health bosses.
- **Conduit 3, Aegis Pulse (from helm engraving):** at low health raises a shield for survival.
- **Conduit 4, Spirit Hawk (from Unique gloves):** periodic companion damage; its attacks don't trigger other conduit skills.
- **Conduit 5, Rift Reprisal (from boss recipe on boots):** retaliates when hit, limited by cooldown.
- **Gameplay:** choose which enemy to farm and which ability/gear to sacrifice for survivability. No manual attack input and no five-actives-at-once button barrage.

Item card reads simply: base and implicit → active engraved skill/source → supports → affix stats → restrictions → predicted change against selected enemy.

## 11. Practical scope and release plan

This is a fundamental redesign, **not an afternoon reforge of the current item tables**. It touches combat cadence, item generation, saves, inventory, UI and the server-compatibility layer. A giant rewrite of web/src/sim.js would repeat the Godot mistake.

**Phase 0: owner design lock.** Decide core behavior and what happens to existing progression, classes, class skills, jewels, and Ascension.

**Phase 1: isolated combat prototype.** On a new branch from preview/browser, implement 3 white weapon families, 2 damage elements, 1 mastery ability and 2 item-granted skills; 1 support each; deterministic logs. Keep the live preview untouched and build a separately testable sandbox.

**Phase 2: item generator and accessible Forge.** Four rarity classes, 12–15 curated affixes, White→Magic→Rare, engraving, salvaging and non-destructive previews. Don't add every proposed support/Unique.

**Phase 3: loot ecosystem.** Targeted monster-family drops, 3–5 boss signatures, 5-skill capacity milestones, protected overflow, balance bot and mobile usability tests.

**Phase 4: save migration and integration.** Snapshot/export old saves, create and test adapters, integrate incrementally with the existing browser UI, test offline parity, CI and rollback. Deploy to the public Godscar preview only with informed approval once the new loop is playable.

**Phase 5: live-service consideration.** Server authority, account binding, anti-cheat and trading only if actually required. Never imply current public browser game is secure multiplayer.

### Acceptance criteria
- A brand-new White Sword attacks indefinitely without any other item or ability.
- Swapping White Sword ↔ Fire Wand changes primary action and damage type, with a logged explanation.
- A player can equip 1–5 extra sourced abilities; sixth stays inactive, with a clear reason.
- Removing an item source deactivates only its granted ability and retains build configuration for later.
- Supports alter exactly the tagged skill and validate illegal combinations.
- Triggered abilities never create unbounded recursive chains.
- Offline results match deterministic live simulation under the same seed/actions and state.
- Crafting cannot silently destroy a locked item, a protected drop or the only usable primary weapon.
- A targeted white-base drop can be upgraded into a meaningful endgame Rare.
- Existing saves are preserved until a tested migration is approved.
- A human unfamiliar with the project can follow item→source→conduit→event→damage and find the matching test.

## 12. Questions for owner review before implementation

These are material choices, intentionally NOT already decided:
1. **Weapon classes:** which existing/new weapon families to keep and whether all classes can use all of them.
2. **Skill sources:** should equipment-granted skills vanish on unequip, or can discoveries become permanently learned once earned?
3. **Conduit pacing:** exact milestones/levels for unlocking 1 through 5 additional automatic slots, and whether slots are global or class-specific.
4. **Support depth:** one or two support sockets per ability, whether primary actions can be modified, and how effects are visibly equipped.
5. **Rarity migration:** fully replace old tiers with Normal/Magic/Rare/Unique, or temporarily retain Epic/Legendary/Ascended as special legacy categories?
6. **Class identity:** preserve classes, specializations and transformations, and how class skills fit into mastery versus gear-based sources.
7. **Loot retention:** size and priority order of the protected overflow queue, including after 24-hour offline catch-up.
8. **Economy:** targeted but random crafting versus more deterministic crafting, material sources, failure risks and gold sinks.
9. **Unique effects:** whether they only transform abilities or may grant a new extra skill and how often they drop.
10. **Targeting and combat scope:** existing one-monster combat vs future multi-enemy, without promising unimplemented AoE mechanics.

## Status discipline

**Confirmed owner direction:** baseline white-weapon autocast; another 1–5 automated skills/DoTs/attacks from loot, crafting and progression; deep player customization influenced by PoE/Grim Dawn/Diablo; continuous idle combat.

**Assistant proposals only:** The Living Arsenal name, Conduits name, nine weapon families, four rarities, specific skills/supports, conditional triggers, crafting currencies, target drop tables, stage unlock pacing and implementation phases. No pricing, drop chances or thresholds are tuned/approved.

**Verified existing software:** original browser project and its current item system remain unmodified, with separate old documentation and code. Server phase 1 is a development scaffold only.
