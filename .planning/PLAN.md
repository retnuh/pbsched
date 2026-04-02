# Phase 6 Plan: Settings and Polish

## Goal
Tunable weights, mobile optimization, and visual flair.

## Tasks

### 1. Scoring Weight Sliders
- [x] Update `Settings.js` to include range inputs for:
  - Repeated Partner Penalty
  - Repeated Opponent Penalty
  - Repeated Sit-out Penalty (the "Fairness" slider)
- [x] Add "Reset to Defaults" button for weights.
- [x] Ensure `SchedulerService` (via `SessionService`) uses these updated weights from `StorageAdapter`.

### 2. Player Manager "Sit Count"
- [x] Update `renderAttendeeManager` in `RoundDisplay.js` to calculate how many times each player has sat out in the current session.
- [x] Display this count next to their names so the organizer can see fairness at a glance.

### 3. Visual Flair (Icons & Transitions)
- [x] Add SVG icons to the bottom navigation bar in `index.html`.
- [x] Implement subtle CSS transitions for view mounting/unmounting.
- [x] Add Help & Guide page.
- [x] Improve empty states for Clubs and Members.

### 4. Technical Polish
- [x] Add iOS `apple-mobile-web-app-capable` and related meta tags to `index.html`.
- [x] Create a basic `manifest.json` for "Add to Home Screen" support.
- [x] Apply `min-h-[100dvh]` and other mobile Safari viewport fixes.

## Verification Plan
- [x] Verify weights: Increase partner penalty to max, generate rounds, confirm fewer repeats.
- [x] Verify Sit Count: Play 3 rounds, check Player Manager, ensure counts match reality.
- [x] Verify Mobile: Check layout on small screen simulator, ensuring bottom nav and sticky buttons don't overlap or hide content.
