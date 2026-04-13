# Project Roadmap: Pickleball Practice Scheduler

## Milestone 0: Project Planning (CURRENT)
- [x] Research technical stack and domain (Vite 8, Vanilla JS, Tailwind 4)
- [x] Define functional and non-functional requirements
- [x] Create architectural design and data model
- [ ] Finalize roadmap and requirements mapping

## Milestone 1: Core Engine & Foundation
**Goal:** Establish the versioned persistence layer and the scheduling algorithm before any UI exists.

### Phase 1: Data Foundation
- **ID:** P1-FOUNDATION
- **Goal:** Versioned StorageAdapter and canonical data model.
- **Requirements:** SETT-03 (Logic), Base for all CLUB/MEMB/SESS persistence.
- **Tasks:**
  - Setup Vite 8 project structure.
  - Implement versioned `StorageAdapter` with migration runner.
  - Define TypeScript-like interfaces for Club, Member, Session, and Round.

### Phase 2: Scheduling Algorithm
- **ID:** P2-ALGORITHM
- **Goal:** Pure-function scheduler with variety optimization.
- **Requirements:** RGEN-01, RGEN-02, RGEN-04, RGEN-06, SESS-05 (Logic).
- **Tasks:**
  - Implement `SchedulerService` (pure functions).
  - Implement penalty-based scoring engine.
  - Add Vitest unit tests for 5–12 player scenarios (including odd counts).

## Milestone 2: Management & Navigation
**Goal:** Build the shell and the roster management system.

### Phase 3: Club and Roster Management
- **ID:** P3-ROSTER
- **Goal:** Manage multiple clubs and their member lists.
- **Requirements:** CLUB-01, CLUB-02, CLUB-03, CLUB-04, MEMB-01, MEMB-02, MEMB-03.
- **Tasks:**
  - Implement Hash Router shell.
  - Create `ClubManager` and `MemberEditor` views.
  - Implement `ClubService` for roster CRUD.

## Milestone 3: Live Session Workflow
**Goal:** The first end-to-end runnable version of the product.

### Phase 4: Session Workflow Core
- **ID:** P4-SESSION-CORE
- **Goal:** Attendance selection and round-by-round play.
- [x] Create `SessionSetup` view (attendance picker).
- [x] Implement `SessionService` (lifecycle management).
- [x] Create `RoundDisplay` view (court-by-court matchups).

## Milestone 4: Advanced Features & Polish
**Goal:** Competitive differentiators and final UI refinement.

### Phase 5: Session Enhancements
- **ID:** P5-SESSION-ADV
- **Goal:** Mid-session changes and alternative schedules.
- [x] Implement `AttendeeList` for mid-session add/remove.
- [x] Implement "Choose Top-N Alternative" schedule picker.
- [x] Implement JSON Import/Export/Share for backup.
- [x] Implement Manual Sitter Selection ("Pick Sitter").
- [x] Implement Undo for played rounds.

### Phase 6: Settings and Polish
- **ID:** P6-POLISH
- **Goal:** Tunable weights, mobile optimization, and visual flair.
- [x] Implement scoring weight sliders in Settings.
- [x] Add "Sit Count" transparency in Player Manager.
- [x] Add SVG Icons to Bottom Navigation.
- [x] Add iOS Web App meta tags and `manifest.json`.
- [x] Apply `100dvh` CSS fixes for mobile Safari.
- [x] Add Help & Guide page.
- [x] Final UI/UX transition polish.

## Milestone 5: Offline & Persistence
**Goal:** Bulletproof performance in low-connectivity areas (common at pickleball courts).

### Phase 7: PWA & Offline Support
- **ID:** P7-PWA
- **Goal:** Full offline functionality.
- [x] Implement Service Worker for asset caching.
- [x] Add manifest.json for "Install App" support.
- [x] Ensure robustness against connectivity drops.
- [x] Implement "New Version Available" update notification.
- [x] Implement git-hash based versioning.
- [x] Add haptic feedback for mobile interactions.

## Milestone 6: UX Polish & Scheduler Improvements

**Goal:** Deliver targeted UX fixes and scheduler fairness improvements captured since PWA launch.

## Phases

- [ ] **Phase 8: Club Name Editing** - Organizer can tap the club name to edit it inline in MemberEditor
- [ ] **Phase 9: Player-Change Test Coverage** - Tests verify played match state is preserved across all mid-session roster changes
- [ ] **Phase 10: Scheduling Penalties for Short-Sided Matches** - Configurable penalties for singles and 3-way solo play, with backward-compatible schema

## Phase Details

### Phase 8: Club Name Editing
**Goal**: Organizer can tap the club name to edit it inline without navigating away
**Depends on**: Phase 7 (app is deployed as PWA)
**Requirements**: CLUB-07, CLUB-08, CLUB-09
**Success Criteria** (what must be TRUE):
  1. Tapping the club name in MemberEditor activates an inline text input at that position
  2. Blurring the input or confirming saves the new name to localStorage and updates the displayed heading
  3. The inline input renders at 16px or larger so iOS Safari does not auto-zoom the viewport
  4. Canceling (e.g., pressing Escape or tapping away without changing text) leaves the name unchanged
**Plans**: TBD
**UI hint**: yes

### Phase 9: Player-Change Test Coverage
**Goal**: Vitest suite confirms that mid-session roster changes never mutate played round state
**Depends on**: Phase 8
**Requirements**: TEST-01, TEST-02, TEST-03
**Success Criteria** (what must be TRUE):
  1. A test adds a player mid-session and asserts every played round's courts and player assignments are byte-for-byte identical before and after
  2. A test removes a player who appeared in a played court and asserts that played round is unchanged
  3. A test asserts that only rounds with `played: false` are regenerated; played rounds retain their original structure
**Plans**: 1 plan
Plans:
- [ ] 09-01-PLAN.md — Fix localStorage regression and write TEST-01, TEST-02, TEST-03

### Phase 10: Scheduling Penalties for Short-Sided Matches
**Goal**: The scheduler penalizes players who already had a singles or 3-way solo/pair match, and those penalties are configurable and schema-safe
**Depends on**: Phase 9
**Requirements**: SCHED-01, SCHED-02, SCHED-03, SCHED-04, SCHED-05
**Success Criteria** (what must be TRUE):
  1. Generating rounds after a singles or 3-way match causes affected players to appear less often on the short-sided position in subsequent candidates
  2. The Settings screen exposes three sliders — singles penalty, 3-way solo penalty, 3-way pair penalty — with visible default values
  3. Changing a penalty slider takes effect on the next generated round without requiring a session restart
  4. Sessions saved before this deploy load without errors and behave as if default penalty values were applied
**Plans**: TBD

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 8. Club Name Editing | 0/? | Not started | - |
| 9. Player-Change Test Coverage | 0/1 | Planned | - |
| 10. Scheduling Penalties for Short-Sided Matches | 0/? | Not started | - |
