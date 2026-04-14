---
phase: 13
slug: drag-interactions-validation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-14
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.js` |
| **Quick run command** | `npm test -- --run src/components/MatchEditor` |
| **Full suite command** | `npm test -- --run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run src/components/MatchEditor`
- **After every plan wave:** Run `npm test -- --run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 13-01-01 | 01 | 0 | DRAG-01 | — | N/A | unit | `npm test -- --run src/components/MatchEditor` | ✅ W0 | ⬜ pending |
| 13-01-02 | 01 | 1 | DRAG-01 | — | N/A | unit | `npm test -- --run src/components/MatchEditor` | ✅ W0 | ⬜ pending |
| 13-01-03 | 01 | 1 | DRAG-02 | — | N/A | unit | `npm test -- --run src/components/MatchEditor` | ✅ W0 | ⬜ pending |
| 13-01-04 | 01 | 1 | DRAG-03 | — | N/A | unit | `npm test -- --run src/components/MatchEditor` | ✅ W0 | ⬜ pending |
| 13-01-05 | 01 | 1 | DRAG-04 | — | N/A | unit | `npm test -- --run src/components/MatchEditor` | ✅ W0 | ⬜ pending |
| 13-02-01 | 02 | 2 | VALID-01 | — | N/A | unit | `npm test -- --run src/components/MatchEditor` | ✅ W0 | ⬜ pending |
| 13-02-02 | 02 | 2 | VALID-02 | — | N/A | unit | `npm test -- --run src/components/MatchEditor` | ✅ W0 | ⬜ pending |
| 13-03-01 | 03 | 3 | VIS-01 | — | N/A | manual | See manual verifications | — | ⬜ pending |
| 13-03-02 | 03 | 3 | DRAG-05 | — | N/A | manual | See manual verifications | — | ⬜ pending |
| 13-03-03 | 03 | 3 | DRAG-06 | — | N/A | manual | See manual verifications | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/components/MatchEditor.test.js` — add stubs for DRAG-01 through DRAG-06, VALID-01, VALID-02
- [ ] `src/components/MatchEditor.test.js` — add `vi.mock('sortablejs')` mock at top of test file
- [ ] `npm install sortablejs` — install missing production dependency

*Existing vitest infrastructure covers the test framework; only mock setup and dependency install required.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Drag highlight visible on hover | VIS-01 | CSS visual feedback not testable in happy-dom | Open app, drag a chip slowly over a slot — destination slot should highlight |
| Touch drag works on iOS | DRAG-05 | Requires real device or Xcode simulator | Open on iOS device, perform drag gestures — chips should move correctly |
| Confirm/Cancel buttons visible & tappable | DRAG-06 | Layout/z-index requires visual confirmation | Verify buttons appear above bench, tap both confirm and cancel paths |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
