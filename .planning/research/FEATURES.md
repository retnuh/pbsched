# Feature Landscape: Match Editor Drag-and-Drop

**Domain:** Pickleball practice scheduler — mobile-first PWA, vanilla JS, localStorage only
**Milestone:** 7 — Match Editor (drag-and-drop player chips)
**Researched:** 2026-04-14
**Overall confidence:** HIGH for interaction patterns; MEDIUM for precise touch API tradeoffs

---

## Table Stakes

Features the organizer will expect to be present and working before the editor feels usable. Missing any of these makes the feature feel half-baked.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Draggable player chips | The entire premise of the feature | Medium | Pointer Events API; `touch-action: none` on chips required |
| Named court slots as drop targets | Players must have somewhere to land | Low | Static grid; slot accepts one player chip |
| Rest Bench as a named drop target | Replaces current separate sit-out flow | Low | Bench can hold multiple chips; no slot-count constraint |
| Ghost placeholder at origin | Reassures user where the chip came from | Low | CSS opacity reduction on the original while dragging |
| Drag preview chip under finger | Confirms the chip is being moved | Low | Cloned chip that follows pointer; `position: fixed` |
| Visual "ready" state on valid drop zones | Guides where a chip can land | Low | Border highlight or background color change on hover/proximity |
| Drop snaps chip into slot | Chip lands cleanly at destination; no float | Low | On `pointerup`, remove clone, insert chip into target |
| Swap behavior when slot is occupied | Dropping on a full slot displaces the existing chip to origin slot | Medium | Two-phase: eject occupant to origin, insert dragged chip |
| Confirm / Save button | Committing edits must be an explicit action | Low | Sticky bottom bar, disabled until at least one change is made |
| Discard / Cancel button | Organizer must be able to bail without side effects | Low | Returns to the original round state; resets all in-memory edits |
| Works on mobile touch (iOS + Android) | Entire audience uses mobile | Medium | Pointer Events API handles both; test on real device |
| Haptic feedback on grab and on drop | Already established in the app for all interactions | Low | `Haptics.light()` on grab; `Haptics.success()` on successful drop |
| Accessible from proposed (unplayed) round | Primary use case — tweak before playing | Low | "Edit" button on current unplayed round card |
| Edits update the session's round object | Core purpose; scheduler uses history | Medium | Mutate a draft copy in memory; persist only on Confirm |

## Differentiators

Features that would improve the experience beyond the basic expectation. Worth building if complexity is low; defer if not.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Accessible from most-recently-played round | Allows correcting a mistake after marking played | Medium | Edits to played rounds must write back to `session.rounds[idx]` so scheduler history updates. Guarded: only the last played round is editable. |
| "Modified" indicator on the editor | Shows the organizer they have unsaved changes | Low | A visible "unsaved" badge or button state change |
| Tap-to-select / tap-to-place fallback | Safer alternative for thumb-cramped small screens; also an accessibility escape hatch | Medium | Tap a chip to select it (ring highlight), then tap an empty slot or another chip to swap. No drag required. Lowers the interaction bar significantly. |
| Constraint indicator on invalid slots | Visual "no" indicator if a slot is already full and swaps aren't allowed | Low | Red border flash on target; chip snaps back to origin |
| Sit-out count badge on bench chips | Reminds organizer who has sat out most — aids fair manual editing | Low | Leverage existing sit-count logic from `renderSitterPicker` in RoundDisplay.js |
| Auto-validate court counts before confirm | Prevent confirming an invalid state (e.g., a court with 1 player on one side) | Medium | Check that each court still has a legal configuration; surface inline error message |

## Anti-Features

Features to explicitly NOT build in this milestone.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Full undo/redo history stack | Disproportionate complexity for a modal editor | Single-step discard: tap Cancel to restore the original state |
| Drag-to-reorder courts | Courts are not ordered in any meaningful way in pickleball practice | Keep courts in their generated order; no court reordering |
| Multi-select drag (grab multiple chips at once) | Very complex on touch; no use case with 4-player courts | One chip at a time; the group is small enough |
| Keyboard shortcuts or desktop-first DnD | This app runs on an organizer's phone; desktop is not the target | Pointer Events (covers mouse too) but don't optimize for it |
| Live score update on edit | Score tracking is explicitly out of scope in PROJECT.md | No score integration |
| Edit history visible in the UI | Prior rounds are shown as read-only; history editing is a power feature | Only the most-recently-played round is editable, and that's already a differentiator |
| Scroll-while-dragging (auto-scroll) | Not needed; the editor is a focused modal or sub-view with a small court grid that fits one screen | Keep the editor layout compact enough to avoid needing it |

