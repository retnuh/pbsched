---
phase: 13-drag-interactions-validation
plan: "02"
subsystem: MatchEditor validation and Confirm/Cancel wiring
tags: [tdd, validation, drag-and-drop, confirm-cancel, sortablejs]
dependency_graph:
  requires: [13-01]
  provides: [validateAndUpdateUI, handleConfirm, handleCancel, hasChanges]
  affects: [src/views/MatchEditor.js, src/views/MatchEditor.test.js]
tech_stack:
  added: []
  patterns: [tdd-red-green, reactive-validation, draft-state-guard, dual-enforcement]
key_files:
  created: []
  modified:
    - src/views/MatchEditor.js
    - src/views/MatchEditor.test.js
decisions:
  - validateAndUpdateUI toggles border-red-400 and disables Confirm on exactly-1-player courts (VALID-01, VALID-02)
  - handleConfirm has independent anyInvalid guard (T-13-05 dual enforcement beyond button.disabled)
  - hasChanges() uses JSON.stringify draft vs originalRound comparison (Claude's discretion per CONTEXT.md)
  - back-btn removed from header; Cancel in bottom bar is the only back-navigation affordance
metrics:
  duration: "~2 minutes"
  completed: "2026-04-14T15:39:04Z"
  tasks_completed: 1
  files_changed: 2
---

# Phase 13 Plan 02: Validation and Confirm/Cancel Wiring Summary

**One-liner:** validateAndUpdateUI() reactively toggles red border and error label on 1-player courts and disables Confirm; handleConfirm() dual-guards then calls SessionService.updateRound; handleCancel() shows native confirm() dialog when changes exist.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (RED) | Add failing tests for VALID-01, VALID-02, DRAG-05 | daa8c59 | MatchEditor.test.js |
| 1 (GREEN) | Implement validateAndUpdateUI, handleConfirm, handleCancel | 23279ff | MatchEditor.js, MatchEditor.test.js |
| 2 | Human verify — auto-approved (auto_advance=true) | — | — |

## What Was Built

### src/views/MatchEditor.js

- Replaced no-op `validateAndUpdateUI(el)` placeholder with full reactive implementation:
  - Iterates `_draft.courts`; any court with exactly 1 player is invalid
  - Invalid court card: `border-red-400` added, `border-gray-200` removed; `[data-court-error]` label `hidden` class removed
  - Valid court: `border-gray-200` restored, error label `hidden` re-added
  - Confirm button: `disabled=true`, `bg-gray-300`, `text-gray-500`, `opacity-50`, `cursor-not-allowed` when any invalid; `bg-blue-600`, `text-white`, `shadow-lg`, `shadow-blue-200` when all valid
- Added `hasChanges()`: `JSON.stringify(_draft) !== JSON.stringify(_originalRound)`
- Added `handleCancel()`: if no changes → `navigate('/active')` directly; if changes → native `confirm()` dialog → navigate on OK
- Added `handleConfirm()`: independent `anyInvalid` guard (T-13-05 dual enforcement), then `SessionService.updateRound(_roundIndex, _draft)`, then `navigate('/active')`
- In `mount()`:
  - `validateAndUpdateUI(el)` called after `initSortables(el)` for initial state
  - `#cancel-btn` wired to `handleCancel`
  - `#confirm-btn` wired to `handleConfirm`
- Removed `#back-btn` from header HTML and its `addEventListener`; header now contains only the `h1`

### src/views/MatchEditor.test.js

- Added `import { SessionService } from '../services/session.js'` for spy assertions
- Added `describe('VALID-01 + VALID-02: Validation state')` with 5 tests:
  - Confirm enabled/`bg-blue-600` when all courts have 2+ players
  - Confirm `disabled=true`/`bg-gray-300` when court has exactly 1 player
  - Invalid court card has `border-red-400`
  - Error label not hidden, text = 'needs 2+ players' when invalid
  - Valid 0-player court has `border-gray-200` and error label hidden
- Added `describe('DRAG-05: Confirm and Cancel wiring')` with 2 tests:
  - Confirm click calls `SessionService.updateRound(0, ...)` and `navigate('/active')`
  - Cancel click with no changes calls `navigate('/active')` directly
- Updated 'Back navigation' describe: renamed test to 'Cancel button calls navigate(/active)', using `#cancel-btn`

## Test Results

- RED commit (daa8c59): 5 new tests failing as expected, 15 passing
- GREEN commit (23279ff): 20/20 MatchEditor tests passing
- Full suite: 38/38 tests across 4 test files

## Deviations from Plan

None — plan executed exactly as written. TDD RED/GREEN sequence followed precisely.

The `auto_advance=true` config caused Task 2 (human-verify checkpoint) to be auto-approved per protocol.

## Known Stubs

None. All stubs from Plan 01 are resolved:
- `validateAndUpdateUI` no-op replaced with full implementation
- Cancel/Confirm click handlers fully wired

## Threat Surface Scan

No new threat surface beyond what the plan's threat model covers:

- T-13-05 (handleConfirm() bypass): Independent `anyInvalid` guard added inside `handleConfirm()` in addition to `button.disabled` — dual enforcement implemented as required.
- T-13-07 (Discard dialog): Hardcoded string "Discard changes? Your edits won't be saved." — no player data in message.

## Self-Check: PASSED

- [x] src/views/MatchEditor.js exists and contains `validateAndUpdateUI` (line 35), `handleConfirm` (line 72), `handleCancel` (line 66), `hasChanges` (line 62)
- [x] `updateRound` called in handleConfirm (line 75)
- [x] "Discard changes" string present (line 68)
- [x] `validateAndUpdateUI(el)` called in mount() (line 234)
- [x] Commit daa8c59 exists (RED gate)
- [x] Commit 23279ff exists (GREEN gate)
- [x] All 20 MatchEditor tests pass; full suite 38/38
