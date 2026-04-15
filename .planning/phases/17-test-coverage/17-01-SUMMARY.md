---
phase: 17-test-coverage
plan: 01
subsystem: testing
tags: [vitest, coverage-v8, v8, npm, vite]

# Dependency graph
requires:
  - phase: 15-dark-mode-foundation
    provides: ThemeService exists and is testable
provides:
  - npm run coverage script producing per-file line and function coverage table
  - @vitest/coverage-v8 installed and configured
  - vite.config.js coverage block with v8 provider, text+html reporters, src/**/*.js include
affects: [17-02, 17-03]

# Tech tracking
tech-stack:
  added: ["@vitest/coverage-v8@4.1.4"]
  patterns: ["V8-native coverage via vitest --coverage, per-file text reporter to stdout, html report in ./coverage/"]

key-files:
  created: []
  modified:
    - package.json
    - package-lock.json
    - vite.config.js

key-decisions:
  - "Pinned @vitest/coverage-v8@4.1.4 to match vitest 4.1.2 minor version — prevents peer dep errors and empty coverage output"
  - "No coverage thresholds configured — TEST-01 requires report presence only, not minimum percentages"
  - "text reporter for stdout table + html reporter for browseable ./coverage/ directory"

patterns-established:
  - "Coverage runs via npm run coverage (vitest run --coverage), not direct npx"
  - "include: src/**/*.js instruments only source files; test files and test-setup.js excluded"

requirements-completed: [TEST-01]

# Metrics
duration: 8min
completed: 2026-04-15
---

# Phase 17 Plan 01: Coverage Infrastructure Summary

**`@vitest/coverage-v8` installed and `npm run coverage` configured — exits 0 and prints a per-file line/function coverage table for `src/**/*.js`**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-15T01:30:00Z
- **Completed:** 2026-04-15T01:38:00Z
- **Tasks:** 2
- **Files modified:** 3 (package.json, package-lock.json, vite.config.js)

## Accomplishments
- Installed `@vitest/coverage-v8@4.1.4` (version-pinned to match vitest 4.1.2 minor)
- Added `"coverage": "vitest run --coverage"` script to package.json
- Added `coverage:` block inside vite.config.js `test:` section with v8 provider, text+html reporters, src/**/*.js include pattern, and test file exclusions
- `npm run coverage` exits 0 with 146 tests passing and prints the full per-file coverage table

## Task Commits

Each task was committed atomically:

1. **Task 1: Install @vitest/coverage-v8 and add coverage script** - `27584a6` (chore)
2. **Task 2: Add coverage config block to vite.config.js** - `4a76857` (chore)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `package.json` - Added `"coverage"` script to scripts block; `@vitest/coverage-v8` added to devDependencies by npm install
- `package-lock.json` - Updated by npm install (17 packages added, 8 changed)
- `vite.config.js` - Added `coverage:` key inside `test:` block with v8 provider, text+html reporters, src/**/*.js include, test file exclusions

## Decisions Made
- Pinned `@vitest/coverage-v8` to `4.1.4` (same minor as vitest `4.1.2`) to prevent peer dependency warnings and empty coverage output
- No `thresholds` configured — TEST-01 only requires the report to appear, not a minimum percentage
- Both `text` (stdout table) and `html` (./coverage/ directory) reporters enabled: text satisfies TEST-01, html is useful for local inspection

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None. npm install completed cleanly (1 pre-existing high severity vulnerability in the audit — unrelated to this plan, out of scope).

## Known Stubs

None - this plan wires real coverage tooling. No placeholder data or stub paths.

## Threat Flags

None - no new network endpoints, auth paths, file access patterns, or schema changes introduced. `@vitest/coverage-v8` is a devDependency from the official Vitest org, pinned to exact version, used only in test/CI context.

## Next Phase Readiness
- `npm run coverage` is operational — Plans 17-02 and 17-03 can now author tests and see coverage output
- All 146 tests pass (131 existing + 15 from RoundDisplay.test.js already in working tree)
- Current overall coverage: 50.64% statements — no regressions

---
*Phase: 17-test-coverage*
*Completed: 2026-04-15*
