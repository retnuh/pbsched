# Features Research

**Domain:** Pickleball practice session scheduler — mobile-first PWA, vanilla JS, localStorage only
**Milestone:** 6 — UX Polish & Scheduler Improvements
**Researched:** 2026-04-13

---

## Inline Name Editing

### What is being built

Inline tap-to-edit for the club name. The name currently appears as a static `<h1>` in `MemberEditor.js`. The user taps it, it becomes an `<input>`, and blur/Enter saves via `ClubService.updateClub()`.

### Table stakes behavior

The standard inline-edit pattern on mobile follows three phases:

**Display phase.** The name renders as a heading. A visual affordance (pencil icon, dashed underline, or "Tap to edit" label) signals editability. On mobile, hover states don't exist, so the cue must be visible at rest — otherwise users won't discover the feature.

**Edit phase.** A single tap converts the heading to a prefilled `<input type="text">`. The keyboard opens. The input replaces the heading in-place with the same visual footprint. No modal, no navigation to a separate edit screen.

**Commit phase.** The user commits via:
- `blur` — tapping anywhere outside (most reliable on mobile)
- `Enter`/`Done` on the keyboard
- An explicit checkmark button (optional, increases clarity at the cost of an extra tap)

The value saves to the backing store on commit. If the value is empty or unchanged, the save is skipped and the previous name is restored.

### Where to implement

Primary location: `MemberEditor.js`, the `<h1>` in the header that renders `club.name`. The `ClubManager.js` list items are navigation targets (tap = navigate to club), not edit targets — they should not be affected.

Data path: `input blur → ClubService.updateClub(clubId, { name: newName }) → re-render header`.

`ClubService.updateClub` already exists (`club.js` line 30) and accepts an arbitrary updates object. No service changes needed.

### Edge cases and expected behaviors

| Scenario | Expected behavior |
|---|---|
| User clears the name entirely | Revert to previous name on blur; do not save empty string |
| User does not change the name | No-op; skip localStorage write |
| User hits Escape | Revert to previous name, exit edit mode |
| Name exceeds reasonable length | `maxlength="40"` on the input; prevents layout breaks on narrow screens |
| Tap during active session | Still works; nothing in `SessionService` depends on club name at runtime |
| iOS Safari input focus | Use `font-size: 16px` on the input to prevent auto-zoom (browser behavior when input font < 16px) |

### Complexity: Low

One element swap (heading to input), one service call on commit, revert on empty/Escape. The only non-trivial concern is the iOS zoom behavior, mitigated by a single CSS rule.

### Dependency on existing code

`ClubService.updateClub()` (already exists). Touches `MemberEditor.js` only. No session, scheduler, or storage changes.

---

## Scheduling Penalties

### What is being built

The scheduler currently penalizes repeated partners, repeated opponents, and repeated sit-outs. It does not penalize players who have been placed into disadvantaged match formats:

- **Singles match** (1v1 court — `teamA.length === 1 && teamB.length === 1`)
- **3-way solo side** (lone player on the short side of a 2v1 court — `teamB.length === 1`)
- **3-way pair side** (two players on the long side of a 2v1 court — `teamA.length === 2` with `teamB.length === 1`)

Default penalties per the feature spec: singles +20, 3-way solo +25, 3-way pair +20. All configurable.

### How scoring currently works

`scoreRound(round, history, settings)` in `scheduler.js` accumulates a numeric penalty. Lower = better. `history` is built by `buildPairHistory(playedRounds)` from played round arrays. `settings` carries penalty weights.

Adding format penalties follows the same pattern: add new history fields, populate them in `buildPairHistory`, read them in `scoreRound`.

### Changes needed in buildPairHistory

Three new fields on the `history` object:

```
history.singlesCount  = { player: count }   // played in a 1v1 court
history.soloSideCount = { player: count }   // was the lone player in a 2v1
history.pairSideCount = { player: count }   // was on the pair side of a 2v1
```

Detection logic inside `round.courts.forEach(court => { ... })`:

```js
const { teamA, teamB } = court;

if (teamA.length === 1 && teamB.length === 1) {
  // Singles court
  [teamA[0], teamB[0]].forEach(p => {
    history.singlesCount[p] = (history.singlesCount[p] || 0) + 1;
  });
} else if (teamA.length === 2 && teamB.length === 1) {
  // 3-way court
  history.soloSideCount[teamB[0]] = (history.soloSideCount[teamB[0]] || 0) + 1;
  [teamA[0], teamA[1]].forEach(p => {
    history.pairSideCount[p] = (history.pairSideCount[p] || 0) + 1;
  });
}
```

