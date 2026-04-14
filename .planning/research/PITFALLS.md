# Pitfalls Research — Milestone 7: Drag-and-Drop Match Editor

**Domain:** Adding touch drag-and-drop and a played-round editor to an existing Vanilla JS mobile PWA with scheduler history
**Researched:** 2026-04-14
**Confidence:** HIGH for touch event mechanics and iOS quirks (well-documented); HIGH for scheduler mutation risks (codebase inspected directly); MEDIUM for UX patterns (heuristic + research)

---

## Critical Pitfalls

Mistakes that require rewrites or silently corrupt scheduler history.

---

### Pitfall 1: Mutating a played round object in-place corrupts the reference used by `buildPairHistory`

**What goes wrong:**
`buildPairHistory(playedRounds)` in `scheduler.js` iterates over `playedRounds` and reads `round.courts`, `round.sittingOut`, and the team arrays within each court. If the match editor edits a round by mutating the objects directly (e.g., `round.courts[0].teamA.push(player)` or `round.sittingOut.splice(idx, 1)`) rather than building a new round object, those mutations propagate silently. The in-memory state diverges from localStorage (until the next `setItem` call). If the user navigates away without saving, the in-memory object is corrupted and future round generation scores against wrong history.

**Why it happens:**
`StorageAdapter.get('sessions')` returns `JSON.parse(localStorage.getItem(...))` — a deep copy at the moment of the call. But the `session` object passed into view functions is held by reference in a closure. Any `session.rounds[idx]` access returns a live reference into that object. The existing `SessionService` methods (`markRoundPlayed`, `markRoundUnplayed`) do direct property assignment on this live object (e.g., `session.rounds[roundIndex].played = true`), which is a pattern the codebase already uses for small flag mutations. Extending this pattern to court/team reassignment is dangerous because the data is structural, not a boolean flag.

**Consequences:**
- Future rounds are generated against wrong pair history — same partners repeatedly, skewed sit-out counts
- The bug is silent: no error thrown, scheduling just degrades in fairness
- If the user edits and saves, the wrong data is persisted; undoing it is impossible without a full session reset

**Prevention:**
Build a complete replacement round object before writing. Never mutate arrays inside `round.courts` or `round.sittingOut` directly. Use a factory pattern:

```js
// BAD — mutates the live reference
session.rounds[idx].courts[0].teamA.push(player);

// GOOD — construct replacement, then write atomically
const updatedRound = buildEditedRound(session.rounds[idx], edits);
SessionService.replaceRound(idx, updatedRound); // writes via StorageAdapter
```

Add a `SessionService.replaceRound(roundIndex, newRoundObject)` method that:
1. Validates the new round is structurally valid (all players accounted for, no duplicates)
2. Deep-copies the new round before writing (defensive against future callers)
3. Calls `StorageAdapter.set(...)` atomically

**Detection:**
- Match editor that calls array methods directly on `round.courts[n].teamA` or `round.sittingOut`
- Any save path that does not go through `StorageAdapter.set`
- Absence of a structural validation step before writing a modified played round

---

### Pitfall 2: Editing a played round must invalidate all unplayed rounds that follow it

**What goes wrong:**
The scheduler generates future rounds based on the pair history of all played rounds. If a played round is edited and saved, any already-generated (but not yet played) rounds are now stale — they were scored against the pre-edit history. The organizer sees a proposed round that may now pair people who were just re-assigned together. Nothing in the current codebase automatically detects this. `SessionService.regenerateRound` exists, but is only called for the single latest unplayed round after an attendee change.

**Why it happens:**
The current architecture treats played rounds as immutable. `deleteUnplayedRoundsAfter(idx)` exists for the attendee-change flow but is not connected to any match-editing flow. The edit-played-round feature bypasses this assumption entirely.

**Consequences:**
- Proposed rounds immediately after an edited played round have incorrect pair/opponent history
- If the organizer edits round 3 of 8 (where rounds 4-5 are played and 6-8 are proposed), there is no clear answer about what to regenerate — this is a complex edge case

**Prevention:**
Define a clear policy upfront and enforce it mechanically:

- **Simpler policy (recommended):** Editing a played round deletes all unplayed rounds after it. After saving the edit, the scheduler regenerates from scratch for the remaining unplayed slots. Show the organizer a confirmation: "Editing this round will regenerate the X upcoming rounds."
- **Harder policy (avoid for v1):** Editing a played round regenerates only the immediately next unplayed round. This is architecturally complex because intermediate played rounds between the edit and the unplayed round create a partial history problem.

