# Pitfalls Research — Milestone 6

**Domain:** Adding inline editing, scheduling penalties, and session-state tests to an existing vanilla JS pickleball SPA
**Researched:** 2026-04-13
**Confidence:** HIGH for mobile editing and testing (well-established patterns); MEDIUM for penalty scoring (specific to this scheduler's architecture)

---

## Inline Editing Pitfalls

### Pitfall 1: `blur` fires before the save action reaches localStorage — data silently lost

**What goes wrong:**
The canonical "tap to edit, blur to save" pattern has a race condition on mobile. When the user finishes typing and taps a "Done" or "Save" button, the tap fires `blur` on the input first. If the `blur` handler saves and then hides the input, the button's `click` event may never fire — or fires after the input is already torn down. The save appears to succeed (no error shown), but the new name is lost.

**Why it happens:**
On mobile Safari and Chrome-for-Android, the event order for a button tap while an input is focused is: `blur` → `mousedown` → `mouseup` → `click`. The `blur` fires before `click`. If the `blur` handler replaces the input element with a `<span>`, the button that was tapped no longer exists in the DOM when `click` would have fired.

**Prevention:**
- Save on `blur` directly — do not rely on a separate save button. `blur` is the correct and sufficient trigger for "tap outside to save."
- If a save button exists, use `mousedown` (not `click`) on the button to set a `pendingSave` flag, then check that flag in the `blur` handler before deciding whether to discard or commit.
- Do not remove the input from the DOM inside the `blur` handler synchronously. Use `setTimeout(() => swapInputForDisplay(), 0)` to let any pending button click fire first.

**Warning signs:**
- Blur handler that calls `innerHTML = ...` or removes the input element before returning
- Any save button whose `click` listener relies on reading `input.value` after the `blur` event

---

### Pitfall 2: Virtual keyboard repositions fixed/sticky elements and obscures the input

**What goes wrong:**
On iOS Safari, opening the keyboard does not resize the Layout Viewport — only the Visual Viewport shrinks. Any `position: fixed` elements (like the bottom action bar visible in the existing `RoundDisplay.js` and `renderAttendeeManager()`) reposition relative to the layout viewport, jumping on top of the input being edited. The user can no longer see what they are typing.

**Why it happens:**
This is a known, long-standing iOS Safari behavior. The existing CSS uses `fixed-safe-bottom` classes, which partially mitigate it, but inline inputs created dynamically inside card layouts (e.g., replacing a `<h3>` with an `<input>` in the club name area of `ClubManager.js`) are not protected by that class. The scrollable container will not scroll the input into view automatically.

**Prevention:**
- After activating the inline input, call `input.scrollIntoView({ behavior: 'smooth', block: 'center' })` to pull it into the visible area.
- Listen to `window.visualViewport.resize` if you need to actively reposition UI elements relative to the keyboard.
- Do not place inline inputs inside `position: fixed` containers. The club name appears in the page header (`ClubManager.js` and `RoundDisplay.js` header area) — ensure the header is in normal flow when editing is active.
- Test on a real iPhone, not just Chrome DevTools mobile emulation. DevTools does not simulate the visual viewport shrink.

**Warning signs:**
- Input activates but scrollable container does not adjust
- Any `position: fixed` element visible while keyboard is open
- Testing only in DevTools responsive mode

---

### Pitfall 3: Accidental edits from misread taps — no cancel path

**What goes wrong:**
The organizer is outdoors, one-handed, under time pressure. The existing UI uses large tap targets. Adding a tap-to-edit zone on the club name (which appears in both the `ClubManager` club list and the `RoundDisplay` header) creates a risk of accidental activation during scroll or while trying to tap a nearby button. Once in edit mode, pressing the phone's back button, navigating away, or the app losing focus (phone call) can leave the edit in an undefined state.

**Why it happens:**
Inline edit patterns typically do not add a cancel affordance because desktop users can press Escape. On mobile there is no Escape key. Blur-to-save is aggressive: any focus loss commits the change.

**Prevention:**
- On blur, compare the new value to the original value before saving. If unchanged, do nothing.
- If the trimmed value is empty, revert to the original value and abort the save rather than saving an empty name.
- Store the original club name in a local variable at the moment the input is activated (`const originalName = club.name`). Check it on blur.
- The back button scenario: the app uses hash routing — navigating away unmounts the view. The `unmount()` hook in `ClubManager.js` is currently empty. If an edit is active when the user navigates, the in-progress edit is lost but localStorage is not corrupted (no partial write), which is acceptable behavior. Document this explicitly.

**Warning signs:**
- Blur handler that saves `input.value` without comparing to original
- No guard for empty-string club name

---

### Pitfall 4: XSS via unsanitized club name rendered with innerHTML

**What goes wrong:**
The existing views (both `ClubManager.js` and `RoundDisplay.js`) use template literals with `innerHTML` to render club names: `<h1>${club.name}</h1>`. If an inline edit allows a club name containing `<script>` or `<img onerror=...>`, that string is stored in localStorage and injected into the DOM every time the view renders, triggering script execution or network requests.

**Why it happens:**
The app currently creates clubs through a form submission, and browsers sanitize form values — but the risk exists. Adding inline editing (where `input.value` flows directly into `club.name` which flows into template literal `innerHTML`) creates a direct injection path.

**Prevention:**
The simplest fix is to HTML-encode all user-provided strings before inserting via `innerHTML`. A minimal encoder:
```js
function escape(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
```
Apply this to every `club.name`, `member.name`, and any other user-controlled string that appears inside an `innerHTML` template literal. The codebase currently interpolates `club.name` in at least six places across `ClubManager.js` and `RoundDisplay.js`.

**Warning signs:**
- Any `innerHTML = \`...\${userControlledValue}...\`` without escaping
- Club or member names that contain `<`, `>`, `"`, `&`

---

### Pitfall 5: StorageAdapter's single-object write model causes stale closures during inline edit

**What goes wrong:**
`StorageAdapter` reads from an in-memory `state` object initialized at module load. `ClubService.getClubs()` calls `StorageAdapter.get('clubs')` on every call, returning the live in-memory reference. If the inline edit component holds a closure over the club object captured at render time, and then the user navigates away and back during an edit, the component is working with a stale reference — the saved name goes to the old object, which is then overwritten by a fresh render.

**Why it happens:**
The existing views call `const club = ClubService.getClub(...)` once at mount time and close over it for the lifetime of the component. This is fine for read-only display. Adding a write path (the inline save) through that same stale reference requires care.

**Prevention:**
In the blur/save handler, always re-fetch the club before writing:
```js
// In the blur handler — do NOT use the closed-over `club`:
ClubService.updateClub(clubId, { name: newName });
```
`ClubService.updateClub` already fetches fresh data from `StorageAdapter` internally (see `clubs.js` lines 30-37), so passing the club ID rather than the club object is safe.

**Warning signs:**
- Save handler that does `club.name = newValue` followed by `ClubService.updateClub(club.id, club)` — this passes the stale closure object
- Any direct mutation of the `club` or `member` objects captured at render time

---

## Penalty Scoring Pitfalls

### Pitfall 6: Adding new penalty fields breaks the migration chain — existing users lose their settings

**What goes wrong:**
The scheduler settings live in localStorage under `settings` with `schemaVersion: 1`. The current defaults are: `penaltyRepeatedPartner: 5`, `penaltyRepeatedOpponent: 10`, `penaltyRepeatedSitOut: 3`, `candidateCount: 200`, `topNToShow: 3`, `oddPlayerFallback: 'three-player-court'`. Adding new penalty fields (e.g., `penaltySinglesMatch`, `penaltyThreeWaySolo`) without a schema migration means existing users' `settings` objects lack these keys. `scoreRound` will see `undefined` where it expects a number, and `undefined * 2` is `NaN` — which propagates silently and breaks all scheduling output without an error being thrown.

**Why it happens:**
`StorageAdapter.set('settings', mergedSettings)` replaces the settings object. Any keys not explicitly included in the merge are dropped. Because `schemaVersion` is checked against `SCHEMA_VERSION = 1` in `storage.js`, and adding new settings does not bump the version, the migration never runs for existing users.

**Prevention:**
- Bump `SCHEMA_VERSION` to `2` and add a migration function that adds the new penalty keys with their defaults to any stored `settings` object.
- In `scoreRound()` and any function that reads penalty values, use safe access with fallbacks: `settings.penaltySinglesMatch ?? 20`. This provides a safety net but is not a substitute for migration.
- Add a test that verifies `scoreRound` produces a valid (non-NaN) score when called with a `settings` object that is missing the new fields.

**Warning signs:**
- `scoreRound` result is `NaN` or `Infinity`
- Schedule generation produces the same round every time (all candidates score equally at NaN)
- No version bump in `storage.js` when new settings keys are added

---

### Pitfall 7: Penalty function treats singles courts and 3-way courts the same as standard 2v2 courts

**What goes wrong:**
The current `scoreRound` function iterates `round.courts` and scores each court based on `teamA.length === 2` (partner pair) and opponent cross-products. A singles court (`teamA: ['p1'], teamB: ['p2']`) scores zero for partners (no pair) and one opponent relationship. A 3-way court (`teamA: ['p1','p2'], teamB: ['p3']`) scores one partner relationship and two opponent relationships. This means these non-standard court types currently receive no structural penalty relative to a 2v2 court, even though they are inherently inferior match formats.

**Why it happens:**
The penalty system was designed with 2v2 as the only court type. The odd-player fallback logic adds non-standard courts but `scoreRound` has no special case for them.

**Prevention:**
Add court-type detection before the per-court scoring loop:
```js
const isSingles = court.teamA.length === 1 && court.teamB.length === 1;
const isThreeWay = court.teamA.length + court.teamB.length === 3;
if (isSingles) score += settings.penaltySinglesMatch ?? 0;
if (isThreeWay) score += settings.penaltyThreeWaySolo ?? 0;
```
This is additive and does not disturb the existing partner/opponent penalty logic. If the penalty weight is `0`, behaviour is unchanged from current.

**Warning signs:**
- Adding a penalty value but not seeing a change in how often non-standard courts appear
- Tests that explicitly exercise 3-player and 1v1 courts passing without checking the resulting scores include the new penalty

---

### Pitfall 8: Penalty weights for new court types are not exposed in Settings or documented

**What goes wrong:**
The existing `Settings.js` view and the `settings` object in storage expose `penaltyRepeatedPartner`, `penaltyRepeatedOpponent`, and `penaltyRepeatedSitOut`. If new penalty keys are added without also adding them to the Settings view, they silently use defaults forever. Users who rely on the advanced settings screen to tune scheduling have no way to disable or adjust the singles/3-way penalties.

**Why it happens:**
Penalty logic is implemented in `scheduler.js`, which is pure functions. The UI for settings is separate in `Settings.js`. It is easy to forget to update the settings view when adding new scoring parameters.

**Prevention:**
- The Settings view should be updated in the same commit that adds the new penalty fields.
- The migration (Pitfall 6) should ensure defaults are sensible so the feature works well even if a user never visits Settings.
- The default for `penaltySinglesMatch` and `penaltyThreeWaySolo` should reflect the intent: these court types are already the "least bad" option for the odd players, so the penalty should be low enough to not override the sit-out preference system, but high enough to encourage spreading them across rounds rather than putting the same player in a singles match every time.

**Warning signs:**
- New `settings.*` key exists in `storage.js` defaults but not in `Settings.js` render output
- Advanced settings screen shows stale set of penalty sliders/inputs

---

### Pitfall 9: The incremental history update inside `generateRounds` does not account for new court types

**What goes wrong:**
`generateRounds` (lines 264-290 in `scheduler.js`) locally updates `currentHistory` between rounds in a batch to avoid calling `buildPairHistory` repeatedly. This incremental update explicitly handles `partnerCount` and `opponentCount` but does not update any per-court-type tracking. If penalty scoring for singles/3-way courts becomes history-aware (e.g., tracking how many times a player has been in a singles match), the incremental update will miss those updates and batch-generated rounds will be scored incorrectly.

**Why it happens:**
The incremental updater was written before non-standard courts were a scoring concern. It mirrors the structure of `buildPairHistory` but only the fields that existed at the time.

**Prevention:**
If the new penalties are stateless (flat penalty per non-standard court appearance, not streak-based), this pitfall does not apply. Keep the new penalties simple: a flat per-occurrence weight rather than streak-amplified. This avoids needing to extend the incremental updater and the history shape. Document this design decision explicitly in `scheduler.js`.

**Warning signs:**
- New history fields that are populated by `buildPairHistory` but not by the incremental updater in `generateRounds`
- Test that generates 5+ rounds in a batch and checks the non-standard court distribution — if the scheduler ignores previous singles assignments within the batch, singles assignments clump in early rounds

---

## Testing Pitfalls

### Pitfall 10: Tests that call `SessionService` hit the real StorageAdapter singleton — tests interfere with each other

**What goes wrong:**
`StorageAdapter` is a module-level singleton initialized via `initStorage()` at import time (see `storage.js` line 85: `let state = initStorage()`). In the test environment (vitest with happy-dom), the module is evaluated once per test file, not per test. A test that creates a session and marks rounds as played mutates the shared singleton. The next test starts with whatever state the previous test left behind. This makes test order significant and causes flaky failures that are hard to debug.

**Prevention:**
The existing `storage.test.js` avoids this by mocking `localStorage` in `beforeEach` with `vi.stubGlobal`. However, because `initStorage()` runs at module evaluation time (not inside a test), the mock is not in place when the module first loads. The existing tests work because `StorageAdapter.reset()` re-runs `migrate` against the mocked storage. This pattern must be extended to any new tests that use `SessionService`:

```js
import { beforeEach, vi } from 'vitest';

beforeEach(() => {
  const storage = {};
  vi.stubGlobal('localStorage', {
    getItem: (key) => storage[key] || null,
    setItem: (key, value) => { storage[key] = value },
    clear: () => { Object.keys(storage).forEach(k => delete storage[k]) }
  });
  // Reset the singleton to a fresh state under the mocked storage
  StorageAdapter.reset();
});
```

**Warning signs:**
- Tests that pass in isolation but fail when run as a suite
- Any test that creates sessions or marks rounds played without a `beforeEach` reset
- `describe` blocks for `SessionService` that don't stub `localStorage`

---

### Pitfall 11: Testing "player changes preserve played match state" is a behaviour test, not a unit test — wrong scope leads to incomplete coverage

**What goes wrong:**
The target feature — "player changes preserving played match state" — spans three layers: `SessionService.updateAttendees()`, `SessionService.regenerateRound()`, and `generateRounds()`. A test written only at the `generateRounds()` level (pure function) cannot verify that `updateAttendees` correctly identifies which rounds are played and which are not, or that `regenerateRound` uses the right `playedRounds` slice. A test written only at the `SessionService` level cannot easily isolate which component of the chain is responsible if the test fails.

**Prevention:**
Write tests at two levels:
1. Unit test `SessionService.regenerateRound()` directly: create a session with 3 rounds where rounds 0 and 1 are `played: true` and round 2 is `played: false`. Call `regenerateRound(2)`. Assert that rounds 0 and 1 are unchanged (same `courts` and `played` values) and round 2 has new matchups.
2. Integration test `updateAttendees()` + auto-regen: call `updateAttendees` with a new player list, then assert the state of all rounds. This tests the coordination logic in `RoundDisplay.js`'s save-attendees handler — which calls both `updateAttendees` and then conditionally calls `regenerateRound`. Because this coordination is in the view layer (not in a service), it may need to be tested via a DOM-mounted component test or extracted into a service method.

**Warning signs:**
- Tests only cover the pure `generateRounds` function and not `SessionService` state mutations
- No test that verifies `played: true` rounds remain untouched after `updateAttendees`

---

### Pitfall 12: The `played: true` guard in `regenerateRound` can be bypassed — the test must cover the guard

**What goes wrong:**
`SessionService.regenerateRound()` has a guard: `if (session && session.rounds[roundIndex] && !session.rounds[roundIndex].played)`. This prevents regenerating a played round. But the coordination code in `RoundDisplay.js` (the save-attendees handler, lines 143-148) calls `regenerateRound` only on the *latest* round if it is unplayed — it does not protect earlier unplayed rounds. If a session has an unusual state (e.g., round 2 is played, round 3 is unplayed, round 4 is also unplayed), calling `regenerateRound(currentRoundIdx)` where `currentRoundIdx = session.rounds.length - 1 = 4` regenerates round 4 but leaves round 3 stale.

**Why it happens:**
The guard works per-round but the coordination logic assumes the unplayed round is always the last one. This assumption holds in the normal flow (play → generate next → play → ...) but breaks for edge cases.

**Prevention:**
The tests should exercise at least one non-trivial session state. The "normal" case (1 played round, 1 unplayed round, update attendees) is insufficient. Also test: 3 played rounds, 2 unplayed rounds. Document what the expected behavior is (which unplayed rounds get regenerated) before writing the test — do not let the implementation define the spec.

**Warning signs:**
- Test suite covers only `playedRounds.length === 1` scenarios
- The guard in `regenerateRound` is tested in isolation (returns null for played rounds) but not for the case where multiple unplayed rounds exist

---

### Pitfall 13: Penalty scoring tests that hardcode expected scores break when defaults change

**What goes wrong:**
`scheduler.test.js` contains tests like `expect(score1).toBe(10)` that rely on `MOCK_SETTINGS.penaltyRepeatedPartner === 5` and the streak calculation producing exactly `5 * 2^1 = 10`. Adding new penalty fields to `MOCK_SETTINGS` (or changing how streaks are calculated) silently changes the expected value and breaks these tests. Worse: if the new penalty for singles courts happens to add a value to a previously-zero scenario, the existing hardcoded expectations fail for unrelated reasons.

**Prevention:**
- Keep `MOCK_SETTINGS` in the test file as a minimal, stable object. New penalty fields should have explicit defaults of `0` in `MOCK_SETTINGS` so they do not affect existing test cases.
- For new penalty tests, construct the expected score programmatically from the settings rather than hardcoding magic numbers: `expect(score).toBe(MOCK_SETTINGS.penaltySinglesMatch)`.
- Do not add new fields to the shared `MOCK_SETTINGS` constant. Instead, spread it: `const singlesSettings = { ...MOCK_SETTINGS, penaltySinglesMatch: 20 }`.

**Warning signs:**
- Existing tests fail after adding new fields to `MOCK_SETTINGS` at the top of the test file
- Any test with `expect(score).toBe(<literal number>)` that doesn't have a comment explaining the arithmetic

---

## Integration Pitfalls

### Pitfall 14: Inline club name edit and the session header in `RoundDisplay.js` show the same club name — both must update

**What goes wrong:**
The club name appears in two views:
1. `ClubManager.js` — the club list (`<h3>${club.name}</h3>`)
2. `RoundDisplay.js` — the session header (`<p class="text-xs text-gray-500">${club.name}</p>`, line 384)

If inline editing is implemented only in `ClubManager.js`, the active session view continues to show the old name until the user navigates away and back. This is not a data bug (the name in localStorage is updated) but a display bug — the organizer renames the club, sees the old name still displayed while running the session, and does not know if the rename worked.

**Prevention:**
Both views read club data by calling `ClubService.getClub(session.clubId)` at render time. Since both views do a full re-render on state change, the fix is straightforward: after a successful club rename in `ClubManager.js`, trigger a re-render if the active session belongs to the renamed club. If the user is currently in `RoundDisplay.js`, the name updates when they navigate to the club list and back — acceptable given the app's hash-based single-view-at-a-time architecture. Document this "eventual consistency within the session" behavior rather than adding cross-view event broadcasting.

**Warning signs:**
- Manually test: rename club while a session is active, navigate to the active session — does the header show the new name?
- Any test that renames a club and then reads the session view without a full `mount()` cycle

---

### Pitfall 15: New `penaltySinglesMatch` and `penaltyThreeWaySolo` fields in `session.settings` diverge from global `settings` in StorageAdapter

**What goes wrong:**
Sessions capture a snapshot of settings at creation time (`session.settings = { ...settings }`). This is intentional — changing global settings mid-session does not retroactively change the scheduling parameters for the active session. However, if new penalty fields are added via migration, existing sessions will lack those keys in their `session.settings` snapshots. `scoreRound` called for an active session will see `undefined` for the new penalty fields.

**Why it happens:**
`createSession` does `settings: { oddPlayerFallback: 'three-player-court', ...settings }` where `settings` comes from `StorageAdapter.get('settings')`. After migration, global settings will have the new fields. But any session created before the migration, or any session stored in the same migration run, may not have been updated.

**Prevention:**
In `scoreRound` and `generateRounds`, treat all penalty settings as optional with sensible defaults using nullish coalescing: `settings.penaltySinglesMatch ?? 0`. This means existing sessions degrade gracefully (no penalty for non-standard courts) rather than crashing. The defaults should be `0` for backward compatibility.

**Warning signs:**
- `scoreRound` receives `session.settings` (from an active session) rather than global settings and produces `NaN` for scores
- No nullish coalescing on new settings fields in `scoreRound`

---

### Pitfall 16: Adding penalty logic changes the scoring function — existing scheduler tests may pass but real-session behavior changes

**What goes wrong:**
All existing tests in `scheduler.test.js` use `MOCK_SETTINGS` which will have `penaltySinglesMatch: 0` and `penaltyThreeWaySolo: 0` (since those tests predate the new fields). The tests will pass. But in production, the default values for new penalty fields may be non-zero. The scheduler's variety and distribution behavior changes — rounds that previously generated 2v1 courts freely may now actively avoid them. This is a behavior change that the existing test suite cannot detect.

**Prevention:**
Write at least one integration-level test that runs `generateRounds` with `penaltySinglesMatch: 30` and `penaltyThreeWaySolo: 20` for a 7-player session and asserts that the resulting rounds have fewer non-standard courts than a run with `penaltySinglesMatch: 0`. This verifies the penalty has the intended effect, not just that the math is correct.

**Warning signs:**
- New penalty parameters added to settings with non-zero defaults, but all tests use `MOCK_SETTINGS` with zero or undefined for those fields
- No test that verifies the penalty actually causes the scheduler to prefer standard courts

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Inline club name edit | Blur/click race condition on mobile | Save on `blur`; compare to original before writing; test on real iOS device |
| Inline edit + virtual keyboard | Input hidden behind keyboard | Call `scrollIntoView` on activation; test with keyboard open |
| Inline edit + empty string | Empty club name saved | Guard: if `trimmed === ''`, revert to original |
| Schema migration for new settings | Existing users get `NaN` scores | Bump `SCHEMA_VERSION`; use `?? 0` fallbacks in `scoreRound` |
| Singles/3-way penalty implementation | Incremental history updater not extended | Keep new penalties stateless (flat, no streak) to avoid extending updater |
| Session state mutation tests | StorageAdapter singleton leaks between tests | `beforeEach` must stub localStorage AND call `StorageAdapter.reset()` |
| Player-change tests | Test only covers normal flow | Also test: multiple unplayed rounds, add player when no unplayed rounds exist |
| Penalty tests | Hardcoded expected scores break | Use spread to extend `MOCK_SETTINGS`; derive expected values from settings constants |
| Cross-view name display | Active session shows stale club name | Acceptable with hash routing; document behavior; add a manual test step |
| New settings in session snapshots | `session.settings` missing new fields | `?? 0` fallbacks in all penalty reads from settings |

---

*Pitfalls research for: Milestone 6 — UX Polish & Scheduler Improvements*
*Researched: 2026-04-13*
