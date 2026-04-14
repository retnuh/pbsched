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
  warning: 1
  info: 3
  total: 4
status: issues_found
---

# Phase 09: Code Review Report

**Reviewed:** 2026-04-14
**Depth:** standard
**Files Reviewed:** 3
**Status:** issues_found

## Summary

Three files were reviewed: the global test setup shim (`src/test-setup.js`), the new mid-session roster change integration tests (`src/services/session.test.js`), and the Vite/Vitest config (`vite.config.js`).

The test setup is sound. The `_store` object is correctly cleared in a `beforeEach` hook at the bottom of the setup file, and `StorageAdapter.reset()` re-initialises the in-memory state in `storage.js` before each test. The Vite config is clean. The test file exercises the critical `updateAttendees` + `regenerateRound` coupling correctly.

One warning remains: the regenerated round's `index` field is never asserted by any test, leaving a specific regression path undetected. Three info-level items cover a redundant test case, an incomplete negative assertion, and a dead default in the fixture helper.

---

## Warnings

### WR-01: Regenerated round `index` field is not asserted after `regenerateRound`

**File:** `src/services/session.test.js:63-69` (TEST-01), `:93-108` (TEST-02), `:130-144` (TEST-03)

**Issue:** All three tests call `SessionService.regenerateRound(2)` but none assert that the resulting round's `index` property equals `2`. In `session.js` line 244 this is set with `newRound.index = roundIndex`, but if that line were accidentally removed the round would carry index `0` (the default from `generateRounds`). All three tests would still pass because they inspect only played-round immutability and player membership — not the round index — while downstream code that looks up rounds by index would silently break.

**Fix:** Add a round-index assertion in at least one test (TEST-03 is the most complete candidate):

```js
const regenerated = SessionService.getActiveSession().rounds[2]
expect(regenerated.index).toBe(2)
```

---

## Info

### IN-01: TEST-01 is a strict subset of TEST-03 — redundant test case

**File:** `src/services/session.test.js:45-71`

**Issue:** TEST-01 adds p5 and asserts that played rounds are unchanged. TEST-03 performs the identical setup and assertion, then adds the stronger check that p5 appears in the regenerated unplayed round. TEST-01 provides no coverage not already provided by TEST-03 and will always pass or fail together with it.

**Fix:** Either remove TEST-01 and rely on TEST-03, or replace TEST-01's assertion with a distinct scenario (e.g. adding a player when there are no unplayed rounds, or when the session has zero played rounds).

---

### IN-02: TEST-02 does not assert the regenerated round contains exactly the expected players

**File:** `src/services/session.test.js:103-108`

**Issue:** After removing p1, the test verifies p1 is absent from the unplayed round but does not verify that only the three remaining players (p2, p3, p4) appear. A bug that included a stale extra player, or that produced a round with only two players, would not be caught.

**Fix:** Add a positive membership assertion alongside the negative one:

```js
const sortedPlayers = [...allPlayersInUnplayed02].sort()
expect(sortedPlayers).toEqual(['p2', 'p3', 'p4'])
```

---

### IN-03: `makeSession` default `attendeeIds` is never exercised

**File:** `src/services/session.test.js:33`

**Issue:** `makeSession` declares `attendeeIds: ['p1', 'p2', 'p3', 'p4']` as a default, but every call in the file passes `attendeeIds` explicitly via the `overrides` argument, making the default dead code. This can mislead a future reader into thinking the default is part of a tested scenario.

**Fix:** No action required if the value is intended as documentation. Alternatively, remove the default and make `attendeeIds` a required parameter to make the fixture intent explicit.

---

_Reviewed: 2026-04-14_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
