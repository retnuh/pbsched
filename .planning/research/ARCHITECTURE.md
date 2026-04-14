# Architecture Research

**Project:** Pickleball Practice Scheduler — Milestone 6 (UX Polish & Scheduler Improvements)
**Researched:** 2026-04-13
**Scope:** Integration analysis for three milestone-6 features:
- Inline tap-to-edit club name
- Scheduling penalties for singles and 3-way solo matches
- Tests for player changes preserving played match state

---

## Integration Points

### Feature 1: Inline tap-to-edit club name

**Where the club name lives in the codebase:**

- `src/services/club.js` — `club.name: string` persisted inside the clubs array. `ClubService.updateClub(id, { name })` already exists at line 30 and handles persistence. No service changes needed.
- `src/views/MemberEditor.js` line 46 — static `<h1>` rendering `club.name` in the club detail screen header.
- `src/views/ClubManager.js` line 36 — static `<h3>` rendering `club.name` inside each club list card.
- `src/views/RoundDisplay.js` line 383 — static `<p>` subtitle showing `club.name` during a session. Read-only; not an edit target.

**The right edit surface is `MemberEditor.js`.** The club list in `ClubManager.js` uses the entire card row as a tap target for navigation (`data-action="view-club"` on the parent div, line 109). Adding an inline edit to the name element there creates a gesture conflict — the tap needed to activate editing would also trigger navigation. `MemberEditor.js` is the dedicated detail screen for a club; the header `<h1>` is the natural edit target with no competing gesture.

**Data refresh after save:** `RoundDisplay.js` reads the club name via `ClubService.getClub(session.clubId)` at mount time (line 22). Since a user editing the club name would not be in an active session simultaneously, the active session screen does not need special handling. `ClubManager.js` calls `ClubService.getClubs()` inside `renderClubs()` each time it runs, so it picks up the updated name automatically on next mount.

---

### Feature 2: Scheduling penalties for singles and 3-way solo matches

**Where scoring lives:**

`src/scheduler.js` — `scoreRound(round, history, settings)` at line 118. This function already handles partner, opponent, and sit-out penalties. The `settings` object it receives is the same object stored in `session.settings` (a snapshot taken at session creation in `SessionService.createSession`, line 34).

**Court shapes that need new penalties:**

The scheduler already generates these court shapes in `generateCandidate()`:
- `three-player-court` fallback → `{ teamA: [p1, p2], teamB: [p3] }` — `teamB.length === 1`
- `two-player-court` fallback → `{ teamA: [p1], teamB: [p2] }` — both teams have length 1

Currently `scoreRound` only processes teams of length 2 for partner penalties (lines 167-171: `if (teamA.length === 2)`). It processes opponent cross-products regardless of team size (lines 175-179), but does not apply any format-level penalty.

**Settings object — two new keys needed:**

```
settings.penaltyThreeWaySolo    // applies when a player is the solo side of a 2v1 court
settings.penaltySinglesMatch    // applies to each player in a 1v1 court
```

These are flat per-occurrence penalties (not history-accumulating). They fire every time a candidate round contains that court shape. Setting either weight to 0 disables that penalty entirely, consistent with how existing weights work.

**Where defaults live:** `src/storage.js` migration v1 (lines 17-33) defines the initial settings object. The new keys need defaults here. Options:
- **Inline fallback** (`settings.penaltyThreeWaySolo ?? 8`) in `scoreRound` — avoids a schema version bump, simpler.
- **Schema v2 migration** — cleaner for ensuring the Settings sliders always read a persisted value. Preferred if the Settings view needs to display and save these values (it does).

Because `Settings.js` will display and persist these weights via `StorageAdapter.set('settings', ...)`, a schema v2 migration that adds the new keys to the stored settings object is the correct approach. Users upgrading from v1 get the defaults merged in.

**Call chain — no changes needed to:**
- `generateCandidate()` — already produces the court shapes
- `generateRounds()` — calls `scoreRound`, passes settings through
- `getTopAlternatives()` — same
- `SessionService` — passes `session.settings` to scheduler functions unchanged

---

### Feature 3: Tests for player changes preserving played match state

**What is being tested:** The invariant that `SessionService.regenerateRound(idx)` replaces only `session.rounds[idx]` and leaves all rounds where `round.played === true` untouched.

