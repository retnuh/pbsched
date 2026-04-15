---
phase: 17
slug: test-coverage
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-15
---

# Phase 17 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vite.config.js` (coverage block to be added in Wave 0) |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm run coverage` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm run coverage`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 17-01-01 | 01 | 0 | TEST-01 | — | N/A | config | `npm run coverage` exits 0 | ✅ | ⬜ pending |
| 17-02-01 | 02 | 1 | TEST-02 | — | N/A | unit | `npm test -- src/services/club.test.js` | ❌ W0 | ⬜ pending |
| 17-02-02 | 02 | 1 | TEST-02 | — | N/A | unit | `npm test -- src/utils/html.test.js` | ❌ W0 | ⬜ pending |
| 17-03-01 | 03 | 2 | TEST-03 | — | N/A | unit | `npm test -- src/services/theme.test.js` | ✅ | ⬜ pending |
| 17-04-01 | 04 | 2 | TEST-04 | — | N/A | unit | `npm test -- src/services/storage.test.js` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `@vitest/coverage-v8` installed as devDependency
- [ ] `package.json` has `"coverage": "vitest run --coverage"` script
- [ ] `vite.config.js` has `test.coverage` block configured

*Existing test infrastructure covers test file stubs for some requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Coverage report output format | TEST-01 | Visual verification that per-file table renders | Run `npm run coverage` and inspect stdout for a table with file paths, line %, and function % columns |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
