---
phase: 10-scheduling-penalties-for-short-sided-matches
plan: "01"
subsystem: scheduler
tags: [scheduler, scoring, penalties, short-sided, schema-migration, storage]
dependency_graph:
  requires: []
  provides:
    - singlesCount/Streak tracking in buildPairHistory
    - threeWaySoloCount/Streak tracking in buildPairHistory
    - threeWayPairCount/Streak tracking in buildPairHistory
    - scoreRound short-sided penalty application
    - generateRounds fast-path short-sided count increments
    - storage schema v2 migration with penalty defaults
  affects:
    - src/scheduler.js
    - src/scheduler.test.js
    - src/storage.js
    - src/storage.test.js
tech_stack:
  added: []
  patterns:
    - "?? operator for null-safe penalty fallback defaults"
    - "Additive migration spread (defaults first, existing settings override)"
    - "Backward iteration streak tracking (same pattern as sitOutStreak)"
key_files:
  created: []
  modified:
    - src/scheduler.js
    - src/scheduler.test.js
    - src/storage.js
    - src/storage.test.js
decisions:
  - "Both players penalized in 1v1 courts (symmetric short-sided burden)"
  - "Only solo-side player gets solo penalty; pair-side players get pair penalty (asymmetric)"
  - "Fast-path only increments counts, not streaks (matches existing pattern for partner/opponent)"
  - "Migration spread order: defaults first, then ...data.settings so user values always win"
  - "SCHEMA_VERSION bumped to 2; migrations chain v0->v1->v2 automatically"
metrics:
  duration_minutes: 4
  completed_date: "2026-04-14"
  tasks_completed: 3
  tasks_total: 3
  files_modified: 4
---

# Phase 10 Plan 01: Scheduling Penalties for Short-sided Matches Summary

**One-liner:** Extended scheduler penalty model with per-player singles/3-way-solo/3-way-pair count+streak tracking, applied in scoreRound with configurable bases and `?? default` fallbacks, plus storage schema v2 migration adding three new penalty keys.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Extend buildPairHistory with short-sided history tracking | f74959a | src/scheduler.js, src/scheduler.test.js |
| 2 | Extend scoreRound with short-sided penalties + fast-path | 3c928ad | src/scheduler.js, src/scheduler.test.js |
| 3 | Bump schema to v2 with short-sided penalty migration | 147ee2b | src/storage.js, src/storage.test.js |

## What Was Built

**buildPairHistory** now returns 6 new fields alongside the existing 6:
- `singlesCount`, `singlesStreak` — per-player scalar counts for 1v1 courts
- `threeWaySoloCount`, `threeWaySoloStreak` — per-player for the solo side of 2v1 courts
- `threeWayPairCount`, `threeWayPairStreak` — per-player for pair-side players in 2v1 courts

Phase 1 (counts) detects `isSingles` (both teams size 1) and `isThreeWay` (total 3, not singles) per court and increments the appropriate scalars. Phase 2 (backward streak iteration) applies the same `expectedStreak` sentinel pattern used by `sitOutStreak`.

**scoreRound** now applies three new penalty clauses inside `round.courts.forEach`:
- 1v1 courts: both players penalized with `penaltySingles ?? 15`
- 2v1 courts (solo side): solo player penalized with `penaltyThreeWaySolo ?? 20`
- 2v1 courts (pair side): each pair player penalized with `penaltyThreeWayPair ?? 15`

All use `??` (nullish coalescing) so missing settings keys fall back to hardcoded defaults without NaN or crashes.

**generateRounds fast-path** now increments `currentHistory.singlesCount`, `threeWaySoloCount`, and `threeWayPairCount` for multi-round batches, keeping history current between rounds in a batch. Streaks are not fast-pathed (consistent with existing pattern).

**Storage schema v2**: `SCHEMA_VERSION` bumped to 2. `migrations[2]` spreads defaults first then `...data.settings` so user-configured values are never overwritten. The recursive `migrate()` chain runs v0→v1→v2 automatically. Existing storage tests updated to assert `schemaVersion === 2`.

## Test Coverage

- 6 new tests in `describe('short-sided history tracking', ...)` — buildPairHistory behavior
- 6 new tests in `describe('scoreRound short-sided penalties', ...)` — scoreRound behavior
- 4 new tests in storage.test.js — v1→v2 migration, key preservation, v0→v2 chain, schemaVersion
- 2 existing storage tests updated (schemaVersion assertion: 1 → 2)
- **Total: 31 tests passing (all green)**

## Decisions Made

1. **Symmetric singles penalty** — both players in a 1v1 court are equally short-sided, so both receive the singles penalty.
2. **Asymmetric 3-way penalty** — solo player and pair players experience different burdens, so separate penalty bases (`penaltyThreeWaySolo` vs `penaltyThreeWayPair`).
3. **Streaks not fast-pathed** — fast-path only increments counts (not streaks) in generateRounds, matching the existing pattern for partner/opponent which also only fast-paths counts.
4. **Spread order in migration** — `{ penaltySingles: 15, ...data.settings }` ensures defaults are applied but never overwrite existing user settings.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all new fields are fully wired from tracking through scoring.

## Threat Flags

No new network endpoints, auth paths, file access patterns, or schema changes at unexpected trust boundaries. The migration (T-10-02) and NaN injection guard (T-10-04) mitigations identified in the plan's threat model are both implemented:
- T-10-02: `migrations[1]` guarantees `settings` exists before `migrations[2]` runs (`...data.settings` is safe)
- T-10-04: `??` operator on all three penalty lookups prevents NaN from null/undefined settings

## Self-Check: PASSED

Files created/modified:
- FOUND: src/scheduler.js
- FOUND: src/scheduler.test.js
- FOUND: src/storage.js
- FOUND: src/storage.test.js

Commits verified:
- FOUND: f74959a (Task 1)
- FOUND: 3c928ad (Task 2)
- FOUND: 147ee2b (Task 3)

Full suite: 31 tests passing, 0 failing.