Implement the simpler policy: call `deleteUnplayedRoundsAfter(editedRoundIndex)` then `generateRounds(...)` in `SessionService.saveEditedRound(...)`.

**Detection:**
- No call to `deleteUnplayedRoundsAfter` in the save path of the match editor
- Unplayed rounds remaining after a played round edit, showing stale matchups
- No test that edits a played round and checks unplayed rounds were regenerated

---

### Pitfall 3: `elementFromPoint` returns the dragged chip itself during touchmove, blocking drop target detection

**What goes wrong:**
The canonical touch drag-and-drop implementation uses `document.elementFromPoint(touch.clientX, touch.clientY)` inside `touchmove` to identify which drop zone the finger is hovering over. The problem: if the dragged chip element is following the finger (positioned absolutely under the finger), `elementFromPoint` returns the chip itself, not the drop zone beneath it. Drop zone highlighting never triggers. The drop registers nowhere.

**Why it happens:**
`elementFromPoint` returns the topmost visible element at the given coordinates. The dragged ghost/clone is rendered on top of the drop zone during the drag, so it wins the hit test. This is the most common implementation mistake in vanilla JS touch drag-and-drop.

**Consequences:**
- Drag appears to work visually but drops are silently ignored
- No error; the chip just snaps back to its origin

**Prevention:**
During drag, set `pointer-events: none` on the dragged element (or the ghost clone) before calling `elementFromPoint`. Restore it on `touchend`:

```js
// In touchmove handler:
draggingEl.style.pointerEvents = 'none';
const dropTarget = document.elementFromPoint(touch.clientX, touch.clientY)?.closest('[data-drop-zone]');
draggingEl.style.pointerEvents = '';
```

This makes `elementFromPoint` see through the dragged chip to the zone beneath it. This is the standard fix and is well-documented in vanilla JS DnD guides.

**Detection:**
- `elementFromPoint` called while the dragging element is positioned at the touch coordinates without `pointer-events: none`
- Drop zones that never highlight during drag testing

---

### Pitfall 4: iOS Safari scrolls the page during touch drag — scroll and drag conflict is not automatically resolved

**What goes wrong:**
On iOS Safari, `touchmove` events do not prevent page scrolling by default. When the organizer tries to drag a player chip between courts, the page scrolls instead. Even worse: iOS 10+ made touch event listeners passive by default, so calling `e.preventDefault()` inside a passive listener throws a console warning and has no effect.

**Why it happens:**
Browsers default touch listeners to `{ passive: true }` to allow scroll optimization. Passive listeners cannot call `preventDefault()`. Without `preventDefault()` in `touchmove`, the browser's scroll behavior competes with the drag.

**Consequences:**
- Drag is unusable on iOS — the page scrolls instead of the chip moving
- Attempting to fix it by adding a non-passive global `touchmove` listener (the common StackOverflow answer) disables all page scrolling, including the round list — a regression

**Prevention:**
Add the `touchstart` listener on the draggable elements with `{ passive: false }`. In the `touchmove` handler, call `e.preventDefault()` only when a drag is actively in progress:

```js
chipEl.addEventListener('touchstart', onDragStart, { passive: false });

function onTouchMove(e) {
  if (!isDragging) return; // not a drag — let scroll happen
  e.preventDefault(); // suppress scroll only during active drag
  // ... update ghost position
}
document.addEventListener('touchmove', onTouchMove, { passive: false });
```

The key is registering the `touchmove` listener with `{ passive: false }` — it must be set at listener registration time, not in the handler body. Register it on `touchstart` of the chip, remove it on `touchend`.

**Detection:**
- `touchmove` listener registered without `{ passive: false }` option
- `e.preventDefault()` called in a listener that was registered without specifying `passive: false`
- Testing only in Chrome DevTools device mode (which does not accurately simulate iOS scroll behavior)
- No testing on a real iPhone

---

### Pitfall 5: iOS Safari long-press shows native text-selection handles and context menu on player chips

**What goes wrong:**
On iOS Safari, a long-press on any text element triggers the native text selection UI (magnifying glass, selection handles) and a context menu ("Copy", "Look Up", "Share"). This fires before the drag gesture can begin. On player name chips, the long-press is also the intended gesture to initiate drag. The two gestures conflict.

**Why it happens:**
iOS Safari's default text selection and callout behaviors are triggered by `touchstart` + hold, which is the same event sequence used to detect long-press-to-drag. The native behavior intercepts the gesture.

**Consequences:**
- Player chips cannot be dragged — the native iOS callout appears instead
- Users can accidentally copy player names, which is confusing
- Text selection handles appear over the visual court layout

**Prevention:**
Apply CSS to all draggable chip elements and their parents:

