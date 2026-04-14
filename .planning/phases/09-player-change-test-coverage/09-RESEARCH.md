# Phase 9: Player-Change Test Coverage — Research

**Researched:** 2026-04-14
**Domain:** Vitest unit testing — SessionService.updateAttendees() + round regeneration
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Test file location:** `src/services/session.test.js` — mirrors service file; scheduler.test.js owns scheduler functions, storage.test.js owns StorageAdapter
- **Mocking approach:** `vi.stubGlobal('localStorage', ...)` pattern from storage.test.js — consistent with project approach
- **Test data setup:** Inline helper factories within the test file (`makeSession`, `makeRound`) — no shared factory files; each `describe` block seeds localStorage via `StorageAdapter.set('sessions', [...])`
- **Played-round comparison:** Deep JSON clone before/after — `JSON.parse(JSON.stringify(...))` — ensures byte-for-byte structural equality
- **"Byte-for-byte identical" definition:** Every played round's `courts` array (including `teamA`, `teamB` arrays), `sittingOut`, round `index`, `played: true` flag, and player ID ordering within arrays
- **TEST-03 assertion:** After `updateAttendees`, assert `session.rounds.filter(r => !r.played)` has been modified (courts differ or round was dropped) — not just a negative assertion on played rounds

### Claude's Discretion
- Exact helper function names and describe block organization
- Number of rounds in test fixtures (2 played + 1 unplayed is sufficient)
- Whether to use `beforeEach` or per-test setup

### Deferred Ideas (OUT OF SCOPE)
- Add drag-and-drop match editor with rest bench — UI feature, separate phase
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TEST-01 | Tests verify played rounds retain their courts and players when a new player is added mid-session | updateAttendees() only mutates attendeeIds; regenerateRound() guards on `!round.played`; test seeds 2 played rounds, adds player, calls regenerateRound on unplayed round, asserts played rounds unchanged |
| TEST-02 | Tests verify played rounds retain their courts and players when a player is removed mid-session (including players who appeared in played courts) | Same guard in regenerateRound(); remove a player who appeared in played courts, regenerate unplayed rounds, assert played rounds unchanged including the removed player's ID |
| TEST-03 | Tests verify that only unplayed rounds are affected by roster changes | After updateAttendees + regenerateRound, assert unplayed rounds changed (courts differ) AND played rounds are identical — both assertions needed |
</phase_requirements>

---

## Summary

Phase 9 writes `src/services/session.test.js` — a Vitest suite proving that `SessionService.updateAttendees()` plus subsequent round regeneration never mutates played round state. The SUT is well-structured: `updateAttendees()` only writes `attendeeIds`, and `regenerateRound()` has an explicit guard (`!session.rounds[roundIndex].played`) that prevents mutation of played rounds.

There is one significant infrastructure issue: the existing `storage.test.js` is currently broken due to a vitest 4.x / happy-dom 20.x regression where `localStorage` is provided as a plain object without method implementations (`getItem`, `setItem` are `undefined`). Because `storage.js` calls `initStorage()` at module scope (line 85), any test file that imports `StorageAdapter` or `SessionService` will crash before any `beforeEach` stub can run. The fix — adding `setupFiles` to `vite.config.js` with a localStorage patch — was verified to work and also fixes `storage.test.js`.

**Primary recommendation:** Wave 0 must add `setupFiles: ['./src/test-setup.js']` to `vite.config.js` and create the patch file before any session tests can be written or run.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vitest | ^4.1.2 | Test runner | Already installed; `justfile` `test` target uses it |
| happy-dom | ^20.8.9 | DOM environment | Already configured in `vite.config.js` `test.environment` |

**Installation:** No new packages needed. [VERIFIED: package.json]

