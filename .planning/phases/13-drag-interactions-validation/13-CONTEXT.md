# Phase 13: Drag Interactions & Validation — Context

**Gathered:** 2026-04-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Make the static MatchEditor interactive: add SortableJS drag-and-drop so the organizer can freely move player chips between court slots and the Rest Bench, then confirm or cancel. Covers DRAG-01 through DRAG-06, VALID-01, VALID-02, VIS-01.

**Not in Phase 13:** Add/remove courts, empty-court pruning on save, sit-out count badges on bench chips, haptic feedback on drop — those are Phase 14.

</domain>

<decisions>
## Implementation Decisions

### Swap Behavior (DRAG-02)
- **D-01:** When a chip is dragged onto an **occupied slot**, the two players **instantly swap** positions. The dragged player takes the target slot; the displaced player moves to the dragged chip's origin slot.
- This is the SortableJS Swap plugin behavior — install `sortablejs` and enable the `Swap` plugin for inter-list swapping.

### Draft State Model
- **D-02:** While editing, maintain an **in-memory draft copy** of the round's court/bench assignments. The original session data is never mutated until Confirm is tapped.
- On Cancel (with changes): show a confirmation dialog — "Discard changes?" — before navigating back. On Cancel (no changes): navigate back silently.
- On Confirm: call `SessionService.updateRound` with the draft state, then navigate to `/active`.

### Validation Feedback (VALID-01, VALID-02)
- **D-03:** Confirm button is **disabled** whenever any court has exactly 1 player.
- **D-04:** Invalid courts get an **inline error indicator** — a red border on the court card and a small label (e.g., "⚠ needs 2+ players") beneath the court header. Error indicator appears/disappears reactively as the organizer drags.
- Courts with 0, 2, 3, or 4 players are valid. Only exactly 1 is invalid.

### Cancel Behavior
- **D-05:** If **no changes** were made (draft matches original): Cancel navigates directly to `/active`.
- **D-06:** If **changes were made**: Cancel shows a native-style confirmation — "Discard changes? Your edits won't be saved." with "Discard" and "Keep editing" options. Tapping "Discard" navigates to `/active`; "Keep editing" dismisses.

### Confirm/Cancel Placement
- **D-07:** Fixed bottom bar, **above the nav bar**, always visible regardless of scroll position.
- Layout: `[Cancel]` left, `[Confirm ✓]` right, full-width bar.
- Confirm button: greyed out and non-interactive when validation fails.
- No separate "save" affordance elsewhere in the view.

### Visual Feedback During Drag (VIS-01)
- **D-08:** The **destination slot** is highlighted during drag (SortableJS `ghostClass` / `chosenClass`). Blue highlight for court slots, neutral for bench.
- Claude's discretion: exact ghost chip styling (opacity, border pulse, etc.).

### SortableJS Setup
- **D-09:** Install `sortablejs` as a production dependency.
- One Sortable list per **zone**: each court's Team A column, each court's Team B column, and the Rest Bench — all in the same SortableJS `group` so chips can move between them.
- Use the **Swap plugin** for chip-on-chip swap behavior (DRAG-02).
- Touch settings: `delay: 150`, `delayOnTouchOnly: true`, `touchStartThreshold: 5` — standard mobile feel.

### Claude's Discretion
- Exact ghost chip CSS (opacity, dashed border, background tint)
- Whether to use a modal dialog or a slide-up sheet for the "Discard changes?" confirmation
- Bottom bar height and button sizing (follow existing bottom nav padding conventions)
- How to detect "changes were made" — shallow comparison of draft vs original round JSON is sufficient

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §"Editor Access" — DRAG-01 through DRAG-06, VALID-01, VALID-02, VIS-01 definitions

### Phase Roadmap
- `.planning/ROADMAP.md` §"Phase 13: Drag Interactions & Validation" — success criteria

### Prior Phase Context
- `.planning/phases/12-editor-scaffold-entry-points/12-CONTEXT.md` — chip styling, layout decisions, entry point wiring

### Existing Implementation (to extend)
- `src/views/MatchEditor.js` — the static view this phase makes interactive; all chip rendering, court layout, bench zone
- `src/router.js` — `navigate()` function; `/edit/:roundIndex` route already registered
- `src/services/session.js` — `SessionService.updateRound(roundIndex, updatedRound)` — the save method Confirm must call

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Chip rendering functions in `MatchEditor.js` (`teamAChip`, `teamBChip`, `benchChip`) — will become SortableJS draggable items
- `navigate('/active')` — Cancel and Confirm both use this after action
- `escapeHTML` from `src/utils/html.js`

### Established Patterns
- `mount(el, params)` / `unmount()` — `unmount` must destroy all SortableJS instances to avoid listener leaks
- `parseInt(params.roundIndex, 10)` — already done in MatchEditor
- Bottom bar: follow the `fixed-safe-bottom` layout pattern used in RoundDisplay's bottom nav spacing (`pb-48` on content)

### Integration Points
- `SessionService.updateRound(roundIndex, updatedRound)` — Confirm calls this with the draft round object
- SortableJS: install via `npm install sortablejs`; import with `import Sortable from 'sortablejs'`

### Not Yet Installed
- `sortablejs` — needs `npm install sortablejs`; no other new dependencies expected

</code_context>

<specifics>
## Specific Notes

- The "Discard changes?" check only fires on Cancel, not on browser back or hash navigation — keep it simple.
- Validation must be reactive: re-run after every drag event (SortableJS `onEnd` callback) and update court error indicators and Confirm button state immediately.
- `unmount()` must call `.destroy()` on every SortableJS instance created during `mount()` — this is important because navigating away and back would otherwise create duplicate listeners.

</specifics>

<deferred>
## Deferred Ideas

- Haptic feedback on successful drop — Phase 14 scope
- Sit-out count badges on bench chips — Phase 14 scope
- Add/remove courts in editor — Phase 14 scope
- Dark mode support — separate todo, not Phase 13 scope
- Test coverage gap audit — separate todo, not Phase 13 scope

### Reviewed Todos (not folded)
- "Add dark mode support" — not Phase 13 scope, remains in backlog
- "Identify test coverage gaps and fill them for backend and UI" — not Phase 13 scope, remains in backlog

</deferred>

---

*Phase: 13-drag-interactions-validation*
*Context gathered: 2026-04-14*
