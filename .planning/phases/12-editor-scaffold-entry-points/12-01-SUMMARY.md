---
phase: 12-editor-scaffold-entry-points
plan: "01"
subsystem: ui
tags: [editor, routing, tdd, match-editor, round-display]
dependency_graph:
  requires: []
  provides: [MatchEditor view, /edit/:roundIndex route, RoundDisplay Edit entry points]
  affects: [src/router.js, src/views/RoundDisplay.js, src/views/MatchEditor.js]
tech_stack:
  added: []
  patterns: [mount/unmount view pattern, TDD red-green, event delegation, hash routing]
key_files:
  created:
    - src/views/MatchEditor.js
    - src/views/MatchEditor.test.js
    - src/test-setup.js
  modified:
    - src/views/RoundDisplay.js
    - src/router.js
    - vite.config.js
decisions:
  - "Chips are <div> elements (not buttons) — static scaffold only; Phase 13 adds interactivity"
  - "Back button uses navigate('/active') not window.history.back() per D-14"
  - "parseInt(params.roundIndex, 10) with !round bounds check handles NaN, negative, out-of-bounds (T-12-01, T-12-02)"
  - "test-setup.js + vite.config.js setupFiles added to fix pre-existing localStorage shim gap"
metrics:
  duration_minutes: 15
  completed_date: "2026-04-14"
  tasks_completed: 4
  files_changed: 6
requirements_satisfied: [MEDIT-01, MEDIT-02]
---

# Phase 12 Plan 01: Editor Scaffold & Entry Points Summary

**One-liner:** Static MatchEditor view with court zone pill chips and Rest Bench wired to /edit/:roundIndex route, with RoundDisplay refactored to 3-button bottom row entry points.

## What Was Built

### MatchEditor.js (new view)
Static court layout editor following the established mount/unmount pattern. Renders each court as a named zone with Team A (blue pill chips) and Team B (orange pill chips) in a 2-column grid. Includes a Rest Bench zone with gray neutral chips (or "None sitting out" when empty). Guards: no-session error and out-of-bounds roundIndex error. Back button calls `navigate('/active')`. No haptics, no Confirm/Cancel buttons — Phase 12 is static scaffold only.

### RoundDisplay.js (refactored entry points)
Two changes:
1. Proposed round card header is now label-only — buttons moved to a new 3-button bottom row (Alternatives | Edit | Mark Played) with `flex-1` equal-width layout and `min-h-[44px]` touch targets.
2. Last-played round header gains an Edit button before the existing Undo button, matching the existing link-button style (`text-blue-600 hover:underline`).
3. Event delegation block gains an Edit handler calling `Haptics.light()` then `navigate('/edit/' + idx)`.

### router.js (route registration)
- Import and route entry for `/edit/:roundIndex` → MatchEditor
- `isSession` condition extended: `(hash.startsWith('#/active') || hash.startsWith('#/edit')) && navTarget === 'RoundDisplay'` keeps session nav highlighted while in the editor

### test-setup.js + vite.config.js (test infrastructure)
Added localStorage shim setup file and `setupFiles` config — required for happy-dom 20.x / vitest 4.x compatibility (pre-existing gap in worktree).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 0 | Create MatchEditor test scaffold (RED) | d7d8d8b | src/views/MatchEditor.test.js |
| 1 | Refactor RoundDisplay.js entry points | 137e7bf | src/views/RoundDisplay.js |
| 2 | Create MatchEditor.js view (GREEN) | b287f69 | src/views/MatchEditor.js, src/test-setup.js, vite.config.js |
| 3 | Wire router | 60cb346 | src/router.js |
| 4 | Checkpoint: Visual verification | — | Auto-approved (auto_advance: true) |

## Test Results

```
Test Files  3 passed (3)
Tests       20 passed (20)
  - src/scheduler.test.js: 9 tests
  - src/storage.test.js: 3 tests
  - src/views/MatchEditor.test.js: 8 tests
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added test-setup.js localStorage shim and vite.config.js setupFiles**
- **Found during:** Task 2 (MatchEditor tests failed with "localStorage.getItem is not a function")
- **Issue:** happy-dom 20.x / vitest 4.x does not initialize localStorage before ES modules run. storage.js calls `initStorage()` at module scope (line 85), so `beforeEach` stubs are too late. The worktree was reset to bcdd5d4 which predates these fixes that exist in the main project.
- **Fix:** Created `src/test-setup.js` (identical to main project's version) and added `setupFiles: ['./src/test-setup.js']` to `vite.config.js`
- **Files modified:** src/test-setup.js (created), vite.config.js
- **Commit:** b287f69

## Known Stubs

None — the MatchEditor renders real session data from StorageAdapter/SessionService. Player names are looked up from club members. No hardcoded placeholder values flow to the UI.

## Threat Flags

No new security surfaces introduced beyond what the plan's threat model covers. T-12-01 and T-12-02 mitigations are implemented: `parseInt(params.roundIndex, 10)` + `if (!round)` guard.

## Self-Check

- [x] src/views/MatchEditor.js exists
- [x] src/views/MatchEditor.test.js exists (8 tests, all passing)
- [x] src/views/RoundDisplay.js contains `data-action="edit"` (3 occurrences)
- [x] src/views/RoundDisplay.js contains `navigate('/edit/' + idx)`
- [x] src/router.js contains `import * as MatchEditor`
- [x] src/router.js contains `'/edit/:roundIndex': MatchEditor`
- [x] src/router.js isSession condition includes `hash.startsWith('#/edit')`
- [x] Commits d7d8d8b, 137e7bf, b287f69, 60cb346 all exist
- [x] Full vitest suite: 20/20 passing

## Self-Check: PASSED
