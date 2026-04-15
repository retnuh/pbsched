# Phase 17: Test Coverage - Pattern Map

**Mapped:** 2026-04-15
**Files analyzed:** 5 (2 new test files, 1 config addition, 1 script addition, 1 devDependency install)
**Analogs found:** 5 / 5

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/services/club.test.js` | test | CRUD | `src/services/session.test.js` | exact — same service tier, same StorageAdapter.reset() pattern |
| `src/utils/html.test.js` | test | transform | `src/storage.test.js` (pure assertions) | role-match — no StorageAdapter needed, pure function assertions |
| `package.json` (script + devDep) | config | — | `package.json` existing scripts block | exact — append to existing scripts and devDependencies |
| `vite.config.js` (coverage block) | config | — | `vite.config.js` existing test block | exact — append `coverage:` key inside `test:` object |

---

## Pattern Assignments

### `src/services/club.test.js` (test, CRUD)

**Analog:** `src/services/session.test.js`

**Imports pattern** (session.test.js lines 1-4):
```js
import { expect, test, describe, beforeEach, vi } from 'vitest'
import { StorageAdapter } from '../storage.js'
import { SessionService } from './session.js'
```

Adapt for club.test.js — drop `vi` and the schedulerModule import (no spy needed for basic CRUD):
```js
import { describe, test, expect, beforeEach } from 'vitest'
import { StorageAdapter } from '../storage.js'
import { ClubService } from './club.js'
```

**StorageAdapter reset pattern** (session.test.js lines 37-40, 60-63, 83-86, 110-113):
Every `describe` block opens with:
```js
describe('ClubService', () => {
  beforeEach(() => {
    StorageAdapter.reset()
  })
  // ...
})
```
This is the ONLY reset mechanism used — do NOT use `vi.stubGlobal('localStorage', ...)` inside service tests. `test-setup.js` clears the raw `_store` before each test; `StorageAdapter.reset()` re-initializes the in-memory state on top of that clean slate.

**Core CRUD assertion pattern** (session.test.js lines 42-57):
```js
test('returns null and does not corrupt state when ...', () => {
  // Arrange: seed StorageAdapter directly
  StorageAdapter.set('sessions', [session])

  // Act
  const result = SessionService.generateNextRound()

  // Assert
  expect(result).toBeNull()
  const rounds = SessionService.getActiveSession().rounds
  expect(rounds).toHaveLength(1)
})
```

Apply the same Arrange/Act/Assert shape to club tests. Seed state via `StorageAdapter.set('clubs', [...])` only when the test needs pre-existing data; for create tests call the service method directly (it seeds its own state).

**Complete test list for club.test.js** (covers all 8 ClubService methods):
```js
test('getClubs returns empty array initially', ...)
test('createClub adds a club with name, id, members, createdAt', ...)
test('getClub returns the club by id', ...)
test('updateClub changes name', ...)
test('deleteClub removes the club', ...)
test('addMember adds member with name and id', ...)
test('removeMember removes by id', ...)
test('renameMember changes member name', ...)
test('updateMembersLastPlayed sets lastPlayed on listed members only', ...)
```

**Pitfall: crypto.randomUUID()** — `club.js` lines 20 and 49 call `crypto.randomUUID()`. If tests throw `TypeError: crypto.randomUUID is not a function`, add to `src/test-setup.js`:
```js
// Only add if crypto.randomUUID is missing in happy-dom
if (!globalThis.crypto?.randomUUID) {
  vi.stubGlobal('crypto', { randomUUID: () => Math.random().toString(36).slice(2) })
}
```
Verify first by running the tests — happy-dom 20.x likely includes Web Crypto.

---

### `src/utils/html.test.js` (test, transform)

**Analog:** `src/storage.test.js` (pure assertion style, no beforeEach setup needed)

**Imports pattern** (storage.test.js line 1 — simplified for pure function):
```js
import { describe, test, expect } from 'vitest'
import { escapeHTML } from './html.js'
```
No `beforeEach`, no `StorageAdapter` — `escapeHTML` is a pure function with no side effects or state.

**Pure function assertion pattern** (storage.test.js lines 15-20):
```js
test('initializes with default state if empty', () => {
  const rawState = StorageAdapter.getRawState()
  expect(rawState.schemaVersion).toBe(2)
})
```

Adapt for escapeHTML — one `expect` per character escape:
```js
describe('escapeHTML', () => {
  test('escapes & to &amp;', () => {
    expect(escapeHTML('a & b')).toBe('a &amp; b')
  })
  test('escapes < to &lt; and > to &gt;', () => {
    expect(escapeHTML('<tag>')).toBe('&lt;tag&gt;')
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

The `escapeHTML` source (html.js lines 8-14) confirms the four replacement characters: `&`, `<`, `>`, `"`. No `'` replacement — do not test for `&apos;` (it is not implemented).

---

### `package.json` (script addition + devDependency)

**Analog:** `package.json` existing scripts block (lines 6-10)

**Current scripts block** (package.json lines 6-10):
```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview"
}
```

**Target scripts block** — add `coverage` after `preview`:
```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "coverage": "vitest run --coverage"
}
```

**Current devDependencies block** (package.json lines 11-17):
```json
"devDependencies": {
  "@tailwindcss/vite": "^4.2.2",
  "happy-dom": "^20.8.9",
  "tailwindcss": "^4.2.2",
  "vite": "^8.0.1",
  "vitest": "^4.1.2"
}
```

Install command (adds entry automatically):
```bash
npm install --save-dev @vitest/coverage-v8@4.1.4
```

This must be run as a shell command — do NOT hand-edit the version into package.json; `npm install` also writes `package-lock.json`.

---

### `vite.config.js` (coverage block addition)

**Analog:** `vite.config.js` existing `test:` block (lines 10-15)

**Current test block** (vite.config.js lines 10-15):
```js
test: {
  environment: 'happy-dom',
  globals: true,
  setupFiles: ['./src/test-setup.js'],
  exclude: ['**/node_modules/**', '.claude/worktrees/**'],
},
```

**Target test block** — append `coverage:` key inside the existing `test:` object:
```js
test: {
  environment: 'happy-dom',
  globals: true,
  setupFiles: ['./src/test-setup.js'],
  exclude: ['**/node_modules/**', '.claude/worktrees/**'],
  coverage: {
    provider: 'v8',
    reporter: ['text', 'html'],
    include: ['src/**/*.js'],
    exclude: ['src/**/*.test.js', 'src/test-setup.js', 'node_modules/**'],
  },
},
```

Use a surgical Edit (diff) on vite.config.js — never Write the full file. The addition is a new `coverage:` key appended after the existing `exclude` line inside `test:`. No other lines change.

---

## Shared Patterns

### StorageAdapter State Reset (for service tests)
**Source:** `src/services/session.test.js` lines 37-40
**Apply to:** `src/services/club.test.js`
```js
beforeEach(() => {
  StorageAdapter.reset()
})
```
`StorageAdapter.reset()` re-initializes the in-memory state to defaults (schemaVersion 2, empty clubs/sessions arrays, default settings). Call it inside every `describe` block that touches StorageAdapter. It is safe to call multiple times — idempotent.

### matchMedia Mock (for ThemeService tests — already in place)
**Source:** `src/test-setup.js` lines 32-43 + `src/services/theme.test.js` lines 6-22
**Apply to:** Any future test that needs to override system dark/light preference
```js
// Per-test override in theme.test.js lines 7-22:
function mockMatchMedia(matches) {
  const addListenerMock = vi.fn()
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: addListenerMock,
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
  return addListenerMock
}
```
Always use `{ writable: true, configurable: true }` — omitting these causes subsequent `Object.defineProperty` calls to throw.

### localStorage Isolation (global, no per-test action needed)
**Source:** `src/test-setup.js` lines 6-26
The global `beforeEach` in `test-setup.js` clears `_store` before every test automatically. Service tests call `StorageAdapter.reset()` on top of that to re-initialize in-memory state. Pure function tests (`html.test.js`) need nothing — they have no localStorage dependency.

---

## No Analog Found

All files in this phase have close analogs. No entries.

---

## Metadata

**Analog search scope:** `src/services/`, `src/utils/`, `src/views/`, `src/`, project root
**Files scanned:** 7 test files + 3 source files + 2 config files
**Pattern extraction date:** 2026-04-15
