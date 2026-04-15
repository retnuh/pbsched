---
phase: 09-player-change-test-coverage
reviewed: 2026-04-15T10:50:00Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - src/test-setup.js
  - src/services/session.test.js
findings:
  critical: 0
  high: 1
  medium: 2
  low: 1
  info: 3
  total: 7
status: issues_found
---

# Phase 09: Code Review Report

**Reviewed:** 2026-04-15
**Depth:** standard
**Files Reviewed:** 2 (Phase 09 deliverables at final review-fixed state — commit `6938500`)
**Status:** issues_found

---

## Scope Note

This review covers the Phase 09 deliverables at the state of commit `6938500` — the final commit produced after two rounds of automated review-and-fix. The files reviewed are `src/test-setup.js` (the module-scope localStorage shim) and `src/services/session.test.js` (the three session roster-change tests: TEST-01, TEST-02, TEST-03). `vite.config.js` is infrastructure-only and is not re-reviewed here.

Later phases appended additional describe blocks to `session.test.js` (WR-01, WR-02, WR-03, HIST-01 through HIST-03); those are out of scope for this review.

---

## Summary

The Phase 09 test infrastructure is sound. The localStorage shim correctly patches `globalThis.localStorage` at module evaluation time, which is the only approach that works given `storage.js` calls `initStorage()` at module scope. The `_store`-clearing `beforeEach` in `test-setup.js` prevents cross-file state bleed. `StorageAdapter.reset()` in each test's own `beforeEach` correctly re-initialises the in-memory `state` singleton in `storage.js`.

The three tests verify the right high-level property — that `updateAttendees` + `regenerateRound` never mutate played round state. However, there are several gaps in correctness:

- **HIGH:** TEST-03 asserts `p5` appears in the regenerated round using a membership check over `allPlayersInUnplayed`, but with `candidateCount: 1` the scheduler may place `p5` in the `sittingOut` slot every time due to deterministic assignment. The `toContain('p5')` assertion would pass whether `p5` played or sat out — but this does not catch a bug where `p5` is simply absent from all arrays entirely. The assertion is correct but not maximally strong.
- **MEDIUM:** TEST-02's positive membership assertion (`sortedPlayers.toEqual(['p2', 'p3', 'p4'])`) sorts a derived array but the sort is applied to `allPlayersInUnplayed02`, which is constructed by flatMapping over all unplayed rounds. With only one unplayed round and exactly three players (after removing p1), this works. However if a future fixture change adds a second unplayed round, the sorted assertion would include duplicates and silently fail to catch a missing player. The assertion technique is fragile if the fixture grows.
- **MEDIUM:** TEST-01 (zero-played-rounds boundary case) calls `regenerateRound(0)` after `updateAttendees`. The test asserts the regenerated round contains `p5` but never asserts that the session still has exactly one round. If `regenerateRound` silently appended a second round instead of replacing round 0, the test would still pass.
- **LOW:** `makeSession` uses rest/spread destructuring (`{ attendeeIds, ...overrides }`) but then spreads `overrides` after the base object properties. This means a caller can accidentally override `id`, `clubId`, or `status` via `overrides`, which could silently create a non-`active` session that `getActiveSession()` cannot find, causing cryptic `Cannot read properties of undefined` failures rather than clear test errors.
- **INFO (x3):** Minor documentation and style gaps described below.

No security issues exist (test-only code with synthetic fixture data). No flakiness risks exist beyond the determinism concern noted under HIGH.

---

## HIGH Findings

### H-01: TEST-03 membership check does not guard against `p5` being absent from both courts AND sittingOut

**File:** `src/services/session.test.js` — TEST-03 body (lines ~130-144 in the Phase 09 final state)

**Issue:** The assertion `expect(allPlayersInUnplayed).toContain('p5')` collects all player IDs from `courts.flatMap(c => [...c.teamA, ...c.teamB])` plus `sittingOut`. This would pass if `p5` is sitting out, which is fine — but with `candidateCount: 1` and the `sit-out` fallback strategy, a 5-player pool will produce exactly one standard 2v2 court plus one player sitting out. The scheduler may consistently assign `p5` to `sittingOut`. The assertion is technically correct (p5 IS in the round), but the stronger guarantee — that p5 is accounted for in the full player accounting equation — is not asserted.

