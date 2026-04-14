# Phase 11: Service Layer & Data Model - Research

**Researched:** 2026-04-14
**Domain:** SessionService extension — vanilla JS service layer, no framework, localStorage persistence
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** `updateRound` on a played round must be atomic — it deletes all subsequent unplayed rounds AND immediately regenerates the next one. The MatchEditor (Phase 12) does not need to call `generateNextRound` separately after save.
- **D-02:** `updateRound` on a proposed (unplayed) round replaces its assignments in place. No subsequent round regeneration needed (there are none).
- **D-03:** Minimal: just `round.source = 'edited'` on the played round record. No `editedAt` timestamp or additional metadata. Rounds without the field are implicitly `source: 'generated'` (backward-compatible).
- **D-04:** Rounds regenerated after a played-round edit are NOT marked with any special source field — they are normal generated rounds.
- **D-05:** Phase 11 must ship with Vitest tests covering all three success criteria.

### Claude's Discretion

- Whether `updateRound` internally delegates to `replaceRound` for the unplayed case or reimplements the logic
- Exact test file location (alongside `session.js` in `src/services/` is the established pattern)

### Deferred Ideas (OUT OF SCOPE)

- `editedAt` timestamp on edited rounds
- Marking regenerated-after-edit rounds with a special source flag
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HIST-01 | Confirmed edits on a proposed round update the round's assignments used by the scheduler | `updateRound` on unplayed round: replace in place; `generateNextRound` already reads played rounds only via `session.rounds.filter(r => r.played)`, so the updated unplayed round's assignments feed into future generation naturally |
| HIST-02 | Confirmed edits on a played round update session history with source flagged as 'edited' | Add `round.source = 'edited'` on the played round record before calling `updateSession`; backward-compatible because existing rounds have no `source` field |
| HIST-03 | Editing a played round invalidates and regenerates all subsequent unplayed rounds | `deleteUnplayedRoundsAfter(roundIndex)` already exists; follow with a single `generateNextRound()` call; atomic because both happen in the same method before any `updateSession` returns to caller |
</phase_requirements>

---

## Summary

Phase 11 adds a single new method — `SessionService.updateRound(roundIndex, updatedRound)` — to the existing `src/services/session.js`. All building blocks are already present in the service: `deleteUnplayedRoundsAfter`, `regenerateRound`, `replaceRound`, and `generateNextRound`. The work is pure orchestration: route the call based on `round.played`, apply the right mutation, persist once via `this.updateSession(session)`.

The scheduler (`scheduler.js`) requires no changes. `generateNextRound` already builds history from `session.rounds.filter(r => r.played)`, so a played round marked `source: 'edited'` participates in history automatically as long as `played: true` is preserved on that record. The `source` field is additive and ignored by the scheduler — complete backward compatibility with existing session data.

The test infrastructure is fully operational: Vitest 4.1.2 is installed, configured in `vite.config.js` with `happy-dom` globals, and the project already has `src/scheduler.test.js` and `src/storage.test.js` as models. The worktree at `.claude/worktrees/agent-afd7819b/src/services/session.test.js` demonstrates the exact localStorage-mocking pattern needed for `session.js` tests — the new test file should live at `src/services/session.test.js` and mirror that pattern.

**Primary recommendation:** Implement `updateRound` as a thin router delegating to existing primitives. Branch on `session.rounds[roundIndex].played`. For played: mutate `source`, call `deleteUnplayedRoundsAfter`, call `generateNextRound`, then `updateSession` once. For unplayed: delegate to `replaceRound` or inline the same replace-in-place logic.

---

## Standard Stack

### Core (already installed — no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vitest | 4.1.2 [VERIFIED: npm at runtime] | Test runner | Already in devDependencies; matches project's existing tests |
| happy-dom | 20.8.9 [VERIFIED: package.json] | DOM environment for tests | Configured in vite.config.js; used by storage.test.js |

**No new packages required.** All runtime dependencies are vanilla JS with no external imports.

