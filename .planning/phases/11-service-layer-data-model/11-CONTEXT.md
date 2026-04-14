# Phase 11: Service Layer & Data Model - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Build `SessionService.updateRound(roundIndex, updatedRound)` and the `source: 'edited'` data field. Pure service layer — no UI. Wire history invalidation so editing a played round atomically deletes subsequent unplayed rounds and regenerates the next one. Covers HIST-01, HIST-02, HIST-03.

</domain>

<decisions>
## Implementation Decisions

### Regeneration Ownership
- **D-01:** `updateRound` on a played round must be atomic — it deletes all subsequent unplayed rounds AND immediately regenerates the next one. The MatchEditor (Phase 12) does not need to call `generateNextRound` separately after save.
- **D-02:** `updateRound` on a proposed (unplayed) round replaces its assignments in place. No subsequent round regeneration needed (there are none).

### source Field Schema
- **D-03:** Minimal: just `round.source = 'edited'` on the played round record. No `editedAt` timestamp or additional metadata. Rounds without the field are implicitly `source: 'generated'` (backward-compatible).
- **D-04:** Rounds regenerated after a played-round edit are NOT marked with any special source field — they are normal generated rounds.

### Test Coverage
- **D-05:** Phase 11 must ship with Vitest tests covering all three success criteria:
  - HIST-01: `updateRound` on a proposed round replaces its assignments; scheduler uses them for subsequent round generation
  - HIST-02: `updateRound` on a played round sets `source: 'edited'` on that round
  - HIST-03: `updateRound` on a played round invalidates and regenerates subsequent unplayed rounds

### Claude's Discretion
- Whether `updateRound` internally delegates to `replaceRound` for the unplayed case or reimplements the logic
- Exact test file location (alongside `session.js` in `src/services/` is the established pattern)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §"Data & Scheduler Integration" — HIST-01, HIST-02, HIST-03 definitions

### Phase Roadmap
- `.planning/ROADMAP.md` §"Phase 11: Service Layer & Data Model" — success criteria and dependencies

### Existing Service
- `src/services/session.js` — SessionService; `replaceRound`, `deleteUnplayedRoundsAfter`, `regenerateRound`, and `generateNextRound` are all building blocks for `updateRound`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `deleteUnplayedRoundsAfter(roundIndex)` — already deletes unplayed rounds after a given index
- `regenerateRound(roundIndex)` — already regenerates a specific unplayed round using played-round history
- `replaceRound(roundIndex, newRound)` — replaces an unplayed round (used by alternatives feature; coexists with `updateRound`)
- `generateNextRound()` — builds history from `session.rounds.filter(r => r.played)`, so played rounds with `source: 'edited'` are included automatically as long as `played: true` is retained

### Established Patterns
- All SessionService methods call `this.updateSession(session)` to persist — `updateRound` should follow the same pattern
- `session.rounds[index].played` is the authoritative flag distinguishing played vs. proposed rounds

### Integration Points
- Phase 12 (MatchEditor) will call `SessionService.updateRound(roundIndex, updatedRound)` as its single save entry point
- No changes to `scheduler.js` or `storage.js` expected in this phase

</code_context>

<specifics>
## Specific Ideas

- No specific references — implementation follows the existing SessionService method patterns

</specifics>

<deferred>
## Deferred Ideas

- `editedAt` timestamp on edited rounds — no requirement references it, no UI to display it
- Marking regenerated-after-edit rounds with a special source flag

### Reviewed Todos (not folded)
- "Allow editing the team name" — completed in Phase 8, stale todo
- "Add scheduling penalties for singles and 3-way solo matches" — completed in Phase 10, stale todo
- "Add tests for player changes preserving played match state" — Phase 9 addressed this; todo appears stale

</deferred>

---

*Phase: 11-service-layer-data-model*
*Context gathered: 2026-04-14*
