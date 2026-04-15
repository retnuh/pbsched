---
phase: 17-test-coverage
reviewed: 2026-04-15T00:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - vite.config.js
  - src/services/club.test.js
  - src/utils/html.test.js
  - src/services/club.js
  - src/utils/html.js
findings:
  critical: 0
  high: 3
  medium: 4
  low: 3
  info: 3
  total: 13
status: issues_found
---

# Phase 17: Code Review Report

**Reviewed:** 2026-04-15
**Depth:** standard (with broader codebase gap analysis)
**Files Reviewed:** 5 primary + supporting context (session.js, scheduler.js, views)
**Status:** issues_found

---

## Summary

Phase 17 adds `@vitest/coverage-v8` integration, 9 ClubService unit tests, and 6 escapeHTML unit tests. The configuration is largely correct and the new tests are well-structured with proper isolation via `StorageAdapter.reset()`. However, the phase leaves meaningful gaps that undermine its stated goal of satisfying TEST-03 and TEST-04 requirements.

The most impactful issues are: (1) `escapeHTML` does not escape single-quotes, creating an XSS vector in attribute contexts with single-quote delimiters, and the test suite does not detect this; (2) the club test suite skips all error/not-found paths, meaning the silent-return branches in `addMember`, `removeMember`, `renameMember`, and `updateMembersLastPlayed` are completely untested; (3) `updateClub` spreading user-supplied `updates` onto the club record without field whitelisting allows arbitrary properties (including `members` overwrite) to be injected through the test surface.

No bugs were introduced by Phase 17 itself. All findings below are either pre-existing gaps that Phase 17 was expected to address, or issues with the new tests' coverage quality.

---

## High Issues

### HI-01: escapeHTML does not escape single-quotes — XSS vector in single-quoted HTML attributes

**File:** `src/utils/html.js:8-14`

**Issue:** The function escapes `&`, `<`, `>`, and `"` but not `'` (single-quote / `&#x27;`). This matters when escaped output is used inside a single-quoted HTML attribute. While the current codebase uses double-quoted attributes in template literals, there is no mechanism preventing future callers from doing `data-x='${escapeHTML(userInput)}'`. A payload of `a' onmouseover='alert(1)` would not be neutralized.

HTML5 specifies `&#x27;` as the safe escape for single-quote in attribute values. OWASP recommends escaping both quote types when building a general-purpose escapeHTML utility.

**Fix:**
```javascript
export function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
```

Add a test in `html.test.js`:
```javascript
test("escapes ' to &#x27;", () => {
  expect(escapeHTML("it's")).toBe('it&#x27;s')
})
```

---

### HI-02: escapeHTML tests do not check null/undefined behavior — silent contract gap

**File:** `src/utils/html.test.js`

**Issue:** `escapeHTML` calls `String(str)` on input, which means `null` becomes `"null"` and `undefined` becomes `"undefined"` — both returned as rendered text in the DOM. The test suite includes a case for `42` (number coercion) but not for `null` or `undefined`.

This matters because `getPlayerName()` in views can return `undefined` if a player ID is not found in the club roster (e.g., a stale session after a member is removed). In that case, `escapeHTML(undefined)` renders `"undefined"` as visible text in the player chip. The behavior is not wrong per se, but it is undocumented and untested, so any future change to the coercion behavior would not be caught.

**Fix:** Add tests to document the contract explicitly:
```javascript
test('coerces null to string "null"', () => {
  expect(escapeHTML(null)).toBe('null')
})

test('coerces undefined to string "undefined"', () => {
  expect(escapeHTML(undefined)).toBe('undefined')
})
```

Alternatively, if the intent is to return `''` for nullish inputs (more defensively correct for a UI utility), add a guard:
```javascript
export function escapeHTML(str) {
  if (str == null) return '';
  return String(str)
    .replace(...)
}
```
Either decision is valid, but it must be tested so the behavior is locked down.

---

### HI-03: Club test suite has zero coverage of not-found / invalid-ID branches

**File:** `src/services/club.test.js`