**Test run command:** `npx vitest run` (or `just test`) [VERIFIED: justfile]

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── services/
│   ├── session.js        # SUT
│   └── session.test.js   # NEW — phase 9 target
├── scheduler.test.js     # Existing — pure functions only
├── storage.test.js       # Existing — StorageAdapter only
└── test-setup.js         # NEW — Wave 0 prerequisite
vite.config.js            # MODIFIED — add setupFiles in Wave 0
```

### Pattern 1: Module-level localStorage patch via setupFiles

**What:** `vite.config.js` `test.setupFiles` points to a file that patches `globalThis.localStorage` before any module imports run. This is required because `storage.js` calls `initStorage()` at module scope.

**When to use:** Required for any test file that imports `StorageAdapter`, `SessionService`, or `ClubService`.

**Verified:** Running `storage.test.js` with `setupFiles` active passes all 3 tests. Without it, `localStorage.getItem is not a function` is thrown. [VERIFIED: local test run]

```javascript
// src/test-setup.js
// Patch localStorage before any module-level code runs.
// Required: happy-dom 20.x / vitest 4.x provides localStorage as a plain object
// with no method implementations (getItem, setItem are undefined).
const _storage = {}
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key) => _storage[key] ?? null,
    setItem: (key, value) => { _storage[key] = String(value) },
    removeItem: (key) => { delete _storage[key] },
    clear: () => { Object.keys(_storage).forEach(k => delete _storage[k]) },
    get length() { return Object.keys(_storage).length }
  },
  writable: true,
  configurable: true
})
```

```javascript
// vite.config.js — add setupFiles to test block
test: {
  environment: 'happy-dom',
  globals: true,
  setupFiles: ['./src/test-setup.js'],  // ADD THIS
},
```

### Pattern 2: Session fixture factory

**What:** Inline helper functions that construct minimal session objects. The `settings` object must include all keys consumed by `generateRounds` / `scoreRound`.

**Minimum settings object** — all five keys required by `scoreRound` and `generateRounds`: [VERIFIED: scheduler.js lines 159, 167–168, 172–177, 253]

```javascript
const MOCK_SETTINGS = {
  oddPlayerFallback: 'sit-out',  // or 'three-player-court'
  candidateCount: 1,             // 1 candidate = deterministic enough for tests
  penaltyRepeatedPartner: 5,
  penaltyRepeatedOpponent: 10,
  penaltyRepeatedSitOut: 3,
}
```

**Minimum session fixture:**
```javascript
function makeRound(index, playerIds, played = false) {
  // 4 players: 1 court 2v2, 0 sitting out
  // 5 players: 1 court 2v2, 1 sitting out (with 'sit-out' strategy)
  const courts = [{ teamA: [playerIds[0], playerIds[1]], teamB: [playerIds[2], playerIds[3]] }]
  const sittingOut = playerIds.slice(4)
  return { index, courts, sittingOut, played }
}

function makeSession(overrides = {}) {
  return {
    id: 'session-1',
    clubId: 'club-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    status: 'active',
    attendeeIds: ['p1', 'p2', 'p3', 'p4'],
    rounds: [],
    settings: { ...MOCK_SETTINGS },
    ...overrides
  }
}
```

### Pattern 3: Seeding state via StorageAdapter.set

**What:** Each `describe` block (or `beforeEach`) calls `StorageAdapter.set('sessions', [...])` directly. `StorageAdapter.set` writes to the in-memory `state` object and persists to the mocked `localStorage`. `SessionService.getActiveSession()` reads from the same `state`.

**Important:** `StorageAdapter` holds module-level `state`. Between tests, use `StorageAdapter.reset()` in `beforeEach` to flush state, then re-seed.

```javascript
beforeEach(() => {
  StorageAdapter.reset()  // clears state back to { schemaVersion: 1, clubs: [], sessions: [], settings: {...} }
  const session = makeSession({
    rounds: [
      makeRound(0, ['p1','p2','p3','p4'], true),   // played
      makeRound(1, ['p1','p3','p2','p4'], true),   // played
      makeRound(2, ['p1','p2','p3','p4'], false),  // unplayed — to be regenerated
    ]
  })
  StorageAdapter.set('sessions', [session])
})
```

### Pattern 4: Full mid-session flow in tests

**What:** The CONTEXT.md note is critical — `updateAttendees()` alone does NOT regenerate rounds. The view calls `regenerateRound()` or `deleteUnplayedRoundsAfter()` separately. Tests must simulate the full flow:

```javascript
// Simulate adding a player mid-session
SessionService.updateAttendees(['p1', 'p2', 'p3', 'p4', 'p5'])
// Then the view would call regenerateRound for the pending unplayed round:
SessionService.regenerateRound(2)
// Now assert
```

**For TEST-03 (only unplayed affected):** Assert both sides:
1. Played rounds are identical (deep clone equality)
2. Unplayed round DID change (different courts or player count)

### Pattern 5: Deep clone comparison for played rounds

```javascript
// Before
const session = SessionService.getActiveSession()
const playedBefore = JSON.parse(JSON.stringify(session.rounds.filter(r => r.played)))

// ... perform action ...

// After
const sessionAfter = SessionService.getActiveSession()
const playedAfter = JSON.parse(JSON.stringify(sessionAfter.rounds.filter(r => r.played)))