**Version verification:** [VERIFIED: package.json and `npx vitest --version`] — Vitest 4.1.2, happy-dom 20.8.9, Node 25.9.0.

---

## Architecture Patterns

### Existing SessionService Method Pattern

Every mutation method in `session.js` follows the same structure:

```javascript
// Source: src/services/session.js (existing methods)
methodName(args) {
  const session = this.getActiveSession();
  if (!session) return null;      // guard — may return early
  
  // 1. Read session state
  // 2. Mutate session in memory
  // 3. Persist once
  this.updateSession(session);
  return result;                  // optional
}
```

`updateRound` must follow this exact pattern: one `getActiveSession()` call, all mutations in memory, one `updateSession(session)` at the end.

### Scheduler's History Consumption

```javascript
// Source: src/services/session.js — generateNextRound()
const playedRounds = session.rounds.filter(r => r.played);
const [nextRound] = generateRounds(
  session.attendeeIds,
  playedRounds,
  1,
  session.settings
);
```

The scheduler sees only `played: true` rounds. A played round with `source: 'edited'` is included automatically. A round where `played` was set to false would be excluded. This means: do NOT change `played` on an edited played round.

### deleteUnplayedRoundsAfter Pattern

```javascript
// Source: src/services/session.js — deleteUnplayedRoundsAfter()
session.rounds = session.rounds.filter(r => r.played || r.index <= roundIndex);
```

This filter keeps: all played rounds (anywhere) + all rounds at or before `roundIndex`. "Subsequent unplayed rounds" means rounds with `index > roundIndex` that have `played: false`. Rounds already played are never removed.

### replaceRound Guards

```javascript
// Source: src/services/session.js — replaceRound()
replaceRound(roundIndex, newRound) {
  const session = this.getActiveSession();
  if (session && session.rounds[roundIndex] && !session.rounds[roundIndex].played) {
    session.rounds[roundIndex] = newRound;
    this.updateSession(session);
  }
}
```

Note: `replaceRound` calls `this.updateSession(session)` internally. If `updateRound` delegates to `replaceRound` for the unplayed case, it calls `updateSession` through `replaceRound` — that is acceptable but means there are two persist calls if `updateRound` also calls `updateSession`. **Recommendation:** for the unplayed path, either inline the replace-in-place logic (avoiding the double persist) or delegate to `replaceRound` and skip the outer `updateSession`. The cleanest approach is to operate directly on `session.rounds[roundIndex]` within `updateRound` and call `updateSession` once at the end.

### Proposed updateRound Logic

```javascript
// [ASSUMED] — Implementation sketch based on verified building blocks
updateRound(roundIndex, updatedRound) {
  const session = this.getActiveSession();
  if (!session || !session.rounds[roundIndex]) return;

  const round = session.rounds[roundIndex];

  if (round.played) {
    // HIST-02: mark as edited
    session.rounds[roundIndex] = { ...updatedRound, played: true, source: 'edited' };

    // HIST-03: delete all subsequent unplayed rounds
    session.rounds = session.rounds.filter(r => r.played || r.index <= roundIndex);

    // Persist before generating next round (generateNextRound reads from storage)
    this.updateSession(session);

    // Regenerate the next round using updated history
    this.generateNextRound();
  } else {
    // HIST-01: replace in place
    session.rounds[roundIndex] = { ...updatedRound, index: roundIndex };
    this.updateSession(session);
  }
}
```

**Critical detail:** `generateNextRound` calls `this.getActiveSession()` and `this.updateSession()` internally. It reads fresh from storage. Therefore the played-round path MUST call `this.updateSession(session)` BEFORE calling `this.generateNextRound()` — otherwise the scheduler generates based on the old history (pre-edit).

### Anti-Patterns to Avoid

