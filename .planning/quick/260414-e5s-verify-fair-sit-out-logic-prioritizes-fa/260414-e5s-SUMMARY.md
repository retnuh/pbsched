---
phase: quick-260414-e5s
plan: 01
subsystem: scheduler, settings-ui
tags: [fairness, sit-out, comments, ui-copy]
dependency_graph:
  requires: []
  provides: [corrected-sitout-ui-copy, clarified-sitout-penalty-comment]
  affects: [src/scheduler.js, src/views/Settings.js]
tech_stack:
  added: []
  patterns: []
key_files:
  modified:
    - src/scheduler.js
    - src/views/Settings.js
decisions:
  - "No logic changes made — getSitOutPenalty formula was already correct"
  - "Settings.js description rewritten to match actual 'fairness-over-equality' semantics"
metrics:
  duration: "5m"
  completed: "2026-04-14"
  tasks_completed: 2
  files_modified: 2
---

# Quick Task 260414-e5s: Verify Fair Sit-Out Logic Prioritizes Fairness — Summary

**One-liner:** Replaced misleading "equal sit-outs" UI copy and scheduler comment with accurate "fairness over equality" language; no logic changed.

## What Was Done

### Task 1: Clarify scheduler.js comment (src/scheduler.js)

The `getSitOutPenalty` function comment was replaced. The old comment said:
> "Massive penalty for sit-outs: base * 100^count — This ensures 2nd BYE (count=1) is 100x more expensive than 1st."

The new comment accurately explains the intent:
> "Fairness penalty for sit-outs: strongly discourages assigning a sit-out to someone who has already sat out more than others. Not about strict equality — about preventing anyone from sitting out repeatedly while others haven't yet."

The formula itself (`Math.pow(100, count)` and `Math.pow(2, streak)`) was not touched.

### Task 2: Fix Settings.js UI copy (src/views/Settings.js)

The Fair Sitting Out slider description was changed from:
> "Higher = forces everyone to sit out equally."

To:
> "How strongly to avoid making the same player sit out again before others have had a turn."

The label ("Fair Sitting Out") was already accurate and left unchanged.

## Verification

- `grep "equal number of rounds\|forces everyone to sit out equally" src/views/Settings.js` — no results
- `grep "Fairness penalty" src/scheduler.js` — found at line 127
- `grep "Math.pow(100, count)\|Math.pow(2, streak)" src/scheduler.js` — logic intact

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 & 2 | f83bbf9 | fix(quick-260414-e5s): clarify sit-out fairness intent in comments and UI copy |

## Deviations from Plan

None — plan executed exactly as written. Logic was confirmed correct; only comments and UI copy were changed.

## Self-Check: PASSED

- src/scheduler.js modified: confirmed
- src/views/Settings.js modified: confirmed
- Commit f83bbf9 exists: confirmed
- "equal number of rounds" / "forces everyone to sit out equally" absent from Settings.js: confirmed
- getSitOutPenalty logic (Math.pow formulas) unchanged: confirmed
