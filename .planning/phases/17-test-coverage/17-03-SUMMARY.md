---
phase: 17-test-coverage
plan: 03
subsystem: testing
tags: [vitest, coverage-v8, theme-service, storage-migration, test-audit]

# Dependency graph
requires:
  - phase: 17-test-coverage
    plan: 01
    provides: npm run coverage infrastructure
  - phase: 17-test-coverage
    plan: 02
    provides: club.test.js and html.test.js
provides:
  - TEST-03 satisfied: ThemeService tests covering system-pref detection, manual override to all 3 modes, and storage persistence
  - TEST-04 satisfied: storage v1->v2 migration regression test confirmed present
  - npm run coverage exits 0 with per-file table including src/utils/html.js
affects: [phase 17 gate — all 4 requirements now satisfied]

# Tech tracking
tech-stack:
  added: []
  patterns: ["vitest text reporter skipFull:false at reporter level to override isAgent default that hides 100%-covered files"]

key-files:
  created: []
  modified:
    - vite.config.js
    - .gitignore

key-decisions:
  - "No new theme tests added — all TEST-03 behavioral acceptance criteria were already satisfied by the existing 12 tests"
  - "No new storage tests added — TEST-04 already covered by importData v1->v2 test at storage.test.js line 35-51"
  - "vite.config.js updated: text reporter skipFull:false at reporter level (not coverage level) to override vitest isAgent default of skipFull:true — required to show src/utils/html.js (100% covered) in stdout table"
  - "coverage/ added to .gitignore — generated HTML report is not source-controlled"

patterns-established:
  - "When running as a vitest agent, the text reporter defaults to skipFull:true — override by passing reporter options as [['text', {skipFull:false}]] tuple syntax"

requirements-completed: [TEST-03, TEST-04]

# Metrics
duration: 15min
completed: 2026-04-15
---

# Phase 17 Plan 03: ThemeService and Storage Test Audit Summary

**Audited theme.test.js and storage.test.js against TEST-03 and TEST-04 — both requirements already satisfied; fixed coverage table to show src/utils/html.js by overriding vitest agent skipFull default**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-15T01:37:00Z
- **Completed:** 2026-04-15T01:42:00Z
- **Tasks:** 2
- **Files modified:** 2 (vite.config.js, .gitignore)

## Accomplishments

- Audited theme.test.js (12 tests) against all 7 TEST-03 checklist items — all Yes, no gaps
- Audited storage.test.js (7 tests) against TEST-04 checklist — Yes, v1→v2 migration via importData tested at lines 35-51 and 77-83
- Identified and fixed vitest agent behavior: isAgent=true forces skipFull:true on text reporter, hiding 100%-covered files (html.js) from stdout table
- Fixed by setting skipFull:false at the reporter tuple level: `[['text', {skipFull:false}], 'html']`
- Added coverage/ to .gitignore (generated artifact, not source-controlled)
- `npm run coverage` exits 0 with all 146 tests passing and all 4 required files visible in table

## Task Commits

1. **Task 1: Audit theme.test.js and storage.test.js** — No file changes (both requirements already satisfied); no commit needed
2. **Task 2: Full suite smoke test and coverage table fix** — `ce660a5` (chore)

## Files Created/Modified

- `vite.config.js` — Updated text reporter to `[['text', {skipFull:false}], 'html']` tuple format; added `all:true` to coverage block
- `.gitignore` — Added `coverage` entry to ignore generated HTML report directory

## Decisions Made

- All TEST-03 checklist items confirmed Yes against existing 12 theme tests — no new tests added
- All TEST-04 checklist items confirmed Yes against existing 7 storage tests — no new tests added
- The vitest `isAgent` code path (in `node_modules/vitest/dist/chunks/coverage.Da5gzbsu.js`) forces `skipFull:true` for the text reporter when running as agent; user config at `coverage.skipFull` level does NOT override this — only reporter-level options do

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] vitest agent forces skipFull:true hiding html.js from coverage table**
- **Found during:** Task 2
- **Issue:** `src/utils/html.js` (100% covered) did not appear in `npm run coverage` stdout table. The acceptance criteria requires it to appear. Root cause: vitest's `isAgent` code path forces `skipFull:true` on the text reporter before user config is applied. `coverage.skipFull:false` at the top level does not override this.
- **Fix:** Changed reporter config from `['text', 'html']` to `[['text', {skipFull:false}], 'html']` (reporter tuple format). The agent code spreads user options as `{skipFull:true, ...text[1]}` — reporter-level options win.
- **Files modified:** `vite.config.js`
- **Commit:** `ce660a5`

## Final Verification

```
npm run coverage output:
 src/utils        |     100 |      100 |     100 |     100 |
  html.js         |     100 |      100 |     100 |     100 |
 src/services/club.js    100% stmts, 100% funcs, 100% lines
 src/services/theme.js   93.33% stmts, 100% funcs
 src/storage.js          86.48% stmts, 100% funcs
 Tests: 146 passed, exit 0
```

## Phase 17 Completion Status

All 4 requirements satisfied:
- TEST-01: `npm run coverage` exits 0 with per-file table (Plan 01)
- TEST-02: club.js (9 tests) and html.js (6 tests) covered (Plan 02)
- TEST-03: ThemeService 12 tests covering system-pref, manual override (dark/light/auto), persistence (this plan — confirmed existing)
- TEST-04: Storage v1→v2 migration regression test in storage.test.js lines 35-51 (this plan — confirmed existing)

## Known Stubs

None — all tests exercise real code paths. No placeholder data or stub implementations.

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes introduced.

## Self-Check

- [x] `vite.config.js` modified — exists at correct path
- [x] `.gitignore` modified — coverage entry added
- [x] Commit `ce660a5` exists in git log
- [x] `npm run coverage` exits 0 with 146 tests and per-file table including html.js

## Self-Check: PASSED

---
*Phase: 17-test-coverage*
*Completed: 2026-04-15*
