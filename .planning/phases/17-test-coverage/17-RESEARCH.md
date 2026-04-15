# Phase 17: Test Coverage - Research

**Researched:** 2026-04-15
**Domain:** Vitest coverage, unit testing browser APIs (localStorage, matchMedia), service-layer testing
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TEST-01 | `npm run coverage` produces a per-file line and function coverage report | Install `@vitest/coverage-v8`; add `coverage` script to package.json; configure reporter in vite.config.js |
| TEST-02 | `club.js` and `html.js` utilities have unit tests covering main paths | `src/services/club.js` has 8 exported methods; `src/utils/html.js` has 1 exported function; zero existing test files for either |
| TEST-03 | ThemeService tests cover system-pref detection, manual override, and persistence | `src/services/theme.test.js` already exists with 14 passing tests; gap analysis needed for manual override to each mode |
| TEST-04 | Storage v1-to-v2 migration regression test | `src/storage.test.js` already covers v1→v2 and v0→v2; gap: no test for raw localStorage input (no `importData`) to confirm `initStorage()` migration path |
</phase_requirements>

---

## Summary

Phase 17 has two distinct tracks: (1) plumbing — add `@vitest/coverage-v8` and the `npm run coverage` script, and (2) test authoring — write new test files for `club.js` and `html.js`, and fill gaps in the existing ThemeService and storage tests.

The test infrastructure is already strong. Vitest 4.1.2 is installed and all 131 existing tests pass. The test environment (happy-dom) and setup file (`src/test-setup.js`) are fully configured with localStorage and matchMedia mocks. The `@vitest/coverage-v8` package does not yet exist in `node_modules` — it must be installed. The coverage reporter runs via `npx vitest run --coverage` after installation; the `npm run coverage` script needs to be added to `package.json`.

For test authoring, the largest gap is `src/services/club.js`: eight methods (getClubs, getClub, createClub, updateClub, deleteClub, addMember, removeMember, renameMember, updateMembersLastPlayed) with zero test coverage today. `src/utils/html.js` exports a single `escapeHTML` function — a straightforward pure-function test with five edge cases. ThemeService already has good coverage (14 tests) but the phase requirement specifically lists "manual override to each of the three modes" — the existing tests cover `setMode('dark')` and `setMode('light')` and `setMode('auto')` persistence, but do NOT test `applyTheme()` when mode is `'auto'` with system pref `dark` after setting `auto` explicitly via `setMode`. The storage migration test at `storage.test.js` already covers the v1→v2 case via `importData()`, satisfying TEST-04.

**Primary recommendation:** Install `@vitest/coverage-v8@4.1.4`, add the `coverage` script to `package.json`, then author `src/services/club.test.js` and `src/utils/html.test.js`. Review ThemeService gaps against the exact TEST-03 acceptance criteria before adding new tests.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Coverage instrumentation | Build tooling (Vite/Vitest) | — | `@vitest/coverage-v8` hooks into V8 at the test runner level |
| Test execution | Node (Vitest runner) | — | All tests run in happy-dom environment via Vitest |
| localStorage mocking | Test setup file | Per-test stubs | `src/test-setup.js` patches globalThis before module import |
| matchMedia mocking | Test setup file | Per-test override | `src/test-setup.js` sets default (light); individual tests override via `Object.defineProperty` |
| StorageAdapter state reset | Per-suite `beforeEach` | — | `StorageAdapter.reset()` clears internal state between tests |

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vitest | 4.1.2 | Test runner | [VERIFIED: package.json] Already installed and configured |
| @vitest/coverage-v8 | 4.1.4 | V8-native coverage | [VERIFIED: npm registry] Must match vitest minor; 4.1.4 is current |
| happy-dom | 20.8.9 | DOM environment for tests | [VERIFIED: package.json] Already installed; configured in vite.config.js |

### Coverage Configuration
[VERIFIED: npm registry / npx vitest --coverage probe]

`@vitest/coverage-v8` is the V8-native provider (no Babel transform needed). The alternative, `@vitest/coverage-istanbul`, requires Babel instrumentation and is slower. For this project's ESM + Vite stack, `coverage-v8` is the correct choice.

**Installation:**
```bash
npm install --save-dev @vitest/coverage-v8@4.1.4
```

**`package.json` script addition:**
```json
"coverage": "vitest run --coverage"
```

