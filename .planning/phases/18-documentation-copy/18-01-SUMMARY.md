---
phase: 18-documentation-copy
plan: 01
subsystem: ui
tags: [help, documentation, copy, tailwind, dark-mode]

# Dependency graph
requires:
  - phase: 16-dark-mode-visuals-toggle
    provides: dark mode UI complete; Help must describe the finished dark mode experience
provides:
  - 5-section workflow-based Help screen rewrite covering full organizer journey
  - Match editing and dark mode contextually documented
  - Technical jargon removed (Optimization Settings, penalty, algorithm)
affects: [18-02, 18-03, verifier]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Workflow-based Help structure: organizer journey sections (Before You Start → Running a Session → Fixing Things → Settings & Preferences → How It Works)"
    - "Dark mode class pairs on content card containers: dark:text-gray-300 on the wrapper div, not individual <p> tags"

key-files:
  created: []
  modified:
    - src/views/Help.js

key-decisions:
  - "Rewrote Help from 4 feature-based sections to 5 workflow-based sections following organizer journey (D-01, D-02, D-03)"
  - "Match editing described briefly in Fixing Things section: tap Edit, drag players, tap Confirm (D-06)"
  - "Dark mode mentioned contextually in Settings & Preferences, not in its own section (D-07)"
  - "How It Works section explains fairness in plain language without penalty/algorithm/weight terminology (D-05)"

patterns-established:
  - "Help screen section order: Before You Start, Running a Session, Fixing Things, Settings & Preferences, How It Works"
  - "Numbered badge spans 1-5 using bg-blue-100 dark:bg-blue-900/30 pattern"

requirements-completed:
  - DOCS-01

# Metrics
duration: 8min
completed: 2026-04-15
---

# Phase 18 Plan 01: Documentation & Copy — Help Screen Rewrite Summary

**Help.js rewritten from a 4-section feature-based layout to a 5-section organizer-journey structure covering match editing and dark mode in plain language**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-04-15T11:52:00Z
- **Completed:** 2026-04-15T12:00:22Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Replaced the 4 feature-based sections (Getting Started, Odd Player Counts, Manual Overrides, Optimization Settings) with 5 workflow-based sections that follow the organizer's journey
- Added match editing description in "Fixing Things" — tap Edit, drag players, tap Confirm (D-06)
- Added dark mode and light mode mention in "Settings & Preferences" section (D-07)
- Removed all technical jargon: "Optimization Settings", "penalty", "algorithm", "optimized"
- Preserved all structural elements: back button, `${__APP_VERSION__}` footer, dark mode class pairs, numbered badge spans

## Task Commits

1. **Task 1: Rewrite Help.js el.innerHTML with workflow-based sections** - `0063697` (feat)

**Plan metadata commit:** (docs commit to follow)

## Files Created/Modified
- `src/views/Help.js` - Full el.innerHTML template literal replaced; 5 workflow sections with correct dark: class pairs

## Decisions Made
None beyond plan specification — all decisions (D-01 through D-07) from 18-CONTEXT.md were followed as written.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None. The `grep "tap .Edit. on any unplayed round"` verification command in the plan uses `.` as a regex wildcard; the actual text contains `"Edit"` with quotes, so `grep -i "Edit.*on any unplayed round"` was used instead. The text is present and correct.

## User Setup Required
None - no external service configuration required.

## Self-Check: PASSED

All files exist and task commit verified.

## Next Phase Readiness
- Help screen is complete and ready for verification
- Phase 18 plans 02 (README rewrite) and 03 (copy audit) can proceed independently
- No blockers

---
*Phase: 18-documentation-copy*
*Completed: 2026-04-15*
