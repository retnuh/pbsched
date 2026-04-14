---
phase: 08-club-name-editing
plan: 01
subsystem: ui
tags: [vanilla-js, inline-edit, localStorage, haptics, ios-safari]

# Dependency graph
requires: []
provides:
  - Inline club name editing with always-visible pencil icon in MemberEditor
  - showToast helper for brief non-blocking user feedback
  - XSS-safe restore() using textContent for localStorage-sourced display name
affects: [09-vitest-tests, 10-penalty-config]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Inline edit pattern: swap DOM node (h1+button) with input, restore on save/cancel
    - Toast notification: fixed-position div, CSS opacity transition, auto-remove via setTimeout
    - saved flag guard: prevents blur double-fire after Enter/Escape keydown

key-files:
  created: []
  modified:
    - src/views/MemberEditor.js

key-decisions:
  - "Used textContent (not innerHTML interpolation) in restore() to prevent XSS from crafted localStorage club names (T-08-02)"
  - "restore() rebuilds the skeleton markup with an empty h1, then assigns .textContent — keeps XSS mitigation explicit and reviewable"
  - "saved flag prevents blur handler firing after Enter/Escape already committed the action"
  - "nameHeading click also activates edit (not just the pencil icon) for a larger tap target"

patterns-established:
  - "Inline edit: replace node with input on activate, restore skeleton via innerHTML + textContent on complete"
  - "Toast: module-level showToast() with inline CSS, opacity fade, auto-remove — no dependency"

requirements-completed: [CLUB-07, CLUB-08, CLUB-09]

# Metrics
duration: 15min
completed: 2026-04-13
---

# Phase 8 Plan 01: Club Name Editing Summary

**Inline tap-to-edit club name in MemberEditor: always-visible pencil icon, input matching h1 style at 24px, blur/Enter saves via ClubService, Escape cancels, empty-name toast, XSS-safe restore**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-13T23:00:20Z
- **Completed:** 2026-04-13T23:15:00Z
- **Tasks:** 3 of 3 (checkpoint:human-verify approved)
- **Files modified:** 1

## Accomplishments
- Added `showToast` module-level helper: fixed-position dark pill, fades after 1.6s, auto-removed at 2s — toast anchored 8px below the triggering input element
- Replaced static `<h1>` with `#club-name-display` wrapper containing `#club-name-heading` and a pencil icon button; layout unchanged for the user
- Wired full inline edit lifecycle: `activateEdit()` builds a styled 1.5rem input, `save()` calls `ClubService.updateClub` + `Haptics.light()`, `cancel()` restores silently, `restore()` rebuilds DOM and re-binds listeners
- Applied T-08-02 XSS mitigation: `restore()` sets innerHTML to an empty skeleton, then assigns `.textContent = displayName` — club names from localStorage never reach innerHTML
- Extended inline edit pattern to member rename: replaced "Rename" button with pencil icon using same save/cancel/empty guard pattern
- Replaced "Remove" text button with trash icon on member rows for cleaner UI
- Club pencil icon right-aligned via flex-grow on h1 to match member row pencil position

## Task Commits

1. **Task 1: Add showToast helper and replace static h1 with editable header markup** - `af60414` (feat)
2. **Task 2: Wire inline edit — activate, save, cancel, and empty-guard logic** - `af60414` (feat — committed together with Task 1 as one atomic implementation commit per plan instructions)
3. **Task 3: checkpoint:human-verify** - Approved by user
4. **Bonus: Replace prompt() member rename with inline edit pattern** - `0b77ac4` (feat)
5. **Bonus: Position toast near the field being edited** - `460d176` (feat)
6. **Bonus: Pencil icon for member rename, align club pencil to right edge** - `a8fab41` (feat)
7. **Bonus: Replace Remove text with trash icon on member rows** - `0e83eb3` (feat)

## Files Created/Modified
- `src/views/MemberEditor.js` - Added showToast, replaced h1 with pencil-icon wrapper, added full inline edit logic (110 lines net new)

## Decisions Made
- **XSS mitigation in restore():** Plan's threat model (T-08-02) required `textContent` assignment after `innerHTML` skeleton. Implemented as: set empty h1 in innerHTML, then `querySelector('#club-name-heading').textContent = displayName`. This is cleaner than escaping and matches the mandatory note from the plan checker.
- **Both tasks in one commit:** Tasks 1 and 2 touch the same single file with tightly coupled changes (the markup from Task 1 is immediately queried in Task 2). A single implementation commit is cleaner than two partial-state commits on the same file.
- **nameHeading click also triggers edit:** Adds a larger tap target without changing the visible affordance.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Security] XSS mitigation applied in restore() per threat model T-08-02**
- **Found during:** Task 2 (restore() implementation)
- **Issue:** Plan's threat register listed T-08-02 as `mitigate`: club name rendered via innerHTML in restore() is a potential XSS vector if a crafted value is stored in localStorage
- **Fix:** restore() builds an empty h1 skeleton via innerHTML (no user data interpolated), then sets `.textContent = displayName` after — user data never reaches innerHTML
- **Files modified:** src/views/MemberEditor.js
- **Verification:** Code review confirms displayName is only written via textContent assignment on line 162
- **Committed in:** af60414

---

**Total deviations:** 1 auto-fixed (1 missing security mitigation from threat model)
**Impact on plan:** Security hardening required by the plan's own threat register. No scope creep.

## Issues Encountered
- `node --input-type=module` check produced a module-not-found error for browser-relative imports — expected in a Node context without a bundler. Verified syntax separately via `new Function()` stripping import/export keywords. Syntax confirmed clean.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Inline club name editing fully implemented, verified, and approved
- Member rename and remove UI also updated to match the new inline edit pattern
- Phase 9 (Vitest tests for mid-session roster changes) can proceed immediately

---
*Phase: 08-club-name-editing*
*Completed: 2026-04-13*
