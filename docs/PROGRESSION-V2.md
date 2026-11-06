# GODSCAR: Living Arsenal progression architecture
**Status:** Core philosophy OWNER-APPROVED on 2026-11-06 PT; specific level thresholds, mechanics, numbers, item/currency names and content are ENGINEERING PROPOSALS pending playtest. This is not a claim of full implementation.

## North-star player loop
**Fight without input → discover equipment/skills/supports → alter automated loadout → deliberately challenge stronger prey → gain resources and knowledge → repeat.**

Combat does not stop for UI, loot management, crafting, boss attempts or experimentation. A white weapon always has an innate attack. Character progression allows **up to five additional autonomous ability slots**, sourced from progression, gear, crafted inscriptions or named finds. Supports modify existing abilities and do not secretly create sixth/seventh skill slots.

## Player promise: never permanently stuck
Never-stuck is **not** never-lose, automatic victory, no resource cost, or every build performing equally.
- **Always a viable earning route:** the lowest available hunt provides guaranteed low-tier material/XP income, including when a higher-tier boss is unbeatable. No absolute negative economy spirals.
- **No irreversible character trap:** level gains, opened regions, unlocked ability-slot capacity and weapon-family mastery persist. Players may switch equipment and automatic ability loadouts without spending premium or rare respec currencies.
- **Recovery costs are bounded:** reallocating permanent progression choices is cheap/free; retooling equipment has material costs. A valuable current item can be retired for a found item from another playstyle.
- **Risk is explicit and voluntary:** high-end item corruption, volatile reforging and similar loss-bearing actions must show odds, failure outcomes, protected exceptions and confirmation. No surprise destruction while offline, auto-salvaging or swapping builds.
- **Difficulty still exists:** boss access and drops may require preparation; challenge failure consumes an ordinary attempt token or time but doesn't delete access to basic progression.
- **Targetable paths:** hunt families, recipe fragments or deterministic milestones provide eventually achievable alternatives to pure lottery. No required item may depend solely on an unlimited unbounded 1-in-a-million drop.
- **Deliberate commitment rewards:** specializing in one weapon grants efficiency or targeted bonuses; switching retains prior mastery but needs time to train the new family. A fresh weapon is never unusable due to prior investments.

## The three-layer progression system

### 1. Character progression: the chassis
Character XP and levels grant baseline survival, access to the 1–5 additional-ability capacity, and a small pool of build-agnostic choices. Character progression cannot be irreversibly misallocated.
**PROVISIONAL vertical-slice milestones:** one conduit at level 2, then 5, 10, 18, 30. This is an example pacing curve for tests, NOT approved levels. The player always has their free weapon action even at level 1.
Make early learning rapid: a new player should experience their first extra automatic ability quickly. The fifth slot is a long-term goal. If a slot is unlocked but a skill source is absent, the character still fights normally.
Use a respec feature for any talent choices that is free outside a boss fight and cannot erase XP or earned abilities. Keep class identity meaningful through preferred stats and mastery bonuses, not weapon hard-locks, until the owner confirms class rules.

### 2. Arsenal progression: the player's library
Weapon-family familiarity improves through **use**. It can unlock support compatibility, recipe knowledge, alternate attack behavior, or narrow conditional bonuses. The value should largely be knowledge and access, not permanent multiplication of total damage; otherwise old specialization becomes a trap.
- Mastery gained on a sword persists when swapping to a wand.
- Starting a new weapon family is always possible; the new family's lower mastery matters, but a good find can bridge the gap.
- Engraved item abilities remain tied to their item **for this proposal's test slice**. Optional permanent unlocks through repeated discovery/boss research can prevent item loss from erasing a viable build.
- Supports are learned/crafted into a library, then equipped to compatible skills using resources.
- Loadout configuration persists independently from current item sources; unavailable skills are clearly marked inactive, never replaced silently.
- Weapon switching should offer a truthful damage/proc/survival comparison rather than a universal green-arrow score.

### 3. World progression: the opportunity map
Regions open after achievable combat milestones, optional bosses and discoveries. Separate three things:
- **Access:** unlocking a new region; primarily reliable milestone progress.
- **Challenge:** defeating difficult monsters, boss tiers and optional modifiers for improved efficiency and special drops.
- **Discovery:** learning recipe families, gaining skill/Unique sources, monster codex and specialization material paths.

An unbeatable boss never blocks every other hunt, resource, ability, or XP source. Optional bosses may have exclusive thematic rewards but not the only way to keep growing. Every monster family should have at least one grounded reason to farm it.

