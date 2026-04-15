---
phase: 11-service-layer-data-model
reviewed: 2026-04-15T00:00:00Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - src/services/session.js
  - src/services/session.test.js
findings:
  critical: 0
  high: 1
  medium: 4
  low: 2
  info: 3
  total: 10
status: issues_found
---

# Phase 11: Code Review Report — `updateRound`

**Reviewed:** 2026-04-15
**Depth:** standard (focused on updateRound and HIST-01/02/03 tests)
**Files Reviewed:** 2
**Status:** issues_found

Note: Four issues from the original Phase 11 review (WR-01 through WR-04) were already
addressed in commit `08913d4`. This review evaluates the current state of the code,
treating those fixes as resolved. The WR-01/02 fixes in particular (`generateNextRound`
empty-result guard and `updateSession` index re-stamping) are directly relevant to
`updateRound` correctness and are referenced where appropriate.

---

## Summary

`updateRound` is structurally correct. The played/unplayed branching is clean, the
persist-before-generate ordering is correct, and `source: 'edited'` is applied only
on the played path. The most significant remaining issue is a filter race condition:
the inline deletion filter at line 283 runs on in-memory objects whose `.index` fields
may still reflect pre-call values from the caller's `updatedRound` spread — and the
`updateSession` re-stamper that would fix them runs only *after* the filter. One HIGH
finding (filter uses stale index from the spread object in edge cases), four MEDIUM
findings (no rollback on persist failure, unconditional post-edit regeneration, silent
no-op on missing session/round, and `source` field passthrough from caller), and three
INFO findings (test coverage gaps) round out the report.

---

## HIGH

### H-01: Filter in played-round branch can match wrong rounds when `updatedRound` carries a stale or incorrect `index` field

**File:** `src/services/session.js:279–283`

**Issue:**

```js
session.rounds[roundIndex] = { ...updatedRound, played: true, source: 'edited', index: roundIndex };

session.rounds = session.rounds.filter(r => r.played || r.index <= roundIndex);
```

The spread `{ ...updatedRound, ..., index: roundIndex }` correctly sets the edited round's
own index. However, the *subsequent rounds* still hold their own `.index` fields from when
they were originally generated. The filter relies on those subsequent-round `.index` values
being in sync with their array positions. Under normal operation this holds because
`updateSession`'s index re-stamper keeps indexes accurate — but the re-stamper runs at
line 287, *after* the filter at line 283 already ran.

The filter is therefore evaluated against the in-memory state *before* re-stamping.
Normally this is safe because no operation in the played path scrambles subsequent rounds'
index values before this point. But the contract is fragile: any caller that builds a round
with a wrong `.index` (e.g., copy-pasting a round object from a different position) would
cause the filter to silently retain or drop the wrong subsequent rounds.

A concrete failure scenario: if the caller passes `updatedRound` with `index: 0` for
`roundIndex = 2`, the edited round is stored with `index: 2` (correct — the spread wins).
But if a subsequent unplayed round at position 3 has `index: 0` due to a bug elsewhere,
the filter `r.index <= roundIndex` evaluates `0 <= 2` → true, and that round is kept
instead of deleted.

**Fix:** Run the filter after `updateSession` (which re-stamps indexes), or use array
position rather than `.index` for the filter:

```js
// Played branch
session.rounds[roundIndex] = { ...updatedRound, played: true, source: 'edited', index: roundIndex };

// Delete subsequent unplayed rounds by array position, not by .index field
session.rounds = session.rounds.filter((r, i) => r.played || i <= roundIndex);

this.updateSession(session);
this.generateNextRound();
```