**Production code path (already exists, no changes needed):**

```
SessionService.updateAttendees(newIds)       // updates session.attendeeIds only
SessionService.regenerateRound(idx)          // replaces rounds[idx] if !played
  → slice played rounds up to idx
  → generateRounds(activeAttendees, playedRounds, 1, settings)
  → session.rounds[idx] = newRound
  → updateSession(session)
```

The `played: true` rounds are used as `playedRounds` input to `generateRounds` but are never modified. The test must confirm this invariant holds.

**Test infrastructure dependency:** `SessionService` imports `StorageAdapter` which initializes from `localStorage` at module load time (`storage.js` line 85: `let state = initStorage()`). This must be mocked before the module loads. The pattern is established in `storage.test.js` lines 8-13: `vi.stubGlobal('localStorage', ...)` in a `beforeEach`. The same pattern applies directly in `session.test.js`.

`SessionService.createSession` also calls `ClubService.updateMembersLastPlayed`. Tests that exercise `createSession` need either a club stub in the mocked storage or direct state injection via `StorageAdapter.set('sessions', [...])` to bypass `createSession` and pre-populate the session under test. The latter is simpler and more isolated.

---

## Components to Modify

| Component | File | What Changes |
|-----------|------|--------------|
| `MemberEditor` view | `src/views/MemberEditor.js` | Replace static `<h1>` club name with tap-to-edit inline input; wire blur/Enter to `ClubService.updateClub` |
| `scoreRound` function | `src/scheduler.js` | Add penalty branches for solo-in-3-way (`teamB.length === 1`) and both-sides-of-1v1 (`teamA.length === 1 && teamB.length === 1`) |
| `Settings` view | `src/views/Settings.js` | Add two range sliders for `penaltyThreeWaySolo` and `penaltySinglesMatch`; follows the exact same pattern as the existing three sliders |
| StorageAdapter migrations | `src/storage.js` | Add schema v2 migration that merges `penaltyThreeWaySolo: 8` and `penaltySinglesMatch: 5` into existing settings; bump `SCHEMA_VERSION` to 2 |

---

## New Components

None in production code.

**New test file:** `src/session.test.js` — tests for `SessionService` in isolation. This is test infrastructure, not a production component. It follows the same Vitest + `vi.stubGlobal` pattern as `src/storage.test.js`.

No new services, views, or utilities are needed. `ClubService.updateClub` is already sufficient for name persistence. The penalty logic is a pure addition to existing functions.

---

## Data Flow Changes

### Club name edit (new flow)

```
User taps club name <h1> in MemberEditor
  → MemberEditor replaces <h1> with focused <input value="current name">
  → User edits; taps away (blur) or presses Enter
  → ClubService.updateClub(clubId, { name: newValue })
       → StorageAdapter.set('clubs', updatedClubs)  [existing path]
  → MemberEditor re-renders header with updated name
```

No downstream effects on session data. Sessions store `clubId`, not a copy of the name. `RoundDisplay` and `ClubManager` both do a live lookup on mount, so they display the updated name automatically after navigating.

### Penalty scoring for match format (modified flow)

```
generateCandidate() → round with courts (unchanged)
  → scoreRound(round, history, settings)  [modified]
       → for each court:
            // existing: partner penalties for 2-person teams
            // existing: opponent penalties across teams
            // NEW: format penalties
            if teamA.length === 1 && teamB.length === 1:
              score += (settings.penaltySinglesMatch ?? 5) * 2  // both players penalized
            elif teamB.length === 1:
              score += settings.penaltyThreeWaySolo ?? 8        // solo player penalized
            elif teamA.length === 1:
              score += settings.penaltyThreeWaySolo ?? 8
  → caller receives score (unchanged)
```

`buildPairHistory`, `generateRounds`, `getTopAlternatives`, and `SessionService` are all unchanged. The new penalty integrates into the existing score minimization loop transparently.

### Schema migration (one-time on app boot)

```
StorageAdapter.initStorage()
  → loads stored state (schemaVersion: 1 for existing users)
  → migrate(data):
       v1 → v2 migration:
         data.settings.penaltyThreeWaySolo = data.settings.penaltyThreeWaySolo ?? 8
         data.settings.penaltySinglesMatch = data.settings.penaltySinglesMatch ?? 5
         data.schemaVersion = 2
  → saveAll(migratedState)
```

