# Project Roadmap: Pickleball Practice Scheduler

## Milestones

- ✅ **Milestone 6: UX Polish & Scheduler Improvements** — Phases 8-10 (shipped 2026-04-14) → [archive](./milestones/v1.0-ROADMAP.md)
- **Milestone 7: Match Editor** — Phases 11-14 (in progress)

## Phases

<details>
<summary>✅ Milestone 6: UX Polish & Scheduler Improvements (Phases 8-10) — SHIPPED 2026-04-14</summary>

**[Milestones 1-5, Phases 1-7 archived in milestones/v1.0-ROADMAP.md]**

- [x] Phase 8: Club Name Editing (1/1 plans) — completed 2026-04-14
- [x] Phase 9: Player-Change Test Coverage (1/1 plans) — completed 2026-04-14
- [x] Phase 10: Scheduling Penalties for Short-Sided Matches (2/2 plans) — completed 2026-04-14

</details>

### Milestone 7: Match Editor

- [x] **Phase 11: Service Layer & Data Model** — Add `SessionService.updateRound` and the `source: 'edited'` field; wire history invalidation so edited played rounds regenerate subsequent unplayed rounds (completed 2026-04-14)
- [x] **Phase 12: Editor Scaffold & Entry Points** — New `MatchEditor` view + `#/edit/:roundIndex` route; static court layout renders current lineup; entry points from proposed and most recently played rounds (completed 2026-04-14)
- [x] **Phase 13: Drag Interactions & Validation** — SortableJS drag-and-drop (touch-native); player swap, bench drag-in/out, confirm/cancel; save blocked when validation fails (completed 2026-04-14)
- [ ] **Phase 14: Court Management & Polish** — Add/remove courts in editor; empty-court pruning on save; sit-out count badges on bench chips; haptic feedback on successful drop

## Phase Details

### Phase 11: Service Layer & Data Model
**Goal**: The data layer can record, flag, and propagate match editor changes before any UI exists
**Depends on**: Phase 10 (Milestone 6 complete)
**Requirements**: HIST-01, HIST-02, HIST-03
**Success Criteria** (what must be TRUE):
  1. Calling `updateRound` on a proposed round replaces its assignments and the scheduler uses those assignments for subsequent round generation
  2. Calling `updateRound` on a played round writes `source: 'edited'` on that round's record in session history
  3. After editing a played round, all subsequent unplayed rounds are invalidated and regenerated using the updated history
**Plans**: 1 plan

Plans:
- [x] 11-01-PLAN.md — Add SessionService.updateRound with TDD (HIST-01, HIST-02, HIST-03)

### Phase 12: Editor Scaffold & Entry Points
**Goal**: The organizer can open a visual court layout editor from either an unplayed or a most recently played round
**Depends on**: Phase 11
**Requirements**: MEDIT-01, MEDIT-02
**Success Criteria** (what must be TRUE):
  1. Tapping "Edit" on the current proposed round opens the match editor pre-populated with that round's full lineup
  2. Tapping "Edit" on the most recently played round opens the match editor pre-populated with that round's lineup
  3. The editor renders each court as a named zone with player chips in their slots and a Rest Bench area for sitting-out players
  4. The editor is accessible on a phone screen with all player chips readable and tappable
**Plans**: 1 plan

Plans:
- [x] 12-01-PLAN.md — RoundDisplay refactor + MatchEditor view + router wiring (MEDIT-01, MEDIT-02)

### Phase 13: Drag Interactions & Validation
**Goal**: The organizer can freely rearrange players between court slots and the bench, then confirm or cancel
**Depends on**: Phase 12
**Requirements**: DRAG-01, DRAG-02, DRAG-03, DRAG-04, DRAG-05, DRAG-06, VALID-01, VALID-02, VIS-01
**Success Criteria** (what must be TRUE):
  1. Dragging a chip to an empty slot places the player there (including touch on iOS)
  2. Dragging a chip onto an occupied slot swaps the two players
  3. Dragging a chip to the Rest Bench moves the player off the court
  4. Dragging a chip from the Rest Bench onto a court slot places the player there
  5. Tapping Confirm saves the edited lineup; tapping Cancel discards all changes and returns to the previous view
  6. Confirm is disabled (and an error message shown) when any court has exactly one player; courts with 0, 2, 3, or 4 players are accepted
  7. A dragged chip's destination slot is visually highlighted during the drag
**Plans**: 2 plans

Plans:
- [x] 13-01-PLAN.md — Install SortableJS, scaffold test stubs, implement drag zones and draft state (DRAG-01, DRAG-02, DRAG-03, DRAG-04, VIS-01)
- [x] 13-02-PLAN.md — Validation, Confirm, Cancel wiring + human verify checkpoint (DRAG-05, DRAG-06, VALID-01, VALID-02, VIS-01)

### Phase 14: Court Management & Polish
**Goal**: The organizer can add or remove courts inside the editor and receives tactile feedback on each successful drop
**Depends on**: Phase 13
**Requirements**: COURT-01, COURT-02, COURT-03, BENCH-01, BENCH-02
**Success Criteria** (what must be TRUE):
  1. Tapping "Add court" inserts a new empty court zone in the editor
  2. Tapping "Remove" on an empty court deletes that zone from the editor
  3. On save, any courts still empty are silently pruned from the saved round
  4. Each chip on the Rest Bench displays the player's current sit-out count
  5. Dropping a chip onto any valid target fires device haptic feedback
**Plans**: 2 plans

Plans:
- [ ] 14-01-PLAN.md — All MatchEditor.js implementation: add/remove courts, pruning, bench badges, haptics, toast (COURT-01, COURT-02, COURT-03, BENCH-01, BENCH-02)
- [ ] 14-02-PLAN.md — Phase 14 test suite + human verify checkpoint (COURT-01, COURT-02, COURT-03, BENCH-01, BENCH-02)

## Backlog

### Phase 999.1: Court Side Penalty to Encourage Swapping Sides (BACKLOG)

**Goal:** Track which side of the court (teamA/teamB) each player has been on and apply a small penalty (1–2) to discourage always playing the same side
**Requirements:** TBD
**Plans:** 0 plans

Plans:
- [ ] TBD (promote with /gsd-review-backlog when ready)

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 8. Club Name Editing | Milestone 6 | 1/1 | Complete | 2026-04-14 |
| 9. Player-Change Test Coverage | Milestone 6 | 1/1 | Complete | 2026-04-14 |
| 10. Scheduling Penalties for Short-Sided Matches | Milestone 6 | 2/2 | Complete | 2026-04-14 |
| 11. Service Layer & Data Model | Milestone 7 | 1/1 | Complete | 2026-04-14 |
| 12. Editor Scaffold & Entry Points | Milestone 7 | 1/1 | Complete | 2026-04-14 |
| 13. Drag Interactions & Validation | Milestone 7 | 2/2 | Complete   | 2026-04-14 |
| 14. Court Management & Polish | Milestone 7 | 0/2 | Not started | - |
