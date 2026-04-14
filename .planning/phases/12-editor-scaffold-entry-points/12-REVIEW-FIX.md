---
phase: 12-editor-scaffold-entry-points
fixed_at: 2026-04-14T14:20:00Z
review_path: .planning/phases/12-editor-scaffold-entry-points/12-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Phase 12: Code Review Fix Report

**Fixed at:** 2026-04-14T14:20:00Z
**Source review:** .planning/phases/12-editor-scaffold-entry-points/12-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 6
- Fixed: 6
- Skipped: 0

## Fixed Issues

### CR-01: Unescaped player names interpolated into innerHTML (stored XSS)

**Files modified:** `src/utils/html.js`, `src/views/MatchEditor.js`, `src/views/RoundDisplay.js`
**Commit:** 32f62a1 (MatchEditor.js + html.js), 022c94e (RoundDisplay.js)
**Applied fix:** Created `src/utils/html.js` exporting `escapeHTML(str)` helper. Added import to both view files. Wrapped all 3 `getPlayerName` interpolations in `MatchEditor.js` and all 10 in `RoundDisplay.js` (lines 202, 307, 310, 320, 480, 481, 484, 485, 505) with `escapeHTML()`.

---

### CR-02: No null guard on ClubService.getClub() return value

**Files modified:** `src/views/MatchEditor.js`, `src/views/RoundDisplay.js`
**Commit:** 32f62a1 (MatchEditor.js), 022c94e (RoundDisplay.js)
**Applied fix:** Added null guard immediately after `ClubService.getClub()` call in both files. If `club` is falsy, renders a "Club Not Found" error screen with a link back to clubs and returns early, preventing the `TypeError` on `club.members.find(...)`.

---

### WR-01: Stale params bleed between route-match attempts in router

**Files modified:** `src/router.js`
**Commit:** 6cd9ee6
**Applied fix:** Introduced `candidateParams = {}` inside the `for` loop body (fresh per iteration). The `every()` predicate now writes to `candidateParams` instead of the outer `params`. Only on a successful match is `params = candidateParams` assigned, ensuring failed partial matches leave no residue.

---

### WR-02: renderSitterPicker accesses round without bounds check

**Files modified:** `src/views/RoundDisplay.js`
**Commit:** c055ae7
**Applied fix:** Added early-return guard at the top of `renderSitterPicker`: if `session.rounds[pickingSitterFor]` is `undefined`, resets `pickingSitterFor = null` and calls `render()` to return to the main view safely.

---

### WR-03: Test MEDIT-01 second case tests the mock, not the code

**Files modified:** `src/views/MatchEditor.test.js`
**Commit:** 8b96298
**Applied fix:** Replaced the tautological test (which called `navigate` directly then asserted it was called) with a test that mounts `RoundDisplay` with a seeded session containing an unplayed round, queries the `[data-action="edit"]` button, clicks it, and asserts `navigate` was called with `/edit/0`. Added import of `mountRoundDisplay` from `RoundDisplay.js`.

---

### WR-04: Missing test for null club scenario in MatchEditor

**Files modified:** `src/views/MatchEditor.test.js`
**Commit:** 8b96298
**Applied fix:** Added `'renders error when club is not found'` test inside the "Error states" describe block. Seeds a session but no clubs data, mounts `MatchEditor`, and asserts `el.innerHTML` contains `'Club Not Found'` — exercising the CR-02 null guard regression path.

---

_Fixed: 2026-04-14T14:20:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