expect(playedAfter).toEqual(playedBefore)
```

### Anti-Patterns to Avoid

- **Stubbing localStorage in `beforeEach` only:** Fails because `storage.js` imports run at module scope before any `beforeEach`. Must use `setupFiles`.
- **Using `vi.mock('./storage.js')`:** Bypasses the actual StorageAdapter, making tests test mocks instead of real behavior.
- **Forgetting `StorageAdapter.reset()` between tests:** Module-level `state` persists across tests within the same file. Active sessions from one test bleed into the next.
- **Calling only `updateAttendees()` and asserting round changes:** The method only updates `attendeeIds`. Tests must also call `regenerateRound()` to simulate the full view flow — otherwise unplayed rounds never change and TEST-03 would be vacuously true.
- **Setting `candidateCount: 0`:** `generateRounds` iterates `for (let c = 0; c < settings.candidateCount; c++)` — zero iterations means `bestCandidate` stays `null` and the push crashes. Use `candidateCount: 1` for fast, deterministic tests.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| localStorage mock | Custom class | Object literal with `getItem`/`setItem` | The existing `storage.test.js` pattern is proven; a full `Storage` class is overkill |
| Round fixture data | Hardcoded JSON blobs in each test | `makeRound()` / `makeSession()` factory functions | Factories make the "before" state clear and keep tests DRY within the file |

---

## Call Chain Analysis

**Critical findings from code review:** [VERIFIED: src/services/session.js]

### `updateAttendees(newAttendeeIds)`
- Line 107–112: Reads active session, sets `session.attendeeIds = newAttendeeIds`, calls `updateSession(session)`
- **Does NOT touch `session.rounds` at all**
- **Does NOT call `regenerateRound()` or `deleteUnplayedRoundsAfter()`**
- The view layer is responsible for calling those after `updateAttendees()`

### `regenerateRound(roundIndex, forcedSitOutIds)`
- Line 223: Guard — `if (session && session.rounds[roundIndex] && !session.rounds[roundIndex].played)`
- If the round has `played: true`, the method returns `null` without mutating anything
- **The guard is IN THE CODE** — tests need to verify the guard works, not implement it

### `deleteUnplayedRoundsAfter(roundIndex)`
- Line 97–102: `session.rounds = session.rounds.filter(r => r.played || r.index <= roundIndex)`
- Only keeps rounds that are played OR have index <= the given index
- **Played rounds are preserved by this filter** — `r.played` is the first condition

### What tests need to exercise
1. `updateAttendees(newIds)` then `regenerateRound(unplayedIdx)` → played rounds unchanged
2. `updateAttendees(fewerIds)` then `regenerateRound(unplayedIdx)` → played rounds unchanged (even if removed player was in them)
3. Both of the above + assert unplayed round DID change

---

## Common Pitfalls

### Pitfall 1: `localStorage.getItem is not a function` at import time
**What goes wrong:** Test file crashes before any test runs with `TypeError: localStorage.getItem is not a function` pointing at `storage.js:58`.
**Why it happens:** happy-dom 20.x / vitest 4.x provides `localStorage` as a plain empty object (no method implementations). `storage.js` calls `initStorage()` at module scope (line 85), which fires when the ES module is imported — before `beforeEach` or `vi.stubGlobal` can run.
**How to avoid:** Add `setupFiles: ['./src/test-setup.js']` to `vite.config.js` test block. The setup file uses `Object.defineProperty` to patch `globalThis.localStorage` before any module runs.
**Warning signs:** The `--localstorage-file` warning in vitest output is a symptom of this vitest 4.x change.

### Pitfall 2: Module-level state leaking between tests
**What goes wrong:** Test 2 sees sessions or state from Test 1 because `StorageAdapter.state` is a module singleton.
**Why it happens:** ES module singletons are not re-initialized between tests in the same vitest worker.
**How to avoid:** Call `StorageAdapter.reset()` in `beforeEach` before re-seeding state.
**Warning signs:** Tests pass individually but fail when run together.

### Pitfall 3: TEST-03 is vacuously true
**What goes wrong:** The test asserts unplayed rounds were affected, but the assertion always passes because `updateAttendees()` alone never changes rounds.
**Why it happens:** Forgetting to call `regenerateRound()` after `updateAttendees()`.
**How to avoid:** The test must simulate the full view flow: `updateAttendees()` then `regenerateRound()`. Assert the unplayed round's courts are different (player count changed, or specific players differ).
**Warning signs:** TEST-03 passes immediately without any round regeneration call.

### Pitfall 4: `candidateCount: 0` crashes round generation
**What goes wrong:** `generateRounds` generates zero candidates, `bestCandidate` is `null`, then `session.rounds[roundIndex] = null` is written, breaking subsequent reads.
**Why it happens:** The `for (let c = 0; c < settings.candidateCount; c++)` loop in `generateRounds` (line 253) needs at least 1 iteration.
**How to avoid:** Use `candidateCount: 1` in `MOCK_SETTINGS`.

### Pitfall 5: The removed player's ID still appears in played courts — and that's correct
**What goes wrong:** Test author sees the removed player's ID in a played round and thinks the assertion should fail.
**Why it happens:** Played round state is intentionally immutable. The removed player's historical participation stays in the record.
**How to avoid:** The assertion for TEST-02 is that the played round is UNCHANGED — the removed player's ID should still be there, exactly as it was before removal.

---

## Code Examples

### Minimal working test structure

```javascript
// src/services/session.test.js
import { expect, test, describe, beforeEach } from 'vitest'
import { StorageAdapter } from '../storage.js'
import { SessionService } from './session.js'