```css
.player-chip {
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
}
```

`-webkit-touch-callout: none` suppresses the iOS share/copy callout. `user-select: none` prevents text selection. Both are required — one alone is insufficient. Verify on a real iOS device; Chrome DevTools does not reproduce this behavior.

**Detection:**
- Player chip elements without `-webkit-user-select: none`
- Testing only in browser devtools, not on physical iOS device
- Long-press on a chip during testing — does the iOS callout appear?

---

### Pitfall 6: Accidental drag fires from a tap — no drag threshold causes erratic behavior

**What goes wrong:**
Touch devices have no mouse precision. A tap that moves even 2-3px (normal for a finger) can trigger `touchmove`, which starts a drag unintentionally. This is especially bad for this app: the organizer may tap to confirm a round or scroll through the court layout, inadvertently triggering a drag that moves a player to an unintended position. The drag-and-drop UI is destructive (it reassigns players), so false positives are costly.

**Why it happens:**
Vanilla JS touch drag implementations that start dragging on the first `touchmove` have no minimum movement threshold. A single pixel of finger movement triggers drag mode.

**Consequences:**
- Players randomly reassigned from taps that move slightly
- Organizer frustration; loss of trust in the editor

**Prevention:**
Implement a minimum movement threshold before entering drag mode:

```js
let startX, startY, isDragging = false;
const DRAG_THRESHOLD = 8; // pixels

function onTouchStart(e) {
  startX = e.touches[0].clientX;
  startY = e.touches[0].clientY;
  isDragging = false;
}

function onTouchMove(e) {
  if (!isDragging) {
    const dx = Math.abs(e.touches[0].clientX - startX);
    const dy = Math.abs(e.touches[0].clientY - startY);
    if (dx < DRAG_THRESHOLD && dy < DRAG_THRESHOLD) return; // too small — not a drag
    isDragging = true;
    // begin drag visuals
  }
  e.preventDefault();
  // ... update position
}
```

8px is a common threshold. Do not go below 4px (too sensitive) or above 15px (too sluggish).

**Detection:**
- `touchmove` handler that enters drag mode on first invocation without checking displacement
- No `DRAG_THRESHOLD` constant or equivalent guard

---

## Moderate Pitfalls

---

### Pitfall 7: Player chip dragged onto a slot that already contains a player — no swap logic causes data loss

**What goes wrong:**
Courts have fixed slots (e.g., Team A slot 1, Team A slot 2). If the organizer drags Player X onto a slot already occupied by Player Y, and the implementation simply places X there without handling Y, Player Y disappears from the round. The round now has 3 players instead of 4 for that court.

**Consequences:**
- Invalid round state: court with wrong player count
- `buildPairHistory` iterating this round will produce wrong pair counts
- The bug persists in saved history

**Prevention:**
Implement slot-to-slot swap semantics, not slot replacement:
- When chip A is dropped onto a slot containing chip B, swap them: A goes to B's slot, B goes to A's slot
- When chip A is dropped onto an empty slot (e.g., the rest bench has empty positions), simply move A
- Enforce player count invariants before allowing any save: every player in the session must appear exactly once across all courts and the rest bench

Add a validation function called before every save:

```js
function validateRoundEdit(editedRound, sessionAttendees) {
  const allPlayers = [
    ...editedRound.sittingOut,
    ...editedRound.courts.flatMap(c => [...c.teamA, ...c.teamB])
  ];
  const expected = new Set(sessionAttendees);
  const actual = new Set(allPlayers);
  if (allPlayers.length !== sessionAttendees.length) return false; // duplicate or missing
  for (const p of expected) { if (!actual.has(p)) return false; }
  return true;
}
```

**Detection:**
- Drop handler that sets slot content without checking if the destination is occupied
- No player-count validation before save
- Testing: drag a player onto a slot containing another player — does the count stay correct?

---

### Pitfall 8: The rest bench is visually ambiguous — organizer does not know how many players should be sitting out

**What goes wrong:**
The rest bench is a free-form drop zone. Dragging too many players there is easy (any number can sit out), but the scheduler expects a specific number of bench players based on the odd-player count for the session. If the organizer puts 3 players on the bench but the session has an odd count of 1, the court layout becomes invalid — courts will be short.

**Why it happens:**
The visual design constraint "drop wherever you like" does not encode the numeric constraint from session math. The organizer has no feedback when they have created an invalid distribution.