**Issue:** Four methods in `club.js` silently no-op when given an invalid `clubId` or `memberId`:
- `addMember` (line 48): returns `undefined` silently when club not found
- `removeMember` (line 61): no-ops silently when club not found
- `renameMember` (lines 70, 73): double-nested `if` — outer no-ops on bad `clubId`, inner no-ops on bad `memberId`
- `updateMembersLastPlayed` (line 82): no-ops silently when club not found

None of these branches are exercised. A regression where one of these returns `null` and the caller tries to destructure it would go undetected. More practically, the test for `addMember` only verifies the happy path — it never verifies the return value is `undefined` (not an error) for the not-found case, which is important for callers like `SessionService.createSession` that rely on this.

**Fix:** Add not-found tests for each method:
```javascript
test('addMember returns undefined for non-existent club', () => {
  const result = ClubService.addMember('no-such-club', 'Alice')
  expect(result).toBeUndefined()
  // And verify no club was created as a side effect
  expect(ClubService.getClubs()).toHaveLength(0)
})

test('getClub returns undefined for non-existent id', () => {
  expect(ClubService.getClub('no-such-id')).toBeUndefined()
})

test('renameMember is a no-op for invalid memberId', () => {
  const club = ClubService.createClub('Club')
  ClubService.addMember(club.id, 'Alice')
  ClubService.renameMember(club.id, 'no-such-member', 'Ghost')
  expect(ClubService.getClub(club.id).members[0].name).toBe('Alice')
})
```

---

## Medium Issues

### ME-01: updateClub allows overwriting the members array via spread — no field whitelist

**File:** `src/services/club.js:30-37`

**Issue:** `updateClub(id, updates)` spreads the entire `updates` object onto the club record:
```javascript
clubs[idx] = { ...clubs[idx], ...updates };
```
This means a caller can pass `{ members: [] }` or `{ id: 'new-id' }` and silently overwrite critical fields. There is no whitelist of permitted update keys. The test for `updateClub` only exercises `{ name: 'New Name' }`, giving false confidence that the method is safe.

This is not currently exploitable from UI (the views only update the name field), but it is an API design issue that creates a fragile contract — particularly since `SessionService` calls `ClubService.updateMembersLastPlayed` separately and would not expect a `members` overwrite from an `updateClub` call.

**Fix:** Whitelist the allowed update fields:
```javascript
updateClub(id, updates) {
  const ALLOWED_KEYS = ['name'];
  const clubs = this.getClubs();
  const idx = clubs.findIndex(c => c.id === id);
  if (idx !== -1) {
    const safeUpdates = Object.fromEntries(
      Object.entries(updates).filter(([k]) => ALLOWED_KEYS.includes(k))
    );
    clubs[idx] = { ...clubs[idx], ...safeUpdates };
    StorageAdapter.set('clubs', clubs);
  }
},
```

Add a test:
```javascript
test('updateClub cannot overwrite members via spread', () => {
  const club = ClubService.createClub('Club')
  ClubService.addMember(club.id, 'Alice')
  ClubService.updateClub(club.id, { name: 'New', members: [] })
  expect(ClubService.getClub(club.id).members).toHaveLength(1)
})
```

---

### ME-02: updateClub return value is undefined — callers cannot detect failure

**File:** `src/services/club.js:30-37`

**Issue:** `updateClub` returns nothing (implicitly `undefined`) whether it succeeds or silently no-ops because the club was not found. The test at line 29-33 in `club.test.js` does not verify the return value at all. A calling convention for silent failures (return `false` / throw) is absent and untested.

This is lower urgency because the current callers always have a valid `id` before calling, but it means a future caller cannot distinguish "club updated" from "club not found" without a separate `getClub` call.

**Fix (minimal — document the contract):** Add a test that makes the silent-failure behavior explicit:
```javascript
test('updateClub on non-existent id is a no-op — returns undefined', () => {
  expect(ClubService.updateClub('no-such-id', { name: 'X' })).toBeUndefined()
  expect(ClubService.getClubs()).toHaveLength(0)
})
```

---

### ME-03: Coverage configuration excludes src/main.js and all views — no visibility into real coverage gaps

**File:** `vite.config.js:15-21`

