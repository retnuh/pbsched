---
phase: 11-service-layer-data-model
reviewed: 2026-04-14T00:00:00Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - src/services/session.js
  - src/services/session.test.js
  - src/test-setup.js
  - vite.config.js
findings:
  critical: 0
  warning: 4
  info: 3
  total: 7
status: issues_found
---

# Phase 11: Code Review Report

**Reviewed:** 2026-04-14
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Summary

The `SessionService` is well-structured and the `updateRound` logic (including the HIST-01/02/03 paths) is correctly implemented and covered by tests. The main concerns are two silent data-corruption risks tied to the `round.index` field and a crash path in `generateNextRound` when the scheduler returns an empty array. There are also two lower-severity issues: a biased shuffle in `morphRoundStrategy` and a state isolation problem in the test suite's `beforeEach` setup.

---

## Warnings

### WR-01: `generateNextRound` pushes `undefined` when `generateRounds` returns an empty array

**File:** `src/services/session.js:64-73`

**Issue:** The scheduler is destructured as `const [nextRound] = generateRounds(...)`. If `generateRounds` returns an empty array (which can happen if the attendee list is empty or the scheduler cannot build a valid round), `nextRound` is `undefined`. The code then calls `session.rounds.push(undefined)` and `this.updateSession(session)`, silently corrupting the rounds array. Downstream code that iterates `session.rounds` and accesses `round.courts` or `round.index` will throw a `TypeError`.

**Fix:**
```js
generateNextRound() {
  const session = this.getActiveSession();
  if (!session) return null;

  const playedRounds = session.rounds.filter(r => r.played);
  const results = generateRounds(
    session.attendeeIds,
    playedRounds,
    1,
    session.settings
  );

  if (!results.length) return null; // guard: scheduler returned nothing

  const [nextRound] = results;
  session.rounds.push(nextRound);
  this.updateSession(session);
  return nextRound;
},
```

---

### WR-02: `deleteUnplayedRoundsAfter` relies on `r.index` being in sync with array position

**File:** `src/services/session.js:96-102`

**Issue:** The filter `session.rounds.filter(r => r.played || r.index <= roundIndex)` assumes every round object's `.index` field accurately reflects its position in the array. This invariant is maintained in most code paths (scheduler sets `index` at generation; `regenerateRound` and `updateRound` patch it on write) but there is no enforcement at the point of use. If a caller pushes a round without setting `index` — or if `index` is set to the wrong value — the filter will silently include or exclude the wrong rounds, deleting played history or retaining stale unplayed rounds. The same pattern is duplicated at line 284 in `updateRound`.

**Fix:** Add a guard that falls back to array-position equality if `r.index` is undefined:
```js
session.rounds = session.rounds.filter(r =>
  r.played || (r.index ?? session.rounds.indexOf(r)) <= roundIndex
);
```
Or, stronger, assert the invariant at the top of `updateSession`:
```js
updateSession(updatedSession) {
  // Re-stamp index to match array position before persisting
  updatedSession.rounds.forEach((r, i) => { r.index = i; });
  const sessions = this.getSessions();
  const idx = sessions.findIndex(s => s.id === updatedSession.id);
  if (idx !== -1) {
    sessions[idx] = updatedSession;
    StorageAdapter.set('sessions', sessions);
  }
},
```

---

### WR-03: Biased shuffle in `morphRoundStrategy` produces non-uniform distributions

**File:** `src/services/session.js:172`

**Issue:** `leftoverPlayers.sort(() => Math.random() - 0.5)` is a well-known anti-pattern. JavaScript's `Array.sort` (V8 TimSort) is not specified to call the comparator a fixed number of times, and using a random comparator produces statistically biased orderings — some permutations appear far more frequently than others. For a sport scheduling app where fairness of sit-out assignments matters, this can cause the same players to sit out disproportionately after strategy switches.

**Fix:** Replace with a Fisher-Yates shuffle:
```js
for (let i = leftoverPlayers.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [leftoverPlayers[i], leftoverPlayers[j]] = [leftoverPlayers[j], leftoverPlayers[i]];
}
```
Note: `scheduler.js` line 193 has the same pattern (`generateCandidate`); consider fixing both.

