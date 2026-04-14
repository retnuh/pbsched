---
phase: 13-drag-interactions-validation
plan: "01"
subsystem: MatchEditor drag interactions
tags: [sortablejs, drag-and-drop, draft-state, tdd]
dependency_graph:
  requires: []
  provides: [drag-zones, draft-state, sortablejs-integration, drag-css]
  affects: [src/views/MatchEditor.js, src/style.css, src/views/MatchEditor.test.js]
tech_stack:
  added: [sortablejs@^1.15.7]
  patterns: [module-scope-state, tdd-red-green, dom-reconciliation]
key_files:
  created: []
  modified:
    - src/views/MatchEditor.js
    - src/style.css
    - src/views/MatchEditor.test.js
    - package.json
    - package-lock.json
decisions:
  - SortableJS Swap plugin mounted at module level (not inside mount()) per Pitfall 1 in RESEARCH.md
  - validateAndUpdateUI left as no-op placeholder — implemented in Plan 02
  - Cancel/Confirm button click handlers deferred to Plan 02; buttons render correctly in Plan 01
metrics:
  duration: "~6 minutes"
  completed: "2026-04-14T15:34:43Z"
  tasks_completed: 2
  files_changed: 5
---

# Phase 13 Plan 01: SortableJS Drag Zones and Draft State Summary

**One-liner:** SortableJS installed with Swap plugin, chip data-player-id attributes, per-zone SortableJS instances, draft-state deep copy, DOM reconciliation, and ghost/chosen drag CSS.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Install SortableJS and scaffold test stubs (RED) | 8cd1b04 | MatchEditor.test.js, package.json, package-lock.json |
| 2 | Implement drag zones, draft state, reconciliation, and drag CSS (GREEN) | 2ceacd7 | MatchEditor.js, style.css |

## What Was Built

### src/views/MatchEditor.js
- Added `import Sortable, { Swap } from 'sortablejs'` and `Sortable.mount(new Swap())` at module level
- Added module-scope state: `_sortableInstances`, `_draft`, `_originalRound`, `_roundIndex`, `_el`
- Updated all three chip helpers (`teamAChip`, `teamBChip`, `benchChip`) to emit `data-player-id="${escapeHTML(id)}"` and `cursor-grab` class
- Court HTML now includes `data-court="{i}"` on card wrappers, `data-zone="court-{i}-a"` and `data-zone="court-{i}-b"` on team columns, and a hidden `data-court-error` label
- Bench HTML now includes `data-zone="bench"` on the flex container; empty-state marker has `bench-empty-marker` class for SortableJS filter
- Added bottom bar HTML with `#cancel-btn` and `#confirm-btn` (click handlers wired in Plan 02)
- Added `initSortables(el)` — creates one Sortable per `[data-zone]` with group, swap, ghostClass, chosenClass, delay settings
- Added `reconcileDraftFromDOM(el)` — reads `data-player-id` from DOM zones back into `_draft`
- Added `handleDragEnd()` — calls reconcile then validateAndUpdateUI (no-op placeholder for Plan 02)
- Implemented `unmount()` — destroys all SortableJS instances, nulls all module-scope state

### src/style.css
- Added `.sortable-ghost` (opacity 0.4, dashed blue-300 border)
- Added `.sortable-chosen` (opacity 0.9, scale 1.05, shadow)
- Added `.sortable-swap-highlight` (blue-50 background, dashed blue-400 border)

### src/views/MatchEditor.test.js
- Added `vi.mock('sortablejs')` with `MockSortable` (constructor, destroy, static mount) and `MockSwap`
- Added `describe('Phase 13: Drag interactions')` block with:
  - DRAG-01: chips have `data-player-id` attributes test
  - DRAG-01: zones have `data-zone` attributes test
  - DRAG-02/03/04: DOM move reconciliation stub test
  - Confirm/Cancel button render test

## Test Results

- Pre-existing tests: 18 passed (MEDIT-01, MEDIT-02, back nav, error states, bench zone)
- New Phase 13 tests: 4 passed (GREEN after Task 2 implementation)
- Full suite: 58/58 tests pass across 8 test files

## Deviations from Plan

None — plan executed exactly as written.

The `validateAndUpdateUI` function is intentionally a no-op placeholder per plan instructions: "Note: `validateAndUpdateUI` is added in Plan 02 / Task 1. For now, define it as a no-op placeholder at module scope so `handleDragEnd` does not throw."

## Known Stubs

| Stub | File | Line | Reason |
|------|------|------|--------|
| `validateAndUpdateUI` no-op | src/views/MatchEditor.js | ~40 | Plan 02 Task 1 implements full validation logic |
| Cancel/Confirm click handlers not wired | src/views/MatchEditor.js | ~196 | Plan 02 Task 2 wires Confirm (SessionService.updateRound) and Cancel (hasChanges + confirm dialog) |

Both stubs are intentional per the plan's scope boundary. Plan 02 resolves them.

## Threat Surface Scan

No new threat surface introduced beyond what the plan's threat model covers:
- T-13-01 (XSS via chip HTML): `escapeHTML()` applied to both `id` and player name in all three chip helpers — mitigated.
- T-13-04 (listener accumulation): `unmount()` calls `s.destroy()` on all instances and empties `_sortableInstances` — mitigated.

## Self-Check: PASSED

- [x] src/views/MatchEditor.js exists and contains `import Sortable`
- [x] src/style.css contains `.sortable-ghost`
- [x] src/views/MatchEditor.test.js contains `vi.mock('sortablejs'`
- [x] Commit 8cd1b04 exists (test RED phase)
- [x] Commit 2ceacd7 exists (feat GREEN phase)
- [x] All 58 tests pass