**Issue:** The coverage config sets `include: ['src/**/*.js']` and correctly excludes test files, but `src/main.js` (application entry), `src/router.js`, and all five untested view files (`ClubManager.js`, `MemberEditor.js`, `SessionSetup.js`, `Settings.js`, `Help.js`) will appear in the coverage report with 0% line coverage, which may be expected — but only `MatchEditor.js` and `RoundDisplay.js` have any test coverage at all among the view files.

The coverage report will show accurate numbers, but the Phase 17 plan documents no coverage targets or thresholds. Without a minimum threshold (e.g., `coverage.thresholds`), `npm run coverage` will always pass regardless of actual coverage percentage. This means CI has no enforcement gate.

**Fix:** Add coverage thresholds to make CI actionable:
```javascript
coverage: {
  provider: 'v8',
  reporter: [['text', { skipFull: false }], 'html'],
  include: ['src/**/*.js'],
  exclude: ['src/**/*.test.js', 'src/test-setup.js', 'node_modules/**'],
  all: true,
  thresholds: {
    // Start at current passing level, raise over time
    lines: 60,
    functions: 60,
    branches: 50,
  },
},
```

---

### ME-04: SessionService has no tests for createSession, closeActiveSession, deleteSession, or updateAttendees

**File:** `src/services/session.js` (no corresponding test entry for these methods)

**Issue:** `session.test.js` covers four targeted bug-regression scenarios (WR-01, WR-02, WR-03, HIST-01–03) but omits core lifecycle methods:

- `createSession`: the most important method (initializes session, calls `ClubService.updateMembersLastPlayed`, persists settings with `oddPlayerFallback` default). No test.
- `closeActiveSession`: changes `status` from `active` to `closed`. No test.
- `deleteSession`: removes session from storage. No test.
- `updateAttendees`: mutates `attendeeIds` mid-session. No test.
- `markRoundUnplayed`: only tested indirectly in WR-02, not as a direct behavior test.

Phase 17 was scoped to include session audit (per 17-03 plan), but these gaps remain. The scheduler integration path (`generateNextRound` → `generateRounds` → `updateSession`) is exercised only through mocks in WR-01, not with real scheduling logic.

**Fix:** Add at minimum a `createSession` test that verifies the session is persisted, `oddPlayerFallback` default is set, and `updateMembersLastPlayed` is called:
```javascript
test('createSession persists an active session with default oddPlayerFallback', () => {
  const club = ClubService.createClub('Club')
  const m = ClubService.addMember(club.id, 'Alice')
  const session = SessionService.createSession(club.id, [m.id])
  expect(session.status).toBe('active')
  expect(session.settings.oddPlayerFallback).toBe('three-player-court')
  expect(SessionService.getActiveSession().id).toBe(session.id)
})
```

---

## Low Issues

### LO-01: createClub test does not verify id uniqueness across multiple creates

**File:** `src/services/club.test.js:14-21`

**Issue:** The `createClub` test (line 14) verifies that a single club has a defined `id`, but does not verify that two clubs created in sequence receive different IDs. Since `crypto.randomUUID()` is used in the implementation, this is unlikely to fail in practice, but the test does not enforce the contract. A regression where the UUID generation was replaced with a counter or a constant would pass the current test.

**Fix:**
```javascript
test('createClub assigns unique ids to each club', () => {
  const c1 = ClubService.createClub('Club A')
  const c2 = ClubService.createClub('Club B')
  expect(c1.id).not.toBe(c2.id)
})
```

---

### LO-02: updateMembersLastPlayed test uses live Date — potential flakiness

**File:** `src/services/club.test.js:63-72`

**Issue:** The test at line 67 creates the timestamp with `new Date().toISOString()` inside the test body itself, then passes it directly to the service call on the next line. There is no clock tick between creation and assertion, so this is unlikely to be flaky in practice. However, the pattern is fragile: if the test were refactored to use `vi.useFakeTimers()` for some other purpose, this timestamp would no longer update as expected.

**Fix (minor):** Pin the timestamp to a known ISO string to make the test fully deterministic:
```javascript
const ts = '2026-01-15T10:30:00.000Z'
ClubService.updateMembersLastPlayed(club.id, [m1.id], ts)
```

