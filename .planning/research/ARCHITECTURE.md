# Architecture: Match Editor Integration

**Project:** Pickleball Practice Scheduler — Milestone 7 (Match Editor)
**Researched:** 2026-04-14
**Confidence:** HIGH — based on direct codebase inspection of all relevant source files

---

## Current Architecture Baseline

### Routing
Hash router in `src/router.js`. Routes map path patterns to view modules. Each view exports `mount(el, params)` and `unmount()`. The router clears `el.innerHTML` and calls `mount` on every navigation. Params are parsed from hash segments (e.g. `/club/:clubId`).

### State
Single flat JSON blob in localStorage keyed as `pb:all`. `StorageAdapter` wraps read/write with schema migrations. All mutation goes through `SessionService`, which reads the active session, mutates in place, and calls `updateSession()` to persist.

### Session and Round data shape (current)
```js
session = {
  id, clubId, createdAt, status,
  attendeeIds: [playerId, ...],
  settings: {
    penaltyRepeatedPartner, penaltyRepeatedOpponent, penaltyRepeatedSitOut,
    penaltyThreeWaySolo, penaltySinglesMatch,
    candidateCount, topNToShow, oddPlayerFallback
  },
  rounds: [
    {
      index: 0,
      played: false,
      courts: [
        { teamA: [playerId, playerId], teamB: [playerId, playerId] }
      ],
      sittingOut: [playerId, ...]
    }
  ]
}
```

### Scheduler inputs
`buildPairHistory(playedRounds)` reads only `round.courts[*].teamA`, `round.courts[*].teamB`, and `round.sittingOut`. The scheduler is pure — no I/O. History is reconstructed fresh from the played rounds array on every call. There is no cache to invalidate.

### RoundDisplay.js — sub-view pattern
`RoundDisplay.js` is one module-level closure (~590 lines). Internal sub-views (attendee manager, sitter picker, alternatives) are rendered by toggling boolean/index flags (`isManagingAttendees`, `showingAlternativesFor`, `pickingSitterFor`) then calling `render()`. This is the established pattern for in-place sub-views within the session screen.

---

## Integration Points

### Where "Edit" entry points attach

**Proposed (unplayed) round:**
In `RoundDisplay.js` `renderMain()`, the button group for unplayed rounds currently contains "Alternatives" and "Mark Played". An "Edit" button belongs here, rendered identically to "Alternatives":
```js
// Inside the !round.played button group, alongside existing buttons:
<button data-action="edit" data-index="${round.index}" ...>Edit</button>
```

**Most recently played round:**
In `renderMain()`, played rounds show either "Undo" (if `round.index === lastPlayedIdx`) or "Completed". An "Edit" button belongs in the `lastPlayedIdx` branch, next to "Undo":
```js
// Inside the played + lastPlayedIdx branch:
<button data-action="edit" data-index="${round.index}" ...>Edit</button>
```

Older played rounds (not lastPlayedIdx) stay as "Completed" only — editing arbitrary history is out of scope for Milestone 7.

**Event delegation in listEl click handler:**
```js
const editBtn = e.target.closest('[data-action="edit"]');
if (editBtn) {
  const idx = parseInt(editBtn.getAttribute('data-index'));
  navigate(`#/edit/${idx}`);
  return;
}
```

### Router change
Add one entry to `routes` in `src/router.js`:
```js
import * as MatchEditor from './views/MatchEditor.js';

const routes = {
  ...existing routes...
  '/edit/:roundIndex': MatchEditor,
};
```

No other router changes.

---

## New Components

### `src/views/MatchEditor.js` — new standalone view

A standalone view module, not an inline sub-view inside RoundDisplay. Reasons:
- Visually complex (multiple drag zones, court layout, bench area)
- Needs its own scroll context
- Benefits from the back-button gesture on mobile navigating to `/active`
- RoundDisplay is already at ~590 lines; major additions should not compound it

Structure:
```
MatchEditor.mount(el, { roundIndex })
  reads session = SessionService.getActiveSession()
  reads round = session.rounds[parseInt(roundIndex)]
  maintains in-memory draft: { courts: [...], sittingOut: [...] }
  renders:
    Header (back, round label, Save button)
    Courts section (one card per court with teamA slot + teamB slot)
    Rest Bench section (sittingOut players)
  handles drag/touch events
  on Save: validates → calls SessionService.updateRound() → navigate('#/active')
