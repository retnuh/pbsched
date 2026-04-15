---
created: 2026-04-15T00:29:42.770Z
title: Add justfile targets for coverage, lint, and missing dev commands
area: tooling
files:
  - Justfile
  - package.json
---

## Problem

The Justfile exists but is missing targets for obvious dev commands that now exist or will soon exist:
- `coverage` — `npx vitest run --coverage` (being added in Phase 17)
- `lint` — no linting target exists
- `typecheck` — if applicable
- `open` or `open-coverage` — open coverage report in browser after running

The `package.json` currently only has `dev`, `build`, `preview` scripts. After Phase 17, a `coverage` script will be added. The Justfile should proxy this and any other useful workflow commands so developers have a single, discoverable interface.

## Solution

Audit `package.json` scripts after Phase 17 executes and add corresponding Justfile targets for anything missing. At minimum:

```just
# Run test coverage report
coverage:
    npm run coverage

# Open coverage report in browser (after running coverage)
open-coverage: coverage
    open coverage/index.html
```

Consider also: `lint`, `format`, `ci` (runs check + coverage), and anything surfaced during Phase 17 execution that would be useful day-to-day.
