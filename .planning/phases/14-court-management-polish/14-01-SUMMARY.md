---
phase: 14-court-management-polish
plan: "01"
subsystem: match-editor
tags: [court-management, haptics, drag-drop, bench, toast]
dependency_graph:
  requires: []
  provides:
    - handleAddCourt
    - handleRemoveCourt
    - showToast
    - rerender
    - wireListeners
    - buildHTML
    - updateRemoveButtonVisibility
  affects:
    - src/views/MatchEditor.js
tech_stack:
  added:
    - Haptics.medium() from ../services/haptics.js
  patterns:
    - rerender() pattern: destroy SortableJS instances, rebuild innerHTML from buildHTML, reinitialize sortables, rewire listeners
    - benchChip factory with sit-out count badge (sitCounts[id] || 0)
    - Event delegation for Remove buttons via .space-y-6 container
    - Toast overlay via document.body.appendChild with auto-fade
key_files:
  modified:
    - src/views/MatchEditor.js
decisions:
  - "buildHTML extracted from mount() to enable rerender() without losing SortableJS initialization"
  - "wireListeners separated from buildHTML so both mount() and rerender() can call them identically"
  - "sitCounts computed inside buildHTML from all session.rounds (not current draft) to avoid double-counting the current round"
  - "Remove button visibility driven by initial CSS class in buildHTML, then maintained by updateRemoveButtonVisibility() after each drag"
  - "handleAddCourt toast fires at exactly 20 courts (the 20th court was just added); block toast fires at attempts beyond 55"
metrics:
  duration_seconds: 110
  completed_date: "2026-04-14T19:35:50Z"
  tasks_completed: 1
  tasks_total: 1
  files_modified: 1
---

# Phase 14 Plan 01: Court Management & Polish — MatchEditor Summary

All five Phase 14 features implemented in `src/views/MatchEditor.js` by refactoring mount() into composable `buildHTML` / `wireListeners` / `rerender` helpers and adding five new handlers.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add Haptics import, rerender helper, showToast, and refactor mount | 9b90878 | src/views/MatchEditor.js |

## Features Implemented

### COURT-01: Add Court button
- `handleAddCourt()` appends `{ teamA: [], teamB: [] }` to `_draft.courts`, then calls `rerender(_el)`
- "Add court" button rendered by `buildHTML` between courts and bench via `addCourtButtonHTML`
- Wired in `wireListeners` via `#add-court-btn` click listener

### COURT-02: Remove Court button (conditional)
- `handleRemoveCourt(courtIndex)` splices the court from `_draft.courts` and calls `rerender(_el)` 
- Remove button per court header; initially shown/hidden by `buildHTML` based on empty+length conditions
- `updateRemoveButtonVisibility(el)` re-evaluates visibility after each drag
- Guard: does nothing if `_draft.courts.length <= 1`

### COURT-03: Empty-court pruning on save
- `handleConfirm()` builds `prunedDraft` with `_draft.courts.filter(c => c.teamA.length > 0 || c.teamB.length > 0)`
- `SessionService.updateRound(_roundIndex, prunedDraft)` receives the pruned version; empty courts never persisted

### BENCH-01: Sit-out count badges on bench chips
- `buildHTML` computes `sitCounts` from all `session.rounds` entries
- `benchChip(id)` renders a `<span class="text-xs ...">N×</span>` subscript using `sitCounts[id] || 0`
- Court chips (`courtChip`) display no badge — different factory for different zones

### BENCH-02: Haptic feedback on drop
- `handleDragEnd` calls `Haptics.medium()` after `validateAndUpdateUI` and `updateRemoveButtonVisibility`
- `Haptics` imported from `../services/haptics.js`

## Architecture Change: rerender() pattern

The main structural change is extracting all HTML construction from `mount()` into `buildHTML(draft, round, club, getPlayerName, session)` and all event wiring into `wireListeners(el)`. This enables `rerender(el)` to:
1. Destroy all SortableJS instances
2. Rebuild `el.innerHTML` from `buildHTML`
3. Re-initialize SortableJS via `initSortables(el)`
4. Re-run `validateAndUpdateUI(el)` 
5. Re-wire all listeners via `wireListeners(el)`

Four new module-scope vars (`_session`, `_club`, `_round`, `_getPlayerName`) are set during `mount()` and nulled in `unmount()`.

## Verification

```
npx vitest run src/views/MatchEditor.test.js
Tests: 104 passed (104)

npx vitest run (full suite)
Test Files: 9 passed (9)
Tests: 148 passed (148)
```

All Phase 12, Phase 13, and existing tests continue to pass.

## Deviations from Plan

None — plan executed exactly as written.

## Threat Mitigations Applied

| Threat ID | Mitigation |
|-----------|-----------|
| T-14-02 | handleAddCourt guards `_draft.courts.length >= 55` and returns early with toast |
| T-14-03 | All user-supplied strings (player names, toast messages) pass through escapeHTML before innerHTML insertion |
| T-14-04 | parseInt(..., 10) on data-attribute; guard `_draft.courts.length <= 1` prevents removing last court |

## Known Stubs

None — all features fully wired with real data sources.

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes introduced.

## Self-Check: PASSED

- [x] `src/views/MatchEditor.js` exists and contains all required functions
- [x] Commit 9b90878 exists in git log
- [x] All 148 tests pass (no regressions)
