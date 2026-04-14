---
phase: 09-player-change-test-coverage
reviewed: 2026-04-14T00:00:00Z
depth: standard
files_reviewed: 3
files_reviewed_list:
  - src/test-setup.js
  - src/services/session.test.js
  - vite.config.js
findings:
  critical: 0
  warning: 2
  info: 3
  total: 5
status: issues_found
---

# Phase 09: Code Review Report

**Reviewed:** 2026-04-14
**Depth:** standard
**Files Reviewed:** 3
**Status:** issues_found

## Summary

Three files were reviewed: the global test setup shim (`src/test-setup.js`), the new mid-session roster change tests (`src/services/session.test.js`), and the Vite/Vitest config (`vite.config.js`). The test file is the primary artifact; the other two are infrastructure.

The tests exercise `SessionService.updateAttendees` + `SessionService.regenerateRound` as a coupled operation, which matches the actual UI flow. TEST-01 and TEST-02 are near-identical: both assert `playedAfter === playedBefore`. TEST-03 adds the stronger assertion that the unplayed round actually contains the new player. No critical issues exist, but there are two warnings around test isolation and a misleading test design, plus a few info items.

## Warnings

### WR-01: `localStorage` store is never cleared between tests — state can bleed across test files

**File:** `src/test-setup.js:6`
**Issue:** The `_store` object is declared once at module scope and shared for the entire test run. `StorageAdapter.reset()` (called in each `beforeEach`) re-writes `pb:all` in `localStorage` via `saveAll`, which correctly re-initialises the in-memory `state` variable in `storage.js`. However, `_store` itself retains any keys written by previous test files that were not overwritten. If another test file (current or future) writes keys with a different prefix or never triggers `StorageAdapter.reset()`, stale data will persist into subsequent test files.

The simpler fix is to call `localStorage.clear()` inside the shim's `clear()` path or expose a `clearAll` helper used by the global `beforeEach`. Alternatively, the shim can add a `vitest` `beforeEach` hook directly:

```js
// src/test-setup.js — add after the defineProperty block
import { beforeEach } from 'vitest'
beforeEach(() => {
  Object.keys(_store).forEach(k => delete _store[k])
})
```

This ensures `_store` is truly empty before every test, regardless of which file called `StorageAdapter.reset()`.

---

### WR-02: TEST-01 and TEST-02 assert the same thing with the same fixture — one of them cannot catch a regression the other already covers

**File:** `src/services/session.test.js:41-95`
**Issue:** TEST-01 ("adding a player") and TEST-02 ("removing a player") both use the identical three-round fixture (`p1-p4`, two played, one unplayed) and assert only `expect(playedAfter).toEqual(playedBefore)`. The only difference is the `updateAttendees` call. This means if `updateAttendees` mutates played rounds, both tests fail; if it does not, both pass. Neither test exclusively validates the add-player or remove-player path.

More importantly, TEST-02 is missing a complementary assertion: that the regenerated unplayed round for the reduced roster does NOT include `p1`. Without it, a bug where `p1` still appears in the regenerated round (because `session.attendeeIds` was not correctly persisted before `regenerateRound` read it) would go undetected.

```js
// Recommended addition to TEST-02, after line 94
const unplayedAfter02 = SessionService.getActiveSession().rounds.filter(r => !r.played)
const allPlayersInUnplayed02 = unplayedAfter02.flatMap(r => [
  ...r.courts.flatMap(c => [...c.teamA, ...c.teamB]),
  ...r.sittingOut,
])
expect(allPlayersInUnplayed02).not.toContain('p1')
```

---

## Info

### IN-01: `makeRound` helper ignores the `index` field returned by `generateRounds` — tests construct rounds with a manually-supplied `index` that may drift from the actual scheduler contract

**File:** `src/services/session.test.js:13-19`
**Issue:** `makeRound(2, ...)` produces `{ index: 2, ... }`. `regenerateRound` in `session.js` (line 244) explicitly sets `newRound.index = roundIndex` after generation, so the round written back always has the correct index. This is safe today, but if `generateRounds` ever starts using the `index` field internally (e.g. for penalty look-up), the fixture-constructed rounds with hardcoded indices could silently produce wrong penalty calculations in test, making tests pass while production diverges. Adding a comment documenting this assumption would prevent future confusion.

---

### IN-02: `makeSession` sets `candidateCount: 1` — this makes the scheduler deterministic but hides randomisation bugs

**File:** `src/services/session.test.js:8`
**Issue:** `MOCK_SETTINGS` uses `candidateCount: 1`, which means `generateRounds` only evaluates a single candidate and always picks it. This makes the unplayed-round regeneration deterministic, which is good for stable assertions. However, it also means the scheduler's candidate-selection and scoring paths are not exercised by these tests. This is acceptable for integration tests focused on roster change isolation, but is worth noting so future tests don't rely on this setting when trying to test scheduler quality.

---

### IN-03: Vitest `globals: true` is set in `vite.config.js` but the test file explicitly imports `expect`, `test`, `describe`, `beforeEach` from `vitest`

**File:** `vite.config.js:12` / `src/services/session.test.js:1`
**Issue:** When `globals: true` is set, Vitest injects `expect`, `test`, `describe`, etc. into the global scope automatically, making explicit imports redundant. The explicit import is harmless and still works — Vitest resolves the import to the same instance — but it creates a minor inconsistency: future test files may omit the import and rely on globals, while this file imports explicitly. Standardising one style across the project avoids reader confusion. Since `globals: true` is already set, the import on line 1 of `session.test.js` can be removed.

---

_Reviewed: 2026-04-14_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