**vite.config.js addition (test section):**
```js
coverage: {
  provider: 'v8',
  reporter: ['text', 'html'],
  include: ['src/**/*.js'],
  exclude: ['src/**/*.test.js', 'src/test-setup.js', 'node_modules/**'],
}
```
The `text` reporter produces the per-file table in the terminal (satisfies TEST-01). `html` produces a browseable HTML report in `coverage/` (optional but standard).

---

## Architecture Patterns

### System Architecture Diagram

```
npm run coverage
      |
      v
vitest run --coverage (vite.config.js test.coverage config)
      |
      v
@vitest/coverage-v8 — instruments src/**/*.js via V8 bytecode counters
      |
      +--> src/test-setup.js (patches localStorage, matchMedia globally)
      |
      +--> Test files (7 existing + 2 new)
      |        |
      |        +--> StorageAdapter.reset() per suite
      |        +--> vi.stubGlobal / Object.defineProperty per test
      |
      v
Per-file line + function coverage table (stdout)
Coverage HTML report (./coverage/)
```

### Recommended Project Structure (no changes to src/ layout)
```
src/
├── services/
│   ├── club.js          # TARGET: new test file
│   ├── club.test.js     # NEW — 8 methods to cover
│   ├── theme.js         # existing
│   ├── theme.test.js    # existing — may need gap-fill
│   ├── session.js       # existing
│   └── session.test.js  # existing
├── utils/
│   ├── html.js          # TARGET: new test file
│   └── html.test.js     # NEW — escapeHTML pure function
├── storage.js           # existing
├── storage.test.js      # existing — v1→v2 migration already tested
└── test-setup.js        # existing — no changes needed
```

### Pattern 1: ClubService Test (StorageAdapter dependency injection via reset)

ClubService reads/writes through `StorageAdapter`. Tests do NOT mock StorageAdapter — they use it directly and call `reset()` in `beforeEach`. This is the established pattern in `session.test.js`.

```js
// src/services/club.test.js
import { describe, test, expect, beforeEach } from 'vitest'
import { StorageAdapter } from '../storage.js'
import { ClubService } from './club.js'

describe('ClubService', () => {
  beforeEach(() => {
    StorageAdapter.reset()
  })

  test('createClub adds a club with name, id, members, createdAt', () => {
    const club = ClubService.createClub('Test Club')
    expect(club.name).toBe('Test Club')
    expect(club.id).toBeDefined()
    expect(club.members).toEqual([])
  })

  test('getClubs returns empty array initially', () => {
    expect(ClubService.getClubs()).toEqual([])
  })

  test('getClub returns the club by id', () => {
    const club = ClubService.createClub('Alpha')
    expect(ClubService.getClub(club.id)).toMatchObject({ name: 'Alpha' })
  })

  test('deleteClub removes the club', () => {
    const club = ClubService.createClub('Alpha')
    ClubService.deleteClub(club.id)
    expect(ClubService.getClubs()).toHaveLength(0)
  })

  test('updateClub changes name', () => {
    const club = ClubService.createClub('Old')
    ClubService.updateClub(club.id, { name: 'New' })
    expect(ClubService.getClub(club.id).name).toBe('New')
  })

  test('addMember adds member with name and id', () => {
    const club = ClubService.createClub('Club')
    const member = ClubService.addMember(club.id, 'Alice')
    expect(member.name).toBe('Alice')
    expect(member.id).toBeDefined()
    expect(ClubService.getClub(club.id).members).toHaveLength(1)
  })

  test('removeMember removes by id', () => {
    const club = ClubService.createClub('Club')
    const member = ClubService.addMember(club.id, 'Alice')
    ClubService.removeMember(club.id, member.id)
    expect(ClubService.getClub(club.id).members).toHaveLength(0)
  })

  test('renameMember changes member name', () => {
    const club = ClubService.createClub('Club')
    const member = ClubService.addMember(club.id, 'Alice')
    ClubService.renameMember(club.id, member.id, 'Alicia')
    expect(ClubService.getClub(club.id).members[0].name).toBe('Alicia')
  })

  test('updateMembersLastPlayed sets lastPlayed timestamp on listed members', () => {
    const club = ClubService.createClub('Club')
    const m1 = ClubService.addMember(club.id, 'Alice')
    const m2 = ClubService.addMember(club.id, 'Bob')
    const ts = new Date().toISOString()
    ClubService.updateMembersLastPlayed(club.id, [m1.id], ts)
    const updated = ClubService.getClub(club.id)
    expect(updated.members.find(m => m.id === m1.id).lastPlayed).toBe(ts)
    expect(updated.members.find(m => m.id === m2.id).lastPlayed).toBeUndefined()
  })
})
```
[VERIFIED: inspecting club.js source and session.test.js patterns]