---

## Feature Dependencies

```
Drag grab → Ghost preview + origin placeholder (must appear simultaneously)
Ghost preview → Pointer tracking (pointerMove updates ghost position)
Drop on occupied slot → Swap behavior (eject occupant first, then place)
Drop on bench → No slot constraint (bench accepts N chips)
Confirm → Write draft state to session.rounds[idx] → SessionService.updateSession()
Confirm (played round) → session.rounds[idx].played stays true; courts/sittingOut mutated
Cancel → Discard draft; show original round data
Sit-out count badge → session.rounds[0..lastPlayedIdx].sittingOut (computed at editor open)
Auto-validate → Run before enabling Confirm button
```

---

## Interaction Model: Recommended Approach

### Primary: Pointer Events API drag-and-drop

Use `pointerdown`, `pointermove`, `pointerup` on the chip elements, not the HTML Drag and Drop API and not the legacy `touchstart`/`touchmove` pair.

**Why Pointer Events:**
- Unified API covering finger, stylus, and mouse with one code path (HIGH confidence — MDN, W3C spec)
- No need for dual mouse/touch handlers
- `touch-action: none` on draggable chips prevents the browser from claiming the pointer for scrolling — critical for drag-to-not-scroll correctness
- Supported in all modern browsers including iOS Safari 13+ (HIGH confidence — MDN compatibility data)

**Why not HTML Drag and Drop API:**
- The `dragstart`/`drop` API does not fire on touch devices natively. Every production implementation that needs mobile either uses a polyfill (`drag-drop-touch`) or abandons the API in favor of Pointer Events. The polyfill adds 5 KB of untestable glue code; Pointer Events avoids it entirely.

**Why not `touchstart`/`touchmove`:**
- Redundant when Pointer Events are available. Adds a second code path that must be maintained in sync.

### Secondary: Tap-to-Select / Tap-to-Place (recommended addition)

For users who find a sustained drag difficult on a small screen — or when the screen is crowded — a tap-based fallback works as follows:

1. Tap a chip → chip receives `selected` class (visible ring); editor enters selection mode
2. Tap any drop target (slot or bench) → chip moves to target; if occupied, chips swap
3. Tap the selected chip again → deselects (cancel the move)

This is the same interaction model used by Yahoo Fantasy's "Swap Mode" and ESPN's tap-based lineup editor on mobile (MEDIUM confidence — from Yahoo Help and ESPN support docs). It requires no pointer tracking and has zero scroll conflict risk.

**Recommendation:** Build drag first. Add tap-to-select as a fallback in the same phase if complexity allows — it reuses all the same slot/swap logic.

---

## State Machine for the Editor

The editor operates with a simple draft model:

```
Open editor
  → Copy current round to draftRound (deep clone)
  → All mutations operate on draftRound

Drag/tap interaction
  → Mutate draftRound.courts + draftRound.sittingOut
  → Re-render chip positions from draftRound

Confirm
  → Validate draftRound
  → Write draftRound into session.rounds[roundIndex]
  → If round.played === true: SessionService.updateSession() (persist history mutation)
  → If round.played === false: treat as a replaceRound equivalent
  → Navigate back / close editor

Cancel
  → Discard draftRound
  → Navigate back / close editor (no session write)
```

This model means the editor never touches live session state until Confirm is tapped. Cancel is always safe.

---

## Edge Cases and Validity Rules

These are the cases the editor must handle correctly. Missing any will produce corrupted scheduler history.

| Scenario | Expected Behavior |
|----------|------------------|
| Drop chip onto its own origin slot | No-op; no visual change |
| Drop chip onto an occupied slot | Swap: origin slot gets displaced chip; target slot gets dragged chip |
| Drag chip from bench to court slot | Move chip; court slot is filled; bench shrinks by one |
| Drag chip from court slot to bench | Move chip; bench grows by one; court slot becomes empty |
| Court slot becomes empty after drag | Slot visually shows as empty (placeholder); Confirm button checks validity |
| All bench chips dragged to courts | Bench shows "No one sitting out" empty state |
| All active players dragged to bench | Should be preventable or produce a validation error on Confirm: can't confirm with no courts |
| Confirm with a court that has 0 players on one side | Validation error before write: "Court 2 is missing players." Confirm remains disabled or shows error toast |
| Confirm with a court that has 3 players on one side | Same validation — invalid court shape |
| Edit a played round | `round.played` stays `true`; only `courts` and `sittingOut` are mutated; scheduler history is updated |
| Pointer cancelled mid-drag (e.g. phone call, notification) | `pointercancel` event fires; snap chip back to origin cleanly |
| Long press before drag (iOS delay) | Not needed: Pointer Events fires `pointerdown` immediately, no hold required |
| Scroll conflict on mobile | `touch-action: none` on chip elements prevents browser claiming the drag as a scroll |

