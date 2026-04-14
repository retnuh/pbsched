---
phase: 10
slug: scheduling-penalties-for-short-sided-matches
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-14
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vite.config.js` |
| **Quick run command** | `npx vitest run src/scheduler.test.js` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/scheduler.test.js`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 1 | SCHED-01/02/03 | — | N/A | unit | `npx vitest run src/scheduler.test.js` | ✅ | ⬜ pending |
| 10-01-02 | 01 | 1 | SCHED-01/02/03 | — | N/A | unit | `npx vitest run src/scheduler.test.js` | ✅ | ⬜ pending |
| 10-01-03 | 01 | 2 | SCHED-04 | — | N/A | manual | Settings screen visual check | N/A | ⬜ pending |
| 10-01-04 | 01 | 2 | SCHED-05 | — | N/A | unit | `npx vitest run src/storage.test.js` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

- `src/scheduler.test.js` — exists; add test cases for new short-sided penalty behavior
- `src/storage.test.js` — exists; add test case for v2 migration

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Settings screen shows 3 new sliders under "Short-Sided Matches" header | SCHED-04 | UI rendering requires browser | Open Settings, scroll to Scheduler Optimization, verify 3 new sliders appear with correct labels and default values |
| Slider change takes effect on next generated round | SCHED-04 | Requires session + round generation interaction | Start session, generate a round, change a slider, generate another round, verify new penalty takes effect |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
