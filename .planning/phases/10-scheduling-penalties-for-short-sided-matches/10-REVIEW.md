---
phase: 10-scheduling-penalties-for-short-sided-matches
reviewed: 2026-04-15T10:47:00Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - src/scheduler.js
  - src/storage.js
  - src/scheduler.test.js
  - src/storage.test.js
findings:
  critical: 0
  high: 2
  medium: 4
  low: 3
  info: 4
  total: 13
status: issues_found
---

# Phase 10: Code Review Report

**Reviewed:** 2026-04-15T10:47:00Z
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Summary

Phase 10 added short-sided penalty tracking (singles and three-way courts) to `buildPairHistory` and `scoreRound`, plus a v2 storage schema migration that seeds three new penalty settings keys. All 28 tests pass. The core algorithm is sound: the exponential streak multiplier is correctly implemented, the sort-keyed pair encoding is applied consistently, and the migration uses the safe `newDefaults...existing` spread ordering so user-configured values always win.

Two high-severity bugs are present. The first is a silent data structure inconsistency between `buildPairHistory` and the incremental update loop in `generateRounds`: the former stores pair counts under sorted keys only, while the latter double-writes both orderings — creating phantom entries that make future `scoreRound` lookups silently return stale zero values. The second is that `initStorage` calls `JSON.parse` without a try/catch; corrupted localStorage data throws an uncaught SyntaxError that crashes the entire app on startup with no recovery path.

Four medium findings cover algorithm gaps and missing test assertions that could mask regressions. Three low findings are quality issues. Four info items are minor suggestions.

---

## High Findings

### H-01: Incremental history update in `generateRounds` uses dual-key encoding, breaking sorted-key invariant

**File:** `src/scheduler.js:356-371`

**Issue:** `buildPairHistory` stores all pair data under sorted canonical keys — for a pair `(p1, p2)` the entry lives at `history.partnerCount['p1']['p2']` (sorted order). The incremental update block inside `generateRounds` calls a local `inc` helper that writes _both_ directions (`[p1][p2]` and `[p2][p1]`). As a result, the next call to `scoreRound` (which looks up sorted keys via `getPartnerCount` / `getOpponentCount`) will find `count = 0` in one direction while the count lives in the unsorted direction — the penalty for multi-round batches is silently underestimated after the first generated round. In a single-round generate call this is harmless (the history is never used again). In a batch call (`countToGenerate > 1`) all rounds after the first are scored against a corrupted history.

```js
// Current — writes both directions (line 356-366)
const inc = (obj, p1, p2) => {
  if (!obj[p1]) obj[p1] = {};
  obj[p1][p2] = (obj[p1][p2] || 0) + 1;
};
if (teamA.length === 2) {
  inc(currentHistory.partnerCount, teamA[0], teamA[1]);
  inc(currentHistory.partnerCount, teamA[1], teamA[0]); // <-- wrong direction
}
```

**Fix:** Mirror the sorted-key pattern used by `buildPairHistory`'s `increment` helper:

```js
const inc = (obj, p1, p2) => {
  const [a, b] = [p1, p2].sort();
  if (!obj[a]) obj[a] = {};
  obj[a][b] = (obj[a][b] || 0) + 1;
};
// Then call once, not twice:
if (teamA.length === 2) {
  inc(currentHistory.partnerCount, teamA[0], teamA[1]);
}
if (teamB.length === 2) {
  inc(currentHistory.partnerCount, teamB[0], teamB[1]);
}
teamA.forEach(a => teamB.forEach(b => {
  inc(currentHistory.opponentCount, a, b);
}));
```

---

### H-02: `initStorage` calls `JSON.parse` without error handling — corrupted localStorage crashes the app on startup

**File:** `src/storage.js:75`

**Issue:** If the stored value at `pb:all` is not valid JSON (partial write, user tampering, browser bug), `JSON.parse(rawData)` throws a `SyntaxError`. Because `initStorage` is called at module evaluation time (`let state = initStorage()`), this crashes the entire module before any exports are available, leaving the app in a broken state with no fallback or user-facing error. There is no recovery path and no test covering this branch.

```js
// Current (line 74-75)
const rawData = localStorage.getItem(`${STORAGE_PREFIX}all`);
let data = rawData ? JSON.parse(rawData) : { schemaVersion: 0 };
```