The existing code already handles this court shape structurally — it just doesn't score it.

### Changes needed in scoreRound

A third penalty block added after the existing sit-out and court-matchup blocks:

```js
// 3. Penalize format disadvantages
round.courts.forEach(court => {
  const { teamA, teamB } = court;

  if (teamA.length === 1 && teamB.length === 1) {
    [teamA[0], teamB[0]].forEach(p => {
      const count = history.singlesCount?.[p] || 0;
      if (count > 0) score += (settings.penaltySingles ?? 20) * count;
    });
  } else if (teamA.length === 2 && teamB.length === 1) {
    const soloCount = history.soloSideCount?.[teamB[0]] || 0;
    if (soloCount > 0) score += (settings.penaltySoloSide ?? 25) * soloCount;

    [teamA[0], teamA[1]].forEach(p => {
      const pairCount = history.pairSideCount?.[p] || 0;
      if (pairCount > 0) score += (settings.penaltyPairSide ?? 20) * pairCount;
    });
  }
});
```

**Penalty formula choice:** Use flat `base * count` (no streak tracking) for format penalties. Streak tracking is meaningful for sit-outs (consecutive punishment) but unnecessary for format fairness — "solo side 3 rounds apart" deserves the same count-based discouragement. Keeps `buildPairHistory` simpler.

### Settings integration

New penalty keys need either:
- Default fallbacks inline in `scoreRound` via `?? 20` / `?? 25` (safest for existing sessions)
- Or a schema v2 migration in `storage.js` that merges new defaults onto existing settings objects

Prefer inline fallbacks (`??`) for backward compatibility with existing users' stored settings. Then add the new keys to the v1 migration defaults so fresh installs get the right values.

New sliders in `Settings.js` follow the exact same pattern as existing `penaltyRepeatedPartner` / `penaltyRepeatedOpponent` sliders.

Session settings copy from global settings at session creation (`createSession` in `session.js` spreads stored settings). New keys flow through automatically.

### Edge cases and expected behaviors

| Scenario | Expected behavior |
|---|---|
| No odd-player courts in session | New penalty fields are all 0; no scoring impact |
| Player has been solo side twice | Penalty doubles (flat `base * count`) |
| `two-player-court` produces 1v1 AND a sit-out | 1v1 players accumulate `singlesCount`; sitter accumulates `sitOutCount` |
| Existing sessions without new history fields | `?.[p] || 0` guards handle undefined gracefully |
| Settings screen | Three new sliders; same range (1–50) and visual pattern as existing sliders |
| Tests | `buildPairHistory` tests verify new count fields populate correctly; `scoreRound` tests verify penalties apply and accumulate |

### Complexity: Medium

Pure function changes to `scheduler.js` only (no I/O, no side effects). Three new history fields, one new `scoreRound` block, three new settings defaults, three new Settings.js sliders. The existing test patterns in `scheduler.test.js` are a direct template for new tests.

### Dependency on existing code

`scheduler.js` (`buildPairHistory`, `scoreRound`), `storage.js` (new default keys in migration), `Settings.js` (new sliders). No view or session service changes needed beyond Settings.

---

## Session State Testing

### What is being built

Tests verifying that when the player roster is modified mid-session (add or remove a player), rounds already marked `played: true` retain their exact structure. Only unplayed rounds are affected.

### How the invariant works in the existing code

`SessionService.updateAttendees(newAttendeeIds)` updates `session.attendeeIds` and persists. The view then calls `SessionService.regenerateRound(currentRoundIdx)` on the latest unplayed round.

`regenerateRound(roundIndex)` in `session.js`:
- Takes `session.rounds.slice(0, roundIndex).filter(r => r.played)` as history input
- Generates a new round from current `session.attendeeIds`
- Replaces only `session.rounds[roundIndex]`

Played rounds (all indices before the target unplayed round) are never touched. The invariant is maintained by code logic but no test covers it. A future refactor could break it silently.

### What the tests need to cover

Per the feature spec:
1. Start a session and mark some rounds as played
2. Modify the roster (add and/or remove players)
3. Assert played rounds retain their court/sittingOut structure exactly
4. Assert only the unplayed round is regenerated/affected

Concrete test scenarios:

| Test | Setup | Assert |
|---|---|---|
| Remove attendee — played rounds preserved | 2 rounds played, remove 1 attendee, call `updateAttendees` + `regenerateRound` | `rounds[0].courts` and `rounds[1].courts` identical before and after |
| Add attendee — played rounds preserved | 2 rounds played, add new attendee, regenerate | Played rounds unchanged; new round can include the new player |
| Undo round after roster change | Play 2 rounds, change roster, undo round 2 | Round 1 `played: true` and courts unchanged |
| Remove player who appeared in a played round | Player p3 appears in `rounds[0].courts`, remove p3 from attendees | `rounds[0].courts` still references p3's id; no scrubbing |

