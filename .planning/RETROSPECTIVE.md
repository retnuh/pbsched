# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — UX Polish & Scheduler Improvements

**Shipped:** 2026-04-14
**Phases:** 3 (8-10) | **Plans:** 4 | **Quick Tasks:** 3

### What Was Built
- Phase 8: Inline club name editing — tap pencil icon, blur/Enter saves, Escape cancels, XSS-safe, iOS 16px font floor
- Phase 9: Vitest session immutability test suite — 3 tests proving mid-session roster changes never mutate played rounds
- Phase 10: Configurable short-sided match penalties — singles/3-way-solo/3-way-pair tracking with schema v2 migration + Settings sliders
- Quick tasks: 0-50 slider ranges (enable disabling), plain-English copy, sitout fairness intent clarified

### What Worked
- Quick task workflow handled copy/UX changes without planning overhead
- Yolo mode enabled fast progression through well-scoped phases
- Schema migration strategy (backward-compatible `?? default` fallbacks) avoided a breaking change
- Penalty model design (exponential `Math.pow(100, count)` for sit-out) correctly implements fairness-over-equality semantics

### What Was Inefficient
- Worktree executor regressions: two worktrees (dx9, e5s) overwrote Settings.js with stale snapshots, stripping phase 10 sliders and dx9 copy changes. Required manual diagnosis and restoration from git history.
- Root cause: `git show HEAD:.planning/ROADMAP.md` backup used git HEAD (which already had old content) rather than the working-tree version — should use `cat` for backup, not `git show HEAD`.
- Planning artifacts (ROADMAP.md, phases 08-10) were deleted by a worktree merge and required restoration from `e67d0fb`.

### Patterns Established
- Quick tasks are safe for copy/UX changes but risky when worktrees have stale context of recently-modified files
- Verify worktree base commit before every executor spawn — stale base leads to silent regressions
- Sitout penalty uses exponential scaling (`base * 100^count`) for fairness-over-equality semantics — document this in code, not just comments

### Key Lessons
1. Worktree backups must use `cat .planning/ROADMAP.md` (working tree) not `git show HEAD:.planning/ROADMAP.md` (git object) — especially after in-session restorations that weren't committed
2. After worktree merges that touch source files, immediately verify key files against the expected git object before committing
3. Quick task executors in worktrees should always read source files fresh from their worktree rather than carrying context from the planner's snapshot

### Cost Observations
- Model: Sonnet 4.6 (all agents)
- Single-day sprint — 3 phases + 3 quick tasks completed in one session
- Notable: Worktree regression recovery added ~20% overhead to total session time

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Key Change |
|-----------|--------|------------|
| v1.0 | 3 (8-10) | First GSD-tracked milestone; established quick task workflow |

### Cumulative Quality

| Milestone | Tests Added | Coverage Notes |
|-----------|-------------|----------------|
| v1.0 | 3 | Session immutability tests; scheduler logic untested |

### Top Lessons (Verified Across Milestones)

1. Worktree backups must snapshot the working tree, not the git object, when in-session restorations haven't been committed
2. Exponential penalty scaling is the correct approach for fairness-over-equality scheduling goals
