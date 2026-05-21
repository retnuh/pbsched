---
phase: quick-260521-g6t
plan: 1
subsystem: ui
tags: [pwa, install-prompt, beforeinstallprompt, ios-safari, vanilla-js, vitest]

requires:
  - phase: 11-pwa-foundation
    provides: manifest.json, service worker registration, apple-mobile-web-app-capable meta
provides:
  - InstallPromptService (event capture + state machine for PWA installability)
  - Smart install button in ClubManager header (auto-hide when installed / unsupported)
  - iOS "Add to Home Screen" instructions modal (Safari fallback for missing beforeinstallprompt)
affects: [club-manager-view, main-bootstrap, future-onboarding-flows]

tech-stack:
  added: []
  patterns:
    - "Single-subscriber observable service pattern (mirror of ThemeService)"
    - "Defensive try/catch wrapping for browser APIs that may not exist (matchMedia, navigator.standalone, MSStream)"
    - "Module-scoped unsubscribe holder so view unmount() releases service subscriptions across re-mounts"

key-files:
  created:
    - src/services/install-prompt.js
    - src/services/install-prompt.test.js
  modified:
    - src/main.js
    - src/views/ClubManager.js

key-decisions:
  - "On dismissed install prompt, keep the stashed event so the user can retry; only drop it on accepted or appinstalled — avoids aggressive re-prompts while still allowing a deliberate second tap"
  - "iOS detection requires UA match AND 'standalone' in navigator AND !MSStream — the standalone-in-navigator check rejects in-app browsers (Instagram, Facebook) which would otherwise show the modal but cannot honor it"
  - "Bootstrap InstallPromptService.init() in main.js (not in ClubManager.mount) because beforeinstallprompt fires once at page load, well before the view mounts"
  - "Single-consumer onChange pattern (replacing previous subscriber on re-bind) is sufficient for current single-view consumer; matches the minimal scope of ThemeService and avoids subscriber-list bookkeeping"

patterns-established:
  - "PWA capability service: capture browser events at bootstrap, expose state via getStatus() enum, notify single view subscriber via onChange()"
  - "Bottom-sheet instructions modal for iOS-only flows that cannot be automated by the platform"

requirements-completed: []

duration: ~25min
completed: 2026-05-21
---

# Quick Task 260521-g6t: PWA Install Button Summary

**Smart auto-detect "Install App" button in ClubManager header — captures beforeinstallprompt for Android/desktop Chromium and shows an iOS "Tap Share → Add to Home Screen" modal as a Safari fallback, hidden in standalone or unsupported environments**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-05-21T10:21:00Z
- **Completed:** 2026-05-21T10:46:00Z
- **Tasks:** 2 (Task 1 was TDD: RED + GREEN)
- **Files modified:** 4 (2 created, 2 edited)

## Accomplishments

- New `InstallPromptService` with full state machine: `installable | ios-instructions | installed | unsupported`
- 11 unit tests covering capture, iOS branching, both standalone-detection pathways, prompt accepted/dismissed/unavailable, subscriber notifications, idempotent init
- Hidden-by-default install button in `ClubManager` header that auto-surfaces only when actionable; iOS-status taps open instructions modal, installable-status taps call native `prompt()`
- Service bootstrapped in `main.js` so the one-shot `beforeinstallprompt` event is captured before any view mounts
- Zero new dependencies; full suite 178 tests green

## Task Commits

1. **Task 1 RED: failing tests for InstallPromptService** — `531ee22` (test)
2. **Task 1 GREEN: implement InstallPromptService** — `748c191` (feat)
3. **Task 2: install-app button + iOS instructions modal wiring** — `91bcfbe` (feat)

_Note: Task 1 followed TDD (RED → GREEN). No REFACTOR commit was needed — the GREEN implementation matched the test expectations without restructuring._

## Files Created/Modified

