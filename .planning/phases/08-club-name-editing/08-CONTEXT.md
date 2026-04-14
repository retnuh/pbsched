# Phase 8: Club Name Editing — Context

**Gathered:** 2026-04-13
**Status:** Ready for planning
**Source:** discuss-phase

<domain>
## Phase Boundary

Make the club name `<h1>` in MemberEditor tap-to-edit inline. Tapping activates an in-place input; blur or Enter saves; Escape or unchanged blur cancels. No navigation away, no modal/dialog.

This is the first in-place edit pattern in the app — member rename currently uses `prompt()`.

</domain>

<decisions>
## Implementation Decisions

### Tap Affordance
- Show a small pencil icon (✏️) next to the club name, always visible
- Icon signals the name is editable without requiring discovery by tapping

### Input Visual Style
- When editing, replace the `<h1>` with an `<input>` that matches the h1 font size and weight (`text-2xl font-bold`)
- Use a subtle bottom border or underline only — no full border/rounded corners
- Font size must be ≥16px to prevent iOS Safari auto-zoom (CLUB-09 — locked)

### Save / Cancel Behavior (locked by requirements)
- **Blur**: save if the value changed and is non-empty; otherwise see "empty name" rule below
- **Enter**: save
- **Escape**: cancel, restore original name — no save

### Empty Name Handling
- If the user clears the name and blurs (empty input), revert to the previous name and show a brief toast or alert explaining the change was discarded (e.g., "Club name can't be empty")

### Service Layer
- `ClubService.updateClub(id, { name })` already exists and handles persistence to localStorage — no service changes needed

### Claude's Discretion
- Exact toast styling and duration (inline banner, native `alert`, or lightweight custom message)
- Whether the pencil icon uses an emoji, SVG, or Unicode character
- Exact transition between h1 and input (no animation required)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Core Implementation Files
- `src/views/MemberEditor.js` — View to modify; h1 at line 46 is the tap target
- `src/services/club.js` — `ClubService.updateClub` at line 30 handles name persistence

### Requirements
- `.planning/REQUIREMENTS.md` — CLUB-07, CLUB-08, CLUB-09 define the locked acceptance criteria

No external specs — requirements fully captured in decisions above.

</canonical_refs>

<specifics>
## Specific Notes

- Todo "Allow editing the team name" folded into this phase (user confirmed it refers to club name editing)
- The `<h1>` in MemberEditor currently has class `text-2xl font-bold flex-grow truncate` — the inline input should match this styling
- `text-2xl` = 1.5rem = 24px, satisfies the ≥16px iOS Safari requirement

</specifics>

<deferred>
## Deferred Ideas

- Add drag-and-drop match editor with rest bench — separate feature, captured in todo backlog

</deferred>

---

*Phase: 08-club-name-editing*
*Context gathered: 2026-04-13 via discuss-phase*