Existing users get the new penalty keys added with defaults on first app load after the update. No data is lost. Sessions that were created before the update still have their own `session.settings` snapshot without the new keys — `scoreRound` uses the inline fallback (`?? 8`, `?? 5`) for those sessions.

### Player-change state preservation (existing flow, test confirms invariant)

```
SessionService.updateAttendees(['p1','p2','p3','p4','p5'])
  → session.attendeeIds updated, rounds untouched

SessionService.regenerateRound(2)
  → playedRounds = session.rounds.slice(0, 2).filter(r => r.played)
  → [newRound] = generateRounds(attendeeIds, playedRounds, 1, settings)
  → session.rounds[2] = newRound   // only index 2 replaced
  → session.rounds[0].played === true  ← invariant: untouched
  → session.rounds[1].played === true  ← invariant: untouched
```

---

## Suggested Build Order

The three features are independent of each other. No feature is a prerequisite for another.

**Recommended sequence — lowest risk first:**

### Step 1: Tests for player-change state preservation

**Why first:** Zero production risk. Establishes `session.test.js` and the `localStorage` mock pattern that will be referenced when validating penalty behavior. Confirms the existing regeneration logic is correct before adding new scoring complexity on top of it.

**Specific work:**
- Create `src/session.test.js` with `vi.stubGlobal('localStorage', ...)` in `beforeEach`
- Inject session state via `StorageAdapter.set` directly (bypass `createSession` to avoid club dependency)
- Test: `regenerateRound(idx)` only replaces `rounds[idx]`; all `played: true` rounds before it are byte-for-byte identical after the call
- Test: `updateAttendees` does not touch `rounds` at all
- Test: `deleteUnplayedRoundsAfter(idx)` removes only rounds where `played === false` and `index > idx`

### Step 2: Scheduling penalties for singles and 3-way solo matches

**Why second:** Pure logic change in `scheduler.js` with no view restructuring. Tests can be added to the existing `scheduler.test.js` immediately. The Settings slider additions are low-risk. Build and verify in isolation before touching any view interaction code.

**Specific work:**
- `src/storage.js`: bump `SCHEMA_VERSION` to 2; add v2 migration merging `penaltyThreeWaySolo: 8` and `penaltySinglesMatch: 5`
- `src/scheduler.js` `scoreRound`: add format penalty branches (see data flow section above)
- `src/views/Settings.js`: add two range sliders matching existing slider structure; wire to `StorageAdapter.set('settings', ...)`
- `src/scheduler.test.js`: add tests confirming format penalties fire when courts have solo/1v1 shapes, that weight=0 produces zero additional penalty, and that standard 2v2 courts are unaffected

### Step 3: Inline tap-to-edit club name

**Why last:** The UI interaction pattern (tap-to-activate input, blur/Enter to confirm, re-render) has the most surface area of the three features. Placing it last means the foundation is stable and the team is in a confident position. The inline edit pattern requires care on mobile: the virtual keyboard shifts layout, blur fires before tap events complete on some iOS versions, and the input must not be accidentally submitted by navigation gestures.

**Specific work:**
- `src/views/MemberEditor.js`: replace static `<h1>` with a two-state element — display mode (shows name, tap activates) and edit mode (shows `<input>`, blur/Enter saves)
- On save: `ClubService.updateClub(clubId, { name: trimmed })`, then re-render the header element only (not the full page, to preserve scroll position)
- Guard: if the name is blank on blur, revert to the previous value — do not save an empty name
- `ClubManager.js` requires no changes — its `renderClubs()` reads fresh data on each call

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Integration points | HIGH | Full source read of all relevant files; service boundary is clear |
| Penalty scoring changes | HIGH | `scoreRound` signature and court shape logic fully inspected; the addition is additive |
| Schema migration | HIGH | Existing migration pattern in storage.js is directly reusable; v1→v2 is straightforward |
| Test infrastructure | HIGH | `storage.test.js` mock pattern is directly applicable; Vitest is already configured |
| Inline edit UX | MEDIUM | Pattern is well-understood; mobile blur/tap event ordering on iOS requires validation during implementation |
