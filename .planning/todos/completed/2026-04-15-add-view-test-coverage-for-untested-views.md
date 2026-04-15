---
created: 2026-04-15T15:10:00.000Z
title: Add test coverage for untested view files
area: testing
files:
  - src/views/ClubManager.js
  - src/views/MemberEditor.js
  - src/views/SessionSetup.js
  - src/views/Settings.js
  - src/views/RoundDisplay.js
---

## Problem

The following view files have 0% (or near-0%) test coverage and collectively drag overall coverage well below the aspirational 60%/65% targets:

| File               | Lines | Functions |
|--------------------|-------|-----------|
| Settings.js        | 0%    | 0%        |
| MemberEditor.js    | 0%    | 0%        |
| ClubManager.js     | 0%    | 0%        |
| SessionSetup.js    | 0%    | 0%        |
| RoundDisplay.js    | ~36%  | ~29%      |

Current calibrated thresholds (lines: 53, functions: 55, branches: 55) reflect this reality. Raising them requires tests for these views.

## Solution

Write unit tests using the existing `mount()` + `StorageAdapter.reset()` + `happy-dom` pattern (see `src/views/MatchEditor.test.js` and `src/views/RoundDisplay.test.js` as references). Focus on:

1. **Settings.js** — largest file (407 lines). Test: theme toggle, penalty sliders, club name editing, data export/import.
2. **MemberEditor.js** — 342 lines. Test: add/remove/rename members, validation.
3. **ClubManager.js** — 143 lines. Test: create/delete/switch clubs.
4. **SessionSetup.js** — 111 lines. Test: player selection, session start.
5. **RoundDisplay.js** — improve from 36% → 70%+. Test: navigation, match editing flows.

## Success Criteria

Overall coverage after this work:
- Lines ≥ 65%
- Functions ≥ 70%
- Branches ≥ 60%

Thresholds in `vite.config.js` should be raised to match.
