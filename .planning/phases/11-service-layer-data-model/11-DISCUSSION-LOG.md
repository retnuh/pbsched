# Phase 11: Service Layer & Data Model - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-14
**Phase:** 11-service-layer-data-model
**Areas discussed:** Regeneration ownership, source field schema, Test coverage

---

## Regeneration Ownership

| Option | Description | Selected |
|--------|-------------|----------|
| Atomic: delete + regenerate one round | updateRound deletes all subsequent unplayed rounds AND immediately regenerates the next one. Caller does nothing after save. | ✓ |
| Two-step: invalidate only | updateRound deletes but does NOT regenerate. Caller must call generateNextRound() after. | |
| Atomic: delete + regenerate ALL subsequent | Regenerate all subsequent unplayed rounds (overkill for typical single-proposed-round case). | |

**User's choice:** Atomic: delete + regenerate one round
**Notes:** Mirrors existing mid-session player-change behavior.

---

## source Field Schema

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal: source: 'edited' only | Just round.source = 'edited'. Matches HIST-02 wording. Backward-compatible. | ✓ |
| With timestamp: source + editedAt | Adds editedAt ISO string alongside the flag. No requirement or UI references it. | |

**User's choice:** Minimal: source: 'edited' only
**Notes:** No editedAt needed.

---

## Test Coverage

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — test all three success criteria | Tests for HIST-01, HIST-02, HIST-03. Tests ARE the verification since there's no UI yet. | ✓ |
| Yes — minimal smoke test only | Just verify no throws. Deeper tests deferred to Phase 12. | |
| No — defer tests to Phase 12 | Skip tests, let Phase 12 UI integration verify. | |

**User's choice:** Yes — test all three success criteria
**Notes:** Service-only phase, tests are the primary verification mechanism.

---

## Claude's Discretion

- Whether `updateRound` internally delegates to `replaceRound` for the unplayed case
- Exact test file location

## Deferred Ideas

- `editedAt` timestamp on edited rounds
- Special source marking on regenerated-after-edit rounds