const MOCK_SETTINGS = {
  oddPlayerFallback: 'sit-out',
  candidateCount: 1,
  penaltyRepeatedPartner: 5,
  penaltyRepeatedOpponent: 10,
  penaltyRepeatedSitOut: 3,
}

function makeRound(index, playerIds, played = false) {
  return {
    index,
    courts: [{ teamA: [playerIds[0], playerIds[1]], teamB: [playerIds[2], playerIds[3]] }],
    sittingOut: playerIds.slice(4),
    played,
  }
}

function makeSession(overrides = {}) {
  return {
    id: 'session-1',
    clubId: 'club-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    status: 'active',
    attendeeIds: ['p1', 'p2', 'p3', 'p4'],
    rounds: [],
    settings: { ...MOCK_SETTINGS },
    ...overrides,
  }
}

describe('SessionService — mid-session roster changes', () => {
  beforeEach(() => {
    StorageAdapter.reset()
  })

  describe('TEST-01: adding a player mid-session', () => {
    test('played rounds are unchanged after adding a player and regenerating', () => {
      const session = makeSession({
        attendeeIds: ['p1', 'p2', 'p3', 'p4'],
        rounds: [
          makeRound(0, ['p1', 'p2', 'p3', 'p4'], true),
          makeRound(1, ['p2', 'p4', 'p1', 'p3'], true),
          makeRound(2, ['p1', 'p2', 'p3', 'p4'], false),
        ],
      })
      StorageAdapter.set('sessions', [session])

      const playedBefore = JSON.parse(JSON.stringify(
        SessionService.getActiveSession().rounds.filter(r => r.played)
      ))

      // Simulate full mid-session flow: update attendees, then regenerate unplayed round
      SessionService.updateAttendees(['p1', 'p2', 'p3', 'p4', 'p5'])
      SessionService.regenerateRound(2)

      const playedAfter = JSON.parse(JSON.stringify(
        SessionService.getActiveSession().rounds.filter(r => r.played)
      ))

      expect(playedAfter).toEqual(playedBefore)
    })
  })
})
```

### TEST-02 snapshot comparison including removed player in courts

```javascript
// The removed player (p1) appeared in played courts — but played rounds must stay identical
SessionService.updateAttendees(['p2', 'p3', 'p4'])
SessionService.regenerateRound(2)

const playedAfter = JSON.parse(JSON.stringify(
  SessionService.getActiveSession().rounds.filter(r => r.played)
))
// p1 should still appear in playedAfter[0].courts[0].teamA — unchanged
expect(playedAfter).toEqual(playedBefore)
```

### TEST-03 dual assertion

```javascript
// Assert played rounds unchanged AND unplayed round changed
const unplayedBefore = JSON.parse(JSON.stringify(
  SessionService.getActiveSession().rounds.filter(r => !r.played)
))

SessionService.updateAttendees(['p1', 'p2', 'p3', 'p4', 'p5'])
SessionService.regenerateRound(2)

const session = SessionService.getActiveSession()
const playedAfter = JSON.parse(JSON.stringify(session.rounds.filter(r => r.played)))
const unplayedAfter = JSON.parse(JSON.stringify(session.rounds.filter(r => !r.played)))

// Played rounds: must be identical
expect(playedAfter).toEqual(playedBefore)