- **Double persist without intermediate flush:** Do not call `deleteUnplayedRoundsAfter` then `generateNextRound` before persisting — `generateNextRound` reads from storage, so it would see the pre-deletion state. Persist after deletion, then generate.
- **Clearing `played` flag on an edited round:** The scheduler filters on `played: true`. Removing the flag from an edited played round would exclude it from history entirely, corrupting subsequent generation.
- **Passing `updatedRound` without preserving `played: true`:** The caller (Phase 12 MatchEditor) provides the court/sittingOut assignments. It should not be responsible for setting `played`. `updateRound` must enforce that a played round stays `played: true`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Deleting subsequent unplayed rounds | Custom filter loop | `deleteUnplayedRoundsAfter(roundIndex)` | Already exists, tested indirectly via undo-round flows |
| Regenerating after invalidation | Custom `generateRounds` call | `generateNextRound()` | Already reads attendees and settings from session; handles persistence |
| Persisting session state | Direct localStorage writes | `this.updateSession(session)` | All existing methods use this; ensures consistent storage format |

---

## Common Pitfalls

### Pitfall 1: generateNextRound reads from storage, not from in-memory session

**What goes wrong:** Developer calls `generateNextRound()` before persisting the session. `generateNextRound` calls `this.getActiveSession()` which reads from localStorage. It picks up the old round list (pre-deletion), generates a round based on stale history.

**Why it happens:** `generateNextRound` is designed to be called independently (not passed a session object). It always fetches fresh.

**How to avoid:** In the played-round path of `updateRound`: mutate in memory, call `this.updateSession(session)` to flush, then call `this.generateNextRound()`.

**Warning signs:** Test for HIST-03 passes but subsequent round uses pre-edit history (wrong opponent counts).

### Pitfall 2: updatedRound.index mismatch

**What goes wrong:** `replaceRound` and `regenerateRound` both set `newRound.index = roundIndex` explicitly. If `updateRound` stores `updatedRound` as-is (from a MatchEditor that may not set `index`), the stored round has an undefined or wrong index.

**Why it happens:** The scheduler's `generateCandidate` embeds `index` at generation time. Editor-provided rounds are constructed by the UI, not the scheduler.

**How to avoid:** In `updateRound`, always set `session.rounds[roundIndex].index = roundIndex` (or spread `{ ...updatedRound, index: roundIndex }`) before persisting.

**Warning signs:** `session.rounds[roundIndex].index` is `undefined` or 0 when roundIndex > 0.

### Pitfall 3: Existing test file location conflict

**What goes wrong:** The worktree at `.claude/worktrees/agent-afd7819b/src/services/session.test.js` exists but is NOT in the main working tree. The main `src/services/` directory has no `session.test.js` yet — the worktree file is a prior agent's work, not committed.

**Why it happens:** GSD worktrees are isolated. Files there are not in `src/`.

**How to avoid:** Create `src/services/session.test.js` fresh. The worktree version is a reference for patterns, not a file to copy-paste blindly — verify it matches the current `session.js` API.

**Warning signs:** Running `npx vitest` from project root shows no session service tests if the file was not created in `src/services/`.

### Pitfall 4: source field on regenerated rounds (D-04 violation)

**What goes wrong:** Developer adds `source: 'regenerated-after-edit'` to rounds created by `generateNextRound` after a played-round edit, thinking it aids debugging.

**Why it happens:** Seems harmless; CONTEXT.md explicitly defers this.

**How to avoid:** `generateNextRound` creates rounds via the scheduler — do not modify generated rounds' structure. D-04 is a locked decision.

---

## Code Examples

### Test File Setup Pattern (from existing tests)

```javascript
// Source: src/storage.test.js and worktree session.test.js
import { expect, test, describe, beforeEach, vi } from 'vitest'
import { StorageAdapter } from '../storage.js'
import { SessionService } from './session.js'

const MOCK_SETTINGS = {
  oddPlayerFallback: 'sit-out',
  candidateCount: 1,          // deterministic — only 1 candidate evaluated
  penaltyRepeatedPartner: 5,
  penaltyRepeatedOpponent: 10,
  penaltyRepeatedSitOut: 3,
}

describe('SessionService — updateRound', () => {
  beforeEach(() => {
    StorageAdapter.reset()     // clears localStorage mock between tests
  })
  // ...
})
```

