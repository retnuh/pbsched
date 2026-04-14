---
phase: 15-dark-mode-foundation
plan: "02"
subsystem: theme
tags: [dark-mode, fouc-prevention, tailwind-v4, theme-service, localstorage]
dependency_graph:
  requires: [15-01]
  provides: [ThemeService, dark-variant, fouc-script, theme-wiring]
  affects: [src/services/theme.js, src/style.css, index.html, src/main.js]
tech_stack:
  added: []
  patterns: [class-based-dark-mode, fouc-prevention, service-encapsulation]
key_files:
  created:
    - src/services/theme.js
  modified:
    - src/style.css
    - index.html
    - src/main.js
    - vite.config.js
decisions:
  - FOUC script placed as first child of <head> immediately after <meta charset>, before any <link> tag
  - Synchronous inline script (no type="module") ensures theme is applied before first paint
  - ThemeService.getMode() returns 'auto' for any unrecognized localStorage value (tamper-safe)
  - setMode() validates against VALID_MODES before writing to localStorage
  - vite.config.js exclude added for .claude/worktrees/** to prevent stale worktree test files from being picked up by the test runner
metrics:
  duration: "~15 minutes (initial execution + fix pass)"
  completed: "2026-04-14T23:00:00Z"
  tasks_completed: 2
  files_changed: 5
---

# Phase 15 Plan 02: Dark Mode Foundation Wiring Summary

**One-liner:** ThemeService implemented + FOUC script and dark body classes inserted into index.html + Tailwind v4 dark variant declared + vitest worktree exclusion fix.

## What Was Built

Created `src/services/theme.js` implementing the full ThemeService API (init, setMode, getMode, applyTheme). Added `@custom-variant dark` to `src/style.css`. Inserted FOUC prevention script as the first element in `<head>` and updated `<body>` class with dark baseline colors in `index.html`. Wired `ThemeService.init()` in `src/main.js` before `initRouter()`.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create src/services/theme.js (ThemeService) | 9d8990c | src/services/theme.js |
| 2 | Wire dark mode into style.css, index.html, main.js | 816e3b5 | src/style.css, index.html, src/main.js |

## Fix Pass: Task 2

Task 2 was initially reported as not applied (FOUC script missing from index.html, body class not updated). Investigation confirmed the edits were correctly committed in `816e3b5` — the user was looking at the pre-merge worktree state. The committed index.html in HEAD contained the correct FOUC script and dark body classes.

A separate issue was found: stale worktree directories under `.claude/worktrees/` contained `theme.test.js` without `theme.js`, causing 2 test file failures. Fixed by adding `.claude/worktrees/**` to the `exclude` list in `vite.config.js`.

## Verification Results

- `npx vitest run` → 7 files passed, 109 tests passed (exit 0)
- `src/style.css` line 3: `@custom-variant dark (&:where(.dark, .dark *));` — FOUND
- `index.html` head: FOUC script as first element after `<meta charset>`, before `<link rel="icon">` — FOUND
- `index.html` body class includes `dark:bg-gray-900 dark:text-gray-100` — FOUND
- `src/main.js` imports ThemeService and calls `ThemeService.init()` before `initRouter(appEl)` — FOUND

## Deviations from Plan

- `vite.config.js` was modified (not in plan's `files_modified` list) to exclude stale worktree test files from the test runner. This is a test infrastructure fix, not a feature change.

## Known Stubs

None — all ThemeService behaviors are fully implemented.

## Threat Flags

None — all T-15-02-xx threats mitigated as designed:
- getMode() returns 'auto' for tampered pb:theme values
- setMode() validates input before writing
- All localStorage and matchMedia calls wrapped in try/catch

## TDD Gate Compliance

- RED gate (Plan 15-01): `test(15-01): add failing ThemeService test suite (DARK-01, DARK-04)` — commit 99e5ea3
- GREEN gate (Plan 15-02): `feat(15-02): implement ThemeService (src/services/theme.js)` — commit 9d8990c

## Self-Check: PASSED

- src/services/theme.js exports ThemeService with all 4 methods: FOUND
- src/style.css contains @custom-variant dark: FOUND
- index.html FOUC script before first <link>: FOUND
- index.html body has dark:bg-gray-900 dark:text-gray-100: FOUND
- src/main.js calls ThemeService.init() before initRouter: FOUND
- All 109 tests pass: CONFIRMED
