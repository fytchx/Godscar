# Godscar change review

**Read `AGENTS.md` and `START-HERE.md` first.** PRs targeting the active game should be based on `preview/browser`, not `main`.

## Why / player value
Describe the problem or design intent, including what continues happening during automatic combat.

## Change summary
Describe each affected layer (simulation, UI, save data, content, preview/deployment). Link an approved decision or flag the question that needs owner clarification.

## Human readability
- [ ] A human unfamiliar with this chat can follow the names, flow, state changes and rationale.
- [ ] No unrelated rewrite, dense magic abstraction or huge opaque generated file.
- [ ] New mechanics have clear rules, readable UI text and relevant tests.

## Safety and continuity
- [ ] Preserved continuous idle combat and current original browser architecture.
- [ ] Save migration, action validation, deterministic behavior and offline play assessed if affected.
- [ ] `docs/PROJECT-STATE.md` and `docs/CHANGELOG.md` updated in the same commit as any code/config/asset change.
- [ ] Decisions, architecture and open questions updated where relevant.
- [ ] No secrets, unapproved major design, Arcana modifications or unauthorized public backend deployment.

## Actual evidence
List exact tests run, their result, remote commit SHA, CI status, Railway preview deployment status and anything **not verified**.

## Follow-up
Document accepted limitations and the next specific action.