## Progression stages (design ranges, NOT balancing claims)
| Phase | Character power | Typical choices | Intended learning |
| --- | --- | --- | --- |
| First hours | White weapon and 1 extra conduit | Two or three weapon families, basic Magic crafting, starter ability | The weapon always fights; one support changes behavior |
| Early game | 2 conduits | Two damage strategies, auto-defense, targeted hunts | Fewer good choices beat five random procs |
| Midgame | 3 conduits | Crafted Rares, tagged supports, class synergies | A new drop can justify switching the build |
| Advanced | 4 conduits | Specialized enemy farms, distinctive Uniques, conditional triggers | Commit to a coherent engine and counters |
| Long-term | 5 conduits | Complex but bounded interactions, higher challenge tiers, optional risk crafts | Deliberate mastery without permanent lock-in |

Character levels need not align 1:1 with world chapters, item tiers or weapon proficiency. Do not add exponential tiers simply to extend grind.

## Resource economy and "the floor"
The minimum earning floor is **measured**, not a promise of infinite wealth: a safe farm provides XP and a basic crafting resource even if item RNG is poor. Advanced materials are obtained from themed enemies and activities. **Gold and basic salvage must cover ordinary recovery costs within a reasonable number of kills** after failed experimentation; concrete budgets and income need simulation.
Suggested first economy (names provisional):
- **Scrap**: any hunt / salvaging; basic reforging and retooling.
- **Seals**: Magic/Rare salvage, harder monster families; upgrading affix quality.
- **Sigils**: targeted challenges or fragments; ability engraving, not the only way to gain an early extra ability.
- **Glyphs**: skill support materials with targeted monster-family sourcing.
Rare risk currency is optional, never required to make a functional build. Avoid introducing 6+ generic essence currencies as mandatory ingredients for everything.

## Item lifecycle and player agency
1. Find **White** equipment with a known innate action/base identity.
2. Keep it White, or upgrade to Magic and then Rare by investing materials; preserve the base and meaningful earlier decisions.
3. Acquire **one or more abilities** from mastery, found engravings or named items; use up to five extra slots.
4. Put compatible supports onto the *specific* action you want to change.
5. Pursue chosen monster families for new bases/materials/recipes and improve gear incrementally.
6. A better/different playstyle item drops; test it using freely swappable loadouts. Current gear doesn't become permanently unusable.
7. Optional risky transformations occur only with explicit confirmation and a way back to viable farming.

### Non-negotiable loot safety
Never invisibly destroy an unreviewed Unique or protected high-value find because of offline overflow. Bounded protection must be designed without unbounded memory: reserve e.g. a finite overflow mailbox and explicitly inform the player when it fills. Common loot can auto-salvage by settings; high-priority overflow needs a documented policy and tests. No silent equipment destruction.

## Combat invariants
- Weapon primary attack has no player button and continues through menus.
- Added automatic abilities are limited to unlocked conduit count, max five; triggers/cooldowns fire automatically.
- Supports modify *one tagged source*, not an unbounded proc graph.
- Triggered casts do not cause recursively triggered casts by default; deterministic event budgets and seeded RNG apply to live/offline/boss simulations.
- Same seed + input actions yields same results. Offline catch-up must be bounded and profiled on mobile.
- Build switching, skill removal and refills should not interrupt normal farming outside honest combat transition timing.

## What the first playable prototype needs (not the full game's scope)
Build an **additive experimental page/route** alongside the untouched approved browser game. No account/system deploy, no migration needed because the owner explicitly deprioritized prototype saves/progress. Do NOT casually wipe the existing browser origin's saved character.
- White Sword/Dagger/Fire Wand with visibly different automatic base attacks.
- 1–5 conduit milestones and at least three independently triggered extra skills, one defensive.
- One tagged support with meaningful tradeoff and compatibility checks.
- White→Magic→Rare crafting using basic earned resources; ability engraving through a targeted earn/spend mechanic.
- A safe starter hunt and one challenging hunt, positive resource floor, voluntary risk action (later).
- Weapon swapping and loadout edits without irreversible penalties.
- Deterministic Node tests for primary uninterrupted attacks, slot cap, availability, source removal, crafting material validation, low-resource recovery and high-priority loot preservation.
- Phone-first UI, clear status, lightweight logs. No pretending this is full Diablo/PoE complexity.

## Decisions already established vs still to test
**Approved:** weapon-driven always-on primary; 1–5 additional modifiable autocast powers; deep loot/crafting as the heart of the game; never permanent character dead-ends while preserving costs, intention and meaningful risk; warmer/brighter identity between dark Diablo and IdleArc; no need to preserve legacy *progress* through prototype redesign.
**Unconfirmed:** class/weapon restrictions, exact conduit unlock levels, whether item spells become permanent discoveries, detailed craft risk/refunds, four rarity categories as final, Unique trading and multiplayer, precise drop/cost curves, whether a future optional corruption can permanently destroy items, and specific visual palette. Prototype defaults are reversible hypotheses, NOT approvals.