```

---

## Data Model Changes

### Add `source` field to the round shape

```js
{
  index: 0,
  played: false,
  source: 'generated' | 'edited',  // NEW
  courts: [...],
  sittingOut: [...]
}
```

**Where to set it:**
- `scheduler.js` `generateCandidate()`: add `source: 'generated'` to the returned round object
- `MatchEditor.js` on save: set `source: 'edited'` on the round before calling `updateRound()`

**Migration:** Not required for correctness. Absence of `source` is treated as `'generated'`. A v3 migration can backfill if needed later, but is not needed for Milestone 7 to function.

**Impact on scheduler:** None. `buildPairHistory` reads only `courts` and `sittingOut`; it ignores unknown fields.

**Impact on RoundDisplay:** Can badge edited rounds with a small "Edited" label if `round.source === 'edited'`. Optional visual touch.

### No other model changes
The scheduler already reads courts and sittingOut in the format that editing will produce. No structural changes to the court shape are needed.

---

## New and Modified Service Methods

### `SessionService.updateRound(roundIndex, roundData)` — new

```js
updateRound(roundIndex, roundData) {
  const session = this.getActiveSession();
  if (!session || session.rounds[roundIndex] === undefined) return;
  session.rounds[roundIndex] = { ...roundData, index: roundIndex };
  this.updateSession(session);
}
```

The existing `replaceRound(roundIndex, newRound)` guards against played rounds (`!session.rounds[roundIndex].played`). The editor needs to update both played and unplayed rounds, so a new method with no played-status guard is required. `replaceRound` stays unchanged — it is still used by the Alternatives picker.

---

## Data Flow: Editing a Round

```
RoundDisplay
  user taps "Edit" on round N
    navigate('#/edit/N')

MatchEditor.mount(el, { roundIndex: 'N' })
  session = SessionService.getActiveSession()
  round = session.rounds[N]
  draft = deepCopy({ courts: round.courts, sittingOut: round.sittingOut })
  render courts + bench from draft

  user drags player chip between slots
    draft updated in memory
    affected slot elements re-rendered (not full page re-render)

  user taps "Save"
    validate: all players accounted for, court sizes match expected shapes
    if invalid: show inline error, stay on screen
    if valid:
      updatedRound = { ...round, courts: draft.courts, sittingOut: draft.sittingOut, source: 'edited' }
      SessionService.updateRound(N, updatedRound)
      Haptics.success()
      navigate('#/active')

RoundDisplay re-mounts
  session re-read (now has edited round N)
  if round N was played, any future call to generateNextRound() or regenerateRound()
    calls buildPairHistory(session.rounds.filter(r => r.played))
    which reads the edited courts/sittingOut — no cache, no extra step