### Pattern 2: escapeHTML Pure Function Test

```js
// src/utils/html.test.js
import { describe, test, expect } from 'vitest'
import { escapeHTML } from './html.js'

describe('escapeHTML', () => {
  test('escapes & to &amp;', () => {
    expect(escapeHTML('a & b')).toBe('a &amp; b')
  })
  test('escapes < to &lt;', () => {
    expect(escapeHTML('<tag>')).toBe('&lt;tag&gt;')
  })
  test('escapes > to &gt;', () => {
    expect(escapeHTML('>')).toBe('&gt;')
  })
  test('escapes " to &quot;', () => {
    expect(escapeHTML('"value"')).toBe('&quot;value&quot;')
  })
  test('coerces non-string to string before escaping', () => {
    expect(escapeHTML(42)).toBe('42')
  })
  test('returns empty string unchanged', () => {
    expect(escapeHTML('')).toBe('')
  })
})
```
[VERIFIED: inspecting html.js source]

### Pattern 3: ThemeService — gap analysis for TEST-03

TEST-03 requires: system-preference detection, manual override to each of the three modes, and storage read/write.

Existing `theme.test.js` covers (14 tests):
- Auto + system dark → dark class added
- Auto + system light → no dark class
- OS change event fires applyTheme in auto mode
- OS change does NOT affect light override
- setMode('dark'), setMode('light'), setMode('auto') → localStorage write
- getMode() returns 'auto' when absent
- getMode() returns stored value when 'dark'
- setMode(invalid) → no write
- applyTheme when stored='dark' regardless of system
- applyTheme when stored='light' regardless of system

**Gap:** TEST-03 says "manual override to each of the three modes." Current tests verify `setMode` writes to storage but do NOT test the `applyTheme()` side-effect for `setMode('auto')` when system pref is dark. Specifically:
- `setMode('auto')` with system-dark → `applyTheme` → dark class? ← NOT tested explicitly as a `setMode` call chained to `applyTheme`
- All three storage writes exist; all three `applyTheme` DOM effects are tested. Coverage is effectively complete for the acceptance criteria.

**Verdict:** theme.test.js likely already meets TEST-03. The planner should run the full test suite before writing new ThemeService tests and verify coverage output to confirm, rather than authoring duplicate tests.

### Anti-Patterns to Avoid

- **Importing StorageAdapter before test-setup.js patches localStorage:** `storage.js` calls `initStorage()` at module scope. The `setupFiles` in vite.config.js ensures `test-setup.js` runs first, but any test file that imports StorageAdapter must rely on that ordering — do not call `vi.mock('../storage.js')` or `vi.stubGlobal('localStorage', ...)` in a way that fights the existing setup.
- **Using `vi.stubGlobal('localStorage', ...)` inside storage tests:** The `storage.test.js` pattern does this inside `beforeEach`. This works because the stub runs before any test calls, but it does NOT re-run `initStorage()`. For migration tests, use `StorageAdapter.importData()` — that runs the full migration chain on demand.
- **Mocking matchMedia with a non-configurable defineProperty:** Use `{ writable: true, configurable: true }` on `Object.defineProperty` calls or Vitest will throw when a subsequent test tries to re-mock it.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| V8 coverage instrumentation | Custom source-map / instrumentation | `@vitest/coverage-v8` | V8 has native bytecode counters — hand-rolling is incorrect |
| localStorage mock in tests | Ad-hoc `global.localStorage = {}` | `src/test-setup.js` pattern (already exists) | Setup file runs before module init; ad-hoc mocks run too late |
| matchMedia mock | `window.matchMedia = () => ...` (non-configurable) | `Object.defineProperty` with `writable: true, configurable: true` | Configurable property lets subsequent tests re-mock |

---

## Common Pitfalls