// Unplayed rounds: must have changed (p5 now present)
const allPlayersInUnplayed = unplayedAfter.flatMap(r => [
  ...r.courts.flatMap(c => [...c.teamA, ...c.teamB]),
  ...r.sittingOut
])
expect(allPlayersInUnplayed).toContain('p5')
```

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 |
| Config file | `vite.config.js` (test block) |
| Quick run command | `npx vitest run src/services/session.test.js` |
| Full suite command | `npx vitest run` or `just test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TEST-01 | Adding a player: played rounds unchanged | unit | `npx vitest run src/services/session.test.js` | Wave 0 |
| TEST-02 | Removing a player (even from played courts): played rounds unchanged | unit | `npx vitest run src/services/session.test.js` | Wave 0 |
| TEST-03 | Only unplayed rounds affected by roster changes | unit | `npx vitest run src/services/session.test.js` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run src/services/session.test.js`
- **Per wave merge:** `npx vitest run` (full suite)
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/test-setup.js` — localStorage patch (fixes storage.test.js regression too)
- [ ] `vite.config.js` — add `setupFiles: ['./src/test-setup.js']` to test block
- [ ] `src/services/session.test.js` — the test file itself (this is what waves 1-3 build)

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Vitest runner | Yes | v25.9.0 | — |
| vitest | Test framework | Yes | 4.1.2 | — |
| happy-dom | DOM environment | Yes | 20.8.9 | — |
| just | `just test` shortcut | Yes (assumed) | — | `npx vitest run` |

**Missing dependencies with no fallback:** None. [VERIFIED: package.json, local test run]

---

## Security Domain

Security enforcement is not applicable to this phase — the deliverable is a test-only file with no network I/O, authentication, or user input handling.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `just` is available on the developer machine | Environment Availability | Low — `npx vitest run` is equivalent and works without just |

---

## Open Questions

1. **Should `storage.test.js` regression be fixed in Wave 0 or as a separate task?**
   - What we know: The regression (happy-dom 20.x / vitest 4.x) causes `storage.test.js` to crash. The `setupFiles` fix resolves both `storage.test.js` and `session.test.js`.
   - What's unclear: Whether fixing `storage.test.js` is in scope for Phase 9 or should be a separate item.
   - Recommendation: Fix it in Wave 0 of Phase 9 — it's 2 lines in `vite.config.js` + 1 new file, and the session tests cannot run without it anyway.

2. **How many unplayed rounds to include in fixtures for TEST-03?**
   - What we know: CONTEXT.md says "2 played + 1 unplayed is sufficient."
   - What's unclear: Whether 1 unplayed round is enough to prove only unplayed rounds change.
   - Recommendation: 1 unplayed round is sufficient. The assertion checks both that played rounds are identical AND that the unplayed round now contains the new player.

---

## Sources

### Primary (HIGH confidence)
- `src/services/session.js` — full source read; `updateAttendees()`, `regenerateRound()`, `deleteUnplayedRoundsAfter()` analyzed directly [VERIFIED: local file read]
- `src/storage.js` — `StorageAdapter` module-level `initStorage()` call verified at line 85 [VERIFIED: local file read]
- `src/scheduler.js` — `generateRounds()` settings keys verified at lines 253, 159, 167–177 [VERIFIED: local file read]
- `src/scheduler.test.js` — `MOCK_SETTINGS` shape and test patterns confirmed [VERIFIED: local file read]
- `src/storage.test.js` — `vi.stubGlobal` pattern confirmed; regression verified by running tests [VERIFIED: local test run]
- `vite.config.js` — `test.environment: 'happy-dom'`, `globals: true` confirmed [VERIFIED: local file read]
- `package.json` — vitest 4.1.2, happy-dom 20.8.9 confirmed [VERIFIED: local file read]
- `justfile` — `just test` = `npx vitest run` confirmed [VERIFIED: local file read]

### Secondary (MEDIUM confidence)
- Local test run: `setupFiles` approach with `Object.defineProperty(globalThis, 'localStorage', ...)` fixes the vitest 4.x regression — confirmed by running storage.test.js with temporary config change [VERIFIED: local test run]

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Call chain analysis (updateAttendees / regenerateRound / deleteUnplayedRoundsAfter): HIGH — read from source
- Guard behavior (`!round.played` check): HIGH — read from source, line 224
- localStorage regression: HIGH — reproduced locally and fix verified
- Minimum settings object: HIGH — read from scheduler.js
- Test fixture design: HIGH — derived from scheduler.test.js patterns

**Research date:** 2026-04-14
**Valid until:** 2026-05-14 (stable stack — vitest/happy-dom versions pinned in package.json)
