# Workflow: every change is committed, understandable and resumable

## Working branch and deployment
- Active development is **`preview/browser`**, a branch holding the original browser game and separate Railway preview. It **auto-deploys** on commit. Preview: https://godscar-browser-preview-preview.up.railway.app/
- `web` is a known historical browser baseline. `feature/server-phase1` is an unconnected server experiment. `main` has the incomplete Godot project. Avoid merging or deploying these without a reason and explicit owner agreement.
- Risky/large tasks should use `work/<short-purpose>` branched **from `preview/browser`**, then merge through review; routine safe edits may be committed directly to the active branch. Always state which branch received the change.
- Repository state outlives conversation state. Do not leave major decisions solely in chats, comments, or issue messages.

## Start a session
1. Fetch/refresh GitHub; verify repository, current branch and HEAD SHA, uncommitted changes and CI/deployment state.
2. Read root docs in the order defined in `START-HERE.md`; read latest two changelog entries and relevant source/tests.
3. State what's verified vs assumed, and define a small specific goal, player-facing acceptance criteria and known design questions.
4. Ask the owner when a major design choice is ambiguous; challenge high-risk proposals based on gameplay, scope and maintenance rather than agreeing automatically.

## Implement
1. Work in the existing game. Identify one clear entry point and impact on nonstop combat, state, offline play, balance and persistence.
2. Avoid reimplementing the game in Godot, Arcana or a different framework unless explicitly confirmed and fidelity-tested.
3. Write readable code per `docs/CODE-STANDARDS.md`. Document new rules and design rationale as needed.
4. Add or adapt focused tests. Run:
   ```bash
   npm test
   npm run build
   # optional original coverage:
   cd web && node test/balance.js warrior 1
   # browser UX: web/test/browser.js requires Playwright setup
   ```
   Also run the existing GitHub `Web tests` and `Godscar original browser preview checks`. A passing build is not proof of device usability or gameplay design quality.
5. Inspect the diff. For save schema changes, test old save hydration and rollback; back up old data. For simulation changes, evaluate `SIM_VERSION`, determinism and the server branch compatibility. Never fake test status.

## **Atomic documentation and GitHub commit rule**
**Every coherent source, config, asset, test, deploy-script or workflow change must include:**
- **`docs/PROJECT-STATE.md`:** update present behavior, new risks, known gaps, next concrete step, and last completed activity. Remove claims that became false.
- **`docs/CHANGELOG.md`:** prepend a dated entry with summary, why, files, tests/results, preview/deployment status, caveats and follow-up.
- If decision changed: **`docs/DECISIONS.md`** (+ `docs/DESIGN-INTENT.md` as relevant).
- If architecture/API/save or code structure changed: **`docs/ARCHITECTURE.md`** and/or **`docs/CODE-STANDARDS.md`**, with clear human-oriented explanation.
- If a question was resolved/newly raised: **`docs/OPEN-QUESTIONS.md`**.

Update documentation **in the same commit as the change**. Don't promise "I'll update later" or defer it until the conversation ends. Keep doc-only corrections focused and factual; don't generate infinite self-referential changelog entries.

A CI check in `.github/workflows/handoff.yml` checks whether the latest change set touched both state and changelog. **This is an aid, not a guarantee**: GitHub may allow pushes even when checks fail until branch protection is separately configured.

## Finish and verification
1. Commit + push the correct branch. Never force-push, delete old work or change the default branch without approval.
2. Verify remote commit SHA and review relevant GitHub workflow results. A newly queued workflow is NOT a pass.
3. If the commit auto-deploys: confirm Railway deployment status, deployed SHA, `/health`, game page, and important interaction paths. Preview is publicly accessible.
4. Report concrete commit link, files, tests (pass/fail/not run), deployment status, limitations, and next action. Say **NOT COMMITTED** or **NOT DEPLOYED** if blocked.
5. Update the handoff section in `docs/PROJECT-STATE.md` so the next AI can start from GitHub alone.

## Rollback and data safety
- Keep known-good commit SHAs. Revert via a new commit, rather than erasing branch history.
- Never assume a browser-local save automatically transfers between the Claude artifact and Railway domains. Before changes to load/serialize/migrate, test export/import and ask before risking existing player data.
- Server branch login links currently print to logs and require local-only mode. Do not deploy it as a public account backend.
- Make explicit approval mandatory before publishing account systems, inviting real players, destructive migrations, spending real money on infrastructure, or touching Arcana.