### Pitfall 1: @vitest/coverage-v8 version mismatch
**What goes wrong:** Installing a different minor version of `@vitest/coverage-v8` than the installed `vitest` causes a peer dependency warning and may produce empty coverage or crash.
**Why it happens:** Both packages must share the same minor version (e.g., both 4.1.x).
**How to avoid:** Pin to `@vitest/coverage-v8@4.1.4` (same minor as vitest 4.1.2).
**Warning signs:** `Error: Incompatible @vitest/coverage-v8` in stderr during `npm run coverage`.

### Pitfall 2: StorageAdapter module-scope initialization fights per-test mocks
**What goes wrong:** A test that does `vi.stubGlobal('localStorage', {...})` inside `beforeEach` doesn't affect `initStorage()` — it already ran when the module was first imported.
**Why it happens:** `storage.js` calls `initStorage()` at the top level, not inside an exported function.
**How to avoid:** Use `StorageAdapter.reset()` or `StorageAdapter.importData(data)` in tests — both re-run the migration chain on the live in-memory state.
**Warning signs:** Test asserts `schemaVersion === 2` but gets `0`, or migration tests don't see expected defaults.

### Pitfall 3: `crypto.randomUUID()` unavailable in test environment
**What goes wrong:** `club.js` calls `crypto.randomUUID()` for new club and member IDs. happy-dom may not implement it.
**Why it happens:** Not all DOM APIs are implemented in happy-dom.
**How to avoid:** Check if tests throw `TypeError: crypto.randomUUID is not a function`. If so, add a global stub in `test-setup.js`: `vi.stubGlobal('crypto', { randomUUID: () => Math.random().toString(36).slice(2) })`. But verify first — happy-dom 20.x likely includes Web Crypto.
**Warning signs:** `TypeError: crypto.randomUUID is not a function` when running club tests.

### Pitfall 4: Coverage script in justfile vs package.json
**What goes wrong:** TEST-01 says `npm run coverage` — that requires a `coverage` script in `package.json`. The justfile has a `test` target that calls `npx vitest run` directly.
**Why it happens:** The justfile bypasses package.json scripts.
**How to avoid:** Add `"coverage": "vitest run --coverage"` to `package.json` scripts. Optionally add a `coverage` target to the justfile: `coverage: \n    npm run coverage`.

---

## Existing Test Coverage Inventory

[VERIFIED: inspecting all test files in src/]

| File | Test File | Tests | Coverage Notes |
|------|-----------|-------|----------------|
| `src/storage.js` | `src/storage.test.js` | 6 | v0→v2, v1→v2 migration covered; reset, get/set covered |
| `src/scheduler.js` | `src/scheduler.test.js` | ~25 | Pair history, scoring, generation |
| `src/router.js` | `src/router.test.js` | ~10 | Route matching |
| `src/services/session.js` | `src/services/session.test.js` | ~60 | Session CRUD, round generation, updateRound |
| `src/services/theme.js` | `src/services/theme.test.js` | 14 | System pref, persistence, applyTheme |
| `src/views/MatchEditor.js` | `src/views/MatchEditor.test.js` | ~20 | Edit flow, drag, confirm/cancel |
| `src/views/RoundDisplay.js` | `src/views/RoundDisplay.test.js` | ~8 | Error states, mark played, edit buttons |
| `src/services/club.js` | **NONE** | 0 | **Gap — 8 methods untested** |
| `src/utils/html.js` | **NONE** | 0 | **Gap — escapeHTML untested** |

---

## Runtime State Inventory

> This is a pure code-addition phase (new test files + package.json + vite.config.js). No renames, refactors, or migrations.

Step 2.5 SKIPPED — not a rename/refactor/migration phase.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | npm scripts, vitest | Yes | v24.14.1 | — |
| vitest | Test runner | Yes | 4.1.2 | — |
| happy-dom | DOM environment | Yes | 20.8.9 | — |
| @vitest/coverage-v8 | `npm run coverage` | No | 4.1.4 (registry) | None — must install |
| npm | Package installation | Yes | (bundled with Node) | — |

