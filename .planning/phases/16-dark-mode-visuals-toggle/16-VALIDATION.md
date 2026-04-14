---
phase: 16
slug: dark-mode-visuals-toggle
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-14
---

# Phase 16 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | none — visual/DOM inspection only (no test framework in project) |
| **Config file** | none |
| **Quick run command** | `open http://localhost:5173` + toggle dark mode |
| **Full suite command** | Full visual review across all 6 views in dark mode |
| **Estimated runtime** | ~2 minutes manual review |

---

## Sampling Rate

- **After every task commit:** Visually verify the changed element renders correctly in dark mode
- **After every plan wave:** Full visual sweep of all affected views
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~2 minutes

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 16-01-01 | 01 | 1 | DARK-03 | — | N/A | manual | open app + force dark class, inspect nav contrast | ✅ existing | ⬜ pending |
| 16-01-02 | 01 | 1 | DARK-05 | — | N/A | manual | open ScheduleView in dark, inspect court/chip colors | ✅ existing | ⬜ pending |
| 16-01-03 | 01 | 1 | DARK-05 | — | N/A | manual | inspect drag ghost styling in dark mode | ✅ existing | ⬜ pending |
| 16-01-04 | 01 | 2 | DARK-05 | — | N/A | manual | open SetupView, BenchView, all secondary views in dark | ✅ existing | ⬜ pending |
| 16-01-05 | 01 | 3 | DARK-06 | — | N/A | manual | open Settings, tap mode buttons, verify immediate theme switch | ✅ existing | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements — this is a pure CSS/DOM phase with no test framework. Visual verification is the only feasible approach.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Courts/chips legible in dark mode on real phone | DARK-05 | CSS visual output — not automatable | Open app on device, force dark class, inspect scheduling view |
| Bench drag ghost visible in dark | DARK-05 | Requires live drag interaction | Drag a player chip in dark mode, confirm ghost is visible |
| Theme toggle immediate (no reload) | DARK-03 | DOM mutation — not automatable | Open Settings, tap each mode option, confirm instant switch |
| All 6 views readable in dark | DARK-05 | Visual contrast — not automatable | Navigate each route with dark mode active, check text/buttons |
| Auto mode follows system preference | DARK-06 | OS-level system event — not automatable | Set system to dark/light, toggle auto mode, confirm match |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
