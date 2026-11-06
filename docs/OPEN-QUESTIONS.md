# Open questions and design uncertainties

Ask the owner before material implementation. Keep entries short and update status when answered. Don't block small reversible bug fixes on unrelated future planning.

| Area | Question / missing evidence | Current safe action |
| --- | --- | --- |
| Latest Claude state | Did the owner make further Claude-only changes after the committed browser build? | Compare current live preview with screenshots/artifact/export before claiming full parity. |
| Save portability | Does the owner have a Claude artifact save code, and which import path should be supported? | Preserve existing Build Export/Import flow; do not overwrite or silently migrate saves. |
| Multiplayer | When/how to bring server-side simulation and accounts online? | Treat `feature/server-phase1` as development-only; assess security, cost, migrations and beta scope first. |
| Visual assets | Where is the official original Godscar logo kit and other approved game artwork? | Don't substitute a new generic logo and claim final integration. |
| Product scope | Which next feature should be a genuine playable vertical slice rather than an MMO-sized promise? | Discuss player value, small acceptance criteria and real engineering cost. |
| Default branch | Should active browser development eventually become the default branch? | Keep `main` as a clear signpost to `preview/browser` until owner approves changing GitHub settings. |
| Item and equipment review | I01–I17 choices are not yet approved; owner is reviewing all implemented behavior. | Read `docs/ITEMS-AND-EQUIPMENT.md`; do not treat prototypes as final design. |\n| Inventory overflow | Should notable Legendary/Ascended drops be destroyed for gold when the bag is full, including offline? | Current code does this; keep behavior unchanged pending owner design decision. |\n| Crafting item level | Does the initialized Hollow stage permit higher-level crafting before zone unlock? | Add a focused reproduction test before changing code. |\n| Living Arsenal progression | Test level gates for five slots, mastery persistence, skill source permanence and recovery economics. These are tuning proposals, not owner-approved thresholds. | Read `docs/PROGRESSION-V2.md` and build an isolated prototype first. |
| Brighter world identity | Decide how much to revise old logo, which new biomes, and final UI palette after visual review. | Read `docs/VISUAL-DIRECTION-V2.md`; preserve selected logo until approved replacement. |
| Itemization v2 | Review the proposed Living Arsenal: weapon families, skill-source persistence, progression to 5 slots, rarity simplification, support sockets, crafting control and class identity. | Read `docs/proposals/LIVING-ARSENAL-ITEMIZATION-V2.md`; no gameplay changes until design choices confirmed. |
| Balance | Which stats, encounters or drop rates are placeholders vs intentionally tuned? | Read source/tests; label hypotheses, collect measurements and confirm important changes. |

**Resolution protocol:** when the owner answers, move the answer into `docs/DECISIONS.md` with date, scope and consequence, then edit this table. Avoid asking the same answered question again.
