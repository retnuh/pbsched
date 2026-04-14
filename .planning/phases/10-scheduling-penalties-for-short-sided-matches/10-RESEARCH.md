# Phase 10: Scheduling Penalties for Short-Sided Matches - Research

**Researched:** 2026-04-14
**Domain:** Scheduler penalty model extension, schema migration, Settings UI
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Use scaled penalty model: `base * 2^streak` — same as partner/opponent penalties.
- **D-02:** Penalty applies only to player(s) occupying the short-sided position:
  - Singles (1v1): both players receive the singles penalty
  - 3-way solo (2v1): the lone player on the 1-player side receives the solo penalty
  - 3-way pair (2v1): each of the two players on the 2-player side receives the pair penalty
- **D-03:** `buildPairHistory()` must be extended to track per-player short-sided history (count/streak for each type) across played rounds.
- **D-04:** Singles penalty default: **15**, range 1–50
- **D-05:** 3-way solo penalty default: **20**, range 1–50
- **D-06:** 3-way pair penalty default: **15**, range 1–50
- **D-07:** All three sliders use the same range (1–50) as existing sliders.
- **D-08:** New sliders go inside the existing "Scheduler Optimization" card, under a new subsection header labeled "Short-Sided Matches".
- **D-09:** Slider labels: "Singles Match", "3-Way Solo", "3-Way Pair".
- **D-10:** Each slider follows the existing pattern: label row with live value display, `input[type=range]`, small descriptive hint text below.
- **D-11:** Haptic feedback (`Haptics.light()`) on slider input, same as existing sliders.
- **D-12:** "Reset to Defaults" button resets all 6 scheduler sliders including the 3 new ones (to 15, 20, 15).
- **D-13:** Add schema v2 migration in `storage.js` that merges new keys into `settings` with defaults `{ penaltySingles: 15, penaltyThreeWaySolo: 20, penaltyThreeWayPair: 15 }`.
- **D-14:** In `scoreRound()`, access new penalty values with `settings.penaltySingles ?? 15` fallback.

### Claude's Discretion

- Exact key names for new penalty fields in settings (suggested: `penaltySingles`, `penaltyThreeWaySolo`, `penaltyThreeWayPair`)
- Exact history field names for new short-sided tracking in `buildPairHistory()` return object
- Exact hint text wording under each new slider
- Whether to add the "Short-Sided Matches" header as a `<p>` or `<h3>` element (match existing section style)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SCHED-01 | Scheduling engine applies a configurable penalty when a player has played a singles (1v1) match this session | `buildPairHistory` extension for singles tracking; `scoreRound` clause for 1-player teams |
| SCHED-02 | Scheduling engine applies a configurable penalty when a player was the solo side of a 3-way (2v1) match this session | `buildPairHistory` extension for 3-way-solo tracking; `scoreRound` clause for `teamB.length === 1` solo player |
| SCHED-03 | Scheduling engine applies a configurable penalty when a player was on the pair side of a 3-way (2v1) match this session | `buildPairHistory` extension for 3-way-pair tracking; `scoreRound` clause for `teamA.length === 2` on a 2v1 court |
| SCHED-04 | Penalty values for SCHED-01–03 are configurable via sliders in Settings screen with sensible defaults | Three new sliders in "Short-Sided Matches" subsection of existing Scheduler Optimization card |
| SCHED-05 | Sessions created before deploy fall back to default penalty values (no breaking schema change) | Schema v2 migration adds new keys with defaults; `?? default` fallback in `scoreRound` covers snapshots |
</phase_requirements>

---

## Summary

This phase extends the scheduler's existing penalty model — which already handles repeated partners, repeated opponents, and sit-outs — to also penalize players who have occupied short-sided positions (singles or 3-way courts) earlier in the same session. All decisions are locked from CONTEXT.md; this research surfaces the exact code paths, field structures, and tradeoffs that the planner needs to produce precise tasks.