More importantly, the current assertion does not catch the case where `regenerateRound` returned `null` (because `generateRounds` returned an empty array) and the old round was never replaced. In that scenario `allPlayersInUnplayed` would be derived from the pre-regeneration round, which already contains p1-p4 but not p5 — and the assertion would correctly fail. However, the test provides no explicit guard that `regenerateRound` actually succeeded (returned a non-null value) before reading the result.

**Fix:** Capture the return value of `regenerateRound` and assert it is not null before reading the regenerated round state:

```js
const regenerated = SessionService.regenerateRound(2)
expect(regenerated).not.toBeNull()
// ... then proceed with unplayed assertions
```

This makes the failure mode explicit if `generateRounds` returns zero candidates.

---

## MEDIUM Findings

### M-01: TEST-02 positive membership assertion is fragile under fixture growth

**File:** `src/services/session.test.js` — TEST-02 body

**Issue:** The assertion:

```js
const sortedPlayers = [...allPlayersInUnplayed02].sort()
expect(sortedPlayers).toEqual(['p2', 'p3', 'p4'])
```

works correctly for the current fixture because there is exactly one unplayed round and exactly three players. `allPlayersInUnplayed02` flatMaps across all unplayed rounds, so if a second unplayed round exists each player appears twice and `sortedPlayers` becomes `['p2', 'p2', 'p3', 'p3', 'p4', 'p4']`, which would fail. This is the right behaviour if a future test author adds a second unplayed round — the test would correctly break. However, the assertion does not communicate its assumption (one unplayed round, no player duplication). A reader who adds a second unplayed round would need to understand why the assertion broke.

**Fix:** Add a guard assertion or comment explaining the assumption:

```js
// Only one unplayed round after regeneration — if this changes, the sorted
// membership assertion below must account for player duplication across rounds.
expect(unplayedAfter02).toHaveLength(1)
const sortedPlayers = [...allPlayersInUnplayed02].sort()
expect(sortedPlayers).toEqual(['p2', 'p3', 'p4'])
```

---

### M-02: TEST-01 does not assert the session has exactly one round after `regenerateRound(0)`

**File:** `src/services/session.test.js` — TEST-01 body

**Issue:** TEST-01 seeds a session with one unplayed round (index 0), then calls `updateAttendees` and `regenerateRound(0)`. The test asserts:

1. No played rounds exist.
2. `rounds[0].index === 0`.
3. `p5` is in the regenerated round.

It does NOT assert that `session.rounds.length === 1`. The `regenerateRound` method replaces `session.rounds[roundIndex]` in place (it does not `push`), so in practice a second round is never appended — but the test does not verify this. A regression that caused `regenerateRound` to `push` a new round in addition to replacing would not be caught.

**Fix:**

```js
const sessionAfter = SessionService.getActiveSession()
expect(sessionAfter.rounds).toHaveLength(1)  // regenerateRound replaces, not appends
```

---

## LOW Findings

### L-01: `makeSession` spreads `overrides` after fixed properties — callers can accidentally clobber `status` and make the session invisible to `getActiveSession`

**File:** `src/services/session.test.js` — `makeSession` factory

**Issue:** The factory is defined as:

```js
function makeSession({ attendeeIds, ...overrides }) {
  return {
    id: 'session-1',
    clubId: 'club-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    status: 'active',
    attendeeIds,
    rounds: [],
    settings: { ...MOCK_SETTINGS },
    ...overrides,
  }
}
```

`overrides` is spread last, so a caller that passes `{ attendeeIds, status: 'closed', rounds: [...] }` will silently produce a session with `status: 'closed'`. `SessionService.getActiveSession()` filters on `status === 'active'`, so the session will not be found. The test will then fail with `Cannot read properties of undefined (reading 'rounds')` rather than a clear assertion error pointing at the cause.

