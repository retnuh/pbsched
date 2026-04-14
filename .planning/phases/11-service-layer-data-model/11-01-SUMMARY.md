---
phase: 11-service-layer-data-model
plan: 01
subsystem: api
tags: [vitest, localStorage, session-service, vanilla-js]

requires:
  - phase: 09-player-change-test-coverage
    provides: Vitest test infrastructure (test-setup.js, StorageAdapter.reset pattern)

provides:
  - SessionService.updateRound(roundIndex, updatedRound) method in src/services/session.js
  - Vitest tests for HIST-01, HIST-02, HIST-03 in src/services/session.test.js
  - source: 'edited' data field on edited played rounds
  - Atomic played-round edit: deletes subsequent unplayed rounds and regenerates next round

affects:
  - 12-match-editor-scaffold (calls SessionService.updateRound as its single save entry point)
  - 13-sortablejs-drag-validation (same save path)
  - 14-court-add-remove-polish (same save path)

tech-stack:
  added: []
  patterns:
    - "updateRound branches on round.played: unplayed replaces in-place, played marks source + regenerates"
    - "Persist-before-generate: updateSession must be called before generateNextRound (generateNextRound reads from storage)"
    - "Inline filter instead of delegating to deleteUnplayedRoundsAfter to avoid double-persist"

key-files:
  created:
    - src/services/session.test.js
    - src/test-setup.js
  modified:
    - src/services/session.js
    - vite.config.js

key-decisions:
  - "updateRound on unplayed round: replace in-place, single updateSession, no generateNextRound (D-02)"
  - "updateRound on played round: set source: 'edited', inline-delete subsequent unplayed rounds, persist BEFORE generateNextRound (D-01, D-03)"
  - "Restored test-setup.js and vite.config.js setupFiles — accidentally deleted in commit 044450b during Phase 10 slider work"

patterns-established:
  - "Persist-before-generate: all methods that call generateNextRound must flush session to storage first"
  - "source: 'edited' field on played rounds is backward-compatible — absence means 'generated'"

requirements-completed:
  - HIST-01
  - HIST-02
  - HIST-03

duration: 15min
completed: 2026-04-14
---

# Phase 11 Plan 01: Service Layer & Data Model Summary

**SessionService.updateRound with two-branch logic (unplayed replace-in-place vs played mark-and-regenerate), backed by three green Vitest tests covering HIST-01, HIST-02, HIST-03**

## Performance

- **Duration:** 15 min
- **Started:** 2026-04-14T11:53:00Z
- **Completed:** 2026-04-14T11:59:00Z
- **Tasks:** 2 (RED + GREEN TDD cycle)
- **Files modified:** 4

## Accomplishments

- Added `SessionService.updateRound(roundIndex, updatedRound)` to `src/services/session.js` with correct played/unplayed branching, `source: 'edited'` field, inline deletion of subsequent unplayed rounds, and persist-before-generate ordering
- Created `src/services/session.test.js` with three passing Vitest tests (HIST-01, HIST-02, HIST-03) using the established localStorage mock pattern
- Restored `src/test-setup.js` and `vite.config.js` `setupFiles` config (accidentally deleted in commit 044450b) — unblocked the entire test infrastructure for session service tests and storage tests

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): Failing tests for updateRound** - `ccca415` (test)
2. **Task 2 (GREEN): Implement updateRound** - `401c78d` (feat)

_Note: TDD tasks have separate RED and GREEN commits_

## Files Created/Modified

- `src/services/session.js` — Added `updateRound` method (35 lines including JSDoc)
- `src/services/session.test.js` — Three Vitest tests: HIST-01, HIST-02, HIST-03
- `src/test-setup.js` — Restored: patches globalThis.localStorage before ES modules load; clears store between tests
- `vite.config.js` — Restored: `setupFiles: ['./src/test-setup.js']` in test config

## Decisions Made

- Followed D-01 (atomic regeneration), D-02 (unplayed replace-in-place), D-03 (source: 'edited' field) exactly as specified in CONTEXT.md
- Inlined the round filter logic instead of delegating to `deleteUnplayedRoundsAfter` to avoid double-persist (that method calls `updateSession` internally)
- Explicit `index: roundIndex` spread on both branches to guard against Phase 12 editor sending rounds without the correct index (mirrors `replaceRound` and `regenerateRound` patterns)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Restored accidentally-deleted test infrastructure**
- **Found during:** Task 1 (RED — writing failing tests)
- **Issue:** `src/test-setup.js` and the `setupFiles` entry in `vite.config.js` were deleted in commit `044450b` (an unrelated Phase 10 slider UI commit). Without the test-setup patch, `storage.js` crashes on `localStorage.getItem is not a function` at module load time — before any `vi.stubGlobal` in `beforeEach` can run.
- **Fix:** Restored `src/test-setup.js` from commit `6869aa4` verbatim; restored `setupFiles: ['./src/test-setup.js']` in `vite.config.js`
- **Files modified:** `src/test-setup.js` (created), `vite.config.js` (modified)
- **Verification:** `npx vitest run` — 11 test files, 89 tests, all passing (including pre-existing `src/storage.test.js` which was also broken)
- **Committed in:** `ccca415` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 3 - blocking)
**Impact on plan:** Required fix to unblock the TDD cycle. Restores behavior that existed before Phase 10. No scope creep.

## Issues Encountered

None beyond the blocking test infrastructure fix documented above.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `SessionService.updateRound` is ready for Phase 12 (MatchEditor scaffold) to call as its single save entry point
- Full Vitest suite green: 11 test files, 89 tests passing
- No blockers for Phase 12

---
*Phase: 11-service-layer-data-model*
*Completed: 2026-04-14*