The existing architecture is a clean fit for this addition. The `buildPairHistory` function already uses a pattern of building count and streak objects keyed by player name. The `scoreRound` function already iterates courts checking `teamA.length` and `teamB.length`. The schema migration chain in `storage.js` is designed for exactly this kind of additive-only upgrade. The Settings UI uses a consistent `<div class="space-y-2">` block per slider with a live value span.

The single non-trivial design question is how to detect and classify courts in the scoring loop, and how to update the fast-path history increment at the bottom of `generateRounds` (which maintains `currentHistory` in-loop without a full rebuild). That increment block must be extended in parallel with `buildPairHistory` or the second-and-beyond round in a multi-round generation batch will score short-sided history incorrectly.

**Primary recommendation:** Implement in four files — `scheduler.js` (history + scoring), `storage.js` (migration), `views/Settings.js` (UI), `services/session.js` (no changes needed; `session.settings` snapshot picks up new keys automatically once migration runs and Settings persists them).

---

## Standard Stack

No new external dependencies are introduced. [VERIFIED: codebase read]

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vitest | ^4.1.2 | Unit tests for scheduler and storage changes | Already installed; test suite at 15/15 passing [VERIFIED: npm, test run] |
| happy-dom | ^20.8.9 | DOM environment for Vitest | Already configured in vite.config.js [VERIFIED: codebase read] |

**Installation:** None required.

---

## Architecture Patterns

### How the Existing Penalty Model Works [VERIFIED: codebase read]

```
buildPairHistory(playedRounds)
  Phase 1 — counts: iterate all played rounds, accumulate partnerCount, opponentCount, sitOutCount
  Phase 2 — streaks: iterate backwards from most recent, extend streak while round matches

scoreRound(round, history, settings)
  For each court: look up counts/streaks in history, compute base * 2^streak, add to score
  For sit-outs: use the 100^count formula instead (much stronger deterrent)

generateRounds(...)
  Calls buildPairHistory once for the played baseline
  Generates N candidates, picks best score
  After picking best: fast-increments currentHistory so next batch round sees correct context
```

### Court Structure for Short-Sided Detection [VERIFIED: codebase read]

`generateCandidate` in `scheduler.js` produces courts with this shape:

```javascript
// Standard 2v2
{ teamA: [p1, p2], teamB: [p3, p4] }

// 3-way (2v1) — oddPlayerFallback: 'three-player-court'
{ teamA: [p1, p2], teamB: [p3] }   // teamB.length === 1

// Singles (1v1) — oddPlayerFallback: 'two-player-court'
{ teamA: [p1], teamB: [p2] }       // both lengths === 1
```

Detection logic for scoring:

```javascript
const isThreeWay = (teamA.length + teamB.length === 3);
const isSingles  = (teamA.length === 1 && teamB.length === 1);

// Inside scoreRound court loop:
if (isSingles) {
  // Both players are short-sided (singles)
  score += getStandardPenalty(settings.penaltySingles ?? 15, singlesCount(p), singlesStreak(p));
  // for each player p in [teamA[0], teamB[0]]
}
if (isThreeWay) {
  const soloSide = teamA.length === 1 ? teamA : teamB;
  const pairSide = teamA.length === 2 ? teamA : teamB;
  // solo player
  score += getStandardPenalty(settings.penaltyThreeWaySolo ?? 20, soloCount(soloSide[0]), soloStreak(soloSide[0]));
  // pair players
  pairSide.forEach(p => {
    score += getStandardPenalty(settings.penaltyThreeWayPair ?? 15, pairCount(p), pairStreak(p));
  });
}
```

### History Extension for `buildPairHistory` [VERIFIED: codebase read]

New per-player scalar fields (not nested objects, unlike partnerCount which is player→player):

```javascript
// Add to history object:
singlesCount:       {},  // { player: count }
singlesStreak:      {},  // { player: streak }
threeWaySoloCount:  {},  // { player: count }
threeWaySoloStreak: {},  // { player: streak }
threeWayPairCount:  {},  // { player: count }
threeWayPairStreak: {},  // { player: streak }
```

Phase 1 (counts) — inside the `round.courts.forEach` block:

```javascript
const { teamA, teamB } = court;
const isSingles = teamA.length === 1 && teamB.length === 1;
const isThreeWay = teamA.length + teamB.length === 3;

if (isSingles) {
  [teamA[0], teamB[0]].forEach(p => {
    history.singlesCount[p] = (history.singlesCount[p] || 0) + 1;
  });
}
if (isThreeWay) {
  const soloSide = teamA.length === 1 ? teamA : teamB;
  const pairSide = teamA.length === 2 ? teamA : teamB;
  history.threeWaySoloCount[soloSide[0]] = (history.threeWaySoloCount[soloSide[0]] || 0) + 1;
  pairSide.forEach(p => {
    history.threeWayPairCount[p] = (history.threeWayPairCount[p] || 0) + 1;
  });
}
```

Phase 2 (streaks) — extend the backwards iteration. Since these are per-player scalars (not per-pair), use the same pattern as `sitOutStreak`:

```javascript
// During backward iteration at round i:
const expectedStreak = playedRounds.length - 1 - i;

playerList.forEach(p => {
  // ... existing sitOutStreak logic ...

  // singles streak
  const inSingles = round.courts.some(c =>
    c.teamA.length === 1 && c.teamB.length === 1 &&
    (c.teamA.includes(p) || c.teamB.includes(p))
  );
  if ((history.singlesStreak[p] || 0) === expectedStreak && inSingles) {
    history.singlesStreak[p] = (history.singlesStreak[p] || 0) + 1;
  }

  // 3-way solo streak
  const inThreeWaySolo = round.courts.some(c => {
    const isThreeWay = c.teamA.length + c.teamB.length === 3;
    if (!isThreeWay) return false;
    const soloSide = c.teamA.length === 1 ? c.teamA : c.teamB;
    return soloSide.includes(p);
  });
  if ((history.threeWaySoloStreak[p] || 0) === expectedStreak && inThreeWaySolo) {
    history.threeWaySoloStreak[p] = (history.threeWaySoloStreak[p] || 0) + 1;
  }

  // 3-way pair streak
  const inThreeWayPair = round.courts.some(c => {
    const isThreeWay = c.teamA.length + c.teamB.length === 3;
    if (!isThreeWay) return false;
    const pairSide = c.teamA.length === 2 ? c.teamA : c.teamB;
    return pairSide.includes(p);
  });
  if ((history.threeWayPairStreak[p] || 0) === expectedStreak && inThreeWayPair) {
    history.threeWayPairStreak[p] = (history.threeWayPairStreak[p] || 0) + 1;
  }
});
```

### Fast-Path History Increment in `generateRounds` [VERIFIED: codebase read]

After the best candidate is chosen, `generateRounds` manually increments `currentHistory` for the next batch iteration (lines 267–289). This block must be extended with the same short-sided classifications, or multi-round generation (`countToGenerate > 1`) will score history incorrectly for rounds 2+:

```javascript
bestCandidate.courts.forEach(court => {
  const { teamA, teamB } = court;
  const isSingles = teamA.length === 1 && teamB.length === 1;
  const isThreeWay = teamA.length + teamB.length === 3;

  if (isSingles) {
    [teamA[0], teamB[0]].forEach(p => {
      currentHistory.singlesCount[p] = (currentHistory.singlesCount[p] || 0) + 1;
    });
  }
  if (isThreeWay) {
    const soloSide = teamA.length === 1 ? teamA : teamB;
    const pairSide = teamA.length === 2 ? teamA : teamB;
    currentHistory.threeWaySoloCount[soloSide[0]] = (currentHistory.threeWaySoloCount[soloSide[0]] || 0) + 1;
    pairSide.forEach(p => {
      currentHistory.threeWayPairCount[p] = (currentHistory.threeWayPairCount[p] || 0) + 1;
    });
  }
  // ... existing partner/opponent increments unchanged ...
});
```

Note: The fast-path does NOT update streaks (streaks require a full backward scan), so streak values will remain at 0 for within-batch rounds. This matches how `partnerStreak` and `opponentStreak` are also not fast-pathed. The behavior is acceptable — it means only the count portion of the penalty applies for within-batch candidates (same tradeoff as existing code).

