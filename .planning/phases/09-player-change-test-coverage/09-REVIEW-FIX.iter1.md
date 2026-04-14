---
phase: 09-player-change-test-coverage
fixed_at: 2026-04-14T00:00:00Z
review_path: .planning/phases/09-player-change-test-coverage/09-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Phase 09: Code Review Fix Report

**Fixed at:** 2026-04-14
**Source review:** .planning/phases/09-player-change-test-coverage/09-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 5
- Fixed: 5
- Skipped: 0

## Fixed Issues

### WR-01: `localStorage` store is never cleared between tests — state can bleed across test files

**Files modified:** `src/test-setup.js`
**Commit:** 6869aa4
**Applied fix:** Added a `beforeEach` hook (importing from `vitest`) at the bottom of `test-setup.js` that deletes every key from `_store` before each test. This ensures the shim's in-memory store is truly empty at the start of every test, regardless of which keys other test files may have written.

---

### WR-02: TEST-01 and TEST-02 assert the same thing — TEST-02 cannot catch a remove-player regression independently

**Files modified:** `src/services/session.test.js`
**Commit:** 6c4d6c9
**Applied fix:** Added a complementary assertion after the existing `expect(playedAfter).toEqual(playedBefore)` in TEST-02. The new assertion collects all player IDs from unplayed rounds after regeneration and asserts that `p1` (the removed player) is not present, catching any bug where `attendeeIds` was not persisted before `regenerateRound` read it.

---

### IN-01: `makeRound` helper ignores the `index` field returned by `generateRounds`

**Files modified:** `src/services/session.test.js`
**Commit:** 6c4d6c9
**Applied fix:** Added a comment above `makeRound` explaining that the hardcoded `index` value is safe today because `regenerateRound` overwrites `newRound.index` after generation, but noting that if `generateRounds` ever uses `index` internally the fixtures must be updated.

---

### IN-02: `makeSession` sets `candidateCount: 1` — hides randomisation bugs

**Files modified:** `src/services/session.test.js`
**Commit:** 6c4d6c9
**Applied fix:** Added a comment above `MOCK_SETTINGS` explaining that `candidateCount: 1` is intentional for determinism in roster-change integration tests, and that the scheduler's candidate-selection and scoring paths are not exercised here.

---

### IN-03: Vitest `globals: true` set but test file explicitly imports from `vitest`

**Files modified:** `src/services/session.test.js`
**Commit:** 6c4d6c9
**Applied fix:** Removed the `import { expect, test, describe, beforeEach } from 'vitest'` line from `session.test.js`. With `globals: true` in `vite.config.js`, Vitest injects these into the global scope automatically; the explicit import was redundant and inconsistent with how future test files may be written.

---

_Fixed: 2026-04-14_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
