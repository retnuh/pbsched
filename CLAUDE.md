# Project Instructions

## Milestone Numbering

Always refer to milestones by number (Milestone 6, Milestone 7, etc.). Never use semantic versioning (v1.0, v1.1, v2.0) for milestones unless explicitly requested by the user.

## Executor Worktree Safety — MANDATORY

After ANY executor agent merges a worktree back to main, BEFORE proceeding to verification or any next step, you MUST run these checks:

```bash
# 1. Detect deleted planning files (compare against the pre-executor base commit)
git diff --name-only --diff-filter=D <base-commit> HEAD -- .planning/

# 2. Detect out-of-scope src modifications (cross-check against plan's files_modified list)
git diff --name-only <base-commit> HEAD -- src/

# 3. Specifically verify ROADMAP.md was NOT overwritten — this has happened before
git show HEAD:.planning/ROADMAP.md | head -5
# Must show current milestone content, NOT old "Milestone 0/1/2..." content
```

If ANY planning file is missing or ROADMAP.md shows wrong content, restore immediately:
```bash
git checkout <base-commit> -- <file>
```
Then commit the restore BEFORE continuing.

**Why this matters:** Executor worktrees have repeatedly deleted planning files and silently overwritten ROADMAP.md with stale content mid-execution. This corrupts project state and wastes significant time to diagnose and fix.