**Prevention:**
- Show the expected bench count prominently in the rest bench header: "Rest bench (1 player should sit out)"
- Use a visual indicator (red badge or warning text) when the actual bench count does not match the expected count
- Do not disable saving when the count is wrong — the organizer may have intentional reasons. But show a clear warning before saving: "You have 2 players sitting out but only 1 is expected. Courts may be uneven."
- Enforce the structural invariant (all players accounted for) but allow flexible bench counts since the scheduler supports multiple odd-player strategies

**Detection:**
- Rest bench with no count indicator or validation feedback
- Save allowed with no warning when bench count mismatches session odd-player math

---

### Pitfall 9: Ghost/clone element position is offset from the touch point — chip feels sticky or misaligned

**What goes wrong:**
When cloning the chip to follow the finger, the clone's position is calculated as `touchX - chipWidth/2, touchY - chipHeight/2` to center it under the finger. But if the touch started at the edge of the chip (not the center), the clone jumps to be centered on the touch point rather than staying at the touch offset. The chip appears to "teleport" at drag start.

**Why it happens:**
Using a centering formula instead of capturing the offset between touch point and chip's top-left at drag start.

**Prevention:**
Capture the offset at `touchstart`:

```js
function onTouchStart(e) {
  const rect = e.currentTarget.getBoundingClientRect();
  dragOffsetX = e.touches[0].clientX - rect.left;
  dragOffsetY = e.touches[0].clientY - rect.top;
}

function onTouchMove(e) {
  ghost.style.left = (e.touches[0].clientX - dragOffsetX) + 'px';
  ghost.style.top  = (e.touches[0].clientY - dragOffsetY) + 'px';
}
```

The ghost follows the finger from exactly where the finger first touched the chip.

**Detection:**
- Ghost element positioned with centering formula rather than captured offset
- Visual test: tap the edge of a chip and drag — does the chip stay under the finger without jumping?

---

### Pitfall 10: HTML5 Drag-and-Drop API is not reliable for touch on iOS Safari — attempting to use it will break mobile

**What goes wrong:**
The native HTML `draggable="true"` + `dragstart`/`dragover`/`drop` API does not fire for touch events on iOS Safari (as of iOS 17/18). Developers who build with the HTML5 DnD API and test on desktop will ship a feature that is completely non-functional on iPhone.

**Why it happens:**
Apple has not implemented touch-to-drag-event mapping in Mobile Safari. The HTML5 DnD spec requires a pointer device; Safari does not synthesize drag events from touch.

**Consequences:**
- The match editor works on desktop Chrome but is completely broken on the organizer's phone — the primary device

**Prevention:**
Do not use the HTML5 DnD API (`draggable`, `dragstart`, `dragover`, `drop`) for this feature. Build entirely on `touchstart` / `touchmove` / `touchend`. The app is mobile-first; desktop is secondary. The touch implementation will work on desktop too (via mouse polyfill if needed), but the reverse is not true.

**Detection:**
- Any `element.setAttribute('draggable', 'true')` in the match editor code
- Any `dragstart`, `dragover`, or `drop` event listeners in the match editor
- Testing only on desktop Chrome — always test on a real iPhone before shipping

---

### Pitfall 11: Stale closure over `session.rounds` causes the editor to operate on an outdated snapshot

**What goes wrong:**
The match editor renders with a captured `session` object. If the editor stays open while another async operation runs (unlikely in this app but possible if the organizer backgrounded the browser and the PWA service worker updated state), the `session.rounds` array the editor is modifying is stale. The save overwrites fresh data with old data.

**Why it happens:**
The existing architecture captures `const session = SessionService.getActiveSession()` once at view render time. All subsequent operations close over this object. This is safe for read-only views. An editor that writes back through this reference can silently overwrite concurrent changes.

**Prevention:**
In `SessionService.saveEditedRound(roundIndex, newRound)`:
1. Re-fetch the session from storage at the moment of save (not from the cached closure)
2. Verify the round at `roundIndex` still has the same `played` status as when editing began
3. If the status changed (e.g., someone marked it unplayed while the editor was open — impossible in this single-user app, but defensive coding is cheap), abort the save with a notice

For this single-organizer, no-server app, the risk is low. The prevention cost is one extra `StorageAdapter.get()` call in the save path. Worth it.

**Detection:**
- `SessionService.saveEditedRound` that reads `session` from a closure parameter rather than re-fetching from storage
- No check that the round's `played` flag is still consistent before writing

---

## Minor Pitfalls

---

### Pitfall 12: Dropping a player back on their original slot should be a no-op, but may trigger a save

**What goes wrong:**
If the organizer picks up a chip and drops it back in its original position (changed their mind), the editor may treat this as a modification and show the "save" state as active, or worse, write an identical round back to storage triggering downstream processing (round invalidation, unplayed round deletion).