---

### WR-04: Test `beforeEach` in `session.test.js` creates an isolated `storage` object but leaves the global `_store` from `test-setup.js` active concurrently

**File:** `src/services/session.test.js:38-44`

**Issue:** Each `beforeEach` in the test file calls `vi.stubGlobal('localStorage', { getItem, setItem, ... })` with a fresh local `storage = {}` dict. Simultaneously, the global `beforeEach` in `test-setup.js` wipes `_store` (the backing dict of the *original* patched localStorage). `StorageAdapter.reset()` re-initialises the in-memory state from the now-active stub. This works today, but it means:

1. The global setup's `_store` wipe (test-setup.js line 24) runs on a localStorage that is immediately overwritten anyway — wasted work.
2. If test ordering changes or `vi.stubGlobal` is removed, `_store` from a prior test file could bleed into this suite because `test-setup.js`'s `_store` is module-level state shared across all test files that don't fully override localStorage.

The simplest safe pattern is to rely solely on the global `beforeEach` in `test-setup.js` (which already clears state) and call `StorageAdapter.reset()` there, removing the per-test `vi.stubGlobal` entirely.

**Fix:** Remove `vi.stubGlobal` from `beforeEach` and add `StorageAdapter.reset()` to the global `beforeEach` in `test-setup.js`:
```js
// test-setup.js
import { beforeEach } from 'vitest'
import { StorageAdapter } from './storage.js'

beforeEach(() => {
  Object.keys(_store).forEach(k => delete _store[k])
  StorageAdapter.reset()
})
```
Then in `session.test.js`, simply:
```js
beforeEach(() => {
  StorageAdapter.reset()
})
```

---

## Info

### IN-01: `createSession` settings spread order makes the hardcoded default overridable by a stored `null` value

**File:** `src/services/session.js:32-35`

**Issue:** The spread `{ oddPlayerFallback: 'three-player-court', ...settings }` intends to set a smart default that can be overridden by stored settings. However, if `settings` in localStorage contains `oddPlayerFallback: null` (e.g., corrupted data or a future migration), the spread will override the hardcoded default with `null`. The comment says "Force smart default (2v1)" which implies it should be the minimum fallback, not overridable by null.

**Fix:**
```js
settings: {
  ...settings,
  oddPlayerFallback: settings?.oddPlayerFallback || 'three-player-court',
}
```

---

### IN-02: `morphRoundStrategy` returns silently when `oddCount === 0` but is still called and mutates state for even-player counts

**File:** `src/services/session.js:147`

**Issue:** `morphRoundStrategy` is called from `updateSettings` when the strategy changes. When `attendeeIds.length % 4 === 0`, the method returns early (line 147) — which is correct. However, `updateSession` is still called afterward (line 138) with the settings update but no round change. This is fine functionally but the intent is obscured; a reader might expect `morphRoundStrategy` to either mutate state or indicate it has nothing to do.

**Fix:** No code change required, but add a comment at the call site:
```js
// morphRoundStrategy is a no-op when attendee count is divisible by 4
this.morphRoundStrategy(round, session.attendeeIds, session.settings);
```

---

### IN-03: `deleteSession` does not check if the session being deleted is the active session

**File:** `src/services/session.js:307-309`

**Issue:** `deleteSession(id)` silently deletes any session by ID, including an active one. If a caller deletes the active session without closing it first, subsequent calls to `getActiveSession()` will return `undefined` correctly, but any in-progress UI state expecting an active session will be in an inconsistent state. There is no guard or warning.

**Fix:** Add a guard or close before delete:
```js
deleteSession(id) {
  const session = this.getSessions().find(s => s.id === id);
  if (session?.status === 'active') {
    console.warn('deleteSession called on active session — closing first');
    this.closeActiveSession();
  }
  const sessions = this.getSessions().filter(s => s.id !== id);
  StorageAdapter.set('sessions', sessions);
},
```

---

_Reviewed: 2026-04-14_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
