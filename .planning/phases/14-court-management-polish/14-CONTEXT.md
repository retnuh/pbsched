# Phase 14: Court Management & Polish — Context

**Gathered:** 2026-04-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Extend the MatchEditor with: add/remove court zones, empty-court pruning on save, sit-out count badges on bench chips, and haptic feedback on successful drops. Covers COURT-01, COURT-02, COURT-03, BENCH-01, BENCH-02.

**Not in Phase 14:** Any changes to drag interactions or validation logic (Phase 13 scope).

</domain>

<decisions>
## Implementation Decisions

### Add Court Button (COURT-01)
- **D-01:** "Add court" is a **circle-plus button** placed **below the last court card, above the Rest Bench** — inline in the scroll flow.
- Tapping it appends a new empty court zone to `_draft.courts` and re-renders.
- The circle-plus affordance clearly signals "add" — Claude's discretion on exact sizing and color (follow existing blue/gray palette).

### Remove Court Button (COURT-02)
- **D-02:** The "Remove" button only appears on courts that have **exactly 0 players** (empty courts — teamA.length === 0 && teamB.length === 0).
- It is hidden/absent on any court that still has players in it.
- Tapping it removes that court from `_draft.courts` and re-renders.
- After removal, courts are renumbered dynamically ("Court 1", "Court 2", ...).

### Empty-Court Pruning on Save (COURT-03)
- **D-03:** On Confirm, before calling `SessionService.updateRound`, filter out any court where `teamA.length === 0 && teamB.length === 0` from `_draft.courts`.
- Pruning is silent — no confirmation required.

