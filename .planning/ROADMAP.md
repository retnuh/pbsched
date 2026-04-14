# Project Roadmap: Pickleball Practice Scheduler

## Milestones

- ✅ **Milestone 6: UX Polish & Scheduler Improvements** — Phases 8-10 (shipped 2026-04-14) → [archive](./milestones/v1.0-ROADMAP.md)
- ✅ **Milestone 7: Match Editor** — Phases 11-14 (shipped 2026-04-14)
- **Milestone 8: Polish & Quality** — Phases 15-18 (in progress)

## Phases

<details>
<summary>✅ Milestone 6: UX Polish & Scheduler Improvements (Phases 8-10) — SHIPPED 2026-04-14</summary>

**[Milestones 1-5, Phases 1-7 archived in milestones/v1.0-ROADMAP.md]**

- [x] Phase 8: Club Name Editing (1/1 plans) — completed 2026-04-14
- [x] Phase 9: Player-Change Test Coverage (1/1 plans) — completed 2026-04-14
- [x] Phase 10: Scheduling Penalties for Short-Sided Matches (2/2 plans) — completed 2026-04-14

</details>

<details>
<summary>✅ Milestone 7: Match Editor (Phases 11-14) — SHIPPED 2026-04-14</summary>

- [x] **Phase 11: Service Layer & Data Model** — Add `SessionService.updateRound` and the `source: 'edited'` field; wire history invalidation so edited played rounds regenerate subsequent unplayed rounds (completed 2026-04-14)
- [x] **Phase 12: Editor Scaffold & Entry Points** — New `MatchEditor` view + `#/edit/:roundIndex` route; static court layout renders current lineup; entry points from proposed and most recently played rounds (completed 2026-04-14)
- [x] **Phase 13: Drag Interactions & Validation** — SortableJS drag-and-drop (touch-native); player swap, bench drag-in/out, confirm/cancel; save blocked when validation fails (completed 2026-04-14)
- [x] **Phase 14: Court Management & Polish** — Add/remove courts in editor; empty-court pruning on save; sit-out count badges on bench chips; haptic feedback on successful drop (completed 2026-04-14)

</details>

### Milestone 8: Polish & Quality

- [ ] **Phase 15: Dark Mode Foundation** — Storage v2 migration, ThemeService, FOUC prevention script, @custom-variant CSS line; system-preference detection and theme persistence
- [ ] **Phase 16: Dark Mode Visuals & Toggle** — dark: utilities on all views; zone chip and SortableJS dark overrides; Settings toggle with manual override (light/dark/auto)
- [ ] **Phase 17: Test Coverage** — Install @vitest/coverage-v8; ThemeService tests, storage migration regression test, club.js/html.js unit tests; coverage report via `npm run coverage`
- [ ] **Phase 18: Documentation & Copy** — Help screen rewrite; README rewrite; plain-language copy audit across all views

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
- [x] 14-01-PLAN.md — All MatchEditor.js implementation: add/remove courts, pruning, bench badges, haptics, toast (COURT-01, COURT-02, COURT-03, BENCH-01, BENCH-02)
- [x] 14-02-PLAN.md — Phase 14 test suite + human verify checkpoint (COURT-01, COURT-02, COURT-03, BENCH-01, BENCH-02)

### Phase 15: Dark Mode Foundation
**Goal**: The app detects, stores, and applies the correct theme before any content is visible — no flash, preference persisted
**Depends on**: Phase 14 (Milestone 7 complete)
**Requirements**: DARK-01, DARK-02, DARK-04
**Success Criteria** (what must be TRUE):
  1. On first load with no stored preference, the app matches the device's current dark/light mode setting automatically
  2. Loading the app produces no white flash — the correct background color is applied before the first paint
  3. After the organizer changes the theme, reloading the app applies the same theme without any flash or flicker
  4. ThemeService reads and writes theme preference through StorageAdapter (not directly to localStorage)
**Plans**: 2 plans
**UI hint**: yes

Plans:
- [ ] 15-01-PLAN.md — Wave 0 test scaffold: theme.test.js stubs + matchMedia mock in test-setup.js (DARK-01, DARK-04)
- [ ] 15-02-PLAN.md — ThemeService implementation + style.css variant + index.html FOUC script + main.js wiring (DARK-01, DARK-02, DARK-04)

### Phase 16: Dark Mode Visuals & Toggle
**Goal**: Every element in the app is legible and correctly styled in dark mode, and the organizer can override the theme from Settings
**Depends on**: Phase 15
**Requirements**: DARK-03, DARK-05, DARK-06
**Success Criteria** (what must be TRUE):
  1. All courts, player chips, and bench drag states are visually distinct and readable under dark mode on a real phone screen
  2. All button labels, hint text, toasts, error states, and empty states are readable in dark mode with sufficient contrast
  3. The Settings screen offers light, dark, and auto (system) options; selecting one takes effect immediately without a page reload
**Plans**: TBD
**UI hint**: yes

### Phase 17: Test Coverage
**Goal**: Running `npm run coverage` produces a per-file line and function coverage report; service-layer and new ThemeService paths are exercised
**Depends on**: Phase 15
**Requirements**: TEST-01, TEST-02, TEST-03, TEST-04
**Success Criteria** (what must be TRUE):
  1. `npm run coverage` completes without error and outputs a per-file line and function coverage table
  2. `club.js` and `html.js` utilities have passing unit tests that cover their main code paths
  3. ThemeService tests cover system-preference detection, manual override to each of the three modes, and storage read/write
  4. A regression test verifies the storage v1-to-v2 migration runs correctly when old-format data is present
**Plans**: TBD

### Phase 18: Documentation & Copy
**Goal**: A non-developer organizer can understand what the app does and how to use it from both the in-app Help screen and the GitHub README
**Depends on**: Phase 16
**Requirements**: DOCS-01, DOCS-02, DOCS-03
**Success Criteria** (what must be TRUE):
  1. The in-app Help screen accurately describes all current features — including dark mode and match editing — using plain language with no technical jargon
  2. The GitHub README opens with one plain sentence describing the app, followed by step-by-step instructions a phone-holding organizer can follow at a court
  3. All button labels, hint text, toast messages, error states, and empty states across the app use plain organizer-appropriate language (no developer terms, no placeholder copy)
**Plans**: TBD

## Backlog

### Phase 999.1: Court Side Penalty to Encourage Swapping Sides (BACKLOG)

**Goal:** Track which side of the court (teamA/teamB) each player has been on and apply a small penalty (1–2) to discourage always playing the same side
**Requirements:** TBD
**Plans:** 2/2 plans complete

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
| 13. Drag Interactions & Validation | Milestone 7 | 2/2 | Complete | 2026-04-14 |
| 14. Court Management & Polish | Milestone 7 | 2/2 | Complete | 2026-04-14 |
| 15. Dark Mode Foundation | Milestone 8 | 0/2 | Not started | - |
| 16. Dark Mode Visuals & Toggle | Milestone 8 | 0/TBD | Not started | - |
| 17. Test Coverage | Milestone 8 | 0/TBD | Not started | - |
| 18. Documentation & Copy | Milestone 8 | 0/TBD | Not started | - |
