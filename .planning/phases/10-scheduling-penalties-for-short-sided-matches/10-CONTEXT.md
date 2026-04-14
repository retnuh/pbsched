# Phase 10: Scheduling Penalties for Short-Sided Matches - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Extend the scheduler's penalty system to penalize players who have previously occupied a "short-sided" position this session — singles (1v1), 3-way solo (the lone player on the 1-player side of 2v1), or 3-way pair (either player on the 2-player side of 2v1). Expose three configurable sliders in the Settings screen. Sessions created before deploy must continue to work using default penalty values (no breaking schema change).

</domain>

<decisions>
## Implementation Decisions

### Penalty Application Model
- **D-01:** Use the same scaled model as existing partner/opponent penalties: `base * 2^streak`. First short-sided occurrence adds a small push; repeats compound exponentially.
- **D-02:** Penalty applies only to the player(s) actually occupying the short-sided position in a candidate round. Not applied to the whole court.
  - Singles (1v1): both players receive the singles penalty (each is "short-sided")
  - 3-way solo (2v1): the one player on the 1-player side receives the solo penalty
  - 3-way pair (2v1): each of the two players on the 2-player side receives the pair penalty
- **D-03:** `buildPairHistory()` must be extended to track per-player short-sided history (singles count/streak, 3-way-solo count/streak, 3-way-pair count/streak) across played rounds.

### Default Values and Slider Ranges
- **D-04:** Singles penalty: **default 15**, range 1–50
- **D-05:** 3-way solo penalty: **default 20**, range 1–50
- **D-06:** 3-way pair penalty: **default 15**, range 1–50
- **D-07:** All three sliders use the same range (1–50) as existing scheduler sliders.

### Settings UI Grouping
- **D-08:** New sliders go inside the existing "Scheduler Optimization" card section, under a new subsection header labeled **"Short-Sided Matches"**. The header sits between the existing 3 sliders and the new 3 sliders.
- **D-09:** Slider labels (displayed in the UI): "Singles Match", "3-Way Solo", "3-Way Pair".
- **D-10:** Each slider follows the existing pattern: label row with live value display, `input[type=range]`, small descriptive hint text below.
- **D-11:** Haptic feedback (`Haptics.light()`) on slider input, same as existing sliders.

### Reset Defaults Behavior
- **D-12:** The existing "Reset to Defaults" button resets all 6 scheduler sliders, including the 3 new ones (to their defaults: 15, 20, 15).

### Schema Compatibility (SCHED-05)
- **D-13:** Add a schema v2 migration in `storage.js` that merges the three new keys into the `settings` object with defaults `{ penaltySingles: 15, penaltyThreeWaySolo: 20, penaltyThreeWayPair: 15 }`. Existing installs run this migration on first load.
- **D-14:** In `scoreRound()`, access new penalty values with `settings.penaltySingles ?? 15` (etc.) as a belt-and-suspenders fallback, ensuring sessions stored before the migration (e.g., snapshots in `session.settings`) also behave correctly.

### Claude's Discretion
- Exact key names for new penalty fields in settings (suggesting: `penaltySingles`, `penaltyThreeWaySolo`, `penaltyThreeWayPair`)
- Exact history field names for new short-sided tracking in `buildPairHistory()` return object
- Exact hint text wording under each new slider
- Whether to add the "Short-Sided Matches" header as a `<p>` or `<h3>` element (match existing section style)

</decisions>

<specifics>
## Specific Notes

- User set short-sided defaults meaningfully higher than existing defaults (partner=5, opponent=10, sitout=3) to create stronger deterrence: singles=15, solo=20, pair=15.
- The solo penalty (20) is highest because being the lone player in a 2v1 is the most disadvantaged position.
- Todo "Add scheduling penalties for singles and 3-way solo matches" (from backlog) is this phase — it is already in scope.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Scheduler
- `src/scheduler.js` — `scoreRound()` (existing penalty model), `buildPairHistory()` (needs extension), `generateCandidate()` (court structure: teamA/teamB with 1 or 2 players)

### Settings UI
- `src/views/Settings.js` — Existing slider pattern, Reset button logic, `StorageAdapter.set('settings', settings)` call

### Schema & Migration
- `src/storage.js` — Migration chain (`migrations` object), v1 defaults in `migrations[1]`, `SCHEMA_VERSION` constant

### Session Snapshot
- `src/services/session.js` — `createSession()` snapshots `settings` into `session.settings`; `generateNextRound()` passes `session.settings` to `generateRounds()`

### Requirements
- `.planning/REQUIREMENTS.md` — SCHED-01 through SCHED-05 define the acceptance criteria

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scoreRound(settings)` — extend by adding penalty clauses for short-sided courts (courts where `teamA.length === 1` or `teamB.length === 1` or both)
- Existing slider HTML pattern in `Settings.js` (lines 19–46) — copy for each new slider
- `Haptics.light()` — already imported, use on new slider `input` events

### Established Patterns
- Penalty model: `base * Math.pow(2, streak)` — replicate for new short-sided history entries
- Settings persistence: `StorageAdapter.set('settings', settings)` in `updateWeights()` — no change needed
- Migration: add `migrations[2]` function that spreads existing settings and adds new keys with defaults

### Integration Points
- `scoreRound()` receives `settings` and `history`; both need new fields
- `buildPairHistory()` returns `history` object; add `singlesCount`, `singlesStreak`, `threeWaySoloCount`, `threeWaySoloStreak`, `threeWayPairCount`, `threeWayPairStreak` (keyed by player name)
- Schema version bumps from 1→2 in `SCHEMA_VERSION` and `migrations`

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 10-scheduling-penalties-for-short-sided-matches*
*Context gathered: 2026-04-14 via discuss-phase*