This is not a current bug (no existing call site passes `status`), but the pattern is a hidden trap for future test authors.

**Fix:** Either list the protected keys explicitly or extract the `settings` spread to avoid accidental override of identity fields:

```js
function makeSession({ attendeeIds, rounds = [], settings = MOCK_SETTINGS }) {
  return {
    id: 'session-1',
    clubId: 'club-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    status: 'active',   // not overridable — prevents invisible sessions
    attendeeIds,
    rounds,
    settings: { ...MOCK_SETTINGS, ...settings },
  }
}
```

---

## INFO Findings

### I-01: `matchMedia` mock in `test-setup.js` is not exercised by any Phase 09 test

**File:** `src/test-setup.js:32-43`

**Issue:** The `matchMedia` mock (lines 32-43) was added to support theme-related tests but is not used by any of the Phase 09 roster-change tests. It is harmless here, but its presence in the global setup file will affect every test file in the project — including future ones that may not expect `matchMedia` to return a mock. The mock returns `matches: false` (system prefers light), which is a sensible default, but the comment "Individual tests that need system-dark behavior override with Object.defineProperty" exists only in the current file. If the mock is later changed without that comment, dark-mode tests may silently break across all files.

**Recommendation:** No action required for Phase 09. Document in the team wiki or a test-utilities README that `test-setup.js` provides a `matchMedia` stub with `matches: false` so future test authors know to override it explicitly when testing dark-mode paths.

---

### I-02: `_store.setItem` coerces all values to strings via `String(value)` — does not match the `localStorage` spec for `null`

**File:** `src/test-setup.js:10`

**Issue:** The Web Storage specification states that `localStorage.setItem(key, null)` stores the string `"null"`, so coercing via `String(value)` is spec-compliant. However, `storage.js` only ever stores JSON-stringified objects via `JSON.stringify(data)`, so in practice this distinction never arises. This is noted for completeness — no change is needed.

---

### I-03: TEST-01 comment says "zero played rounds" but the describe label says "adding a player before any round has been played" — slight phrasing mismatch

**File:** `src/services/session.test.js` — TEST-01 describe and inner comment

**Issue:** Minor inconsistency between the describe label `'TEST-01: adding a player before any round has been played'` and the inline comment `// Distinct from TEST-03: zero played rounds`. Both refer to the same scenario, but a future reader scanning only describe labels and only inline comments will see different phrasings. This is cosmetic only.

**Fix:** Align the describe label with the comment, e.g. `'TEST-01: adding a player when no rounds have been played yet'`.

---

## Summary Table

| ID   | Severity | File                              | Description                                                                 |
|------|----------|-----------------------------------|-----------------------------------------------------------------------------|
| H-01 | HIGH     | src/services/session.test.js      | `regenerateRound` return value not checked before asserting round state     |
| M-01 | MEDIUM   | src/services/session.test.js      | TEST-02 positive membership assertion fragile if fixture gains a second unplayed round |
| M-02 | MEDIUM   | src/services/session.test.js      | TEST-01 does not assert `rounds.length === 1` after `regenerateRound`       |
| L-01 | LOW      | src/services/session.test.js      | `makeSession` overrides spread can silently clobber `status: 'active'`      |
| I-01 | INFO     | src/test-setup.js                 | `matchMedia` mock affects all tests but is undocumented outside this file   |
| I-02 | INFO     | src/test-setup.js                 | `String(value)` coercion in `setItem` noted; spec-compliant, no change needed |
| I-03 | INFO     | src/services/session.test.js      | Phrasing mismatch between TEST-01 describe label and inline comment         |

**Totals by severity:**

| Severity | Count |
|----------|-------|
| CRITICAL | 0     |
| HIGH     | 1     |
| MEDIUM   | 2     |
| LOW      | 1     |
| INFO     | 3     |
| **Total**| **7** |

---

_Reviewed: 2026-04-15_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