**Fix:**

```js
const rawData = localStorage.getItem(`${STORAGE_PREFIX}all`);
let data;
try {
  data = rawData ? JSON.parse(rawData) : { schemaVersion: 0 };
} catch (e) {
  console.error('StorageAdapter: failed to parse stored data, starting fresh.', e);
  data = { schemaVersion: 0 };
}
```

---

## Medium Findings

### M-01: `scoreRound` short-sided penalty is always applied even when `count === 0` — first occurrence is penalized

**File:** `src/scheduler.js:248-273`

**Issue:** `getStandardPenalty` correctly gates on `count === 0` and returns 0 in that case. However, `scoreRound` passes the current round's _history_ count, not a prospective count, when computing the short-sided penalties. This means: the _first time_ a player is placed in a singles court (`singlesCount[p]` is 0), no penalty applies — which is the intended behavior. But `scoreRound` is called to evaluate a candidate for the _next_ round, so `singlesCount[p]` already reflects past rounds. On the very first singles assignment for a player, the count is correctly 0 and returns 0. This is fine.

However, a subtle issue exists: the singles and three-way penalties use the **current history's count**, not `count + 1` (the prospective future value). This means the exponential base for the _nth_ assignment is `2^streak` where streak is the existing streak — but the resulting court _will add 1 to streak_. The penalty curves are therefore one step behind: a player with a consecutive singles streak of 2 is penalized as `15 * 2^2 = 60`, but after this round it becomes streak 3 and the next evaluation sees the full penalty. This one-step lag is consistent with how partner/opponent penalties work (the same pattern exists throughout `scoreRound`), so this is not a regression introduced by Phase 10. However, it is worth documenting as a known algorithmic property, because the penalty comments (lines 248-252) imply the formula accounts for the new assignment, which it does not.

**Impact:** Low probability of user-visible misbehavior since the curve is steep enough to dominate. Flag for documentation clarity and future penalty tuning.

**Fix:** Either add a code comment making the "score uses current-round streak, not next-round streak" contract explicit, or prospectively add 1 to the count/streak for penalty evaluation. The comment approach is lower risk:

```js
// NOTE: `count` and `streak` reflect history *before* this candidate round.
// The penalty formula therefore evaluates the (n-1)th assignment cost, not nth.
// This is consistent with how partner/opponent penalties work throughout this function.
```

---

### M-02: `isThreeWay` detection logic could misclassify a 0v3 or 3v0 degenerate court

**File:** `src/scheduler.js:52, 246`

**Issue:** `isThreeWay` is defined as `teamA.length + teamB.length === 3 && !isSingles`. This correctly handles the 2v1 and 1v2 cases. However, if a 3v0 or 0v3 court were ever present in `playedRounds` (from a data import or future bug), the check would evaluate `isThreeWay = true` with `soloSide = teamA` (length 0) and `pairSide = teamA` (length 2 since teamA.length === 3... actually teamA would be [p1,p2,p3] and teamB would be [] so `teamA.length === 1` is false so `soloSide = teamB = []` — `soloSide[0]` is `undefined`). This would write `history.threeWaySoloCount[undefined]` and corrupt the history silently.

The defect requires malformed input data, but `importData` in storage.js accepts arbitrary JSON with no schema validation, making this reachable in practice.

**Fix:** Add a guard in the three-way branch, or add a defensive check in `buildPairHistory`:

```js
// Require exactly one side of length 1 and one of length 2
const isThreeWay = (teamA.length === 2 && teamB.length === 1) ||
                   (teamA.length === 1 && teamB.length === 2);
```

This replaces the arithmetic check on both lines (52 and 246).

---

### M-03: `importData` runs `migrate()` but never validates that the input is a plain object

**File:** `src/storage.js:133-137`

**Issue:** `importData(data)` passes the argument directly to `migrate(data)`. If `data` is `null`, `undefined`, a string, or an array, `migrate` will attempt to read `data.schemaVersion` (returns `undefined` for null/undefined — throws for primitive types) and then call a migration function with it. A `null` input throws `TypeError: Cannot read properties of null (reading 'schemaVersion')` in `migrate`, crashing without a useful message.

