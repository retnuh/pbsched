---
phase: 15
slug: dark-mode-foundation
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-14
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.2 |
| **Config file** | vite.config.js (`test.environment: happy-dom`) |
| **Quick run command** | `npm test -- --run` |
| **Full suite command** | `npm test -- --run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run`
- **After every plan wave:** Run `npm test -- --run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 15-01-01 | 01 | 0 | DARK-01, DARK-04 | — | N/A | unit | `npm test -- --run src/services/theme.test.js` | ❌ W0 | ⬜ pending |
| 15-01-02 | 01 | 1 | DARK-02 | — | FOUC script catches localStorage errors silently | manual | Reload app in DevTools throttled mode, check no white flash | N/A | ⬜ pending |
| 15-01-03 | 01 | 1 | DARK-01 | — | System pref detection correct on first load | unit | `npm test -- --run src/services/theme.test.js` | ❌ W0 | ⬜ pending |
| 15-01-04 | 01 | 1 | DARK-04 | — | ThemeService does not call localStorage directly | unit | `npm test -- --run src/services/theme.test.js` | ❌ W0 | ⬜ pending |
| 15-01-05 | 01 | 2 | DARK-01, DARK-04 | — | matchMedia listener fires applyTheme in auto mode | unit | `npm test -- --run src/services/theme.test.js` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `src/services/theme.test.js` — stubs for DARK-01, DARK-02, DARK-04 (ThemeService unit tests)
- [x] `src/test-setup.js` — add `window.matchMedia` mock (happy-dom does not implement it)

*Note: vitest and happy-dom are already installed. No new packages required.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| No white flash on load | DARK-02 | FOUC is a visual artifact; jsdom/happy-dom cannot render paint order | Open app in Chrome DevTools → Network tab → throttle to Slow 3G → hard reload; verify no white background flashes before dark bg appears |
| No flash on preference reload | DARK-02 | Same as above | Set theme to dark via ThemeService.setMode('dark') → reload; verify bg is dark from first paint |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 10s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-04-14