**Prevention:**
Before marking the editor as "dirty" (unsaved changes), compare the current in-editor assignment to the original snapshot. If identical, stay in clean state. Also: track a `hasChanges` boolean that gates the save path — only call `SessionService.saveEditedRound` if `hasChanges === true`.

---

### Pitfall 13: The match editor for an unplayed round and the match editor for a played round have subtly different semantics — one UI for both creates confusion

**What goes wrong:**
Editing an *unplayed* round: low stakes, the round is a proposal, no history is affected by the edit itself (only by confirming/playing it). Editing a *played* round: high stakes, scheduler history is rewritten, unplayed rounds are invalidated. Using the same visual component for both without communicating this difference causes the organizer to make destructive edits thinking they are making harmless adjustments.

**Prevention:**
- Show a warning banner when editing a played round: "Editing a played round will update match history and regenerate upcoming rounds."
- Use a different visual treatment (e.g., amber/yellow border or header) for the played-round editor vs. the proposed-round editor
- Require an extra confirmation tap to save a played round edit (not just the unplayed round edit)

**Detection:**
- Single edit component with no differentiation between played and unplayed round context
- No warning shown when entering played-round edit mode

---

### Pitfall 14: Android Chrome behavior differs from iOS Safari for touch drag — test both

**What goes wrong:**
The passive listener fix (`{ passive: false }`), the long-press callout suppression (`-webkit-touch-callout`), and the text selection suppression (`-webkit-user-select`) are all webkit-prefixed. On Android Chrome (Blink engine), some of these behave differently or are already standard (no prefix needed). An implementation tuned only for iOS may have residual issues on Android.

**Key differences:**
- Android Chrome does not show a long-press callout on arbitrary elements the way iOS does (only on links and images)
- `touch-action: none` is supported on Chrome/Android but not on iOS Safari — it is an alternative to `passive: false` but not a substitute on iOS
- Android Chrome's scroll performance degrades more noticeably when passive listeners are suppressed globally

**Prevention:**
Test on both platforms. Use `user-select: none` (unprefixed) as the primary selector and add `-webkit-user-select: none` as a companion. Use `{ passive: false }` on drag-specific listeners (not globally). Avoid `touch-action: none` as a sole solution since it does not work on iOS.

---

### Pitfall 15: Court layout renders poorly on small screens when chips are too large to fit in drop slots

**What goes wrong:**
Player name chips on a visual court layout must be large enough to tap and drag (minimum 44px height per Apple HIG). A court with 2 players per side needs 4 chips arranged in a 2x2 grid. On an iPhone SE (375px wide), with court padding and borders, the available width per slot is ~80px. Long player names overflow or truncate awkwardly.

**Prevention:**
- Truncate long names with `text-overflow: ellipsis` and `overflow: hidden` on chip elements
- Show the full name in a tooltip on long-press (or accept truncation — organizers know their players)
- Design the court grid with `flex-wrap` and minimum slot sizes, test on 375px viewport width
- Do not rely on the chip being readable during drag — the ghost element can show a truncated name

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Touch event setup | iOS scroll conflict with drag gesture | `{ passive: false }` on drag-specific touchmove listeners; `preventDefault()` only when `isDragging === true` |
| Drop zone detection | `elementFromPoint` returns dragged chip | Set `pointer-events: none` on ghost before calling `elementFromPoint` |
| iOS text selection | Long-press shows native callout | `-webkit-user-select: none` + `-webkit-touch-callout: none` on all chip elements |
| Drag threshold | Taps accidentally trigger drag | 8px minimum displacement before entering drag mode |
| Slot swap logic | Dropping onto occupied slot loses a player | Swap semantics required; validate player count before save |
| Saving played round | Unplayed rounds remain stale after history rewrite | Call `deleteUnplayedRoundsAfter(editedIdx)` and regenerate in save path |
| Round object mutation | In-place array mutation corrupts history | Construct full replacement round; never mutate `round.courts` directly |
| HTML5 DnD API | Feature works on desktop but not iPhone | Use touch events only; never use `draggable` attribute |
| Played vs. unplayed editor | Organizer doesn't understand stakes of editing history | Different visual treatment + confirmation for played round edits |
| Android/iOS parity | webkit-only fixes miss Android | Test on both platforms; use unprefixed CSS properties with webkit fallbacks |
| Rest bench validation | Invalid bench count not caught until scheduler fails | Show expected vs. actual bench count; warn before saving if mismatched |

---

*Pitfalls research for: Milestone 7 — Drag-and-Drop Match Editor*
*Researched: 2026-04-14*
