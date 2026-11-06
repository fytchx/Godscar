# Godscar project changelog and handoff history

This log records **completed and committed change sets**, not wishes. Most recent first. For every code/asset/config/test change, prepend an entry in the **same commit** as that change. Distinguish tests and deployment status from assumptions. Important old entries should not be deleted.

## 2026-11-05 PT — Durable GitHub handoff and human-readable standards
- **What / why:** Created permanent AI + human onboarding and contributor agreement, active-branch signpost, current project snapshot, confirmed design intent/decisions, code readability standards, architecture map, workflow, open questions, PR checklist, and an automated documentation completeness check. This is to stop future agents starting from the abandoned Godot remake or losing work between conversations.
- **Paths:** `AGENTS.md`, `CLAUDE.md`, `START-HERE.md`, `docs/{PROJECT-STATE,DESIGN-INTENT,DECISIONS,ARCHITECTURE,CODE-STANDARDS,WORKFLOW,OPEN-QUESTIONS,CHANGELOG}.md`, `.github/PULL_REQUEST_TEMPLATE.md`, `.github/workflows/handoff.yml`, `scripts/check-handoff.mjs`.
- **Game impact:** None. Source files `web/src/` unchanged.
- **Validation:** Documentation cross-references / CI handoff gate must be checked after commit. The prior original browser game and preview workflows were green as of the earlier deployment, not proof of any newer code changes.
- **Deployment:** Commit to `preview/browser` triggers Railway auto-deploy. Check status and deployed revision afterward.
- **Risks / next:** Default GitHub branch remains `main`; update its top-level README/instructions to route collaborators to active branch. Ensure future commits honor same-commit documentation.
  
## 2026-11-05 PT — Original Claude browser game restored as separate live preview
- **What / why:** Reused unmodified `web/src/sim.js`, `web/src/ui.js`, `web/src/shell.html` from saved browser branch. Added Node build/server on `preview/browser` and an isolated Railway preview, without touching Arcana.
- **Validation:** [Preview workflow passed](https://github.com/fytchx/Godscar/actions/runs/42172538698); [legacy Web tests passed](https://github.com/fytchx/Godscar/actions/runs/42172538774); public web page and `/health` returned content.
- **Owner acceptance:** Owner recognized and approved this as the intended game.
- **Limitations:** Browser saves are origin-specific, Claude cloud sync does not automatically transfer, server authority not live, later uncommitted Claude work unknown.

## Earlier — Incorrect Godot APK rewrite
- **What happened:** An unfaithful native Godot version was committed to default `main` and packaged for Android. Basic automated tests passed but presentation and mechanics did not match the original game. The owner rejected it.
- **Disposition:** Preserve history only; do not build current game features on this rewrite or claim it was faithful.
