# Project Mandates: Pickleball Practice Scheduler

This file contains foundational instructions for AI agents working on this project. These mandates take absolute precedence over general defaults.

## 📋 Documentation First
- **Mandate:** All planning documents (`ROADMAP.md`, `STATE.md`, `PLAN.md`) **MUST** be updated to reflect current progress and future intent **BEFORE** any code changes are committed or published to GitHub.
- **Rationale:** Ensures the project state remains the "source of truth" for collaborative development and provides clear context for future sessions.

## ⚠️ Executor Worktree Safety — MANDATORY

After ANY executor agent merges a worktree back to main, BEFORE proceeding to verification or any next step, run these checks:

```bash
# 1. Detect deleted planning files
git diff --name-only --diff-filter=D <base-commit> HEAD -- .planning/

# 2. Detect out-of-scope src modifications (cross-check against plan's files_modified list)
git diff --name-only <base-commit> HEAD -- src/

# 3. Verify ROADMAP.md was NOT overwritten with stale content
git show HEAD:.planning/ROADMAP.md | head -5
# Must show current milestone, NOT old "Milestone 0/1/2..." content
```

If ANY planning file is missing or ROADMAP.md shows wrong content, restore immediately before continuing:
```bash
git checkout <base-commit> -- <file>
```

**Why:** Executor worktrees have repeatedly deleted `.planning/` files and silently overwritten `ROADMAP.md` with old content. This has corrupted project state multiple times.

## 🚀 Deployment Discipline
- **Mandate:** Always run `npm run build` locally before pushing to verify the production bundle.
- **Mandate:** Use the `just deploy` command to ensure the `check` (install, test, build) suite passes before pushing to the main branch.

## 📱 Mobile Integrity
- **Mandate:** Prioritize the mobile experience. Any new feature must be verified against the `fixed-safe-bottom` layout and ensure haptic feedback is integrated where appropriate.