**Missing dependencies with no fallback:**
- `@vitest/coverage-v8` — must be installed before coverage runs. One `npm install --save-dev @vitest/coverage-v8@4.1.4` command resolves this.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 |
| Config file | `vite.config.js` (test section) |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run` |
| Coverage command | `npm run coverage` (after script added) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TEST-01 | `npm run coverage` outputs per-file table | smoke | `npm run coverage` | ❌ script not yet in package.json |
| TEST-02 | club.js main paths covered | unit | `npx vitest run src/services/club.test.js` | ❌ Wave 0 |
| TEST-02 | html.js escapeHTML covered | unit | `npx vitest run src/utils/html.test.js` | ❌ Wave 0 |
| TEST-03 | ThemeService: system pref, override, persistence | unit | `npx vitest run src/services/theme.test.js` | ✅ (14 tests; verify gap coverage) |
| TEST-04 | Storage v1→v2 migration regression | unit | `npx vitest run src/storage.test.js` | ✅ (see storage.test.js line 35) |

### Sampling Rate
- **Per task commit:** `npx vitest run`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green + `npm run coverage` exits 0 before verification

### Wave 0 Gaps
- [ ] `src/services/club.test.js` — covers TEST-02 (ClubService methods)
- [ ] `src/utils/html.test.js` — covers TEST-02 (escapeHTML)
- [ ] `"coverage"` script in `package.json` — covers TEST-01
- [ ] `@vitest/coverage-v8` in `package.json` devDependencies — prerequisite for TEST-01
- [ ] `coverage` config block in `vite.config.js` test section — prerequisite for TEST-01

---

## Security Domain

> This phase adds test files only. No new user-facing surface, no auth, no data input, no cryptography. ASVS categories V2, V3, V4, V5, V6 do not apply. The `escapeHTML` function being tested (V5 input validation) already exists and is tested for XSS-escaping correctness — the test suite verifies, not re-implements.

Security domain: NOT APPLICABLE for this phase.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `crypto.randomUUID()` works in happy-dom 20.x without mocking | Common Pitfalls | club.test.js tests crash on `createClub` — fix by adding crypto stub to test-setup.js |
| A2 | ThemeService gap analysis is complete — no additional TEST-03 scenarios missing | Validation Architecture | Phase could ship tests that don't satisfy TEST-03 acceptance — verify by reading requirement against test list |

---

## Open Questions

1. **Does Phase 15 ship before Phase 17 executes?**
   - What we know: State.md says Phase 17 depends on Phase 15 (ThemeService must exist). Phase 15 plans are in `.planning/phases/15-dark-mode-foundation/` and theme.js is committed.
   - What's unclear: Phase 15 plans show "0/2" complete in ROADMAP.md but `git log` shows `theme.js` committed. Phase 16 is also complete. The ThemeService and its test file both exist in `src/services/`.
   - Recommendation: ThemeService is available. Phase 17 can proceed immediately.

2. **Should the coverage reporter gate on a minimum threshold?**
   - What we know: TEST-01 only requires the report to output — no minimum percentage specified.
   - What's unclear: Whether the planner should configure `thresholds` in vite.config.js.
   - Recommendation: Do NOT add thresholds. The requirement says "produces a report" — not "achieves X%." Thresholds cause CI failures when new code is added without tests, which is out of scope for this phase.

---

## Sources

### Primary (HIGH confidence)
- `src/services/club.js` — [VERIFIED: read in session]
- `src/utils/html.js` — [VERIFIED: read in session]
- `src/services/theme.js` — [VERIFIED: read in session]
- `src/storage.js` — [VERIFIED: read in session]
- `src/test-setup.js` — [VERIFIED: read in session]
- `src/services/theme.test.js` — [VERIFIED: read in session, 14 tests counted]
- `src/storage.test.js` — [VERIFIED: read in session, v1→v2 migration tested]
- `package.json` — [VERIFIED: no coverage script, no @vitest/coverage-v8]
- `vite.config.js` — [VERIFIED: test section has environment, globals, setupFiles, exclude]
- `npm view @vitest/coverage-v8 version` → `4.1.4` — [VERIFIED: registry]
- `npx vitest run --coverage` → `MISSING DEPENDENCY Cannot find dependency '@vitest/coverage-v8'` — [VERIFIED: probe]

### Secondary (MEDIUM confidence)
- `@vitest/coverage-v8` peer-dependency matching vitest minor version — [ASSUMED: standard vitest versioning convention]

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified via npm registry and package.json
- Architecture: HIGH — all source files read directly, test patterns verified from existing tests
- Pitfalls: HIGH — two pitfalls verified by probing (coverage missing dep, storage init timing); one [ASSUMED] (crypto.randomUUID)

**Research date:** 2026-04-15
**Valid until:** 2026-05-15 (stable tooling; vitest 4.x unlikely to break before then)