```

**Key insight:** The scheduler's `buildPairHistory` is stateless and reconstructs from raw arrays every time. Editing a played round's courts/sittingOut in storage is the only step needed to change the history visible to the scheduler. No invalidation, no secondary update.

---

## Scheduler Interaction: Edited Played Rounds

When an already-played round is edited and saved:

1. `SessionService.updateRound(N, editedRound)` writes the new courts/sittingOut to storage.
2. The next call to `generateNextRound()` or `regenerateRound()` filters `session.rounds.filter(r => r.played)`.
3. `buildPairHistory(playedRounds)` reconstructs from the edited data.
4. Partner counts, opponent counts, sit-out counts, and streaks all reflect the human-edited assignments.
5. The best candidate for the next round is scored against this updated history.

**Edge case — a next unplayed round already exists when a played round is edited:**
The unplayed round was generated using pre-edit history. After saving edits to the played round, the unplayed round may be suboptimal given the new history.

Recommendation for Milestone 7: Do not auto-regenerate. Leave the unplayed round in place. Show a one-line notice on RoundDisplay if `session.rounds` contains a played round with `source: 'edited'` and there is a subsequent unplayed round: e.g. "A played round was edited — tap Alternatives to refresh this round." This makes the implication visible without surprising the organizer with an unwanted regeneration.

---

## Drag-and-Drop Implementation

### Desktop (HTML5 DnD API)
Use `draggable="true"` on player chips, `dragstart`/`dragover`/`drop` on slot elements and bench. Standard, works reliably on desktop browsers.

### Mobile (touch events)
The HTML5 DnD API does not reliably fire on iOS Safari. Must use `touchstart`/`touchmove`/`touchend` events with manual hit-testing.

Pattern:
```js
// touchstart: record which chip is being dragged, its starting position
// touchmove: move a visual clone element with the finger position
// touchend: call document.elementFromPoint(touch.clientX, touch.clientY)
//           to find the target slot, then update draft
```

No library needed for this project's scale (~4 courts max, ~12 players). The manual touch approach is ~50-80 lines and avoids any new dependency.

### In-memory draft, partial DOM updates
Maintain a draft object in MatchEditor's closure:
```js
let draft = {
  courts: round.courts.map(c => ({ teamA: [...c.teamA], teamB: [...c.teamB] })),
  sittingOut: [...round.sittingOut]
};
```
On each drop, update `draft` and re-render only the affected slot elements (find by data attribute, replace innerHTML). Avoids a full re-render that would disrupt drag state.

---

## Validation on Save

Before calling `updateRound`, verify:
1. Total player count = `(all court slot occupants) + sittingOut.length` equals `session.attendeeIds.length`.
2. Each court's teamA and teamB are not empty (at minimum one player each).
3. Standard courts (when round was originally 4-player) retain valid sizes — no slot left empty without the other team also being adjusted.

If validation fails, show a fixed banner at the top of the screen: "Invalid arrangement — every court needs players on both sides." Do not navigate away.

---

## Component Summary

| Component | File | Change | Notes |
|-----------|------|--------|-------|
| Router | `src/router.js` | Add `/edit/:roundIndex` route | One import, one route entry |
| MatchEditor view | `src/views/MatchEditor.js` | New | Full editor UI |
| SessionService | `src/services/session.js` | Add `updateRound()` | Additive, no existing method changes |
| RoundDisplay | `src/views/RoundDisplay.js` | Add "Edit" buttons; badge edited rounds; add event delegation case | Minimal additions to existing rendering |
| Scheduler | `src/scheduler.js` | Add `source: 'generated'` to `generateCandidate()` output | One-line addition |
| StorageAdapter | `src/storage.js` | No change | `source` field is backward-compatible |

---

## Suggested Build Order

Dependencies:
- `SessionService.updateRound()` has no UI dependency — build first
- MatchEditor depends on `updateRound()` existing
- RoundDisplay entry points depend on the editor route being registered
- Touch drag-and-drop depends on the basic drag-and-drop working first
- Validation is the last thing to harden before shipping

### Phase 1 — Service layer + data model
- Add `source: 'generated'` to `generateCandidate()` return value in `scheduler.js`
- Add `SessionService.updateRound()` to `session.js`
- Write unit tests for `updateRound()`: updates courts and sittingOut of a played round, preserves `played` status, does not affect other rounds
- No UI changes yet — zero regression risk

### Phase 2 — MatchEditor scaffold (static, no drag)
- Register `/edit/:roundIndex` in `router.js`
- `MatchEditor.js` mounts, reads round, renders static court layout with player chips (no drag yet)
- Add "Edit" buttons to RoundDisplay (both unplayed and last-played round branches)
- Confirms routing, data reading, and visual layout before adding interaction complexity

### Phase 3 — Drag-and-drop on desktop
- Add HTML5 DnD to MatchEditor chips and slot targets
- Implement draft in-memory state
- Save button calls `updateRound()` and navigates back
- Badge edited rounds in RoundDisplay (`round.source === 'edited'`)
- Add the notice about stale next-round when a played round is edited

### Phase 4 — Touch drag-and-drop (mobile)
- Add `touchstart`/`touchmove`/`touchend` handlers alongside HTML5 DnD
- Implement visual drag clone that follows the finger
- Manual hit-test via `document.elementFromPoint` on `touchend`
- Verify on actual iOS Safari and Android Chrome — this is where mobile-specific issues surface

### Phase 5 — Validation and polish
- Inline save validation with error banner
- Haptic feedback on drop events (`Haptics.light()`) and save (`Haptics.success()`)
- Edge case: what if the organizer removes a player from attendees while looking at an edited round that includes that player? (Player is still in the courts — save would produce a courts set referencing a non-attendee. Detect and surface clearly.)

---

## What Stays Unchanged

- `StorageAdapter` — no interface changes
- `scheduler.js` scoring and history logic — no changes
- `storage.js` schema version — `source` field is backward-compatible, no migration needed for Milestone 7
- Navigation shell and bottom nav bar — no changes
- All other views (`ClubManager`, `MemberEditor`, `SessionSetup`, `Settings`, `Help`) — no changes

---

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| iOS touch DnD | High | HTML5 DnD is unreliable on Safari; must use touch events. Known problem with well-established manual workaround. Plan for this from Phase 4 onward, not as an afterthought. |
| RoundDisplay size | Low | Already ~590 lines. Add only buttons and one event delegation case — not sub-view logic. Editor complexity lives in MatchEditor. |
| Stale next-round after played-round edit | Low | Surfaced via a notice rather than auto-regen. No data integrity issue — scheduler re-reads from storage on every call. |
| Non-attendee player in edited courts | Medium | Can occur if attendee list changes after editing. Validate player IDs in `updateRound` or surface on MatchEditor save. |
| Court size validation | Medium | Editor must enforce valid court shapes (not allow empty slots, not allow 3-player standard courts). Implement in Phase 5 save validation. |