The last case is the most important invariant: played round data is immutable. Player ids in courts are never purged retroactively when a player leaves. Name resolution (`getPlayerName`) handles absent players gracefully by falling back to 'Unknown'.

### Testing infrastructure already in place

- Vitest with `vi.stubGlobal` for localStorage (established in `storage.test.js`)
- Pure function tests in `scheduler.test.js` as template for structure and style
- `SessionService` is a plain object — all methods callable directly in tests without DOM

The main setup challenge: `StorageAdapter` calls `initStorage()` at import time, which reads `localStorage`. Tests must stub localStorage before the module loads, or call `vi.resetModules()` between test files to get a fresh module state.

**Recommendation:** Create `src/session.test.js`. In `beforeEach`, stub localStorage with a fresh in-memory object (same pattern as `storage.test.js`). Build session fixtures as plain objects pushed directly into the mocked storage, then call `SessionService` methods and assert on the returned session. No DOM, no routing, no view code.

### Complexity: Low-Medium

Conceptually low — the invariant is simple and the behavior is already correct. Medium in test setup because:
- Requires constructing realistic session fixtures (rounds with courts, played flags, attendee ids)
- `SessionService` has import-time side effects that need careful mock sequencing
- `vi.resetModules()` may be needed if `StorageAdapter` state leaks between test files due to the module-level `let state = initStorage()` in `storage.js`

### Dependency on existing code

`session.js` (service under test), `storage.js` (needs localStorage mock), `scheduler.js` (called transitively by service methods). No production code changes needed — this is a pure test coverage addition.

---

## Anti-Patterns to Avoid

### Inline editing: full view re-render on tap

**What goes wrong:** The entire `MemberEditor` view re-renders with an edit form when the user taps the club name.

**Why bad:** Re-render kills input focus, creates flash, loses scroll position, and is unnecessary — only one element is changing.

**Instead:** Swap only the `<h1>` to an `<input>` in-place. Keep all other DOM untouched during the edit lifecycle. On commit or cancel, swap back.

### Inline editing: save on every keystroke

**What goes wrong:** Each keypress calls `ClubService.updateClub()`, triggering storage writes and possibly a re-render.

**Why bad:** Unnecessary writes, potential flicker, and a re-render mid-edit will steal focus.

**Instead:** Save exactly once on `blur` or `Enter`. No debounce needed — a single commit event is correct.

### Scheduling penalties: storing derived counts in the round object

**What goes wrong:** `singlesCount` or `soloSideCount` increments are stored on the round object itself instead of being derived from `buildPairHistory`.

**Why bad:** The round object becomes a source of truth for derived data. If the derivation logic changes, stored rounds have stale values. `buildPairHistory` is the single correct place to derive history from played arrays.

**Instead:** Keep round objects as pure structural data (courts, sittingOut, played). Derive all counts in `buildPairHistory` at scoring time.

### Scheduling penalties: breaking existing session data

**What goes wrong:** New penalty defaults are written only into the schema v1 migration block. Existing users have already run v1; their stored settings won't have the new keys. `scoreRound` receives `undefined` and produces `NaN` scores.

**Instead:** Use defensive fallbacks in `scoreRound` (`settings.penaltySingles ?? 20`) so existing stored settings without the new keys still work. Add the new keys to the v1 defaults so fresh installs get them. Only create a v2 migration if the schema structure changes.

### Session state tests: testing through the view layer

**What goes wrong:** Tests drive `RoundDisplay.js` — mounting it into a DOM, simulating taps, asserting on rendered HTML.

**Why bad:** Fragile, slow, couples tests to render details, and requires JSDOM setup that the existing test suite doesn't use.

**Instead:** Call `SessionService` methods directly as functions. Assert on the plain objects returned by `getActiveSession()`. No DOM required. This is exactly how `scheduler.test.js` tests the scheduler.

### Session state tests: using shared state between test runs

**What goes wrong:** `StorageAdapter` holds a module-level `let state = initStorage()`. If localStorage isn't reset between tests, or if `vi.resetModules()` isn't called between test files, one test's session data leaks into the next.

**Instead:** In `beforeEach`, stub a fresh in-memory localStorage. If module isolation is needed between files, use `vi.resetModules()` + dynamic `import()` within the test to get a fresh `StorageAdapter` instance.
