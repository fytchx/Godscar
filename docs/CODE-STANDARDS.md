# Human-first coding and documentation standards

A competent human developer with no history of this project should be able to understand the game, trace an action, change a rule and review the design without asking an AI to decode the codebase.

## Primary standards
1. **Prefer clarity over cleverness.** Write plain, conventional JavaScript and HTML/CSS. Choose names that describe purpose: `calculateDamage`, `applyBossReward`, `saveCharacter`, not mystery abbreviations or one-letter parameters (except narrow local loops). Avoid nested ternaries and clever expression chains.
2. **One concern at a time.** Separate domain rules, presentation, persistence and networking. A module/function should have one explainable responsibility. Avoid giant UI renderers that also do state mutation, or network handlers that contain combat math.
3. **Make state and actions explicit.** Show inputs, outputs, valid ranges, invariants, failure modes, what is mutated, what is returned, and whether a function is deterministic. Important state schemas should be described beside the code and in `docs/ARCHITECTURE.md`.
4. **Comments explain WHY.** Don't narrate obvious syntax. Explain non-obvious design choices, balance formulas, deterministic RNG, timer ordering, defensive checks, migration behavior and anything surprising. Refer to a decision record when one exists.
5. **Naming and layout should match game concepts.** One canonical term for a concept across UI, sim, data, tests and docs; make conversions or aliases explicit. Use simple file paths. Don't invent placeholder fake services, mock data or new game jargon and silently present them as real.
6. **Document numbers that matter.** Give balance constants meaningful names or nearby rationale; distinguish tuned values from tentative ones. Do not change ten interacting damage multipliers just to tidy a function.
7. **Error handling should be visible.** Actions report understandable validation failures. Never swallow errors silently merely to keep a demo pretty. Protect user progress and explain failure/recovery pathways.
8. **Keep change sets reviewable.** Small focused diffs, related tests, clear commit message and plain-English rationale. Don't reformat unrelated files or silently replace established assets. Use incremental refactors with behavior-preserving tests.
9. **Don't optimize prematurely.** Measure performance bottlenecks. For mobile, consider long offline catch-up, frequent re-renders, memory usage and accessibility. Avoid dependencies without explaining their benefit.
10. **No opaque generated code.** Don't commit compressed/minified source, giant base64 blobs, inscrutable one-line implementations or enormous HTML strings as the ONLY editable source. Generated `web/dist/index.html` is a build artifact, not the source of truth.

## Existing technical debt is acknowledged, not permission to compound it
`web/src/sim.js` and `web/src/ui.js` predate these standards and are relatively large. Do NOT rewrite them in bulk or demand arbitrary file-length limits. When adding a feature, first locate the correct existing function, add the smallest readable change and supporting test. Extract shared, stable seams only when the risk is justified and the legacy browser build will remain equivalent. Link the refactor to behavior tests.

## When writing new mechanics
- Introduce a short player-facing description, accepted use cases and edge cases.
- Describe data format and effects in code/docs.
- Identify deterministic simulation consequences, offline timing, balance/projection effects, save compatibility and possible exploits.
- Write focused tests (including rejected actions, boundary cases and consistency of offline vs live simulation).
- Keep UI interactions touch-friendly and readable at narrow widths. Distinguish actual visual assets from sketches or placeholders.

## When writing UI and art
- Read `docs/visual_identity.md` and actual current `web/src/shell.html`. Don't restyle the whole game because "modern UI" sounds attractive.
- State visual hierarchy, font/readability intent, behavior at phone width, feedback for background combat and accessibility concerns.
- Do not use generic, inconsistent AI art, substitute an unofficial logo, or claim graphics are integrated before they are.
- Before implementing unclear art direction, present specific choices and ask the owner. Maintain continuity with established world color and approved brand imagery.

## Human review checklist
A new contributor should be able to answer:
- Where does this feature live? Which file/function is the entry point?
- What player intent causes it? What happens while combat continues?
- What states are read/written, and how is save compatibility protected?
- Which tests prove the behavior? Which parts remain uncertain?
- Can I change this in isolation without knowing someone's chat history?

If any answer is "the AI knows," the code/docs are not done.