Callers are responsible for passing valid data, but there is no type guard and no test for the null case.

**Fix:**

```js
importData(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    console.error('StorageAdapter.importData: invalid data format, ignoring.');
    return state;
  }
  state = migrate(data);
  saveAll(state);
  return state;
}
```

---

### M-04: Streak tracking for partner/opponent pairs is not updated in the incremental `generateRounds` path

**File:** `src/scheduler.js:350-391`

**Issue:** The incremental history update in `generateRounds` updates `partnerCount`, `opponentCount`, and the three new short-sided counts — but does **not** update any of the streak fields (`partnerStreak`, `opponentStreak`, `singlesStreak`, `threeWaySoloStreak`, `threeWayPairStreak`, `sitOutStreak`). The code comment on line 374 explicitly acknowledges this for short-sided streaks: "streaks are not fast-pathed, matching existing pattern."

The consequence: when generating a batch of N rounds (`countToGenerate > 1`), the streak-based penalty multiplier for rounds 2..N is always evaluated using the streak from the _initial_ `buildPairHistory` call. If round 1 creates a new consecutive pair, round 2 does not see that streak and may select the same pair again at base penalty instead of `2^1` penalty. This is a known design choice per the comment, but it means batch generation intentionally produces worse variety than single-round generation. There is no test documenting or asserting this behavior.

**Fix (short term):** Add a comment in the code explicitly stating: "Streak fast-path is intentionally omitted; batch-generated rounds after the first may slightly underpenalize consecutive short-sided assignments. If variety degrades in batch mode, rebuild the full history via `buildPairHistory` between rounds."

**Fix (long term):** Rebuild history via `buildPairHistory` between batch rounds (at the cost of O(rounds * courts) extra work per batch). For typical session sizes this is negligible.

---

## Low Findings

### L-01: `scoreRound` silently produces an incorrect score if `history` is missing short-sided fields entirely

**File:** `src/scheduler.js:251-273`

**Issue:** The short-sided penalty block accesses `history.singlesCount?.[p]`, `history.threeWaySoloCount?.[soloPlayer]`, etc. with optional chaining — these correctly default to 0 if the top-level key is missing. However, if the `history` object was produced by an older `buildPairHistory` before Phase 10 (e.g., a cached result from before the upgrade), the keys will be `undefined` and the optional chain silently returns 0. This means no penalty is applied and the behavior degrades silently. The `??` fallback on `settings.penaltySingles` correctly handles the settings side; the history side is also correctly handled via `?.`. This is fine at runtime but could mask bugs during development.

**Recommendation:** In test helpers, always pass a fully-initialized history object (all keys present, even if empty `{}`). The existing test suite at lines 299-320 already does this for some tests, but not all (see M tests that omit short-sided fields from history).

---

### L-02: Duplicate object literal keys in test `opponentCount` history fixture silently discard earlier entries

**File:** `src/scheduler.test.js:40-41`

**Issue:** The `scoreRound penalizes repeats` test builds a `history` object with a literal that contains duplicate keys:

```js
opponentCount: { 'p1': { 'p3': 0 }, 'p1': { 'p4': 0 }, 'p2': { ... }, 'p2': { ... } },
```

JavaScript object literals with duplicate keys silently use the last value. The first `'p1': { 'p3': 0 }` entry is overwritten by `'p1': { 'p4': 0 }`. This means the test is not actually verifying what the comment implies. The test still passes because the penalty being tested is on the partner pair (p1-p2), not the opponents, and the opponent penalty returns 0 for both paths. The duplicate keys are dead data, not a runtime error, but they are misleading and mask what the history actually looks like.

**Fix:** Remove the duplicate keys or deduplicate them:

```js
opponentCount: { 'p1': { 'p3': 0, 'p4': 0 }, 'p2': { 'p3': 0, 'p4': 0 } },
```

---

### L-03: `migrate()` logs `console.info` on every app load after migration, including reloads where data is already v2

**File:** `src/storage.js:66`

**Issue:** `initStorage` always calls `migrate(data)`, which logs an info message for each migration step applied. For a fresh install, this prints once on first load and never again (data is saved at v2 and subsequent loads skip migration). However, if `saveAll` fails (e.g., quota exceeded), the stored version remains v1 and the migration log fires on every page load. This is a minor noise issue but can be confusing in production console logs.

