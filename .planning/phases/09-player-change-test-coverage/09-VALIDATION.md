---
phase: 9
slug: player-change-test-coverage
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-14
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x |
| **Config file** | `vite.config.js` (vitest config embedded) |
| **Quick run command** | `npx vitest run src/services/session.test.js` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/services/session.test.js`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 9-01-01 | 01 | 0 | — | — | N/A | infra | `npx vitest run src/storage.test.js` | ❌ W0 | ⬜ pending |
| 9-01-02 | 01 | 1 | TEST-01 | — | N/A | unit | `npx vitest run src/services/session.test.js` | ❌ W0 | ⬜ pending |
| 9-01-03 | 01 | 1 | TEST-02 | — | N/A | unit | `npx vitest run src/services/session.test.js` | ❌ W0 | ⬜ pending |
| 9-01-04 | 01 | 1 | TEST-03 | — | N/A | unit | `npx vitest run src/services/session.test.js` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/test-setup.js` — localStorage patch for vitest 4.x + happy-dom 20.x (fixes module-scope `initStorage()` call)
- [ ] `vite.config.js` updated — add `setupFiles: ['./src/test-setup.js']` to vitest config
- [ ] `src/services/session.test.js` — skeleton with describe blocks and failing stubs for TEST-01, TEST-02, TEST-03

---

## Manual-Only Verifications

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