### Schema Migration Pattern [VERIFIED: codebase read]

Current state: `SCHEMA_VERSION = 1`, single migration at `migrations[1]`.

v2 migration adds new settings keys via spread:

```javascript
// src/storage.js
const SCHEMA_VERSION = 2;  // bump from 1

// Add migrations[2]:
2: (data) => {
  return {
    ...data,
    settings: {
      penaltySingles: 15,
      penaltyThreeWaySolo: 20,
      penaltyThreeWayPair: 15,
      ...data.settings,  // existing keys override defaults (preserves user's current values if they somehow exist)
    },
    schemaVersion: 2,
  };
},
```

Important: spread order matters. `...data.settings` AFTER the defaults means existing settings keys win. This is the correct direction: defaults are the floor, user data takes priority. However, since these keys are brand new, `data.settings` won't have them, so the defaults always apply on migration.

The `migrate()` function is recursive and applies migrations in sequence — existing code handles this correctly without any changes.

### Session Snapshot and Settings Propagation [VERIFIED: codebase read]

`createSession()` in `session.js` snapshots current settings at session start:

```javascript
settings: {
  oddPlayerFallback: 'three-player-court',  // forced default
  ...settings   // spreads all current StorageAdapter settings
}
```

After migration runs on app load, `StorageAdapter.get('settings')` will include the new keys. Any NEW session created after migration has the new keys in its snapshot. The `?? default` fallback in `scoreRound` covers OLD sessions stored before migration (their `session.settings` snapshot won't have the new keys).

`generateNextRound()` passes `session.settings` directly to `generateRounds()` — no change needed there.

### Settings UI Slider Pattern [VERIFIED: codebase read]

Each slider in Settings.js uses this exact HTML block (example from partner slider):

```html
<div class="space-y-2">
  <div class="flex justify-between text-sm font-bold">
    <label>Repeated Partners</label>
    <span id="val-partner" class="text-blue-600">${settings.penaltyRepeatedPartner || 5}</span>
  </div>
  <input type="range" id="weight-partner" min="1" max="50"
    value="${settings.penaltyRepeatedPartner || 5}"
    class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600">
  <p class="text-[10px] text-gray-400">Higher = avoids putting same partners together.</p>
</div>
```

The three new sliders follow this exact pattern with their respective IDs and defaults.

The subsection header "Short-Sided Matches" should match the style of `<h2 class="font-bold text-gray-700">` (the card title uses this) — but since this is a subsection within the existing card, a `<p class="text-xs font-bold text-gray-600 uppercase tracking-wide mt-2">` or similar is appropriate. The CONTEXT.md leaves the exact element to Claude's discretion; match whatever style looks best at the subsection level without conflicting with the card's `<h2>` hierarchy.

The `updateWeights()` function must be extended to read/write the three new keys:

```javascript
function updateWeights() {
  // existing:
  settings.penaltyRepeatedPartner = parseInt(partnerInput.value);
  settings.penaltyRepeatedOpponent = parseInt(opponentInput.value);
  settings.penaltyRepeatedSitOut = parseInt(sitoutInput.value);
  // new:
  settings.penaltySingles = parseInt(singlesInput.value);
  settings.penaltyThreeWaySolo = parseInt(threeWaySoloInput.value);
  settings.penaltyThreeWayPair = parseInt(threeWayPairInput.value);
  // ... display value updates ...
  StorageAdapter.set('settings', settings);
}
```

The Reset button handler must be extended:

```javascript
el.querySelector('#reset-weights').addEventListener('click', () => {
  partnerInput.value = 5;
  opponentInput.value = 10;
  sitoutInput.value = 3;
  singlesInput.value = 15;
  threeWaySoloInput.value = 20;
  threeWayPairInput.value = 15;
  Haptics.medium();
  updateWeights();
});
```

### Anti-Patterns to Avoid

- **Modifying `session.settings` snapshots in existing sessions:** Don't backfill `session.settings` on existing sessions — the `?? default` fallback in `scoreRound` is the correct mechanism. Mutating stored sessions risks data corruption.
- **Applying the short-sided penalty to the whole court:** D-02 is explicit — only the player(s) occupying the short-sided slot receive the penalty. On a 2v1, the full-side pair and the solo side have different penalties applied differently.
- **Forgetting the fast-path history increment:** Extending `buildPairHistory` without also extending the in-loop increment in `generateRounds` causes incorrect scoring for batch sizes > 1.
- **Using `||` instead of `??` for the settings fallback:** `settings.penaltySingles || 15` would treat a user-set value of `0` as falsy and silently apply the default. `??` is correct because it only falls back on `null`/`undefined`. (Range is 1–50 so 0 shouldn't occur in practice, but `??` is semantically correct.)

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Schema upgrade | Custom one-shot migration script | Existing `migrations` chain in `storage.js` | Already handles recursive application, version tracking, and forward-compatibility |
| Streak calculation | New streak algorithm | Extend the existing backwards iteration in `buildPairHistory` phase 2 | Same algorithm, same structure — just new per-player scalar fields |
| Haptic feedback | Custom vibration logic | `Haptics.light()` already imported in Settings.js | Consistent with all existing sliders |

---

## Common Pitfalls

### Pitfall 1: Asymmetric Detection of the "Solo" Side in 2v1
**What goes wrong:** `teamB` is always the 1-player side in `generateCandidate` (the code appends the trio as `teamA: [p1, p2], teamB: [p3]`). If you hard-code "teamB is solo", your detection breaks if a future code change reorders the assignment. Also, `getTopAlternatives` calls `generateCandidate` via the same path, so the same detection runs there too.
**Why it happens:** Assuming teamB is always the short side.
**How to avoid:** Always detect dynamically: `teamA.length === 1` vs `teamB.length === 1`. Explicit length checks are robust to both sides.
**Warning signs:** Tests pass with synthetic history but fail when `generateCandidate` is used end-to-end.

### Pitfall 2: Missing Fast-Path History Increment
**What goes wrong:** `buildPairHistory` is correct but `generateRounds` maintains `currentHistory` manually after each picked candidate. If the short-sided counts aren't incremented there, generating two consecutive rounds in one call (e.g., `countToGenerate = 2`) will not penalize the second round for any short-sided positions that occurred in the first.
**Why it happens:** The fast-path block (lines 267–289 of scheduler.js) is separate from `buildPairHistory` and easy to overlook.
**How to avoid:** Extend both in the same task. Verify with a test that generates 2+ rounds and checks that history reflects the short-sided position from round 1 when scoring round 2.
**Warning signs:** Single-round generation tests pass; multi-round generation produces unexpected short-sided repeats.

### Pitfall 3: Schema Version Bump Without Verifying Migration Chain
**What goes wrong:** Setting `SCHEMA_VERSION = 2` without verifying the `migrate()` function correctly chains v1→v2 for installs that are already on v1 (the typical case).
**Why it happens:** Testing migration starting from v0 (fresh install) but not from v1 (existing install with data).
**How to avoid:** The storage test should test migration from a v1 snapshot that lacks the new settings keys. Confirm the v2 migration merges defaults correctly.
**Warning signs:** Fresh installs work; existing installs don't get the new default values.

### Pitfall 4: Settings UI Reads Stale Settings Object
**What goes wrong:** The `settings` object is read once at mount time (`const settings = StorageAdapter.get('settings') || {}`). If the new keys aren't present at that point (before migration runs, or before the user ever opens Settings), the slider `value` attribute and `val-*` spans show undefined or NaN.
**Why it happens:** Migration runs at `initStorage()` (module load), so by the time Settings mounts, migration has already run. But if the fallback `|| {}` produces an empty object (edge case), all keys are missing.
**How to avoid:** Use the same `|| default` pattern in the HTML template that existing sliders use: `${settings.penaltySingles || 15}`. Belt-and-suspenders approach that matches the existing code style.
**Warning signs:** Sliders display NaN or 0 on first open after deploy.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.2 |
| Config file | `vite.config.js` (test key; no separate vitest.config.js) |
| Environment | happy-dom (configured in vite.config.js) |
| Quick run command | `npx vitest run src/scheduler.test.js` |
| Full suite command | `npx vitest run` |
| Current baseline | 15/15 passing [VERIFIED: test run 2026-04-14] |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SCHED-01 | `buildPairHistory` tracks singlesCount/singlesStreak per player | unit | `npx vitest run src/scheduler.test.js` | Wave 0 gap |
| SCHED-01 | `scoreRound` applies singles penalty using base * 2^streak | unit | `npx vitest run src/scheduler.test.js` | Wave 0 gap |
| SCHED-02 | `buildPairHistory` tracks threeWaySoloCount/threeWaySoloStreak per player | unit | `npx vitest run src/scheduler.test.js` | Wave 0 gap |
| SCHED-02 | `scoreRound` applies 3-way-solo penalty to solo-side player only | unit | `npx vitest run src/scheduler.test.js` | Wave 0 gap |
| SCHED-03 | `buildPairHistory` tracks threeWayPairCount/threeWayPairStreak per player | unit | `npx vitest run src/scheduler.test.js` | Wave 0 gap |
| SCHED-03 | `scoreRound` applies 3-way-pair penalty to each pair-side player | unit | `npx vitest run src/scheduler.test.js` | Wave 0 gap |
| SCHED-04 | New settings keys are written by Settings UI and persist via StorageAdapter | manual / smoke | N/A | manual only |
| SCHED-05 | Schema v2 migration adds new keys with defaults when migrating from v1 | unit | `npx vitest run src/storage.test.js` | Wave 0 gap |
| SCHED-05 | `scoreRound` uses `?? default` fallback when settings keys are absent | unit | `npx vitest run src/scheduler.test.js` | Wave 0 gap |

### Sampling Rate
- **Per task commit:** `npx vitest run`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green (all 15 existing + new tests) before `/gsd-verify-work`

### Wave 0 Gaps

New test cases to add to **existing test files** (no new files needed):

**`src/scheduler.test.js`** — add a new `describe` block:
- [ ] `buildPairHistory tracks short-sided positions` — verify singlesCount, singlesStreak, threeWaySoloCount, threeWaySoloStreak, threeWayPairCount, threeWayPairStreak are populated from played rounds with 1v1 and 2v1 courts
- [ ] `scoreRound applies singles penalty` — verify base * 2^streak applied to both players in a 1v1 court; verify 0 when no history
- [ ] `scoreRound applies 3-way-solo penalty to solo player only` — verify solo side penalized; pair side not penalized by solo penalty
- [ ] `scoreRound applies 3-way-pair penalty to each pair player` — verify pair side penalized; solo side not penalized by pair penalty
- [ ] `scoreRound uses ?? fallback when penalty keys missing from settings` — verify no NaN/crash when settings lacks the new keys
- [ ] `scoreRound penalty is configurable` — verify different base values produce proportionally different scores

**`src/storage.test.js`** — add cases to the existing StorageAdapter describe:
- [ ] `migrates from v1 to v2 adding short-sided penalty defaults` — start from `{ schemaVersion: 1, settings: { ...existing } }`, call `importData`, verify new keys present with correct defaults
- [ ] `v2 migration preserves existing settings keys` — confirm existing v1 settings values are not overwritten by migration

---

## Code Examples

### Verified Pattern: Existing Streak Tracking for Scalars [VERIFIED: codebase read]

The sit-out streak uses the per-player scalar pattern that the new short-sided streaks should follow:

```javascript
// src/scheduler.js — existing sit-out streak (Phase 2 backward iteration)
if (history.sitOutStreak[p] === (playedRounds.length - 1 - i)) {
  if (round.sittingOut.includes(p)) history.sitOutStreak[p]++;
}
```

The new streaks mirror this exactly, differing only in the detection predicate.

### Verified Pattern: Existing Settings Fallback in scoreRound [VERIFIED: codebase read]

```javascript
// src/scheduler.js — existing penalty lookup (line 159)
score += getSitOutPenalty(settings.penaltyRepeatedSitOut, getSitOutCount(p), getSitOutStreak(p));
```

The new lookups use the same `getStandardPenalty` helper with `??` fallback:

```javascript
score += getStandardPenalty(settings.penaltySingles ?? 15, singlesCount(p), singlesStreak(p));
```

### Verified Pattern: Storage Migration [VERIFIED: codebase read]

```javascript
// src/storage.js — existing migrations[1] structure to replicate for migrations[2]
1: (data) => {
  return {
    ...data,
    settings: data.settings || { /* full default settings object */ },
    schemaVersion: 1,
  };
},
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No short-sided history | Per-player short-sided count + streak in buildPairHistory | Phase 10 | Scheduler can now differentiate candidates that repeat short-sided positions |
| 3 scheduler settings | 6 scheduler settings | Phase 10 | Schema v2 migration required |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The fast-path history increment in `generateRounds` (lines 267–289) does not track streaks for any existing history type | Architecture Patterns | If it does track streaks somehow, the guidance to skip streak fast-patching is wrong — but code inspection confirms it doesn't |

**All other claims verified from direct codebase reads.**

---

## Open Questions

1. **Should `MOCK_SETTINGS` in test files be updated to include the new penalty keys?**
   - What we know: Both `scheduler.test.js` and `session.test.js` have a `MOCK_SETTINGS` constant that doesn't include the new keys. `scoreRound` will use `?? default` fallback, so existing tests won't break.
   - What's unclear: Whether updating `MOCK_SETTINGS` is cleaner (explicit) vs. relying on the fallback (implicit validation that the fallback works).
   - Recommendation: Update `MOCK_SETTINGS` in `scheduler.test.js` to include the new keys with explicit values. This avoids relying on fallback in tests that aren't specifically testing the fallback. Tests that DO test the fallback behavior should use a settings object that deliberately omits the new keys.

---

## Environment Availability

Step 2.6: SKIPPED — this phase is purely code/config changes within the existing codebase. No external tools, services, or CLIs beyond what is already installed (Node.js, Vitest) are required.

---

## Security Domain

No security-relevant changes in this phase. The only inputs are numeric slider values (integers 1–50) written to localStorage. No authentication, session tokens, cryptography, or network requests are involved. ASVS categories V2, V3, V4, V6 do not apply. V5 (Input Validation) is satisfied by `type="range"` with `min`/`max` attributes enforced by the browser; `parseInt()` in `updateWeights()` ensures the stored value is always an integer.

---

## Sources

### Primary (HIGH confidence)
- `src/scheduler.js` — direct read: `buildPairHistory`, `scoreRound`, `generateRounds`, `generateCandidate` — full implementation verified
- `src/storage.js` — direct read: `migrations`, `SCHEMA_VERSION`, `migrate()`, `initStorage()` — full migration chain verified
- `src/views/Settings.js` — direct read: slider HTML pattern, `updateWeights()`, Reset button handler — exact pattern confirmed
- `src/services/session.js` — direct read: `createSession()`, `generateNextRound()`, `updateSettings()` — settings snapshot and propagation verified
- `src/scheduler.test.js` — direct read: `MOCK_SETTINGS`, test patterns, `buildPairHistory` and `scoreRound` test structure
- `src/storage.test.js` — direct read: migration test pattern, `beforeEach` localStorage mock
- `vite.config.js` — direct read: Vitest configuration (happy-dom, globals, setupFiles)
- `npx vitest run` output — confirmed 15/15 tests passing as of 2026-04-14

### Secondary (MEDIUM confidence)
- None required — all research was satisfied by direct codebase reads.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; existing stack fully verified
- Architecture patterns: HIGH — all code paths read directly, no assumptions about framework behavior
- Pitfalls: HIGH — derived from direct reading of the exact code paths being modified
- Test coverage design: HIGH — existing test file structure confirmed; new test cases scoped to the same files

**Research date:** 2026-04-14
**Valid until:** 2026-05-14 (stable codebase; no third-party dependency changes expected)
