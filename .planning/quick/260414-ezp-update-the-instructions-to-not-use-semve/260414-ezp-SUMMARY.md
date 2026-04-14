# Quick Task 260414-ezp: Update instructions — no semver

**Completed:** 2026-04-14

## What Was Done

Created `CLAUDE.md` at the project root with a rule prohibiting semantic versioning for milestones. Milestones must always be referred to by number (Milestone 6, Milestone 7) unless the user explicitly requests semver notation.

Also cleaned up existing semver references from PROJECT.md, RETROSPECTIVE.md, and STATE.md.

## Files Changed

- `CLAUDE.md` — created with no-semver rule
- `.planning/PROJECT.md` — removed all `v1.0` milestone references, replaced with `Milestone 6`
- `.planning/RETROSPECTIVE.md` — replaced all `v1.0` milestone references with `Milestone 6`
- `.planning/STATE.md` — replaced `Quick Tasks (v1.0)` heading
