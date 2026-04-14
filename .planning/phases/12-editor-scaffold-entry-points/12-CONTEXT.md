# Phase 12: Editor Scaffold & Entry Points — Context

**Gathered:** 2026-04-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Create `MatchEditor.js` view mounted at route `#/edit/:roundIndex`; render a static (non-interactive) court layout pre-populated from the round data; wire "Edit" entry point buttons in `RoundDisplay.js` for both the current proposed round and the most recently played round. Covers MEDIT-01, MEDIT-02.

**Not in Phase 12:** SortableJS drag integration, player chip interactivity, Confirm/Cancel save wiring — those are Phase 13.

</domain>

<decisions>
## Implementation Decisions

### Edit Button Placement — Proposed Round Card (MEDIT-01)
- **D-01:** Move ALL action buttons off the proposed round card header and into a 3-button row at the **bottom of the card** — Alternatives | Edit | Mark Played.
- **D-02:** The proposed round card header becomes label-only: "Round X" with no action buttons.
- **D-03:** This is a RoundDisplay refactor, not just an additive change — the existing "Alternatives" and "Mark Played" buttons move from header to card bottom.

### Edit Button Placement — Most Recently Played Round Card (MEDIT-02)
- **D-04:** Add "Edit" button to the **header** of the most recently played round card, alongside the existing "Undo" button. No structural change to the played round card layout.

### Route & View
- **D-05:** Route: `#/edit/:roundIndex` — add to existing routes object in `router.js`.
- **D-06:** New file: `src/views/MatchEditor.js` — follows the established `mount(el, params)` / `unmount()` pattern.
- **D-07:** Entry point: `navigate('/edit/' + round.index)` from both round card edit buttons.

### Court Zone Layout in Editor
- **D-08:** Courts rendered as 2-column Team A | Team B layout — same visual language as RoundDisplay for familiarity.
- **D-09:** Player names rendered as **pill chips** (rounded badge style) — blue for Team A, orange for Team B. This signals interactivity and sets up Phase 13 SortableJS drop zones.
- **D-10:** Each court is labeled "Court N" (same as RoundDisplay).

### Rest Bench
- **D-11:** Rest Bench rendered as a **scrollable section below the last court**, visually distinct from court cards (gray/neutral background zone, not a white card).
- **D-12:** Sitting-out players rendered as pill chips in the bench zone (same chip style as court chips).
- **D-13:** Bench section header: "Rest Bench" label.

### Back Navigation
- **D-14:** Back button in editor header always navigates to `/active` (not browser history back).
- **D-15:** The session nav item stays highlighted while in the editor — `#/edit/` routes should match the `isSession` condition in the nav active-state logic in `router.js`.

### Claude's Discretion
- Exact button sizing/styling for the 3-button row at card bottom (follow existing button patterns in RoundDisplay)
- Whether the 3-button row uses flex or grid layout
- Pill chip height and padding (must meet ~44px tap target for Phase 13 drag readiness)
- Exact gray shade for Rest Bench background zone

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §"Editor Access" — MEDIT-01, MEDIT-02 definitions

### Phase Roadmap
- `.planning/ROADMAP.md` §"Phase 12: Editor Scaffold & Entry Points" — success criteria

### Existing Views (patterns to follow)
- `src/views/RoundDisplay.js` — round card rendering (proposed + played), navigation patterns, `renderMain()` for the 3-button row refactor target
- `src/views/MemberEditor.js` — example of a sub-view with back navigation to parent

### Router
- `src/router.js` — route registration, nav active-state logic (`isSession` condition to extend for `/edit/` routes), `navigate()` function

### Service
- `src/services/session.js` — `SessionService.getActiveSession()` and round data shape; `updateRound` (Phase 13's save entry point — read for data model reference only)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `navigate(path)` from `router.js` — use for both the Edit button and the Back button
- `getPlayerName(id)` pattern in RoundDisplay — replicate in MatchEditor
- `Haptics.light()` — import for Edit button tap

### Established Patterns
- All views: `export function mount(el, params)` + `export function unmount() {}`
- Router params: `params.roundIndex` will be a string — parseInt before use
- Nav active state: extend the `isSession` condition in `initRouter` to include `hash.startsWith('#/edit')`

### Integration Points
- `router.js`: add `'/edit/:roundIndex': MatchEditor` to the `routes` object
- `RoundDisplay.js` `renderMain()`: refactor proposed round card header (remove buttons) + add 3-button row at card bottom; add Edit button to last-played round header
- Round data shape: `round.courts[i].teamA[]`, `round.courts[i].teamB[]`, `round.sittingOut[]` — all player IDs resolved via `getPlayerName`

### No New Dependencies
- Phase 12 is static HTML/CSS only — no SortableJS, no new npm packages

</code_context>

<specifics>
## Specific Notes

- The proposed round card button refactor (D-01 through D-03) is intentional scope — the organizer needs to see Edit as a peer action alongside the other round actions, not an afterthought.
- Pill chips must be large enough for touch — aim for ~44px height to prepare for Phase 13 drag handles.

</specifics>

<deferred>
## Deferred Ideas

- Whether RoundDisplay should also use pill chip styling for player names (consistency question raised but not decided — deferred; plain text stays in RoundDisplay for now, pills are editor-only to signal interactivity)
- Confirm/Cancel buttons in the editor — Phase 13
- Chip drag handles — Phase 13
- "Edited" badge on round cards — Future milestone requirement

### Reviewed Todos (not folded)
- "Allow editing the team name" — completed in Phase 8, stale todo
- "Add scheduling penalties for singles and 3-way solo matches" — completed in Phase 10, stale todo
- "Add tests for player changes preserving played match state" — Phase 9 addressed this, stale todo
- "Identify test coverage gaps and fill them for backend and UI" — relevant but not Phase 12 scope

</deferred>

---

*Phase: 12-editor-scaffold-entry-points*
*Context gathered: 2026-04-14*
