---
phase: 11
slug: service-layer-data-model
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-14
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.2 |
| **Config file** | `vite.config.js` — `test: { environment: 'happy-dom', globals: true }` |
| **Quick run command** | `npx vitest run src/services/session.test.js` |
| **Full suite command** | `npx vitest run` |

---

## Sampling Rate

- **After every task commit:** `npx vitest run src/services/session.test.js`
- **After wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

---

## Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HIST-01 | `updateRound` on unplayed round replaces assignments; scheduler uses them for next generation | unit | `npx vitest run src/services/session.test.js` | Wave 0 gap |
| HIST-02 | `updateRound` on played round sets `source: 'edited'`; `played: true` preserved | unit | `npx vitest run src/services/session.test.js` | Wave 0 gap |
| HIST-03 | `updateRound` on played round deletes subsequent unplayed rounds and regenerates next | unit | `npx vitest run src/services/session.test.js` | Wave 0 gap |

---

## Wave 0 Gaps

- [ ] `src/services/session.test.js` — must be created; covers HIST-01, HIST-02, HIST-03 (does not exist in main working tree)

*(Existing `src/scheduler.test.js` and `src/storage.test.js` require no changes.)*
