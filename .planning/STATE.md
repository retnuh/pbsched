---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: Ready to execute
last_updated: "2026-04-14T10:51:42.566Z"
progress:
  total_phases: 4
  completed_phases: 0
  total_plans: 1
  completed_plans: 0
  percent: 0
---

# Project State: Pickleball Practice Scheduler

## Current Position

**Milestone 7 — Match Editor** | Phase 11 (next) | Status: Roadmap ready, planning Phase 11

```
Milestone 7 progress: [----------] 0% (0/4 phases)
```

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-14)

**Core value:** Generate fair, varied round matchups instantly — so the organizer can focus on running practice, not doing scheduling math in their head.
**Current focus:** Milestone 7 — Match Editor (let organizer manually reassign players between courts and bench)

## Performance Metrics

| Milestone | Phases | Plans | Outcome |
|-----------|--------|-------|---------|
| Milestone 6 | 3 | 4 | Shipped 2026-04-14 |
| Milestone 7 | 4 | TBD | In progress |

## Accumulated Context

- App is a full-featured, offline-capable PWA with haptic feedback, automated versioning, and a seamless update flow
- Scheduler uses random-generate + score candidates with exponential penalty-based scoring
- Short-sided match penalties (singles, 3-way solo/pair) configurable via Settings sliders (0=disable, max 50)
- localStorage only — no backend; mobile-first (organizer's phone)
- Fairness-over-equality semantics: sit-out penalty uses base * 100^count to prevent repeated sit-outs before others have had a turn
- Active requirements deferred: JSON export/import (CLUB-05/06), in-session player change UI (SESS-03/04), alternative schedule picker (RGEN-03), default odd-player policy (SETT-02)

### Milestone 7 Key Decisions

- **Drag library:** SortableJS 1.15.7 — handles touch natively; HTML5 DnD API is broken on iOS and must not be used
- **Draft model:** All edits on a deep clone; Confirm writes back, Cancel discards — no intermediate persistence
- **New service method:** `SessionService.updateRound(roundIndex, updatedRound)` — single entry point for all editor saves
- **New view:** `MatchEditor.js` mounted at route `#/edit/:roundIndex`
- **History integration:** `source: 'edited'` field on edited rounds (backward-compatible); editing a played round invalidates + regenerates all subsequent unplayed rounds

## Session Continuity

- Phase 11 is next — build `SessionService.updateRound` and history invalidation before any UI
- Build order: service layer (Phase 11) → static scaffold + routes (Phase 12) → SortableJS drag + validation (Phase 13) → court add/remove + polish (Phase 14)
- Test SortableJS touch behavior on real iOS device during Phase 13 — emulator does not reproduce iOS drag bugs
