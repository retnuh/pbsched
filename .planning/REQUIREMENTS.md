# Requirements: Milestone 7 — Match Editor

**Milestone goal:** Let the organizer manually reassign players between courts and the rest bench before confirming or after a round is played.

---

## Active Requirements

### Editor Access

- [ ] **MEDIT-01**: Organizer can open the match editor from the current proposed (unplayed) round, pre-populated with that round's lineup
- [ ] **MEDIT-02**: Organizer can open the match editor from the most recently played round, pre-populated with that round's lineup

### Drag Interactions

- [ ] **DRAG-01**: Organizer can drag a player chip to an empty court slot
- [ ] **DRAG-02**: Organizer can drag a player chip to an occupied slot, swapping the two
- [ ] **DRAG-03**: Organizer can drag a player chip to the Rest Bench
- [ ] **DRAG-04**: Organizer can drag a player from the Rest Bench to a court slot
- [ ] **DRAG-05**: Organizer can confirm edits to save the match
- [ ] **DRAG-06**: Organizer can cancel edits and return without saving

### Court Management

- [ ] **COURT-01**: Organizer can add an empty court to the editor
- [ ] **COURT-02**: Organizer can remove an empty court from the editor
- [ ] **COURT-03**: On save, empty courts are silently removed

### Validation

- [ ] **VALID-01**: Saving is blocked if any court has exactly 1 player; 0 (empty/removed), 2 (singles), 3 (3-way), and 4 (2v2) are all valid
- [ ] **VALID-02**: Non-attendees cannot be placed on a court slot
- [ ] **VIS-01**: The drop target slot shows a clear visual indicator when a chip is being dragged over it (SortableJS ghostClass/dragClass — verify visually clear on mobile)

### Data & Scheduler Integration

- [ ] **HIST-01**: Confirmed edits on a proposed round update the round's assignments used by the scheduler
- [ ] **HIST-02**: Confirmed edits on a played round update session history with source flagged as 'edited'
- [ ] **HIST-03**: Editing a played round invalidates and regenerates all subsequent unplayed rounds

### Polish

- [ ] **BENCH-01**: Bench chips display each player's sit-out count
- [ ] **BENCH-02**: Haptic feedback fires on successful drop

---

## Future Requirements

- Tap-to-select / tap-to-place fallback interaction (deferred — drag-only in Milestone 7)
- Edited round badge on RoundDisplay (deferred)
- Undo for match editor changes (deferred)
- Edit any played round, not just most recent (deferred — too complex, cascading history rewrites)

## Out of Scope

- Editing rounds other than the current proposed or most recently played — cascading history rewrite complexity
- Tap-to-select interaction — drag-and-drop covers mobile adequately for now
- Score tracking — scheduling only
- Court cap / venue configuration — organizer manages their own venue

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| HIST-01 | Phase 11 | Pending |
| HIST-02 | Phase 11 | Pending |
| HIST-03 | Phase 11 | Pending |
| MEDIT-01 | Phase 12 | Pending |
| MEDIT-02 | Phase 12 | Pending |
| DRAG-01 | Phase 13 | Pending |
| DRAG-02 | Phase 13 | Pending |
| DRAG-03 | Phase 13 | Pending |
| DRAG-04 | Phase 13 | Pending |
| DRAG-05 | Phase 13 | Pending |
| DRAG-06 | Phase 13 | Pending |
| VALID-01 | Phase 13 | Pending |
| VALID-02 | Phase 13 | Pending |
| VIS-01 | Phase 13 | Pending |
| COURT-01 | Phase 14 | Pending |
| COURT-02 | Phase 14 | Pending |
| COURT-03 | Phase 14 | Pending |
| BENCH-01 | Phase 14 | Pending |
| BENCH-02 | Phase 14 | Pending |
