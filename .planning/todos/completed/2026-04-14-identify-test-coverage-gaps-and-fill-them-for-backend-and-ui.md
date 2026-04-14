---
created: 2026-04-14T10:37:25.025Z
title: Identify test coverage gaps and fill them for backend and UI
area: testing
files: []
---

## Problem

As Milestone 7 (Match Editor) adds new service methods (e.g., `SessionService.updateRound`) and UI views (MatchEditor, drag-and-drop interactions, validation), there is no systematic audit of what is and isn't covered by tests. Coverage gaps in the service layer could allow regressions in history invalidation, round regeneration, or the `source: 'edited'` field. Coverage gaps in the UI layer could leave drag behavior, validation rules, and edge cases untested.

## Solution

After Milestone 7 phases are complete, run a test coverage audit:
1. Identify untested paths in `src/services/session.js` (especially `updateRound`, history invalidation, `replaceRound`)
2. Identify untested UI behaviors in MatchEditor (drag-and-drop, confirm/cancel, validation blocking)
3. Add Vitest unit tests for service-layer gaps
4. Add integration or component tests for UI-layer gaps where feasible in a Vanilla JS / no-framework stack

## Process Gap (flagged 2026-04-14)

Bug fixes committed during Phase 11 code review cleanup shipped without tests initially. Tests were added in a follow-up commit after the user flagged the gap. This should not require a reminder.

**Process check to add:** Enforce that any bug fix — whether from a code review finding, a reported issue, or an ad-hoc fix — must include at least one regression test in the same commit. The test should verify the specific failure mode the fix addresses (not just that the function runs). Code review output (REVIEW.md) should include test stubs alongside fix suggestions so the executor agent ships them together.