- `src/services/install-prompt.js` (134 LOC) — Module-scoped state, init/destroy lifecycle mirroring ThemeService, defensive try/catch on all browser-API access, single-subscriber onChange returning unsubscribe function
- `src/services/install-prompt.test.js` (184 LOC) — 11 Vitest cases using synthetic `Event` objects with stubbed `preventDefault`/`prompt`/`userChoice`; navigator/matchMedia mutations snapshotted in `beforeEach` and restored in `afterEach`
- `src/main.js` (+4 lines) — Imports and calls `InstallPromptService.init()` directly after `ThemeService.init()`
- `src/views/ClubManager.js` (+69 / -1 lines) — Hidden install button inside existing header, new `#ios-install-modal` (bottom-sheet matching delete-club-modal pattern), button click handler routing to either `promptInstall()` or the iOS modal, `syncInstallBtn()` reactor wired through `InstallPromptService.onChange`, module-scoped `_unsubscribeInstall` holder released by `unmount()`

## Decisions Made

- **Dismissed-event retention:** Kept the stashed event on `'dismissed'` outcome so the button stays clickable for a second try. Dropping it would force users to wait for a fresh `beforeinstallprompt`, which may never come in the same page load. The button does not nag — it only re-prompts on explicit user tap.
- **iOS detection requires `'standalone' in navigator`:** Distinguishes real iOS Safari (which has the property) from in-app browsers (Instagram, FB) that lack it. Showing the instructions modal in an in-app browser would be a dead end since "Add to Home Screen" is not available there.
- **Bootstrap location:** `InstallPromptService.init()` lives in `main.js`, not `ClubManager.mount()`, because `beforeinstallprompt` fires at most once per page load and may fire before any view mounts. Initializing in the view would race the event.
- **Single subscriber:** `onChange` replaces any previous subscriber rather than maintaining a list. Current consumer is just `ClubManager.syncInstallBtn`; the mount() guard `if (typeof _unsubscribeInstall === 'function') _unsubscribeInstall();` handles the rare double-mount case cleanly.

## Deviations from Plan

None — plan executed exactly as written.

The plan's diff-stat estimate for `ClubManager.js` was `+~50` lines; actual was `+69 / -1`. The overage is from the iOS modal having more accessible markup (ordered list with numbered steps and inline SVG share icon) than a minimal version would. No deletion drift, no rewrite — confirmed with `git diff --stat` (4 files, 390 insertions, 1 deletion total — all intended).

## Issues Encountered

None.

## User Setup Required

None — pure client-side feature, no external services or env vars.

## Verification

- `npx vitest run src/services/install-prompt.test.js` → 11/11 passing
- `npx vitest run` → 178/178 passing (no regressions in club, session, theme, or other suites)
- `git diff --stat` (vs base `fce0bb3`): 4 files, +390 / -1 — matches plan estimate within tolerance
- `git status --short` → clean (no leaked artifacts after test runs)
- Visual smoke (deferred to user via the plan's `<human-check>` block in Task 2 — Chromium synthetic `beforeinstallprompt` dispatch, iOS UA spoofing, and standalone-window mode)

## Self-Check: PASSED

Verified all created files exist on disk and all commit hashes are reachable from HEAD:

- FOUND: `src/services/install-prompt.js`
- FOUND: `src/services/install-prompt.test.js`
- FOUND: `src/main.js` (modified)
- FOUND: `src/views/ClubManager.js` (modified)
- FOUND: commit `531ee22` (RED tests)
- FOUND: commit `748c191` (GREEN implementation)
- FOUND: commit `91bcfbe` (Task 2 wiring)

## Next Steps

- Manual smoke per the plan's Task 2 `<human-check>` is the only remaining verification (Claude cannot dispatch real PWA install dialogs in CI/headless).
- Future opportunity: extend `InstallPromptService` with telemetry (record dismissed/accepted outcomes for product analytics). Not in scope here.

---
*Quick task: 260521-g6t-add-a-button-on-first-screen-to-create-a*
*Completed: 2026-05-21*