Note: `globals: true` is set in `vite.config.js`. The `beforeEach` import comes from `vitest` explicitly in the worktree tests. Either approach (explicit import or globals) works — follow the explicit import pattern for clarity.

### Minimal Session Fixture

```javascript
// Source: worktree session.test.js — makeSession / makeRound helpers
function makeRound(index, playerIds, played = false) {
  return {
    index,
    courts: [{ teamA: [playerIds[0], playerIds[1]], teamB: [playerIds[2], playerIds[3]] }],
    sittingOut: playerIds.slice(4),
    played,
  }
}

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

Using `candidateCount: 1` makes generation deterministic (only one candidate) — important for HIST-03 tests where the test needs to assert the regenerated round exists and is valid, not assert its exact composition.

### HIST-01 Test Shape (unplayed round replacement)

```javascript
// [ASSUMED] — pattern based on existing test structure
test('updateRound on unplayed round replaces assignments in place', () => {
  const session = makeSession({
    attendeeIds: ['p1', 'p2', 'p3', 'p4'],
    rounds: [makeRound(0, ['p1', 'p2', 'p3', 'p4'], false)],
  })
  StorageAdapter.set('sessions', [session])

  const editedRound = makeRound(0, ['p3', 'p4', 'p1', 'p2'], false)
  SessionService.updateRound(0, editedRound)

  const updated = SessionService.getActiveSession().rounds[0]
  // Verify assignments changed
  expect(updated.courts[0].teamA).toContain('p3')
  // Verify round count unchanged (no extra round added)
  expect(SessionService.getActiveSession().rounds).toHaveLength(1)
})
```

### HIST-02 Test Shape (played round gets source: 'edited')

```javascript
// [ASSUMED] — pattern based on existing test structure
test('updateRound on played round sets source: edited', () => {
  const session = makeSession({
    attendeeIds: ['p1', 'p2', 'p3', 'p4'],
    rounds: [makeRound(0, ['p1', 'p2', 'p3', 'p4'], true)],
  })
  StorageAdapter.set('sessions', [session])

  const editedRound = makeRound(0, ['p3', 'p4', 'p1', 'p2'], true)
  SessionService.updateRound(0, editedRound)

  const updated = SessionService.getActiveSession().rounds[0]
  expect(updated.source).toBe('edited')
  expect(updated.played).toBe(true)  // played flag must survive
})
```

### HIST-03 Test Shape (subsequent unplayed rounds invalidated)

```javascript
// [ASSUMED] — pattern based on existing test structure
test('updateRound on played round invalidates and regenerates subsequent unplayed rounds', () => {
  const session = makeSession({
    attendeeIds: ['p1', 'p2', 'p3', 'p4'],
    rounds: [
      makeRound(0, ['p1', 'p2', 'p3', 'p4'], true),
      makeRound(1, ['p2', 'p3', 'p4', 'p1'], false),  // existing proposed round
    ],
  })
  StorageAdapter.set('sessions', [session])

  const editedRound = makeRound(0, ['p3', 'p4', 'p1', 'p2'], true)
  SessionService.updateRound(0, editedRound)

  const rounds = SessionService.getActiveSession().rounds
  // Original unplayed round at index 1 replaced by freshly generated round
  expect(rounds).toHaveLength(2)
  expect(rounds[0].played).toBe(true)
  expect(rounds[0].source).toBe('edited')
  expect(rounds[1].played).toBe(false)
  expect(rounds[1].index).toBe(1)
})
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|-----------------|--------|
| No history invalidation | `deleteUnplayedRoundsAfter` + `generateNextRound` atomic | Edited played rounds flow cleanly into subsequent generation |
| Alternatives picker uses `replaceRound` | `updateRound` will coexist as a distinct entry point | No conflict; `replaceRound` remains for alternative-picking feature |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `updateRound` must persist before calling `generateNextRound` because `generateNextRound` reads from storage | Architecture Patterns — proposed logic | If wrong: generation uses stale history; HIST-03 tests would catch this |
| A2 | The worktree session.test.js is not committed to main branch; `src/services/session.test.js` does not exist | Common Pitfalls | If wrong: duplicate test file; harmless but confusing |
| A3 | Test shapes for HIST-01/02/03 (Code Examples) | Code Examples | The exact assertion targets may differ once implemented; these are illustrative |

