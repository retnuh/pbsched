---
phase: 16-dark-mode-visuals-toggle
plan: "01"
subsystem: ui-css
tags: [dark-mode, css, nav, tailwind]
dependency_graph:
  requires: []
  provides: [dark-zone-chips, dark-sortable-ghost, dark-nav-bar]
  affects: [src/style.css, index.html, src/router.js]
tech_stack:
  added: []
  patterns: [tailwind-dark-variant-descendant-selector, classList-toggle-dark-prefix]
key_files:
  created: []
  modified:
    - src/style.css
    - index.html
    - src/router.js
decisions:
  - "Used .dark [selector] descendant CSS for zone chips — lower specificity than inline but sufficient; no !important needed for chips"
  - "Dark ghost border uses !important to override the existing .sortable-ghost !important rule"
  - "dark:text-blue-400 and dark:text-gray-500 added as static HTML classes on <a data-nav> elements and also toggled dynamically in router.js for sync with light-mode toggles"
metrics:
  duration: "~10 minutes"
  completed: "2026-04-14T22:52:05Z"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 3
---

# Phase 16 Plan 01: Dark Mode Zone Chips, Ghost Border, and Nav Bar Summary

**One-liner:** Dark CSS overrides for zone chips (A/B/bench), sortable-ghost drag border, and nav bar dark background/text using `.dark` descendant selectors and Tailwind dark utility classes.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Zone chip dark CSS overrides and sortable-ghost dark border | 4693b1a | src/style.css |
| 2 | Dark utility classes on nav bar and router active-state toggling | c0c7890 | index.html, src/router.js |

## What Was Built

**Task 1 — src/style.css:**
Added four new dark override rule blocks immediately after their light-mode counterparts:
- `.dark [data-zone$="-a"] [data-player-id]` — navy bg (#1e3a5f), blue border (#1d4ed8), light blue text (#93c5fd)
- `.dark [data-zone$="-b"] [data-player-id]` — dark orange bg (#431407), orange border (#c2410c), peach text (#fdba74)
- `.dark [data-zone="bench"] [data-player-id]` — dark gray bg (#374151), gray border (#4b5563), light gray text (#d1d5db)
- `.dark .sortable-ghost` — `border: 3px dashed #9ca3af !important` (gray-400, visible on dark backgrounds)

No existing rules were modified.

**Task 2 — index.html:**
- `<nav>` element: added `dark:bg-gray-800/90 dark:border-gray-700`
- All three `<a data-nav>` elements: added `dark:text-gray-500 dark:text-blue-400` as static classes

**Task 2 — src/router.js:**
Added two toggle calls after the existing light-mode toggles:
```javascript
link.classList.toggle('dark:text-blue-400', isActive);
link.classList.toggle('dark:text-gray-500', !isActive);
```

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all changes are complete CSS/HTML/JS with no placeholder values.

## Threat Flags

None — changes are additive CSS classes and static HTML attributes; no new network endpoints, auth paths, or schema changes introduced.

## Self-Check: PASSED

- src/style.css: 3 `.dark [data-zone` rules present (grep -c returns 3) + `.dark .sortable-ghost` with `#9ca3af !important`
- index.html: `<nav>` contains `dark:bg-gray-800/90 dark:border-gray-700`; all 3 `<a data-nav>` contain `dark:text-gray-500 dark:text-blue-400`
- src/router.js: `dark:text-blue-400` and `dark:text-gray-500` toggled dynamically
- Commits 4693b1a and c0c7890 verified in git log