**Recommendation:** No code change required. Add a note in the `QuotaExceededError` handler that repeated migration logging may occur if saves fail.

---

## Info Findings

### I-01: `generateCandidate` signature accepts `history` and `settings` parameters that it never uses

**File:** `src/scheduler.js:282`

**Issue:** `generateCandidate(attendees, history, settings, index)` takes `history` and `settings` as parameters, but the function body never references either. Both are passed through from `generateRounds` and `getTopAlternatives`. The parameters are vestigial — likely left over from an earlier design where candidate generation was penalty-guided rather than random. Dead parameters make the function signature misleading.

**Fix:** Remove unused parameters from the signature (and update all three call sites):

```js
function generateCandidate(attendees, index) { ... }
```

---

### I-02: `getRelationship` in the streak-computation loop rebuilds the inner loop on every call and could be memoized

**File:** `src/scheduler.js:95-109`

**Issue:** `getRelationship(round, p1, p2)` iterates every court in the round for every player pair. For a session with many rounds and many players, the streak-building loop calls this O(players^2 * rounds) times, each of which scans O(courts) courts. For typical pickleball sessions (8 players, 10 rounds, 2 courts) this is negligible. Flagged as info only.

---

### I-03: `buildPairHistory` returns early (line 71) before initializing streaks when `playedRounds.length === 0`

**File:** `src/scheduler.js:71`

**Issue:** `if (playedRounds.length === 0) return history;` at line 71 is placed _after_ the count-accumulation loop and _before_ the streak initialization. This is correct in behavior (no counts to accumulate, no streaks to compute), but the early return means all streak fields remain as empty `{}` objects (not initialized to 0 per-player). Callers of `buildPairHistory` that destructure streak fields will get `undefined` for any player — which is handled by the `|| 0` guards in `scoreRound`. No bug, but the asymmetry between a zero-round return and a nonzero-round return is a latent trap if a caller ever iterates streak keys assuming they are initialized.

---

### I-04: No test for `generateRounds` batch mode (`countToGenerate > 1`) variety correctness

**File:** `src/scheduler.test.js`

**Issue:** There is a test for batch generation (line 64: "generates 2 rounds for 8 players") that only checks array length and court count. There is no test verifying that the second round in a batch does not repeat the same pairings as the first (the M-04 finding above shows that streak fast-pathing could allow this). A test generating 2 rounds with 4 players and asserting that partner pairs differ between round 1 and round 2 would catch regressions in the incremental history update.

---

## Summary

| Severity | Count | Findings |
|----------|-------|----------|
| CRITICAL  | 0     | —        |
| HIGH      | 2     | H-01 (dual-key encoding breaks sorted-key invariant in batch mode), H-02 (JSON.parse without try/catch crashes app on corrupt storage) |
| MEDIUM    | 4     | M-01 (one-step penalty lag undocumented), M-02 (degenerate 3v0 court corrupts history), M-03 (importData accepts null without guard), M-04 (streak not fast-pathed — batch mode underpenalizes consecutive assignments) |
| LOW       | 3     | L-01 (missing short-sided history fields silently return 0), L-02 (duplicate object keys in test fixture), L-03 (migration log fires repeatedly when save fails) |
| INFO      | 4     | I-01 (dead parameters in generateCandidate), I-02 (getRelationship not memoized), I-03 (zero-round return leaves streak fields uninitialized), I-04 (no batch-mode variety regression test) |
| **Total** | **13** | |

**Priority order for remediation:**

1. **H-01** — Fix the dual-key encoding in `generateRounds`; it silently degrades scheduling quality in any multi-round batch generate call.
2. **H-02** — Wrap `JSON.parse` in `initStorage` in a try/catch; corrupted localStorage currently causes an uncaught crash at module load time.
3. **M-02** — Tighten the `isThreeWay` guard to prevent `undefined` key writes from malformed imported data.
4. **M-03** — Add a type guard to `importData`.
5. **L-02** — Fix the duplicate object literal keys in the test fixture (it's misleading, though currently harmless).
6. Remaining medium/low/info items can be addressed as part of future polish phases.

---

_Reviewed: 2026-04-15_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
