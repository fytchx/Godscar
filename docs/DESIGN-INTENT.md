# Godscar design intent, owner direction, and how to clarify design

> **2026-11-06 current direction:** The Living Arsenal is now the core of Godscar. The weapon's primary always attacks and loot, crafting and progression provide up to 5 other automatic abilities. Changing playstyles must remain possible without permanent dead-ends, but significant investments and risk matter. World identity should be brighter and more adventurous without losing the Godscar wound. Read [PROGRESSION-V2.md](PROGRESSION-V2.md) and [VISUAL-DIRECTION-V2.md](VISUAL-DIRECTION-V2.md). This supersedes older assumptions that the existing item system is final.

This is an **intent document**, not a comprehensive approved game design document. Separate confirmed direction from ideas and current code behavior. The owner wants honest feasibility advice and design decisions that make sense to a future human contributor.

## Confirmed central experience
- A character is **always battling enemies on its own**. The player does not need to press attack or actively control combat to progress.
- While combat runs, players can inspect loot, compare/equip gear, plan builds, manage autocast spells, craft, hunt bosses, explore progression and engage with other systems. Nothing should trivially stop ordinary farming.
- The fun comes from **buildcraft, progression, loot and meaningful decisions**, with combat as the reliable background heartbeat. Deep systems should provide choice, not mandatory attention every second.
- Mobile-first browsing is the **current validated development medium**. A future native APK is possible but **not a reason to replace working systems**.
- The setting is dark fantasy, involving Godscar/the Godwound, Blight, Caldris, a crimson anomalous fissure, corrupted environments and ascension mysteries. Only specific established lore from code/docs is confirmed.

## Visual design already selected
See `docs/visual_identity.md`. The approved GODSCAR wordmark uses weathered gothic-metal lettering and a crimson split in its O. The crimson anomaly is a distinct world force, **not generic fire**. Contrast corrupted vs uncorrupted world environments. Legibility comes before ornamental effects, especially on phones. The official art asset files were described in the earlier design conversation and are **not verified in the game repository**. Do not infer that an arbitrary new generated logo/image is the same approved asset.

## Current implementation is not the complete design mandate
Some systems that exist in `web/src/sim.js` are working prototype decisions, not necessarily final: five classes, six damage types, affixes, specializations, auto-push, spells, ascension, set bonuses, jewels, two zones and bosses. Do **not** extrapolate a full MMO roadmap or class tree from these without asking. There are known placeholders and evolving balance numbers.

## Previous direction rejected
An earlier experiment used Godot and manual movement / skills, and a later rewrite of the browser game into a stripped-down Godot APK lost substantial fidelity. The owner explicitly rejected that detour and approved returning to the original browser game. Do not revive that direction by default. "Can Godot export an APK?" is **separate** from "does this implementation match the product?"

## Before proposing or implementing material design
**Understand the existing experience**: inspect the relevant UI, sim rules, content definitions, test cases and live behavior. Then write a short design brief:
1. **Player problem / goal:** Why does this add fun to continuous combat?
2. **Exact behavior:** What happens in the background while player changes tabs or goes offline?
3. **System interactions:** Loot, currencies, gearing, stats, classes, bosses, stage progress, save state, balancing and abuse surface.
4. **User experience:** Phone layout, interaction cost, clarity/feedback, accessibility, edge cases.
5. **Scope and tradeoffs:** Simplest usable version, time/complexity risk, alternative worth considering.
6. **Verification:** How to know this is correct, including a human acceptance scenario.
7. **Unknowns:** A direct question for the owner where intent actually determines behavior.

If a description is contradictory or materially ambiguous, **clarify before coding or generating art**. If there is enough information for a small reversible fix, implement pragmatically and state your assumptions. Don't invent a mechanic, quest, item tier, currency, animation style, map layout, or lore to make a demo feel finished.

## Honest pushback is required
- Identify when a system accidentally becomes a clicker, demands constant attention, creates idle-progress exploits, multiplies maintenance work, or complicates multiplayer unnecessarily.
- Suggest smaller, testable vertical slices rather than promising a complete MMO or polished 3D world in one sprint.
- Avoid automatic "yes" answers. Be able to say "we cannot safely ship that yet" and explain what must change.
- Never portray game artwork or interactions as completed if they only exist as mockups. Never confuse server-auth code plans with a running server.

## Design handoff rule
When the owner confirms a new decision, capture it in `docs/DECISIONS.md`, update this file if it alters the identity/rules, then implement and test as an **atomic documented change**. Keep unanswered ideas in `docs/OPEN-QUESTIONS.md` with clear status.