---

## Dependencies on Existing Code

| Existing Feature | How the Editor Uses It |
|-----------------|----------------------|
| `session.rounds[idx].courts` | Read to populate initial chip positions; written back on Confirm |
| `session.rounds[idx].sittingOut` | Read to populate Bench initial state; written back on Confirm |
| `session.rounds[idx].played` | Determines whether Confirm writes to played history vs. unplayed proposal |
| `SessionService.updateSession()` | Called on Confirm to persist the mutated session |
| `SessionService.replaceRound()` | Existing method; Confirm on an unplayed round can call this instead of direct mutation |
| `getPlayerName(id)` | Chip labels; already implemented in `RoundDisplay.js` |
| `Haptics.light()` / `Haptics.success()` | Grab and drop feedback; service already exists |
| `session.rounds` sit-out counts | For bench chip badges; computed the same way as `renderSitterPicker` |
| Scheduler history (`playedRounds`) | After Confirm on a played round, the next `generateNextRound()` will use the edited history automatically — no extra work needed |

No changes to `scheduler.js` or `SessionService` business logic are expected. The editor is a new view that reads existing data structures and writes back to them through existing persistence methods.

---

## MVP Recommendation

Build in this order within the milestone:

1. Editor UI scaffold: open from "Edit" button on current unplayed round, shows chips in court slots + bench, has Confirm/Cancel buttons (no drag yet)
2. Drag-and-drop with Pointer Events: grab, ghost, drop onto empty slot, drop onto occupied slot (swap), drop onto bench
3. Confirm writes draft to session; Cancel discards; validate before Confirm
4. Accessibility from most-recently-played round (edit played history)
5. Tap-to-select fallback (if complexity allows within the milestone)

**Defer:**
- Sit-out count badges on bench chips: useful but not critical; the organizer knows who has sat out
- Auto-validation UI beyond a simple Confirm-disabled state: inline error messages can wait

---

## Sources

- [Smart Interface Design Patterns — Drag-and-Drop UX](https://smart-interface-design-patterns.com/articles/drag-and-drop-ux/) — visual feedback states, ghost/placeholder patterns, undo approach
- [MDN — Using Pointer Events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events/Using_Pointer_Events) — unified API, `touch-action` requirement
- [MDN — Pointer Events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events) — browser support confirmation
- [Bricx Labs — 15 Drag and Drop UI Tips 2025](https://bricxlabs.com/blogs/drag-and-drop-ui) — 44px touch targets, timing thresholds, undo stacks, haptic timing
- [Pencil & Paper — Drag & Drop UX Best Practices](https://www.pencilandpaper.io/articles/ux-pattern-drag-and-drop) — ghost state, lifted state, drop zone states
- [LogRocket — Designing drag and drop UIs](https://blog.logrocket.com/ux-design/drag-and-drop-ui-examples/) — invalid drop handling, constraint enforcement
- [Contentsquare Engineering — Click and Swap](https://engineering.contentsquare.com/2021/click-and-swap-alternative-to-drag-and-drop/) — tap-to-select/place as alternative pattern
- [Yahoo Fantasy Help — Edit Lineup](https://help.yahoo.com/kb/SLN26796.html) — tap-based mobile lineup swap pattern
- [ESPN Fantasy — Setting Your Lineup](https://support.espn.com/hc/en-us/articles/360000958652-Setting-Your-Lineup) — tap-position swap on mobile
- [Cloudscape Design System — Drag and Drop](https://cloudscape.design/patterns/general/drag-and-drop/) — constraint enforcement, conditional restrictions
- [drag-drop-touch-js polyfill](https://github.com/drag-drop-touch-js/dragdroptouch) — confirms HTML DnD API doesn't work natively on touch; Pointer Events avoids this entirely
