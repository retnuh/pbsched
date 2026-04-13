# Phase 9: Player-Change Test Coverage — Context

**Gathered:** 2026-04-14
**Status:** Ready for planning
**Source:** discuss-phase --auto

<domain>
## Phase Boundary

Write a Vitest suite in `src/services/session.test.js` that proves `SessionService.updateAttendees()` never mutates played round state when the roster changes mid-session.

The tests cover three scenarios:
1. Adding a player mid-session — played rounds unchanged
2. Removing a player who appeared in a played court — played rounds unchanged
3. Only unplayed rounds are affected by the change (regenerated/modified)

</domain>

<decisions>
## Implementation Decisions

### Test file location
- New file: `src/services/session.test.js`
- Rationale: Mirrors the service file location; `scheduler.test.js` owns scheduler functions, `storage.test.js` owns StorageAdapter — session service needs its own file

### Mocking approach
- Use `vi.stubGlobal('localStorage', ...)` pattern from `src/storage.test.js` — consistent with project's existing approach
- Build a minimal in-memory localStorage mock in `beforeEach`, pre-seeded with a session that has played rounds
- No need to mock `crypto.randomUUID()` — tests construct session objects directly via StorageAdapter

### Test data setup pattern
- Inline helper factories within the test file (`makeSession`, `makeRound`) — no shared factory files
- Each `describe` block seeds localStorage with its own session state via `StorageAdapter.set('sessions', [...])`
- Avoids coupling tests to each other

### Played-round comparison method
- Capture played rounds before the call: `const before = JSON.parse(JSON.stringify(playedRoundsBefore))`
- Assert after: `expect(JSON.parse(JSON.stringify(playedRoundsAfter))).toEqual(before)`
- Deep JSON clone ensures byte-for-byte structural equality (per success criteria requirement)

### What "byte-for-byte identical" means here
- Every played round's `courts` array (including `teamA`, `teamB` arrays) and `sittingOut` must match exactly
- Round `index`, `played: true` flag, and player ID ordering within arrays are all asserted equal

### Unplayed-rounds assertion (TEST-03)
- After `updateAttendees`, assert that `session.rounds.filter(r => !r.played)` has been modified (courts differ or round was dropped)
- This demonstrates only unplayed rounds were touched — a negative assertion on played rounds is insufficient alone

### Claude's Discretion
- Exact helper function names and describe block organization
- Number of rounds to include in test fixtures (2 played + 1 unplayed is sufficient)
- Whether to use `beforeEach` or per-test setup (either is fine for this scope)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Core Implementation Files
- `src/services/session.js` — `SessionService.updateAttendees()` is the SUT; `regenerateRound()` and `deleteUnplayedRoundsAfter()` are the methods that could mutate state
- `src/storage.js` — `StorageAdapter` used by SessionService; must be initialized in tests
- `src/scheduler.js` — imported by session.js; pure functions, no mocking needed

### Existing Test Files (patterns to follow)
- `src/storage.test.js` — shows `vi.stubGlobal('localStorage', ...)` pattern and `beforeEach` setup
- `src/scheduler.test.js` — shows test structure, `describe`/`test` conventions, fixture style

### Requirements
- `.planning/REQUIREMENTS.md` — TEST-01, TEST-02, TEST-03 define the acceptance criteria

</canonical_refs>

<specifics>
## Specific Notes

- Todo "Add tests for player changes preserving played match state" (score 0.6) folded into this phase — directly describes what's being built
- Todo "Add drag-and-drop match editor with rest bench" (score 0.9) matches on keywords but is UI scope — NOT folded; deferred
- `updateAttendees` does NOT regenerate rounds by itself — it only updates `attendeeIds`. The views call `regenerateRound` or `deleteUnplayedRoundsAfter` separately. Tests should simulate the full mid-session flow (updateAttendees + round regeneration) to catch real mutation bugs
- Session schema: `{ id, clubId, createdAt, status, attendeeIds, rounds: [{index, courts: [{teamA, teamB}], sittingOut, played}], settings }`
- `settings` object in session requires `oddPlayerFallback`, `candidateCount`, and penalty values to run `generateRounds`

</specifics>

<deferred>
## Deferred Ideas

- Add drag-and-drop match editor with rest bench — UI feature, separate phase

</deferred>

---

*Phase: 09-player-change-test-coverage*
*Context gathered: 2026-04-14 via discuss-phase --auto*