### Court Limits (Easter Egg)
- **D-04:** Minimum 1 court — the Remove button on the last remaining court is hidden (can't reduce to 0).
- **D-05:** Maximum 55 courts.
  - When the organizer adds court #20 (crossing past 19): show a toast — **"Oooh, more than Wimbledon's Championship courts? Fancy"** — then allow the add.
  - When at 55 courts and the organizer taps Add again: show a toast — **"Can't be better than Wimbledon!"** — and do NOT add a court.
- Toast display: Claude's discretion on implementation (a lightweight ephemeral toast is fine — 2-3 seconds, centered at top or bottom of screen).

### Sit-Out Count Badges on Bench Chips (BENCH-01)
- **D-06:** Each player chip on the Rest Bench displays their **session-wide sit-out count** — total number of rounds they have sat out across all **played** rounds in the session (same calculation as RoundDisplay's `sitCounts`).
- The current draft is NOT included in the count (the round hasn't been saved yet).
- **Display format:** A small numeric badge or subscript on the chip. Claude's discretion on exact styling (e.g., a small gray pill badge showing "2×" or "sat out 2" beneath/beside the player name, consistent with RoundDisplay's `Sat out Nx` pattern).
- Court chips do NOT get a sit-out badge — bench chips only.

### Haptic Feedback on Successful Drop (BENCH-02)
- **D-07:** After every successful drag-end where a player chip lands on a **valid target** (any court slot or bench slot — not an empty-slot placeholder that was rejected), call `Haptics.medium()`.
- "Successful" means the `onEnd` event fired without the move being cancelled. Use the existing `handleDragEnd` function — add `Haptics.medium()` there.
- Already-imported pattern: `import { Haptics } from '../services/haptics.js'` — follow the same pattern.

### Test Coverage (Folded)
- **D-08:** Phase 14 includes tests for:
  - Add court button inserts a new court zone
  - Remove button hidden when court has players; visible when empty
  - Remove button hidden when only 1 court remains
  - Pruning: empty courts are excluded from the saved round on Confirm
  - Sit-out count badge shows correct count from session history (not draft)
  - Court limit guardrails (no add beyond 55, no remove below 1)
- Tests follow the existing `MatchEditor.test.js` pattern.

### Claude's Discretion
- Circle-plus button sizing and color (follow existing button/card patterns)
- Toast implementation (lightweight inline div, ephemeral, no library needed)
- Sit-out badge styling on bench chips (follow `Sat out Nx` pattern from RoundDisplay)
- Whether the Remove button is a small `×` in the court card header or a labeled "Remove" text button
- Whether adding a court appends to the bottom of the court list or inserts before the bench

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — general project constraints
- `.planning/ROADMAP.md` §"Phase 14: Court Management & Polish" — success criteria and requirements list (COURT-01 through BENCH-02)

### Prior Phase Context
- `.planning/phases/13-drag-interactions-validation/13-CONTEXT.md` — draft state model, SortableJS setup, zone naming, validation logic
- `.planning/phases/12-editor-scaffold-entry-points/12-CONTEXT.md` — chip styling, court layout structure

### Existing Implementation (to extend)
- `src/views/MatchEditor.js` — entire editor; all decisions extend this file
- `src/views/RoundDisplay.js` — sit-out count calculation pattern (`sitCounts` via `session.rounds` iteration, lines ~58-63)
- `src/services/haptics.js` — `Haptics.medium()` for drop feedback
- `src/services/session.js` — `SessionService.updateRound(roundIndex, updatedRound)` — Confirm save target
- `src/views/MatchEditor.test.js` — existing test file to extend

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `_draft.courts` — mutable array of `{ teamA: [], teamB: [] }` objects; add/remove courts here
- `reconcileDraftFromDOM(el)` — reads zone IDs back from DOM; must be called after any DOM mutation
- `syncEmptySlots(el)` — keeps empty-slot placeholders in sync; must be called after adding/removing courts
- `validateAndUpdateUI(el)` — updates validation state; call after any structural change
- `initSortables(el)` — creates SortableJS instances per zone; must be re-initialized when courts are added/removed (destroy existing, re-init all)
- `Haptics` — already established in codebase (`light`, `medium`, `success`, `error`)
- `sitCounts` computation in RoundDisplay (lines ~58-63): `session.rounds.forEach(round => round.sittingOut.forEach(id => sitCounts[id] = (sitCounts[id] || 0) + 1))`

### Established Patterns
- Re-render pattern: modify `_draft.courts`, then re-render via `el.innerHTML = ...` + re-init SortableJS (destroy old instances first)
- Toast: no existing pattern — simple ephemeral div, Claude to implement inline
- `mount(el, params)` / `unmount()` — all SortableJS instances in `_sortableInstances` must be destroyed in unmount

### Integration Points
- `handleDragEnd(evt)` — add `Haptics.medium()` call here (after reconcile + sync + validate)
- Confirm handler (`handleConfirm`) — add pruning step before `SessionService.updateRound` call

</code_context>

<specifics>
## Specific Notes

- **Wimbledon Easter Egg:** The thresholds are 19 (warning toast, allow add) and 55 (block toast, no add). These are exact. Court #20 triggers the first toast; court #56 would be blocked.
- **Re-init SortableJS after add/remove:** When a court is added or removed, the existing SortableJS instances must be destroyed (`_sortableInstances.forEach(s => s.destroy()); _sortableInstances = []`) and re-initialized on the new DOM — or use a targeted re-render approach. Either is fine; full re-render is simpler.
- **Sit-out count for bench chips:** Only chips in the `[data-zone="bench"]` zone get badges. The count comes from `session.rounds` (all rounds, not just played — or filter to played if `round.played` exists). Use the same logic as RoundDisplay.
- **Remove button visibility:** After every drag event (in `handleDragEnd`), re-evaluate which Remove buttons are visible. A court that had players dragged out should show Remove; one that had a player dragged in should hide it.
- **Draft mutation on add/remove:** When adding a court, push `{ teamA: [], teamB: [] }` to `_draft.courts`. When removing, splice the matching index from `_draft.courts`. Always sync before and after.

</specifics>

<folded_todos>
## Folded Todos

- **"Identify test coverage gaps and fill them for backend and UI"** — folded in; Phase 14 includes tests for all new features (see D-08).

</folded_todos>

<deferred>
## Deferred Ideas

- Dark mode support — separate todo, not Phase 14 scope
- Update README for non-technical users — separate todo, not this phase

</deferred>

---

*Phase: 14-court-management-polish*
*Context gathered: 2026-04-14*