---

## Open Questions (RESOLVED)

1. **Should updateRound guard against non-active sessions?**
   - What we know: All existing SessionService methods guard with `if (!session) return` or `if (session && ...)`. The caller (Phase 12) will only call `updateRound` when a session is active.
   - What's unclear: Whether to silently return or throw on no-session.
   - Recommendation: Follow the existing pattern — silent `return` (no throw). Consistent with all other methods.
   - RESOLVED: Silent `return` (no throw) — matches all existing SessionService guard patterns.

2. **What happens if roundIndex is out of bounds?**
   - What we know: `replaceRound` guards `session.rounds[roundIndex]` existence.
   - What's unclear: Phase 12 will always pass a valid index (from route param), so this is a defensive concern only.
   - Recommendation: Add `if (!session.rounds[roundIndex]) return;` guard for robustness, consistent with `replaceRound`.
   - RESOLVED: Add `if (!session || !session.rounds[roundIndex]) return;` defensive guard — same pattern as `replaceRound` and `regenerateRound`.

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies — pure JS service layer with existing test infrastructure already verified operational).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 [VERIFIED: runtime] |
| Config file | `vite.config.js` — `test: { environment: 'happy-dom', globals: true }` |
| Quick run command | `npx vitest run src/services/session.test.js` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HIST-01 | `updateRound` on unplayed round replaces assignments; scheduler uses them for next generation | unit | `npx vitest run src/services/session.test.js` | Wave 0 |
| HIST-02 | `updateRound` on played round sets `source: 'edited'`; `played: true` preserved | unit | `npx vitest run src/services/session.test.js` | Wave 0 |
| HIST-03 | `updateRound` on played round deletes subsequent unplayed rounds and regenerates next | unit | `npx vitest run src/services/session.test.js` | Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run src/services/session.test.js`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/services/session.test.js` — covers HIST-01, HIST-02, HIST-03 (does not yet exist in main working tree)

*(Existing `src/scheduler.test.js` and `src/storage.test.js` require no changes.)*

---

## Security Domain

Step 2.6 security: Phase 11 is a pure internal service layer mutation — no new network calls, no user-facing input, no authentication surface. The `updateRound` payload originates from the in-memory draft model (Phase 12 draft clone) and is validated by Phase 13 before the editor allows save. No new ASVS categories are introduced by this phase.

---

## Sources

### Primary (HIGH confidence)
- `src/services/session.js` — Full source read; all building-block methods verified
- `src/scheduler.js` — Full source read; `generateNextRound` history consumption pattern verified
- `package.json` + `vite.config.js` — Test stack versions verified
- `.planning/phases/11-service-layer-data-model/11-CONTEXT.md` — Locked decisions loaded
- `.planning/REQUIREMENTS.md` — HIST-01/02/03 definitions loaded

### Secondary (MEDIUM confidence)
- `src/scheduler.test.js` — Established test patterns (describe/test/MOCK_SETTINGS structure)
- `src/storage.test.js` — localStorage mock pattern (vi.stubGlobal)
- `.claude/worktrees/agent-afd7819b/src/services/session.test.js` — Session test reference (not in main tree; pattern verified readable)

### Tertiary (LOW confidence)
- None.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; verified installed versions
- Architecture: HIGH — all building blocks read directly from source; proposed logic is synthesis of verified patterns
- Pitfalls: HIGH — derived from direct code reading, not speculation
- Test patterns: HIGH — existing test files read verbatim

**Research date:** 2026-04-14
**Valid until:** 2026-05-14 (stable vanilla JS codebase; no moving dependencies)
