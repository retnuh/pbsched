---
phase: 12
slug: editor-scaffold-entry-points
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-14
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | `vite.config.js` |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 12-01-01 | 01 | 0 | MEDIT-01 | — | N/A | unit | `npx vitest run src/views/MatchEditor.test.js` | ❌ W0 | ⬜ pending |
| 12-01-02 | 01 | 1 | MEDIT-01 | — | N/A | unit | `npx vitest run src/views/MatchEditor.test.js` | ❌ W0 | ⬜ pending |
| 12-01-03 | 01 | 1 | MEDIT-02 | — | N/A | unit | `npx vitest run src/views/RoundDisplay.test.js` | ✅ | ⬜ pending |
| 12-01-04 | 01 | 2 | MEDIT-01, MEDIT-02 | — | N/A | unit | `npx vitest run --reporter=verbose` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/views/MatchEditor.test.js` — stubs for MEDIT-01 (editor mount, pre-population, back navigation)

*Existing Vitest infrastructure (happy-dom, localStorage shim, vite.config.js) requires no changes.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Player chips readable and tappable on phone screen | MEDIT-01 | Visual/touch — cannot be automated | Open editor on mobile viewport; verify all chips visible and tap targets ≥ 44px |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