Using `i` (the array position from `filter`'s callback) eliminates dependence on the
`.index` field entirely and is immune to stale values.

The same fix should be applied to `deleteUnplayedRoundsAfter` (line 102), which has the
identical pattern. Note: the existing `updateSession` re-stamper (WR-02 fix) is a good
safety net on write, but the filter runs before that net catches anything.

---

## MEDIUM

### M-01: No rollback if `updateSession` (persist) fails — `generateNextRound` runs against unsaved state

**File:** `src/services/session.js:287–289`

**Issue:**

```js
this.updateSession(session);      // persist
this.generateNextRound();          // reads from storage
```

`StorageAdapter.set` swallows `QuotaExceededError` silently (see `storage.js:89–93`).
If localStorage is full, `updateSession` appears to succeed but the data is not written.
`generateNextRound` then calls `this.getActiveSession()`, which reads back from the in-memory
`state` object inside `StorageAdapter` — not from raw localStorage — so it sees the
post-persist in-memory state and generates a new round. That new round is then written
(also silently failing). The session looks correct in memory for the rest of this page load,
but on a hard refresh the user sees:

- The played round reverted to its pre-edit state (old data from disk)
- The generated next round vanished

Because the quota failure is silent, the user receives no warning and may believe their edit
was saved when it was not. This is not introduced by Phase 11 (it is an infrastructure
limitation), but `updateRound`'s persist-then-generate design makes the failure mode
particularly misleading.

**Fix (minimal):** Surface the error from `StorageAdapter.set` so callers can detect and
signal failure. At a minimum, `updateRound` should check for a thrown error or return value:

```js
// storage.js saveAll — re-throw after logging so callers can catch
} catch (e) {
  if (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014) {
    console.error('LocalStorage quota exceeded. Data may not be saved.');
    throw e;  // let callers decide how to handle
  }
  throw e;
}
```

Until that change lands, `updateRound` is operating correctly by spec but the spec has a
silent-failure gap. Document it in the method's JSDoc.

---

### M-02: Unconditional `generateNextRound()` on every played-round edit may create unintended extra rounds

**File:** `src/services/session.js:289`

**Issue:** `generateNextRound()` is called unconditionally after editing any played round,
regardless of whether:

1. The session already has a pending unplayed round at the tail (only possible if it was
   played — the filter at line 283 deletes all subsequent unplayed rounds, so this is not
   currently a problem).
2. The session is closed. `generateNextRound` checks for `getActiveSession()` and returns
   null if none is found, so closed sessions are safe.
3. The scheduler cannot produce a valid round. The WR-01 fix handles this (returns null
   without pushing).

The issue is narrower: if the session's last round is the one being edited and it was
the *only* round (a single played round), `generateNextRound` will always produce and
persist a new round slot. This is likely the desired behaviour, but it is not tested
explicitly. If the intent is ever to allow editing without triggering regeneration
(e.g., correcting a typo in a completed session), this unconditional call will create
unintended round slots.

**Fix:** No code change required if the current behaviour is intended. However, add a JSDoc
note clarifying the side effect:

```js
/**
 * Played round path always triggers generateNextRound() after persist.
 * This creates a new unplayed round even if the session was previously at
 * its natural end. Callers that do not want this must ensure the session is
 * closed before calling updateRound.
 */
```

---

### M-03: Silent no-op when session not found or `roundIndex` is out of bounds — caller cannot distinguish from success

**File:** `src/services/session.js:272–273`

**Issue:**

```js
updateRound(roundIndex, updatedRound) {
  const session = this.getActiveSession();
  if (!session || !session.rounds[roundIndex]) return;
```

The method returns `undefined` in both the success case and the guard case. A caller that
passes a bad index (negative, beyond the array, or an index for a session that does not
exist) receives no indication that the update was not applied. UI code that relies on the
round having been updated will silently display stale data.

Note: `session.rounds[-1]` is `undefined` in JavaScript, so the guard does catch negative
indexes. `session.rounds[roundIndex]` is also `undefined` for indexes beyond the array.
Both are caught, but the caller is not notified.

**Fix:** Return a boolean or throw:

```js
updateRound(roundIndex, updatedRound) {
  const session = this.getActiveSession();
  if (!session || !session.rounds[roundIndex]) return false;
  // ...
  return true;
}
```

Alternatively, throw a `RangeError` for invalid indexes. At minimum, document the silent
failure in the JSDoc so callers are aware.

---

### M-04: `source` field from `updatedRound` caller input can bleed through on the unplayed path

**File:** `src/services/session.js:292`

**Issue:**

```js
// Unplayed branch
session.rounds[roundIndex] = { ...updatedRound, index: roundIndex };
```

The spread puts `updatedRound` first, so all fields from the caller's object are retained
(except `index`, which is overridden). If the caller passes an `updatedRound` with
`source: 'edited'` (which is valid — the UI might echo back the existing round object),
the unplayed round will be stored with `source: 'edited'`. Subsequent code that treats
`source: 'edited'` as a reliable flag for "this was a played round that was manually
changed" will misread unplayed rounds that happen to carry the field.

On the played path this is also present, but the explicit `source: 'edited'` override
in the spread makes it deliberate. On the unplayed path, there is no override.

**Fix:** Explicitly strip `source` on the unplayed path, or whitelist allowed fields:

```js
// Unplayed branch — strip source to avoid polluting the unplayed round
const { source: _dropped, ...safeRound } = updatedRound;
session.rounds[roundIndex] = { ...safeRound, index: roundIndex };
```

---

## LOW

### L-01: `updateSession` mutates round objects in place during index re-stamping — shared references are silently changed

**File:** `src/services/session.js:299`

**Issue:**

```js
updatedSession.rounds.forEach((r, i) => { r.index = i; });
```

This directly mutates each round object. If a caller holds a reference to a round object
that was in `session.rounds` before calling `updateSession`, that reference's `.index`
field is changed without the caller's knowledge. In the current codebase this is benign
because callers do not retain live references across the call. But it is a latent hazard
if `updateRound`'s return type is ever changed to return the updated round, or if the
session object is cached in a view layer.

**Fix:** Re-stamp as a map to produce new objects (avoids shared-reference mutation):

```js
updatedSession.rounds = updatedSession.rounds.map((r, i) => ({ ...r, index: i }));
```

This is slightly more expensive but eliminates the mutation hazard entirely.

---

### L-02: `makeRound` test helper always creates rounds with exactly 4 players assigned — no helper for odd-player or sitter scenarios

**File:** `src/services/session.test.js:15–22`

**Issue:**

```js
function makeRound(index, playerIds, played = false) {
  return {
    index,
    courts: [{ teamA: [playerIds[0], playerIds[1]], teamB: [playerIds[2], playerIds[3]] }],
    sittingOut: playerIds.slice(4),
    played,
  }
}
```

`makeRound` always assigns the first four players to a court and puts extras in
`sittingOut`. This means every `updateRound` test uses a 4-player, 0-sitter configuration.
The filter at line 283 behaves identically for 4-player and 5-player rounds, so the tests
do not exercise the sitting-out case. An odd-player session (5 or 7 attendees) is a common
real-world configuration.

**Fix:** Add a `makeSittingRound` helper or add an optional `sittingOut` parameter to
`makeRound`, then add one test with a sitter.

---

## INFO

### IN-01: HIST-02 does not assert the courts of the edited round were actually updated

**File:** `src/services/session.test.js:131–144`

**Issue:** HIST-02 verifies `source: 'edited'` and `played: true` but does not check that
the courts from `editedRound` replaced the original courts. If `updateRound` accidentally
ignored `updatedRound`'s courts and kept the original, HIST-02 would still pass. HIST-01
does check courts (`expect(updated.rounds[0].courts[0].teamA).toContain('p3')`), but
HIST-02 is missing the equivalent assertion.

**Fix:**
```js
expect(updated.rounds[0].courts[0].teamA).toContain('p3'); // from editedRound
```

---

### IN-02: No test covers editing a round when the scheduler cannot produce a next round after the edit

**File:** `src/services/session.test.js`

**Issue:** When `updateRound` is called on a played round, it calls `generateNextRound()`
which may return null if the scheduler has no valid candidates. The WR-01 fix (null-guard in
`generateNextRound`) prevents data corruption in that case, but there is no test that:

1. Exercises `updateRound` on a played round
2. Forces the scheduler to return no candidates
3. Verifies the session remains valid (no extra null appended, persisted state correct)

A mock similar to the WR-01 test (`vi.spyOn(schedulerModule, 'generateRounds').mockReturnValueOnce([])`)
would cover this path.

---

### IN-03: No test for re-editing an already-edited round (`source: 'edited'` present on input)

**File:** `src/services/session.test.js`

**Issue:** There is no test for the case where a round that already has `source: 'edited'`
is edited again. The current code handles this correctly (the spread overwrites with
`source: 'edited'` again on the played path), but the absence of a test leaves the
idempotency of repeated edits unverified. Edge case: if a previously-edited round is somehow
marked unplayed and then re-edited via the unplayed path, the `source` field bleeds through
(see M-04).

---

## Summary of Findings

| Severity | Count | IDs |
|----------|-------|-----|
| CRITICAL | 0 | — |
| HIGH | 1 | H-01 |
| MEDIUM | 4 | M-01, M-02, M-03, M-04 |
| LOW | 2 | L-01, L-02 |
| INFO | 3 | IN-01, IN-02, IN-03 |
| **TOTAL** | **10** | |

### Recommended action order

1. **H-01** — Change the filter to use array position (`i`) rather than `r.index`. One-line
   fix, eliminates dependence on a stale field. Apply the same fix to `deleteUnplayedRoundsAfter`.
2. **M-04** — Strip `source` on the unplayed path to prevent field bleed-through.
3. **M-03** — Return a boolean from `updateRound` so callers can detect silent no-ops.
4. **IN-01, IN-02** — Fill the two test gaps (court assertion in HIST-02, scheduler-empty
   path through `updateRound`).
5. **M-01** — Document the QuotaExceededError limitation; defer the infrastructure fix.
6. **M-02, L-01, L-02, IN-03** — Low-risk; address in a cleanup pass.

---

_Reviewed: 2026-04-15_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