---

### LO-03: html.test.js does not test the `>` escape in isolation

**File:** `src/utils/html.test.js:9-11`

**Issue:** The second test (`'escapes < to &lt; and > to &gt;'`) tests both `<` and `>` in the same assertion using `'<tag>'`. This means if `>` escaping were broken but `<` escaping still worked, the test would still pass because `escapeHTML('<tag>')` would produce `&lt;tag>` which does not equal `&lt;tag&gt;`, so the test _would_ catch it — this is actually fine. However, the test for `>` in the multi-character test at line 25-27 is redundant. This is a minor test organization note, not a bug.

More importantly: there is no test for the `>` in isolation (e.g., `escapeHTML('>')` equals `'&gt;'`). Matching the pattern of the `&` and `<` tests would be more consistent.

**Fix (optional):** Split into two focused tests:
```javascript
test('escapes < to &lt;', () => {
  expect(escapeHTML('<')).toBe('&lt;')
})
test('escapes > to &gt;', () => {
  expect(escapeHTML('>')).toBe('&gt;')
})
```

---

## Info Items

### IN-01: Five view files have no tests — ClubManager, MemberEditor, SessionSetup, Settings, Help

**Files:** `src/views/ClubManager.js`, `src/views/MemberEditor.js`, `src/views/SessionSetup.js`, `src/views/Settings.js`, `src/views/Help.js`

**Issue:** These files are not covered by any test. `ClubManager.js` and `MemberEditor.js` contain user-input handling, member name rendering, and club name editing logic (including the `textContent` XSS guard at MemberEditor.js:87). `SessionSetup.js` contains the attendee selection and session creation trigger. None of these have mount/render tests.

Phase 17 may have been deliberately scoped to services and utilities only. If so, this is a known gap. It is listed here for visibility in the coverage tracking context.

---

### IN-02: Haptics service has no tests (trivially testable)

**File:** `src/services/haptics.js`

**Issue:** `Haptics` wraps `navigator.vibrate` with four thin methods. These are simple enough to unit test with a mock navigator, and coverage-v8 will report 0% for this file. Testing them verifies the vibration pattern constants haven't been accidentally edited. However, this is low priority since the logic is trivial.

---

### IN-03: router.test.js has one test — route resolution logic is untested

**File:** `src/router.test.js`

**Issue:** The router has non-trivial route-matching logic (parameterized segments, length matching, `hashIsHome` check). Only one test exists, covering `scrollTo` behavior. The parameterized matching (e.g., `/club/:clubId` vs `/club/abc123`) is completely untested, as is the 404 fallback path. This was not introduced in Phase 17, but the phase's coverage audit should have surfaced it.

---

## Summary Table

| Severity | Count | Items |
|----------|-------|-------|
| HIGH     | 3     | HI-01 (missing `'` escape), HI-02 (null/undefined behavior untested), HI-03 (no not-found branch tests) |
| MEDIUM   | 4     | ME-01 (updateClub field whitelist), ME-02 (silent failure contract), ME-03 (no coverage thresholds), ME-04 (SessionService lifecycle gaps) |
| LOW      | 3     | LO-01 (id uniqueness not asserted), LO-02 (live Date in test), LO-03 (isolated `>` test missing) |
| INFO     | 3     | IN-01 (five view files untested), IN-02 (Haptics untested), IN-03 (router resolution untested) |
| **TOTAL**| **13**| |

---

## Recommended Action Order

1. **Fix HI-01 immediately** — add `'` → `&#x27;` to `escapeHTML` and a corresponding test. This is the only finding with a live XSS risk vector, even if currently unexploited.
2. **Fix HI-02** — decide whether `null`/`undefined` should return `''` or `"null"`/`"undefined"`, and add tests to lock in the decision.
3. **Fix HI-03** — add not-found branch tests for `addMember`, `getClub`, and `renameMember`. These take less than 10 minutes total.
4. **Add ME-03 thresholds** — prevents coverage from silently degrading as the codebase grows.
5. Remaining medium/low items can be addressed in a follow-up test pass.

---

_Reviewed: 2026-04-15_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
